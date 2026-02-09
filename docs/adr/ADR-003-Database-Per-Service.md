# ADR-003: Database Per Service Pattern

**Date**: 2026-02-07  
**Status**: Accepted  
**Deciders**: Architecture Team

## Context

In a microservices architecture, we need to decide how services access data. Should they share a database or have their own?

## Decision

Each microservice will have its own database, using the most appropriate technology for its needs:
- **Employee Service**: PostgreSQL (transactional data) + MongoDB (audit logs) + Elasticsearch (search)
- **Payroll Service**: PostgreSQL (payroll records)

## Alternatives Considered

### 1. Shared Database
**Pros**: Easier to maintain ACID transactions, simpler queries  
**Cons**: Tight coupling, schema changes affect all services, scaling bottleneck

### 2. Database Per Service with Same Technology
**Pros**: Independent but consistent technology  
**Cons**: Doesn't leverage polyglot persistence benefits

## Consequences

### Positive
- **Loose Coupling**: Services can evolve independently
- **Technology Diversity**: Choose best DB for each use case
  - PostgreSQL: ACID transactions for employee/payroll data
  - MongoDB: Flexible schema for audit logs
  - Elasticsearch: Full-text search
- **Independent Scaling**: Scale databases independently
- **Fault Isolation**: Database failure doesn't affect all services

### Negative
- **Distributed Transactions**: Need Saga pattern for cross-service transactions
- **Data Duplication**: Some data replicated across services
- **Join Queries**: Can't join across databases, need API calls or event sourcing
- **Operational Complexity**: More databases to manage

## Implementation Notes

### Data Ownership
```
Employee Service owns:
- employees table (PostgreSQL)
- audit_logs collection (MongoDB)
- employees index (Elasticsearch)

Payroll Service owns:
- payrolls table (PostgreSQL)
- payment_transactions table
```

### Cross-Service Data Access
1. **API Calls**: Use OpenFeign for synchronous queries
2. **Event Replication**: Subscribe to events to maintain read models
3. **CQRS**: Separate read and write models

### Data Consistency
- Use Saga pattern for distributed transactions (ADR-005)
- Use Outbox pattern for reliable event publishing (ADR-006)
- Accept eventual consistency where appropriate

## Related Decisions

- ADR-005: Saga Pattern
- ADR-006: Outbox Pattern
- ADR-007: Polyglot Persistence Strategy
