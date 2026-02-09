package com.example.employee.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Fallback implementation for Payroll Service when circuit breaker opens
 */
@Slf4j
@Component
public class PayrollServiceFallback implements PayrollServiceClient {
    
    @Override
    public PayrollResponse createPayroll(PayrollCreateRequest request) {
        log.error("Payroll service is unavailable. Falling back for employee: {}", request.getEmployeeId());
        throw new RuntimeException("Payroll service is currently unavailable");
    }
    
    @Override
    public void deletePayrollByEmployeeId(Long employeeId) {
        log.error("Payroll service is unavailable. Cannot delete payroll for employee: {}", employeeId);
        throw new RuntimeException("Payroll service is currently unavailable");
    }
    
    @Override
    public PayrollResponse getPayrollByEmployeeId(Long employeeId) {
        log.error("Payroll service is unavailable. Cannot fetch payroll for employee: {}", employeeId);
        throw new RuntimeException("Payroll service is currently unavailable");
    }
}
