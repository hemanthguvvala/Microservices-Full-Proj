package com.example.employee.client;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PayrollResponse {
    private Long id;
    private Long employeeId;
    private BigDecimal salary;
    private String status;
    private LocalDate effectiveDate;
}
