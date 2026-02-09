-- ═══════════════════════════════════════════════════════════════════════════════
-- ADVANCED SQL QUERIES — Interview Reference
-- ═══════════════════════════════════════════════════════════════════════════════
-- Demonstrates: Window Functions, CTEs, Complex JOINs, Subqueries,
-- Aggregations, Performance Optimization
--
-- Context: Employee Platform database (PostgreSQL 15)
-- ═══════════════════════════════════════════════════════════════════════════════


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 1. WINDOW FUNCTIONS                                                        │
-- │    ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD, NTILE, FIRST_VALUE            │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 1a. Rank employees by salary within each department
-- Interview classic: "Find the top 3 highest paid employees per department"
SELECT
    e.id,
    e.first_name,
    e.last_name,
    d.name AS department,
    e.salary,
    ROW_NUMBER() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) AS row_num,
    RANK()       OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) AS rank,
    DENSE_RANK() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) AS dense_rank
FROM employees e
JOIN departments d ON e.department_id = d.id
ORDER BY d.name, rank;

-- ROW_NUMBER: always unique (1,2,3,4...)
-- RANK: gaps after ties (1,2,2,4...)
-- DENSE_RANK: no gaps (1,2,2,3...)


-- 1b. Top 3 highest paid per department using CTE + Window Function
WITH ranked_employees AS (
    SELECT
        e.*,
        d.name AS department_name,
        DENSE_RANK() OVER (
            PARTITION BY e.department_id
            ORDER BY e.salary DESC
        ) AS salary_rank
    FROM employees e
    JOIN departments d ON e.department_id = d.id
)
SELECT id, first_name, last_name, department_name, salary, salary_rank
FROM ranked_employees
WHERE salary_rank <= 3
ORDER BY department_name, salary_rank;


-- 1c. LAG / LEAD — Compare with previous/next row
-- "Show each employee's salary vs the previous hire's salary"
SELECT
    e.first_name,
    e.last_name,
    e.hire_date,
    e.salary,
    LAG(e.salary, 1)  OVER (ORDER BY e.hire_date) AS prev_hire_salary,
    LEAD(e.salary, 1) OVER (ORDER BY e.hire_date) AS next_hire_salary,
    e.salary - LAG(e.salary, 1) OVER (ORDER BY e.hire_date) AS salary_diff_from_prev
FROM employees e
ORDER BY e.hire_date;


