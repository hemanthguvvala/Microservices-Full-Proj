-- Add soft delete columns to notifications table
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_notifications_deleted ON notifications(deleted);