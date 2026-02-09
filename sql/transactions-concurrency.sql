-- ═══════════════════════════════════════════════════════════════════════════════
-- TRANSACTION & CONCURRENCY PATTERNS
-- ═══════════════════════════════════════════════════════════════════════════════
-- Interview insight: Understanding isolation levels and locking is CRITICAL
-- for backend engineers working with concurrent microservices


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 1. ISOLATION LEVELS                                                        │
-- │    READ UNCOMMITTED → READ COMMITTED → REPEATABLE READ → SERIALIZABLE     │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- PostgreSQL default: READ COMMITTED
-- Each query in a transaction sees the latest committed data

-- REPEATABLE READ: Same query always returns same result within transaction
-- Use for: salary calculations, report generation
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
    -- All queries here see a consistent snapshot
    SELECT SUM(salary) FROM employees WHERE department_id = 1;
    -- Even if another transaction updates salaries, this sees the original values
COMMIT;

-- SERIALIZABLE: Transactions execute as if they ran one-at-a-time
-- Use for: financial operations, inventory management
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    -- Check if budget allows
    SELECT total_budget - SUM(salary) AS remaining
    FROM departments d
    JOIN employees e ON e.department_id = d.id
    WHERE d.id = 1
    GROUP BY d.total_budget;

    -- If remaining > 0, insert new employee
    INSERT INTO employees (first_name, last_name, salary, department_id)
    VALUES ('New', 'Hire', 75000, 1);
COMMIT;
-- If another transaction modified the same data, one will get a serialization error
-- App must retry the failed transaction


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 2. LOCKING PATTERNS                                                        │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 2a. SELECT FOR UPDATE — Pessimistic locking
-- Locks the rows so no other transaction can modify them
-- Use: salary adjustment, inventory deduction
BEGIN;
    SELECT * FROM employees WHERE id = 1 FOR UPDATE;
    -- Row is now locked — other transactions wait
    UPDATE employees SET salary = salary + 5000 WHERE id = 1;
COMMIT;

-- 2b. SELECT FOR UPDATE SKIP LOCKED — Job queue pattern
-- Used by Spring Batch / Outbox pattern to process work items without conflicts
BEGIN;
    SELECT * FROM outbox_events
    WHERE status = 'PENDING'
    ORDER BY created_at
    LIMIT 10
    FOR UPDATE SKIP LOCKED;    -- Skip rows locked by other workers
    -- Process the events...
    UPDATE outbox_events SET status = 'PROCESSED' WHERE id IN (...);
COMMIT;

-- 2c. Advisory Locks — Application-level distributed locking
-- Used when you need to lock a concept, not a specific row
SELECT pg_advisory_lock(hashtext('payroll_processing_dept_1'));
-- ... do payroll processing for department 1 ...
SELECT pg_advisory_unlock(hashtext('payroll_processing_dept_1'));

-- Try lock (non-blocking):
SELECT pg_try_advisory_lock(hashtext('batch_job_monthly_report'));
-- Returns true if acquired, false if already held


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 3. DEADLOCK PREVENTION                                                    │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- Interview: "How do you prevent deadlocks?"
-- Answer: "Always lock resources in the same order"

-- BAD: Transaction A locks employee 1 then 2, Transaction B locks 2 then 1 → DEADLOCK
-- GOOD: Always lock in ascending ID order
BEGIN;
    SELECT * FROM employees WHERE id IN (1, 2) ORDER BY id FOR UPDATE;
    -- Both transactions lock in same order → no deadlock
COMMIT;

-- Deadlock detection query:
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_query,
    blocking_activity.query AS blocking_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.relation = blocked_locks.relation
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 4. OPTIMISTIC vs PESSIMISTIC LOCKING (Spring Boot context)                │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- OPTIMISTIC LOCKING (Spring @Version annotation)
-- No database locks — use version column to detect conflicts
-- Schema:
--   ALTER TABLE employees ADD COLUMN version INTEGER DEFAULT 0;
--
-- Application logic (JPA does this automatically):
--   UPDATE employees SET salary = 85000, version = version + 1
--   WHERE id = 1 AND version = 3;
--   -- If rows_affected = 0 → someone else updated → throw OptimisticLockException
--
-- Use when: read-heavy, low contention, web forms


-- PESSIMISTIC LOCKING (SELECT FOR UPDATE)
-- Database-level locks — blocks other transactions
-- Use when: write-heavy, financial operations, MUST guarantee consistency


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 5. COMMON TABLE EXPRESSIONS for DML (DELETE, UPDATE with CTEs)            │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- Soft delete terminated employees older than 2 years
-- (archive to audit table, then delete)
WITH employees_to_archive AS (
    SELECT id, first_name, last_name, email, department_id, salary, status, hire_date
    FROM employees
    WHERE status = 'TERMINATED'
      AND updated_at < NOW() - INTERVAL '2 years'
),
archived AS (
    INSERT INTO archived_employees
    SELECT * FROM employees_to_archive
    RETURNING id
)
DELETE FROM employees WHERE id IN (SELECT id FROM archived);

-- Update salaries for top performers in batch
WITH performance_scores AS (
    SELECT
        e.id,
        e.salary,
        pr.score,
        CASE
            WHEN pr.score >= 4.5 THEN 0.10  -- 10% raise
            WHEN pr.score >= 4.0 THEN 0.07  -- 7% raise
            WHEN pr.score >= 3.5 THEN 0.05  -- 5% raise
            ELSE 0.03                        -- 3% raise
        END AS raise_pct
    FROM employees e
    JOIN performance_reviews pr ON pr.employee_id = e.id
    WHERE pr.review_year = EXTRACT(YEAR FROM CURRENT_DATE) - 1
      AND e.status = 'ACTIVE'
)
UPDATE employees e
SET
    salary = ROUND(e.salary * (1 + ps.raise_pct), 2),
    updated_at = NOW()
FROM performance_scores ps
WHERE e.id = ps.id;
