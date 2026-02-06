package com.example.payroll.client;

import com.example.payroll.dto.EmployeeDTO;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "employee-service", path = "/api/employees")
public interface EmployeeClient {

    @GetMapping("/{id}")
    @CircuitBreaker(name = "employeeService", fallbackMethod = "getEmployeeFallback")
    @Retry(name = "employeeService")
    EmployeeDTO getEmployeeById(@PathVariable("id") Long id);

    default EmployeeDTO getEmployeeFallback(Long id, Exception ex) {
        return EmployeeDTO.builder()
                .id(id)
                .firstName("Unknown")
                .lastName("Employee")
                .email("unknown@company.com")
                .department("N/A")
                .position("N/A")
                .status("UNAVAILABLE")
                .build();
    }
}
