package com.example.payroll.mapper;

import com.example.payroll.dto.SalaryComponentRequest;
import com.example.payroll.dto.SalaryComponentResponse;
import com.example.payroll.model.SalaryComponent;
import org.springframework.stereotype.Component;

@Component
public class SalaryComponentMapper {

    public SalaryComponent toEntity(SalaryComponentRequest request) {
        return SalaryComponent.builder()
                .payrollId(request.getPayrollId())
                .componentName(request.getComponentName())
                .componentType(request.getComponentType())
                .amount(request.getAmount())
                .isTaxable(request.getIsTaxable() != null ? request.getIsTaxable() : false)
                .description(request.getDescription())
                .build();
    }

    public SalaryComponentResponse toResponse(SalaryComponent component) {
        return SalaryComponentResponse.builder()
                .id(component.getId())
                .payrollId(component.getPayrollId())
                .componentName(component.getComponentName())
                .componentType(component.getComponentType())
                .amount(component.getAmount())
                .isTaxable(component.getIsTaxable())
                .description(component.getDescription())
                .createdAt(component.getCreatedAt())
                .updatedAt(component.getUpdatedAt())
                .build();
    }
}
