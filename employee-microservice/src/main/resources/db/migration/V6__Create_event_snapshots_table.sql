-- V6: Event Sourcing Snapshots table
-- Stores periodic snapshots of aggregate state to optimize event replay.
--
-- Without snapshots: replay ALL events from beginning = O(n)
-- With snapshots:    load latest snapshot + replay events since snapshot = O(1) + O(delta)
--
-- Interview: "Why do we need snapshots in event sourcing?"
-- An employee with 5 years of history might have thousands of events.
-- SELECT all those events + apply in memory is expensive.
-- Snapshot every 100 events means we only ever replay max 100 events.

CREATE TABLE event_snapshots (
    id                  BIGSERIAL     PRIMARY KEY,
    aggregate_id        VARCHAR(100)  NOT NULL,
    aggregate_type      VARCHAR(80)   NOT NULL,
    aggregate_version   BIGINT        NOT NULL,   -- version of the LAST event included in this snapshot
    state_json          TEXT          NOT NULL,   -- full serialized aggregate state
    state_size_bytes    INTEGER,                  -- for monitoring snapshot size growth
    snapshot_reason     VARCHAR(60),              -- THRESHOLD_REACHED | EXPLICIT | SCHEDULED
    created_at          TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Primary lookup: given aggregateId + type, find the latest snapshot
CREATE INDEX idx_snapshot_aggregate ON event_snapshots(aggregate_id, aggregate_type);

-- Optimized for "get latest snapshot" query (ORDER BY aggregate_version DESC LIMIT 1)
CREATE INDEX idx_snapshot_version ON event_snapshots(aggregate_id, aggregate_type, aggregate_version DESC);

COMMENT ON TABLE event_snapshots IS
    'Periodic snapshots of event-sourced aggregate state. Optimizes replay from O(n) to O(delta). Never delete rows.';

COMMENT ON COLUMN event_snapshots.aggregate_version IS
    'The EventStore.eventVersion of the last event included in this snapshot. Resume replay from this version + 1.';
