# ADR-002: Event-Driven Architecture with Kafka

**Date**: 2026-02-07  
**Status**: Accepted  
**Deciders**: Architecture Team

## Context

Microservices need to communicate changes and decouple services. We need asynchronous communication for:
- Employee creation/update notifications
- Payroll processing triggers
- Audit events
- Real-time updates to clients

## Decision

We will use Apache Kafka as our primary message broker for asynchronous, event-driven communication between services.

## Alternatives Considered

### 1. RabbitMQ
**Pros**: Lower latency, traditional message queue, easier to learn  
**Cons**: Not designed for high-throughput event streaming, less suitable for event sourcing

### 2. AWS SQS/SNS
**Pros**: Managed service, no infrastructure maintenance  
**Cons**: Vendor lock-in, higher cost at scale, limited throughput

### 3. Direct REST API Calls Only
**Pros**: Simple, synchronous  
**Cons**: Tight coupling, no event replay, poor scalability

## Consequences

### Positive
- High throughput (millions of events/second)
- Event replay capability (important for debugging)
- Log-based storage (durable event history)
- Scalable and fault-tolerant
- Supports event sourcing patterns
- Decouples services

### Negative
- Operational complexity (need to manage Kafka cluster)
- Learning curve for developers
- Eventual consistency (not immediately consistent)
- More complex error handling

## Implementation Notes

```yaml
Topics:
- employee-events: Employee CRUD operations
- payroll-events: Payroll processing
- audit-events: System audit trail
```

### Event Schema
```json
{
  "eventId": "uuid",
  "eventType": "EMPLOYEE_CREATED",
  "aggregateId": "employee-123",
  "timestamp": "2026-02-07T10:00:00Z",
  "payload": { ... }
}
```

### Best Practices
- Use idempotent consumers (handle duplicate messages)
- Implement dead letter queues for failed messages
- Use appropriate partition keys for ordering
- Monitor consumer lag

## Related Decisions

- ADR-005: Saga Pattern (uses Kafka for orchestration)
- ADR-006: Outbox Pattern (ensures reliable event publishing)
- ADR-008: WebSocket for Real-Time Updates
