package com.example.employee.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

/**
 * Feign client for Payroll Service
 */
@FeignClient(name = "payroll-service", fallback = PayrollServiceFallback.class)
public interface PayrollServiceClient {
    
    @PostMapping("/api/payroll")
    PayrollResponse createPayroll(@RequestBody PayrollCreateRequest request);
    
    @DeleteMapping("/api/payroll/employee/{employeeId}")
    void deletePayrollByEmployeeId(@PathVariable("employeeId") Long employeeId);
    
    @GetMapping("/api/payroll/employee/{employeeId}")
    PayrollResponse getPayrollByEmployeeId(@PathVariable("employeeId") Long employeeId);
}
