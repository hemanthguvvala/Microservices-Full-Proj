-- V1__create_notifications_table.sql
-- Flyway migration for the notification service

CREATE TABLE IF NOT EXISTS notifications (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_id    VARCHAR(255) NOT NULL,
    title           VARCHAR(500) NOT NULL,
    message         TEXT NOT NULL,
    channel_type    VARCHAR(50) NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    priority        VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    sender          VARCHAR(255),
    reference_id    VARCHAR(255),
    read_at         TIMESTAMP,
    retry_count     INT DEFAULT 0,
    metadata        TEXT,
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
