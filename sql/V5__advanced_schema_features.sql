-- ═══════════════════════════════════════════════════════════════════════════════
-- FLYWAY MIGRATION: Advanced Schema Features
-- ═══════════════════════════════════════════════════════════════════════════════
-- Version: V5__advanced_schema_features.sql
-- Description: Materialized views, partitioning, triggers, functions
-- Interview insight: Shows knowledge of advanced PostgreSQL features

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 1. MATERIALIZED VIEW — Pre-computed department statistics                  │
-- │    Interview: "How do you optimize slow dashboard queries?"                │
-- │    Answer: "Materialized views — precomputed, refreshed on schedule"       │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE MATERIALIZED VIEW mv_department_stats AS
SELECT
    d.id AS department_id,
    d.name AS department_name,
    COUNT(e.id) AS employee_count,
    COUNT(e.id) FILTER (WHERE e.status = 'ACTIVE') AS active_count,
    ROUND(AVG(e.salary), 2) AS avg_salary,
    MIN(e.salary) AS min_salary,
    MAX(e.salary) AS max_salary,
    SUM(e.salary) AS total_salary_budget,
    ROUND(AVG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.hire_date))), 1) AS avg_tenure_years,
    NOW() AS last_refreshed
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
GROUP BY d.id, d.name
WITH DATA;

-- Create unique index (required for CONCURRENTLY refresh)
CREATE UNIQUE INDEX idx_mv_dept_stats ON mv_department_stats (department_id);

-- Refresh command (run via pg_cron or Spring @Scheduled):
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_department_stats;


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 2. TABLE PARTITIONING — Payroll table by date range                       │
-- │    Interview: "How do you handle tables with millions of rows?"            │
-- │    Answer: "Partitioning — divide large table into smaller chunks"         │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- Partition by RANGE on pay_period (one partition per year)
CREATE TABLE payroll_records (
    id              BIGSERIAL,
    employee_id     BIGINT NOT NULL,
    pay_period      DATE NOT NULL,
    base_salary     DECIMAL(12,2) NOT NULL,
    bonus           DECIMAL(12,2) DEFAULT 0,
    deductions      DECIMAL(12,2) DEFAULT 0,
    net_pay         DECIMAL(12,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, pay_period)    -- Partition key must be in PK
) PARTITION BY RANGE (pay_period);

-- Create partitions for each year
CREATE TABLE payroll_records_2023 PARTITION OF payroll_records
    FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');

CREATE TABLE payroll_records_2024 PARTITION OF payroll_records
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE payroll_records_2025 PARTITION OF payroll_records
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Default partition for data that doesn't match any range
CREATE TABLE payroll_records_default PARTITION OF payroll_records DEFAULT;

-- Indexes on partitions
CREATE INDEX idx_payroll_records_employee ON payroll_records (employee_id);
CREATE INDEX idx_payroll_records_period ON payroll_records (pay_period);

-- Query automatically hits only the relevant partition:
-- SELECT * FROM payroll_records WHERE pay_period BETWEEN '2024-01-01' AND '2024-12-31';
-- → Only scans payroll_records_2024 (partition pruning)


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 3. TRIGGER + FUNCTION — Audit trail (who changed what, when)              │
-- │    Interview: "How do you track data changes in production?"               │
-- │    Answer: "Audit triggers — automatic, tamper-proof change log"           │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- Audit log table
CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    table_name      TEXT NOT NULL,
    operation       TEXT NOT NULL,     -- INSERT, UPDATE, DELETE
    record_id       BIGINT,
    old_data        JSONB,
    new_data        JSONB,
    changed_fields  TEXT[],
    changed_by      TEXT DEFAULT current_user,
    changed_at      TIMESTAMPTZ DEFAULT NOW(),
    ip_address      INET
);

