package com.example.payroll.dto;

import com.example.payroll.model.SalaryComponent.ComponentType;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryComponentRequest {

    @NotNull(message = "Payroll ID is required")
    private Long payrollId;

    @NotBlank(message = "Component name is required")
    private String componentName;

    @NotNull(message = "Component type is required")
    private ComponentType componentType;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.0", message = "Amount cannot be negative")
    private BigDecimal amount;

    private Boolean isTaxable;

    private String description;
}
