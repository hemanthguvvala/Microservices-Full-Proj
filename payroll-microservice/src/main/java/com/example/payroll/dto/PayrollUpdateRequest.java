package com.example.payroll.dto;

import com.example.payroll.model.Payroll.PayrollStatus;
import jakarta.validation.constraints.DecimalMin;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollUpdateRequest {

    @DecimalMin(value = "0.0", message = "Allowances cannot be negative")
    private BigDecimal allowances;

    @DecimalMin(value = "0.0", message = "Bonuses cannot be negative")
    private BigDecimal bonuses;

    @DecimalMin(value = "0.0", message = "Deductions cannot be negative")
    private BigDecimal deductions;

    @DecimalMin(value = "0.0", message = "Tax cannot be negative")
    private BigDecimal tax;

    private LocalDate paymentDate;

    private PayrollStatus status;

    private String notes;
}
