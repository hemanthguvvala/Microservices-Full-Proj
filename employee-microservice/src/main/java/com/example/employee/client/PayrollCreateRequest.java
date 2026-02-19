package com.example.employee.client;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PayrollCreateRequest {
    private Long employeeId;
    private String employeeName;
    private BigDecimal salary;
    private String department;
    private LocalDate effectiveDate;
}
