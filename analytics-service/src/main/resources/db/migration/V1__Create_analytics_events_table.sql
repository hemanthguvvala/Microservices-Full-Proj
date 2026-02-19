-- V1: Analytics events table
-- APPEND-ONLY — never UPDATE or DELETE rows
-- All queries are aggregations (GROUP BY, COUNT) → indexes on all filter columns

CREATE TABLE employee_analytics_events (
    id                  BIGSERIAL PRIMARY KEY,
    employee_id         VARCHAR(100) NOT NULL,
    tenant_id           VARCHAR(100) NOT NULL,
    event_type          VARCHAR(60)  NOT NULL,   -- EMPLOYEE_CREATED, PROMOTED, etc.
    department          VARCHAR(100),
    performed_by        VARCHAR(100),
    event_timestamp_ms  BIGINT       NOT NULL,   -- epoch ms — sortable without parsing
    correlation_id      VARCHAR(100),
    metadata_json       TEXT,                    -- JSON blob for flexible extra data
    source              VARCHAR(20)  DEFAULT 'GRPC',  -- GRPC | KAFKA
    ingested_at         TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Individual column indexes for single-predicate queries
CREATE INDEX idx_analytics_employee   ON employee_analytics_events(employee_id);
CREATE INDEX idx_analytics_tenant     ON employee_analytics_events(tenant_id);
CREATE INDEX idx_analytics_dept       ON employee_analytics_events(department);
CREATE INDEX idx_analytics_type       ON employee_analytics_events(event_type);
CREATE INDEX idx_analytics_timestamp  ON employee_analytics_events(event_timestamp_ms);

-- Composite index for the most common query pattern: tenant + time range
-- Interview: "Why composite index ORDER matters?"
-- → tenant_id first (high cardinality filter), timestamp second (range scan)
--   Query optimizer can use this index for: WHERE tenant_id = ? AND event_timestamp_ms BETWEEN ? AND ?
CREATE INDEX idx_analytics_tenant_time ON employee_analytics_events(tenant_id, event_timestamp_ms);

-- Partial index for new hires only (most common dashboard query)
-- Interview: "When do you use a partial index?"
-- → When a specific subset of rows is queried very frequently.
--   This index only covers EMPLOYEE_CREATED rows — smaller, faster for new-hire counts.
CREATE INDEX idx_analytics_new_hires ON employee_analytics_events(tenant_id, department)
    WHERE event_type = 'EMPLOYEE_CREATED';

COMMENT ON TABLE employee_analytics_events IS
    'Append-only event log for employee lifecycle analytics. Never update, never delete.';
