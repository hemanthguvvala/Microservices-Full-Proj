-- ═══════════════════════════════════════════════════════════════════════════════
-- V1: Initial Schema — Employee Management System (PostgreSQL)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Interview: "Why PostgreSQL instead of H2 for Flyway migrations?"
-- → Migrations run against the PRODUCTION database engine. Using H2 syntax
--   (AUTO_INCREMENT) would fail on PostgreSQL (BIGSERIAL/GENERATED ALWAYS).
--   Dev parity: Testcontainers spins up real PostgreSQL for tests.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id              BIGSERIAL PRIMARY KEY,
    first_name      VARCHAR(50) NOT NULL,
    last_name       VARCHAR(50) NOT NULL,
    email           VARCHAR(100) NOT NULL UNIQUE,
    department      VARCHAR(100),
    position        VARCHAR(100),
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    salary          NUMERIC(12, 2),
    hire_date       DATE,
    phone_number    VARCHAR(20),
    tenant_id       VARCHAR(50),
    deleted         BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMP,
    created_date    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by      VARCHAR(255),
    last_modified_by VARCHAR(255),
    version         BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_employee_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employee_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employee_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employee_tenant ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_deleted ON employees(deleted);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE,
    description     VARCHAR(255),
    created_date    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(50) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,
    email           VARCHAR(100) NOT NULL UNIQUE,
    enabled         BOOLEAN DEFAULT TRUE,
    created_date    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by      VARCHAR(255),
    last_modified_by VARCHAR(255)
);

-- User-Role mapping (Many-to-Many)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Seed default roles
INSERT INTO roles (name, description) VALUES
    ('ROLE_USER', 'Standard user role'),
    ('ROLE_ADMIN', 'Administrator role with full access'),
    ('ROLE_MANAGER', 'Manager role with elevated privileges')
ON CONFLICT (name) DO NOTHING;

-- Seed admin user (password: admin123, BCrypt-hashed)
INSERT INTO users (username, password, email, created_by) VALUES
    ('admin', '$2a$10$slYQmyNdGzTn7ZLBXBChFOC9f6kFjAqPhccnP6DxlWXx2lPk1C3G6', 'admin@example.com', 'system')
ON CONFLICT (username) DO NOTHING;

-- Assign ADMIN role to admin user (idempotent)
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'ROLE_ADMIN'
ON CONFLICT DO NOTHING;
