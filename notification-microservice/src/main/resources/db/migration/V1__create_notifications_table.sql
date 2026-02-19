-- ═══════════════════════════════════════════════════════════════════════════════
-- V1: Notification Service Schema (PostgreSQL)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
    id              BIGSERIAL PRIMARY KEY,
    recipient_id    VARCHAR(255) NOT NULL,
    title           VARCHAR(500) NOT NULL,
    message         TEXT NOT NULL,
    channel_type    VARCHAR(50) NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    priority        VARCHAR(50) NOT NULL DEFAULT 'NORMAL',
    template_name   VARCHAR(255),
    attachment_path VARCHAR(500),
    sender          VARCHAR(255),
    reference_id    VARCHAR(255),
    read_at         TIMESTAMP,
    sent_at         TIMESTAMP,
    retry_count     INT DEFAULT 0,
    metadata        TEXT,
    deleted         BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMP,
    created_date    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version         BIGINT DEFAULT 0
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel_type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_date);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_status ON notifications(recipient_id, status);
