package com.example.payroll.dto;

import com.example.payroll.model.Payroll.PaymentMethod;
import com.example.payroll.model.Payroll.PayrollStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollResponse {

    private Long id;
    private Long employeeId;
    private BigDecimal basicSalary;
    private BigDecimal allowances;
    private BigDecimal bonuses;
    private BigDecimal deductions;
    private BigDecimal tax;
    private BigDecimal netSalary;
    private LocalDate payPeriodStart;
    private LocalDate payPeriodEnd;
    private LocalDate paymentDate;
    private PayrollStatus status;
    private PaymentMethod paymentMethod;
    private String currency;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
