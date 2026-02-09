# ADR-005: Saga Pattern for Distributed Transactions

**Date**: 2026-02-07  
**Status**: Accepted  
**Deciders**: Architecture Team

## Context

With database-per-service pattern, we can't use traditional ACID transactions across services. We need a way to maintain data consistency in distributed transactions.

**Example Business Flow**: Employee Onboarding
1. Create employee record (Employee Service)
2. Create payroll record (Payroll Service)
3. Send welcome email (Notification Service)
4. Grant system access (Auth Service)

If step 3 fails, we need to undo steps 1 and 2.

## Decision

Implement the **Saga Pattern** using **Orchestration approach** for managing distributed transactions.

Each saga has:
- **Forward transactions**: Normal business operations
- **Compensating transactions**: Rollback operations if something fails

## Alternatives Considered

### 1. Two-Phase Commit (2PC)
**Pros**: Strong consistency  
**Cons**: Blocking protocol, not suitable for microservices, poor performance

### 2. Choreography-Based Saga
**Pros**: Decentralized, no single point of failure  
**Cons**: Hard to understand flow, difficult to add new steps, complex error handling

### 3. Event Sourcing
**Pros**: Complete audit trail  
**Cons**: High complexity, eventual consistency

## Decision: Orchestration-Based Saga

A central orchestrator coordinates the saga:

```
SagaOrchestrator
  ├── Start Saga
  ├── Execute Step 1 → Success → Next
  ├── Execute Step 2 → Failure → Compensate
  └── Compensate Step 1
```

## Consequences

### Positive
- **Explicit Workflow**: Easy to understand business process
- **Centralized Error Handling**: Single place to manage failures
- **Easy Testing**: Can test each step in isolation
- **Timeout Management**: Orchestrator can timeout long-running steps
- **Monitoring**: Clear visibility into saga status

### Negative
- **Orchestrator is Critical**: Single point of failure (mitigated with HA)
- **Added Complexity**: Need to implement compensation logic
- **Eventual Consistency**: Not immediately consistent
- **Idempotency Required**: Steps must be idempotent

## Implementation

### Database Model
```sql
CREATE TABLE saga_instances (
    id BIGSERIAL PRIMARY KEY,
    saga_id VARCHAR(255) UNIQUE NOT NULL,
    saga_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_step VARCHAR(100),
    saga_data TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE saga_steps (
    saga_id BIGINT REFERENCES saga_instances(id),
    step_name VARCHAR(100),
    step_status VARCHAR(50)
);
```

### Example: Employee Onboarding Saga

```java
public class EmployeeOnboardingSaga implements SagaOrchestrator {
    
    private List<String> steps = List.of(
        "CREATE_EMPLOYEE",
        "CREATE_PAYROLL",
        "SEND_WELCOME_EMAIL",
        "GRANT_SYSTEM_ACCESS"
    );
    
    // If any step fails, compensate in reverse order
}
```

### Compensating Transactions

| Forward Action | Compensating Action |
|---------------|---------------------|
| Create Employee | Delete Employee |
| Create Payroll | Delete Payroll |
| Send Welcome Email | Send Cancellation Email |
| Grant Access | Revoke Access |

### Best Practices
1. **Idempotency**: Each step must be idempotent (safe to retry)
2. **Timeout**: Set reasonable timeouts for each step
3. **Monitoring**: Track saga execution in real-time
4. **Retry Logic**: Implement exponential backoff
5. **Semantic Lock**: Lock resources during saga execution

## Monitoring

```
Metrics to Track:
- Active sagas
- Failed sagas
- Average saga duration
- Step failure rates
```

## Related Decisions

- ADR-002: Event-Driven Architecture (Sagas use events)
- ADR-003: Database Per Service
- ADR-006: Outbox Pattern (ensures reliable saga events)
