-- V1__Create_payroll_tables.sql

-- Create payrolls table
CREATE TABLE IF NOT EXISTS payrolls (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    basic_salary DECIMAL(10, 2) NOT NULL CHECK (basic_salary > 0),
    allowances DECIMAL(10, 2) DEFAULT 0 CHECK (allowances >= 0),
    bonuses DECIMAL(10, 2) DEFAULT 0 CHECK (bonuses >= 0),
    deductions DECIMAL(10, 2) DEFAULT 0 CHECK (deductions >= 0),
    tax DECIMAL(10, 2) DEFAULT 0 CHECK (tax >= 0),
    net_salary DECIMAL(10, 2),
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    payment_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    payment_method VARCHAR(20) DEFAULT 'BANK_TRANSFER',
    currency VARCHAR(3) DEFAULT 'USD',
    notes VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0,
    CONSTRAINT unique_employee_period UNIQUE (employee_id, pay_period_start)
);

-- Create indexes for payrolls
CREATE INDEX idx_employee_id ON payrolls(employee_id);
CREATE INDEX idx_pay_period_start ON payrolls(pay_period_start);
CREATE INDEX idx_status ON payrolls(status);

-- Create salary_components table
CREATE TABLE IF NOT EXISTS salary_components (
    id BIGSERIAL PRIMARY KEY,
    payroll_id BIGINT NOT NULL,
    component_name VARCHAR(100) NOT NULL,
    component_type VARCHAR(20) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    is_taxable BOOLEAN DEFAULT FALSE,
    description VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_payroll FOREIGN KEY (payroll_id) REFERENCES payrolls(id) ON DELETE CASCADE
);

-- Create indexes for salary_components
CREATE INDEX idx_payroll_id ON salary_components(payroll_id);
CREATE INDEX idx_component_type ON salary_components(component_type);

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    payroll_id BIGINT NOT NULL,
    transaction_reference VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'INITIATED',
    payment_gateway VARCHAR(50),
    processed_at TIMESTAMP,
    error_message VARCHAR(500),
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_transaction_payroll FOREIGN KEY (payroll_id) REFERENCES payrolls(id) ON DELETE CASCADE
);

-- Create indexes for payment_transactions
CREATE INDEX idx_transaction_payroll_id ON payment_transactions(payroll_id);
CREATE INDEX idx_transaction_ref ON payment_transactions(transaction_reference);
CREATE INDEX idx_transaction_status ON payment_transactions(status);

-- Add comments
COMMENT ON TABLE payrolls IS 'Stores payroll information for employees';
COMMENT ON TABLE salary_components IS 'Stores individual salary components for each payroll';
COMMENT ON TABLE payment_transactions IS 'Stores payment transaction history for payrolls';
