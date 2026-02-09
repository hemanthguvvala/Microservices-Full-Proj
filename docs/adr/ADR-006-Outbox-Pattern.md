# ADR-006: Outbox Pattern for Reliable Event Publishing

**Date**: 2026-02-07  
**Status**: Accepted  
**Deciders**: Architecture Team

## Context

**The Dual-Write Problem**: When we save an entity to the database AND publish an event to Kafka, one might succeed while the other fails:

```java
// ❌ PROBLEM: Not atomic!
void createEmployee(Employee e) {
    employeeRepository.save(e);     // Succeeds
    kafkaProducer.send(event);      // Fails → Event lost!
}
```

Scenarios where this can fail:
1. Database saves, Kafka is down → No event published
2. Kafka publishes, database transaction rolls back → Duplicate event
3. Network partition between DB and Kafka

## Decision

Implement the **Outbox Pattern** to ensure reliable event publishing with at-least-once delivery guarantee.

## How It Works

1. **Save entity AND event in same database transaction**:
```java
@Transactional
void createEmployee(Employee e) {
    employeeRepository.save(e);
    outboxRepository.save(OutboxEvent);  // Same transaction!
}
```

2. **Separate process reads outbox and publishes to Kafka**:
```java
@Scheduled(fixedDelay = 5000)
void publishPendingEvents() {
    List<OutboxEvent> pending = outboxRepo.findPending();
    for (event : pending) {
        kafkaProducer.send(event);
        markAsProcessed(event);
    }
}
```

## Alternatives Considered

### 1. Transactional Outbox with CDC (Change Data Capture)
**Pros**: No polling, better performance  
**Cons**: Requires Debezium setup, more complex

### 2. Direct Kafka Publishing Only
**Pros**: Simple  
**Cons**: Doesn't solve dual-write problem

### 3. Listen to Yourself Pattern
**Pros**: Simple  
**Cons**: Doesn't guarantee ordering, harder to track

## Consequences

### Positive
- **Guaranteed Delivery**: Events will eventually be published
- **Atomicity**: Entity save and event save in same transaction
- **Resilience**: Events survive Kafka downtime
- **Audit Trail**: Outbox table serves as event log
- **Ordering**: Can maintain order within aggregate

### Negative
- **Slight Delay**: Polling interval introduces latency (5 seconds default)
- **Additional Table**: Need outbox table in database
- **Cleanup Required**: Need to clean old processed events
- **Idempotency**: Consumers must handle duplicate events (at-least-once)

## Implementation

### Database Schema
```sql
CREATE TABLE outbox_events (
    id BIGSERIAL PRIMARY KEY,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    processed_at TIMESTAMP,
    status VARCHAR(20) NOT NULL,  -- PENDING, PROCESSED, FAILED
    retry_count INT DEFAULT 0,
    error_message TEXT,
    version BIGINT  -- Optimistic locking
);

CREATE INDEX idx_outbox_pending ON outbox_events(status, created_at) 
WHERE status = 'PENDING';
```

### Usage Example

```java
// In Employee Service
@Transactional
public Employee createEmployee(EmployeeRequest request) {
    // 1. Save employee
    Employee employee = employeeRepository.save(newEmployee);
    
    // 2. Save event to outbox (same transaction)
    outboxService.saveEvent(
        "Employee",
        employee.getId().toString(),
        "EMPLOYEE_CREATED",
        employee
    );
    
    return employee;
}

// Background Publisher (runs every 5 seconds)
@Scheduled(fixedDelay = 5000)
@Transactional
public void publishPendingEvents() {
    List<OutboxEvent> events = outboxRepo.findPending();
    for (OutboxEvent event : events) {
        try {
            kafkaTemplate.send("employee-events", event.getPayload());
            event.setStatus(PROCESSED);
            event.setProcessedAt(LocalDateTime.now());
        } catch (Exception e) {
            event.setRetryCount(event.getRetryCount() + 1);
            if (event.getRetryCount() >= 3) {
                event.setStatus(FAILED);
            }
        }
        outboxRepo.save(event);
    }
}
```

### Retry Strategy
- Retry up to 3 times with exponential backoff
- Mark as FAILED after max retries
- Alert operations team for manual intervention

### Cleanup Strategy
- Delete PROCESSED events older than 7 days
- Keep FAILED events for investigation
- Run cleanup job daily at 2 AM

## Performance Considerations

For high-throughput scenarios, consider:
1. **CDC with Debezium**: Tail transaction log instead of polling
2. **Batch Processing**: Process multiple events per poll
3. **Parallel Workers**: Multiple publisher instances with locking

## Monitoring

```
Metrics to track:
- Pending events count (alert if > 1000)
- Failed events count (alert if > 10)
- Average processing delay
- Outbox table size
```

## Related Decisions

- ADR-002: Event-Driven Architecture
- ADR-005: Saga Pattern (uses Outbox for reliability)