CREATE INDEX idx_audit_log_table ON audit_log (table_name, changed_at);
CREATE INDEX idx_audit_log_record ON audit_log (table_name, record_id);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_changed_fields TEXT[];
    v_key TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_old_data := to_jsonb(OLD);
        INSERT INTO audit_log (table_name, operation, record_id, old_data, changed_by)
        VALUES (TG_TABLE_NAME, 'DELETE', OLD.id, v_old_data, current_user);
        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);

        -- Find which fields actually changed
        FOR v_key IN SELECT jsonb_object_keys(v_new_data) LOOP
            IF v_old_data->v_key IS DISTINCT FROM v_new_data->v_key THEN
                v_changed_fields := array_append(v_changed_fields, v_key);
            END IF;
        END LOOP;

        -- Only log if something actually changed
        IF v_changed_fields IS NOT NULL THEN
            INSERT INTO audit_log (table_name, operation, record_id, old_data, new_data, changed_fields, changed_by)
            VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id, v_old_data, v_new_data, v_changed_fields, current_user);
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'INSERT' THEN
        v_new_data := to_jsonb(NEW);
        INSERT INTO audit_log (table_name, operation, record_id, new_data, changed_by)
        VALUES (TG_TABLE_NAME, 'INSERT', NEW.id, v_new_data, current_user);
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to employees table
CREATE TRIGGER trg_employees_audit
    AFTER INSERT OR UPDATE OR DELETE ON employees
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- Attach trigger to payroll table
CREATE TRIGGER trg_payroll_audit
    AFTER INSERT OR UPDATE OR DELETE ON payroll
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 4. STORED FUNCTION — Calculate employee total compensation                │
-- │    Interview: "When do you use stored procs vs application layer?"         │
-- │    Answer: "Stored procs for data-intensive ops that shouldn't leave DB"   │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION fn_calculate_total_compensation(
    p_employee_id BIGINT,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE (
    employee_name TEXT,
    base_salary_total DECIMAL(12,2),
    bonus_total DECIMAL(12,2),
    deductions_total DECIMAL(12,2),
    net_pay_total DECIMAL(12,2),
    months_worked INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.first_name || ' ' || e.last_name,
        COALESCE(SUM(p.base_salary), 0),
        COALESCE(SUM(p.bonus), 0),
        COALESCE(SUM(p.deductions), 0),
        COALESCE(SUM(p.net_pay), 0),
        COUNT(p.id)::INTEGER
    FROM employees e
    LEFT JOIN payroll p ON p.employee_id = e.id
        AND EXTRACT(YEAR FROM p.pay_period) = p_year
    WHERE e.id = p_employee_id
    GROUP BY e.first_name, e.last_name;
END;
$$ LANGUAGE plpgsql;

-- Usage: SELECT * FROM fn_calculate_total_compensation(1, 2024);


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 5. ROW LEVEL SECURITY (RLS) — Multi-tenant data isolation                │
-- │    Interview: "How do you ensure data isolation in multi-tenant SaaS?"     │
-- │    Answer: "RLS — database enforces tenant isolation, not app code"        │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- Enable RLS on employees table
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Policy: managers can only see employees in their department
CREATE POLICY department_isolation ON employees
    USING (
        department_id = (
            SELECT department_id FROM employees WHERE id = current_setting('app.current_user_id')::BIGINT
        )
    );

-- Policy: HR can see all employees
CREATE POLICY hr_full_access ON employees
    USING (
        current_setting('app.current_role', true) = 'HR_ADMIN'
    );

-- In Spring Boot: set session variables before queries
-- SET app.current_user_id = '42';
-- SET app.current_role = 'MANAGER';


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 6. UPSERT (INSERT ON CONFLICT) — Idempotent operations                   │
-- │    Interview: "How do you handle duplicate inserts?"                       │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- Insert or update employee
INSERT INTO employees (id, email, first_name, last_name, salary, department_id)
VALUES (1, 'john@example.com', 'John', 'Doe', 85000, 1)
ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    salary = EXCLUDED.salary,
    updated_at = NOW()
WHERE employees.salary != EXCLUDED.salary;  -- Only update if salary actually changed
