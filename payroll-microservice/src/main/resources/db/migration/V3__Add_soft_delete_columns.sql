-- Add soft delete columns to payrolls table
ALTER TABLE payrolls
ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE payrolls
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_payrolls_deleted ON payrolls(deleted);