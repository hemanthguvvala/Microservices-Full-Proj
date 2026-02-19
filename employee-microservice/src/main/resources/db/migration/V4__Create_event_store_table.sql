-- Event store table for event sourcing pattern
CREATE TABLE IF NOT EXISTS event_store (
    id BIGSERIAL PRIMARY KEY,
    aggregate_id VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data TEXT NOT NULL,
    event_version BIGINT NOT NULL,
    performed_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (aggregate_id, aggregate_type, event_version)
);
CREATE INDEX IF NOT EXISTS idx_event_aggregate ON event_store(aggregate_id, aggregate_type);
CREATE INDEX IF NOT EXISTS idx_event_type ON event_store(event_type);
CREATE INDEX IF NOT EXISTS idx_event_created ON event_store(created_at);