-- Add soft delete and multi-tenancy columns to employees table
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_employees_deleted ON employees(deleted);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON employees(tenant_id);