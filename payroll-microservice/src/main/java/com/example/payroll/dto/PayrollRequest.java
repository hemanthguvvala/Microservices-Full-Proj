package com.example.payroll.dto;

import com.example.payroll.model.Payroll.PaymentMethod;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollRequest {

    @NotNull(message = "Employee ID is required")
    private Long employeeId;

    @NotNull(message = "Basic salary is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Basic salary must be positive")
    private BigDecimal basicSalary;

    @DecimalMin(value = "0.0", message = "Allowances cannot be negative")
    private BigDecimal allowances;

    @DecimalMin(value = "0.0", message = "Bonuses cannot be negative")
    private BigDecimal bonuses;

    @DecimalMin(value = "0.0", message = "Deductions cannot be negative")
    private BigDecimal deductions;

    @DecimalMin(value = "0.0", message = "Tax cannot be negative")
    private BigDecimal tax;

    @NotNull(message = "Pay period start date is required")
    private LocalDate payPeriodStart;

    @NotNull(message = "Pay period end date is required")
    private LocalDate payPeriodEnd;

    private LocalDate paymentDate;

    private PaymentMethod paymentMethod;

    private String currency;

    private String notes;
}