-- 1d. Running total of salaries (cumulative sum)
SELECT
    e.first_name,
    e.last_name,
    e.salary,
    SUM(e.salary) OVER (ORDER BY e.hire_date) AS running_total,
    AVG(e.salary) OVER (
        ORDER BY e.hire_date
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS moving_avg_3    -- 3-period moving average
FROM employees e
ORDER BY e.hire_date;


-- 1e. NTILE — Divide employees into salary quartiles
SELECT
    e.first_name,
    e.last_name,
    e.salary,
    NTILE(4) OVER (ORDER BY e.salary) AS salary_quartile,
    CASE NTILE(4) OVER (ORDER BY e.salary)
        WHEN 1 THEN 'Bottom 25%'
        WHEN 2 THEN '25-50%'
        WHEN 3 THEN '50-75%'
        WHEN 4 THEN 'Top 25%'
    END AS quartile_label
FROM employees e;


-- 1f. FIRST_VALUE / LAST_VALUE — Highest/lowest salary per department
SELECT DISTINCT
    d.name AS department,
    FIRST_VALUE(e.first_name || ' ' || e.last_name)
        OVER (PARTITION BY e.department_id ORDER BY e.salary DESC
              ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
        AS highest_paid_employee,
    FIRST_VALUE(e.salary)
        OVER (PARTITION BY e.department_id ORDER BY e.salary DESC
              ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
        AS max_salary,
    LAST_VALUE(e.first_name || ' ' || e.last_name)
        OVER (PARTITION BY e.department_id ORDER BY e.salary DESC
              ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
        AS lowest_paid_employee
FROM employees e
JOIN departments d ON e.department_id = d.id;


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 2. COMMON TABLE EXPRESSIONS (CTEs)                                         │
-- │    Regular CTEs, Recursive CTEs, Multiple CTEs                             │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 2a. Regular CTE — Department salary statistics
WITH dept_stats AS (
    SELECT
        department_id,
        COUNT(*) AS employee_count,
        AVG(salary) AS avg_salary,
        MIN(salary) AS min_salary,
        MAX(salary) AS max_salary,
        STDDEV(salary) AS salary_stddev
    FROM employees
    GROUP BY department_id
),
company_avg AS (
    SELECT AVG(salary) AS company_avg_salary FROM employees
)
SELECT
    d.name AS department,
    ds.employee_count,
    ROUND(ds.avg_salary, 2) AS avg_salary,
    ROUND(ca.company_avg_salary, 2) AS company_avg,
    ROUND(ds.avg_salary - ca.company_avg_salary, 2) AS diff_from_company_avg,
    ROUND(ds.salary_stddev, 2) AS salary_spread,
    ds.min_salary,
    ds.max_salary
FROM dept_stats ds
JOIN departments d ON ds.department_id = d.id
CROSS JOIN company_avg ca
ORDER BY ds.avg_salary DESC;


-- 2b. Recursive CTE — Employee hierarchy (manager → reports)
-- Interview classic: "List all employees under a manager, recursively"
WITH RECURSIVE employee_hierarchy AS (
    -- Base case: top-level managers (no manager)
    SELECT
        id,
        first_name,
        last_name,
        manager_id,
        1 AS level,
        CAST(first_name || ' ' || last_name AS TEXT) AS hierarchy_path
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Recursive case: employees who report to someone in the hierarchy
    SELECT
        e.id,
        e.first_name,
        e.last_name,
        e.manager_id,
        eh.level + 1,
        eh.hierarchy_path || ' → ' || e.first_name || ' ' || e.last_name
    FROM employees e
    INNER JOIN employee_hierarchy eh ON e.manager_id = eh.id
)
SELECT
    id,
    REPEAT('  ', level - 1) || first_name || ' ' || last_name AS employee,
    level,
    hierarchy_path
FROM employee_hierarchy
ORDER BY hierarchy_path;


-- 2c. Recursive CTE — Generate a date series (useful for reports)
WITH RECURSIVE date_series AS (
    SELECT DATE '2024-01-01' AS report_date
    UNION ALL
    SELECT report_date + INTERVAL '1 month'
    FROM date_series
    WHERE report_date < DATE '2024-12-01'
)
SELECT
    ds.report_date,
    COUNT(e.id) AS new_hires
FROM date_series ds
LEFT JOIN employees e ON DATE_TRUNC('month', e.hire_date) = ds.report_date
GROUP BY ds.report_date
ORDER BY ds.report_date;


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 3. COMPLEX JOINS                                                           │
-- │    Multi-table JOINs, Self-JOINs, LATERAL, CROSS APPLY                    │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 3a. Multi-table JOIN with aggregation
-- "For each department, show the manager, employee count, total payroll, and avg salary"
SELECT
    d.name AS department,
    m.first_name || ' ' || m.last_name AS manager_name,
    COUNT(e.id) AS team_size,
    SUM(p.base_salary + COALESCE(p.bonus, 0)) AS total_payroll,
    ROUND(AVG(p.base_salary), 2) AS avg_base_salary,
    SUM(CASE WHEN e.status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_count,
    SUM(CASE WHEN e.status = 'ON_LEAVE' THEN 1 ELSE 0 END) AS on_leave_count
FROM departments d
LEFT JOIN employees m ON d.manager_id = m.id
LEFT JOIN employees e ON e.department_id = d.id
LEFT JOIN payroll p ON p.employee_id = e.id AND p.pay_period = (
    SELECT MAX(pay_period) FROM payroll WHERE employee_id = e.id
)
GROUP BY d.id, d.name, m.first_name, m.last_name
ORDER BY total_payroll DESC;


-- 3b. Self JOIN — Find employees who earn more than their manager
SELECT
    e.first_name || ' ' || e.last_name AS employee,
    e.salary AS employee_salary,
    m.first_name || ' ' || m.last_name AS manager,
    m.salary AS manager_salary,
    e.salary - m.salary AS overpayment
FROM employees e
INNER JOIN employees m ON e.manager_id = m.id
WHERE e.salary > m.salary
ORDER BY overpayment DESC;


-- 3c. LATERAL JOIN — Top 3 recent payroll records per employee
-- Interview insight: LATERAL = correlated subquery in FROM clause (PostgreSQL)
SELECT
    e.id,
    e.first_name,
    e.last_name,
    recent_pay.pay_period,
    recent_pay.base_salary,
    recent_pay.bonus
FROM employees e
CROSS JOIN LATERAL (
    SELECT pay_period, base_salary, bonus
    FROM payroll p
    WHERE p.employee_id = e.id
    ORDER BY p.pay_period DESC
    LIMIT 3
) recent_pay
ORDER BY e.id, recent_pay.pay_period DESC;


-- 3d. FULL OUTER JOIN — Reconciliation query
-- "Find employees without payroll records AND payroll records without employees"
SELECT
    COALESCE(e.id, p.employee_id) AS id,
    e.first_name,
    e.last_name,
    p.pay_period,
    p.base_salary,
    CASE
        WHEN e.id IS NULL THEN 'ORPHAN_PAYROLL — no employee found'
        WHEN p.employee_id IS NULL THEN 'MISSING_PAYROLL — no payroll record'
        ELSE 'MATCHED'
    END AS reconciliation_status
FROM employees e
FULL OUTER JOIN payroll p ON e.id = p.employee_id
WHERE e.id IS NULL OR p.employee_id IS NULL
ORDER BY reconciliation_status;


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 4. SUBQUERIES                                                              │
-- │    Scalar, Correlated, EXISTS, IN, ANY/ALL                                │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 4a. Correlated subquery — Employees earning above department average
SELECT
    e.first_name,
    e.last_name,
    e.salary,
    d.name AS department,
    (SELECT AVG(e2.salary) FROM employees e2 WHERE e2.department_id = e.department_id) AS dept_avg
FROM employees e
JOIN departments d ON e.department_id = d.id
WHERE e.salary > (
    SELECT AVG(e2.salary)
    FROM employees e2
    WHERE e2.department_id = e.department_id
)
ORDER BY d.name, e.salary DESC;


-- 4b. EXISTS — Departments that have employees on leave
SELECT d.name AS department
FROM departments d
WHERE EXISTS (
    SELECT 1
    FROM employees e
    WHERE e.department_id = d.id
      AND e.status = 'ON_LEAVE'
);
-- Interview insight: EXISTS is more efficient than IN for large datasets
-- because it short-circuits (stops when first match is found)


-- 4c. ALL — Employees who earn more than ALL employees in HR
SELECT first_name, last_name, salary
FROM employees
WHERE salary > ALL (
    SELECT e.salary
    FROM employees e
    JOIN departments d ON e.department_id = d.id
    WHERE d.name = 'Human Resources'
);


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 5. AGGREGATIONS & GROUPING                                                 │
-- │    GROUP BY, HAVING, ROLLUP, CUBE, GROUPING SETS                          │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 5a. ROLLUP — Hierarchical subtotals (department → status → total)
SELECT
    COALESCE(d.name, '*** ALL DEPARTMENTS ***') AS department,
    COALESCE(e.status, '*** ALL STATUSES ***') AS status,
    COUNT(*) AS employee_count,
    SUM(e.salary) AS total_salary,
    ROUND(AVG(e.salary), 2) AS avg_salary
FROM employees e
JOIN departments d ON e.department_id = d.id
GROUP BY ROLLUP(d.name, e.status)
ORDER BY d.name NULLS LAST, e.status NULLS LAST;
-- ROLLUP produces: (dept, status), (dept, NULL), (NULL, NULL)
-- Each NULL level = subtotal for that grouping


-- 5b. CUBE — All possible combinations of subtotals
SELECT
    COALESCE(d.name, '** ALL **') AS department,
    COALESCE(EXTRACT(YEAR FROM e.hire_date)::TEXT, '** ALL **') AS hire_year,
    COUNT(*) AS count,
    SUM(e.salary) AS total_salary
FROM employees e
JOIN departments d ON e.department_id = d.id
GROUP BY CUBE(d.name, EXTRACT(YEAR FROM e.hire_date))
ORDER BY department, hire_year;


-- 5c. GROUPING SETS — Custom grouping combinations
SELECT
    d.name AS department,
    e.status,
    EXTRACT(YEAR FROM e.hire_date) AS hire_year,
    COUNT(*) AS count,
    SUM(e.salary) AS total
FROM employees e
JOIN departments d ON e.department_id = d.id
GROUP BY GROUPING SETS (
    (d.name),                  -- Total by department
    (e.status),                -- Total by status
    (d.name, e.status),        -- Department + status breakdown
    ()                         -- Grand total
)
ORDER BY department NULLS LAST, status NULLS LAST, hire_year NULLS LAST;


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 6. PRACTICAL BUSINESS QUERIES                                              │
-- │    Real-world queries you'd write at a job                                 │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 6a. Year-over-year salary growth per department
WITH yearly_salary AS (
    SELECT
        d.name AS department,
        EXTRACT(YEAR FROM p.pay_period) AS year,
        SUM(p.base_salary) AS total_salary
    FROM payroll p
    JOIN employees e ON p.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    GROUP BY d.name, EXTRACT(YEAR FROM p.pay_period)
)
SELECT
    department,
    year,
    total_salary,
    LAG(total_salary) OVER (PARTITION BY department ORDER BY year) AS prev_year,
    ROUND(
        (total_salary - LAG(total_salary) OVER (PARTITION BY department ORDER BY year))
        / NULLIF(LAG(total_salary) OVER (PARTITION BY department ORDER BY year), 0) * 100,
        2
    ) AS yoy_growth_pct
FROM yearly_salary
ORDER BY department, year;


-- 6b. Employee retention analysis — cohort analysis by hire year
WITH cohorts AS (
    SELECT
        EXTRACT(YEAR FROM hire_date) AS hire_year,
        COUNT(*) AS hired,
        COUNT(*) FILTER (WHERE status = 'ACTIVE') AS still_active,
        COUNT(*) FILTER (WHERE status = 'TERMINATED') AS terminated
    FROM employees
    GROUP BY EXTRACT(YEAR FROM hire_date)
)
SELECT
    hire_year,
    hired,
    still_active,
    terminated,
    ROUND(still_active::NUMERIC / hired * 100, 1) AS retention_rate_pct,
    ROUND(terminated::NUMERIC / hired * 100, 1) AS attrition_rate_pct
FROM cohorts
ORDER BY hire_year;


-- 6c. Payroll budget forecast — using exponential moving average
WITH monthly_payroll AS (
    SELECT
        DATE_TRUNC('month', pay_period) AS month,
        SUM(base_salary + COALESCE(bonus, 0)) AS total_payroll
    FROM payroll
    GROUP BY DATE_TRUNC('month', pay_period)
    ORDER BY month
)
SELECT
    month,
    total_payroll,
    ROUND(AVG(total_payroll) OVER (
        ORDER BY month
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ), 2) AS moving_avg_3m,
    ROUND(AVG(total_payroll) OVER (
        ORDER BY month
        ROWS BETWEEN 11 PRECEDING AND CURRENT ROW
    ), 2) AS moving_avg_12m
FROM monthly_payroll;


-- 6d. Find salary outliers using standard deviation
WITH salary_stats AS (
    SELECT
        department_id,
        AVG(salary) AS avg_salary,
        STDDEV(salary) AS stddev_salary
    FROM employees
    GROUP BY department_id
)
SELECT
    e.first_name,
    e.last_name,
    d.name AS department,
    e.salary,
    ROUND(ss.avg_salary, 2) AS dept_avg,
    ROUND((e.salary - ss.avg_salary) / NULLIF(ss.stddev_salary, 0), 2) AS z_score,
    CASE
        WHEN (e.salary - ss.avg_salary) / NULLIF(ss.stddev_salary, 0) > 2 THEN 'HIGH OUTLIER'
        WHEN (e.salary - ss.avg_salary) / NULLIF(ss.stddev_salary, 0) < -2 THEN 'LOW OUTLIER'
        ELSE 'NORMAL'
    END AS outlier_status
FROM employees e
JOIN departments d ON e.department_id = d.id
JOIN salary_stats ss ON e.department_id = ss.department_id
ORDER BY ABS((e.salary - ss.avg_salary) / NULLIF(ss.stddev_salary, 0)) DESC;


-- 6e. Pivot table — Employee count by department and status
SELECT
    d.name AS department,
    COUNT(*) FILTER (WHERE e.status = 'ACTIVE') AS active,
    COUNT(*) FILTER (WHERE e.status = 'ON_LEAVE') AS on_leave,
    COUNT(*) FILTER (WHERE e.status = 'TERMINATED') AS terminated,
    COUNT(*) FILTER (WHERE e.status = 'PROBATION') AS probation,
    COUNT(*) AS total
FROM employees e
JOIN departments d ON e.department_id = d.id
GROUP BY d.name
ORDER BY total DESC;
