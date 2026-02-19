# ADR-011: Debezium CDC as Supplemental Outbox Strategy

**Date**: 2026-02-19
**Status**: Accepted
**Deciders**: Platform Engineering Team

---

## Context

The current outbox pattern implementation (`OutboxPublisher`) polls the `outbox_events` table every 5 seconds using `@Scheduled`. While this correctly solves the dual-write problem (atomically writing business data + event in same transaction), it has operational limitations:

| Issue | Impact |
|-------|--------|
| Polling latency | Up to 5s before event is published to Kafka |
| Database load | Additional SELECT queries on every poll cycle, even when no events are pending |
| Single point of execution | `@Scheduled` runs on one pod in a multi-replica deployment (requires distributed lock coordination) |
| No WAL-level visibility | Cannot capture schema changes, DELETEs that don't pass through application code |

We need an alternative that provides lower latency and wider change capture without modifying the application write path.

---

## Decision

We will add **Debezium** as a Change Data Capture layer that runs alongside the existing outbox polling publisher. Both strategies remain active:

- **Outbox polling** — primary path, runs in-process, always available
- **Debezium CDC** — supplemental path, WAL-based, sub-100ms latency, operates independently of application code

**Implementation details:**
- `infrastructure/debezium/docker-compose-cdc.yml` — Debezium Connect 2.5 container
- PostgreSQL logical replication enabled with `wal_level=logical`
- **pgoutput plugin** — built into PostgreSQL 10+, no server-side plugin installation required
- Replication slot: `debezium_slot` — persists LSN position so no events are missed on restart
- **Tables monitored**: `public.employees`, `public.outbox_events`, `public.event_store`
- **Outbox Event Router SMT** (Single Message Transform) — routes outbox table rows to the correct Kafka topic based on `aggregatetype` and `type` columns
- `snapshot.mode: initial` — full table snapshot on first run, then WAL streaming
- Heartbeat interval: 10s — prevents replication slot from lagging during low-traffic periods

---

## How it works

```
PostgreSQL (WAL)
    │
    │  wal_level=logical
    │  replication slot: debezium_slot
    ↓
Debezium Connector (kafka-connect)
    │  Reads: INSERT, UPDATE, DELETE row-level changes
    │  Plugin: pgoutput (built-in, no install)
    │  Applies SMT: Outbox Event Router transform
    ↓
Kafka Topics
    ├── cdc.public.employees          ← direct employee changes
    ├── cdc.public.outbox_events      ← outbox rows (routed by SMT)
    └── cdc.public.event_store        ← event sourcing store changes
    ↓
Analytics Service (EmployeeEventKafkaConsumer)
```

---

## Consequences

### Positive
- **Sub-100ms latency** — Debezium reads WAL in real time vs. 5s polling
- **Zero DB polling load** — no SELECT queries; WAL streaming is a push model
- **Survives application downtime** — Debezium runs independently, catches up from LSN on restart
- **Captures all changes** — including direct DB updates, migrations, and deletes
- **Outbox Event Router** — automatically routes payload from outbox row to correct topic and event type without code changes
- **At-least-once delivery** — Kafka offsets + LSN position ensure no events are lost

### Negative
- **Additional infrastructure** — Debezium Connect container + replication slot maintenance
- **WAL retention** — must ensure WAL is not purged before Debezium consumes it (configure `wal_keep_size` or monitor replication slot lag)
- **Replication slot leak risk** — if Debezium is down for an extended period, WAL accumulates and can fill disk; requires monitoring
- **Two consumers for outbox** — possible duplicate events if both the polling publisher and Debezium pick up the same outbox row; design consumers to be idempotent

### Mitigations
- Monitoring: alert on replication slot lag > 1000 events / 1 hour of WAL age
- Idempotent Kafka consumers: all consumers use `eventId` deduplication
- In production, disable polling publisher and use CDC only once Debezium is stable

---

## Init Container Pattern

The `debezium-connector-init` service in docker-compose-cdc.yml waits for kafka-connect to be healthy (via `curl /connectors` healthcheck), then POSTs the connector configuration JSON. This prevents race conditions on startup.

```yaml
debezium-connector-init:
  image: curlimages/curl
  depends_on:
    kafka-connect:
      condition: service_healthy
  command: |
    curl -X POST http://kafka-connect:8083/connectors
         -H "Content-Type: application/json"
         -d @/config/employee-db-connector.json
```

---

## Alternatives Considered

| Option | Reason Not Chosen |
|--------|-------------------|
| Polling outbox only | Already implemented; 5s latency; polling load; single-instance scheduling |
| Application-level dual-write | Violates atomicity guarantee — risk of message loss if Kafka is down after DB commit |
| PostgreSQL NOTIFY/LISTEN | Only works with direct DB connection; doesn't scale across services; not persisted |
| Maxwell's Daemon | Less active community than Debezium; Debezium is CNCF ecosystem standard |

---

## References
- [Debezium PostgreSQL Connector](https://debezium.io/documentation/reference/connectors/postgresql.html)
- [Outbox Event Router SMT](https://debezium.io/documentation/reference/transformations/outbox-event-router.html)
- `infrastructure/debezium/docker-compose-cdc.yml`
- `infrastructure/debezium/employee-db-connector.json`
