package com.example.payroll.dto;

import com.example.payroll.model.SalaryComponent.ComponentType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryComponentResponse {

    private Long id;
    private Long payrollId;
    private String componentName;
    private ComponentType componentType;
    private BigDecimal amount;
    private Boolean isTaxable;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
