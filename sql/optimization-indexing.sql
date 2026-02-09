-- ═══════════════════════════════════════════════════════════════════════════════
-- QUERY OPTIMIZATION & INDEXING STRATEGIES
-- ═══════════════════════════════════════════════════════════════════════════════
-- Interview insight: Knowing HOW to optimize is more important than writing queries
-- Key tools: EXPLAIN ANALYZE, pg_stat_statements, pg_stat_user_tables


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 1. EXPLAIN ANALYZE — Understanding Query Plans                             │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- Always use EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) to understand query performance
-- Key things to look for:
--   Seq Scan      = table scan (BAD for large tables)
--   Index Scan    = using index (GOOD)
--   Hash Join     = joining using hash table
--   Nested Loop   = O(n*m) — bad for large tables
--   Sort          = in-memory or disk sort
--   Actual Time   = real execution time in ms

-- Example: Before optimization (Seq Scan)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM employees WHERE email = 'john@example.com';
-- Output might show: Seq Scan on employees (cost=0.00..25.00 rows=1 width=200)
--                    Filter: (email = 'john@example.com'::text)
--                    Rows Removed by Filter: 999

-- After adding index:
CREATE INDEX CONCURRENTLY idx_employees_email ON employees (email);
-- Now EXPLAIN shows: Index Scan using idx_employees_email on employees


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 2. INDEX STRATEGIES                                                        │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 2a. B-Tree Index (default, most common)
-- Best for: equality checks (=), range queries (<, >, BETWEEN), ORDER BY
CREATE INDEX idx_employees_department ON employees (department_id);
CREATE INDEX idx_employees_hire_date ON employees (hire_date);
CREATE INDEX idx_payroll_employee_period ON payroll (employee_id, pay_period DESC);

-- 2b. Composite Index (multi-column)
-- Rule: put high-cardinality columns FIRST, and columns used in WHERE before ORDER BY
CREATE INDEX idx_employees_dept_salary
    ON employees (department_id, salary DESC);
-- Covers: WHERE department_id = X ORDER BY salary DESC

-- 2c. Partial Index (index only subset of rows)
-- Saves space and speeds up queries that always filter by a condition
CREATE INDEX idx_active_employees
    ON employees (department_id, salary)
    WHERE status = 'ACTIVE';
-- Only indexes active employees — much smaller, much faster

-- 2d. Covering Index (INCLUDE columns)
-- Avoids table lookup by including needed columns in the index itself
CREATE INDEX idx_employees_covering
    ON employees (department_id)
    INCLUDE (first_name, last_name, salary);
-- Index-only scan: no need to read the table at all

-- 2e. GIN Index (for full-text search, JSONB, arrays)
CREATE INDEX idx_employees_search
    ON employees USING GIN (to_tsvector('english', first_name || ' ' || last_name));
-- Query: WHERE to_tsvector('english', first_name || ' ' || last_name) @@ to_tsquery('John')

-- 2f. Expression Index (index on computed value)
CREATE INDEX idx_employees_email_lower
    ON employees (LOWER(email));
-- Speeds up: WHERE LOWER(email) = 'john@example.com'

-- 2g. CONCURRENTLY — Create index without locking the table
-- Critical for production: normal CREATE INDEX locks writes
CREATE INDEX CONCURRENTLY idx_employees_status ON employees (status);


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 3. OPTIMIZATION PATTERNS                                                   │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 3a. ANTI-PATTERN: SELECT * (fetches all columns, wastes I/O)
-- BAD:
SELECT * FROM employees WHERE department_id = 1;
-- GOOD: Select only needed columns
SELECT id, first_name, last_name, salary FROM employees WHERE department_id = 1;

-- 3b. ANTI-PATTERN: Function on indexed column (breaks index usage)
-- BAD: (Seq Scan — function prevents index use)
SELECT * FROM employees WHERE EXTRACT(YEAR FROM hire_date) = 2024;
-- GOOD: (Index Scan — range query uses index)
SELECT * FROM employees WHERE hire_date >= '2024-01-01' AND hire_date < '2025-01-01';

-- 3c. ANTI-PATTERN: OR conditions (often prevent index usage)
-- BAD: (May result in Seq Scan)
SELECT * FROM employees WHERE department_id = 1 OR department_id = 5;
-- GOOD: (Uses Index Scan)
SELECT * FROM employees WHERE department_id IN (1, 5);

-- 3d. ANTI-PATTERN: NOT IN with NULLs (unexpected results)
-- BAD: If subquery returns NULL, entire NOT IN returns empty
SELECT * FROM employees WHERE department_id NOT IN (SELECT id FROM departments);
-- GOOD: NOT EXISTS handles NULLs correctly
SELECT * FROM employees e
WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.id = e.department_id);

-- 3e. Pagination — Keyset vs OFFSET
-- BAD: OFFSET N scans and discards N rows (slow for large N)
SELECT * FROM employees ORDER BY id LIMIT 20 OFFSET 10000;
-- GOOD: Keyset pagination (uses index, constant time)
SELECT * FROM employees WHERE id > 10000 ORDER BY id LIMIT 20;

-- 3f. Batch INSERT vs individual INSERTs
-- BAD: 1000 separate network round-trips
-- INSERT INTO employees (name) VALUES ('Alice');
-- INSERT INTO employees (name) VALUES ('Bob');
-- ...

-- GOOD: Single batch
INSERT INTO employees (first_name, last_name, email, department_id, salary)
VALUES
    ('Alice', 'Smith', 'alice@example.com', 1, 75000),
    ('Bob', 'Jones', 'bob@example.com', 2, 82000),
    ('Carol', 'Williams', 'carol@example.com', 1, 68000);

-- BEST: COPY for bulk loads (fastest)
-- COPY employees FROM '/path/to/file.csv' WITH (FORMAT csv, HEADER true);


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 4. MONITORING QUERIES                                                      │
-- │    PostgreSQL system views for performance analysis                         │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 4a. Find slow queries (requires pg_stat_statements extension)
SELECT
    query,
    calls,
    ROUND(total_exec_time::NUMERIC, 2) AS total_time_ms,
    ROUND(mean_exec_time::NUMERIC, 2) AS avg_time_ms,
    rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 4b. Find tables that need vacuuming or have bloat
SELECT
    schemaname,
    relname AS table_name,
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows,
    ROUND(n_dead_tup::NUMERIC / NULLIF(n_live_tup, 0) * 100, 2) AS dead_pct,
    last_vacuum,
    last_autovacuum,
    last_analyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- 4c. Find unused indexes (wasting disk space and slowing writes)
SELECT
    schemaname,
    relname AS table_name,
    indexrelname AS index_name,
    idx_scan AS times_used,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 4d. Table sizes
SELECT
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size,
    pg_size_pretty(pg_indexes_size(relid)) AS index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- 4e. Active connections and queries
SELECT
    pid,
    usename,
    client_addr,
    state,
    query,
    now() - query_start AS query_duration,
    wait_event_type
FROM pg_stat_activity
WHERE state != 'idle'
  AND pid != pg_backend_pid()
ORDER BY query_start;

-- Kill a long-running query:
-- SELECT pg_cancel_backend(<pid>);      -- Graceful
-- SELECT pg_terminate_backend(<pid>);   -- Force kill
