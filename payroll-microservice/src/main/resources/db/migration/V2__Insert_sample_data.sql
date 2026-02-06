-- V2__Insert_sample_data.sql

-- Insert sample payroll data
INSERT INTO payrolls (employee_id, basic_salary, allowances, bonuses, deductions, tax, net_salary, 
                      pay_period_start, pay_period_end, payment_date, status, payment_method, currency)
VALUES 
    (1, 5000.00, 500.00, 1000.00, 200.00, 900.00, 5400.00, '2024-01-01', '2024-01-31', '2024-02-05', 'PAID', 'BANK_TRANSFER', 'USD'),
    (2, 6000.00, 600.00, 0.00, 300.00, 1000.00, 5300.00, '2024-01-01', '2024-01-31', '2024-02-05', 'PAID', 'BANK_TRANSFER', 'USD'),
    (1, 5000.00, 500.00, 500.00, 200.00, 850.00, 4950.00, '2024-02-01', '2024-02-29', NULL, 'APPROVED', 'BANK_TRANSFER', 'USD'),
    (2, 6000.00, 600.00, 0.00, 300.00, 1000.00, 5300.00, '2024-02-01', '2024-02-29', NULL, 'PENDING', 'BANK_TRANSFER', 'USD');

-- Insert sample salary components
INSERT INTO salary_components (payroll_id, component_name, component_type, amount, is_taxable, description)
VALUES 
    (1, 'Housing Allowance', 'ALLOWANCE', 300.00, FALSE, 'Monthly housing allowance'),
    (1, 'Transport Allowance', 'ALLOWANCE', 200.00, FALSE, 'Monthly transport allowance'),
    (1, 'Performance Bonus', 'BONUS', 1000.00, TRUE, 'Quarterly performance bonus'),
    (2, 'Housing Allowance', 'ALLOWANCE', 400.00, FALSE, 'Monthly housing allowance'),
    (2, 'Transport Allowance', 'ALLOWANCE', 200.00, FALSE, 'Monthly transport allowance');
