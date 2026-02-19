package com.example.employee.saga.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO containing employee onboarding saga data
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeOnboardingData {
    private Long employeeId;
    private String firstName;
    private String lastName;
    private String email;
    private String department;
    private String position;
    private BigDecimal salary;
    private LocalDate hireDate;
    private String phoneNumber;
    
    // Saga state tracking
    private Long payrollId;
    private String userId;
    private boolean emailSent;
    private boolean accessGranted;
}
