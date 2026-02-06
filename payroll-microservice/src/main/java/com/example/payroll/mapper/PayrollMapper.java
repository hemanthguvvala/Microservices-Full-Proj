package com.example.payroll.mapper;

import com.example.payroll.dto.PayrollRequest;
import com.example.payroll.dto.PayrollResponse;
import com.example.payroll.dto.PayrollUpdateRequest;
import com.example.payroll.model.Payroll;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class PayrollMapper {

    public Payroll toEntity(PayrollRequest request) {
        return Payroll.builder()
                .employeeId(request.getEmployeeId())
                .basicSalary(request.getBasicSalary())
                .allowances(request.getAllowances() != null ? request.getAllowances() : BigDecimal.ZERO)
                .bonuses(request.getBonuses() != null ? request.getBonuses() : BigDecimal.ZERO)
                .deductions(request.getDeductions() != null ? request.getDeductions() : BigDecimal.ZERO)
                .tax(request.getTax() != null ? request.getTax() : BigDecimal.ZERO)
                .payPeriodStart(request.getPayPeriodStart())
                .payPeriodEnd(request.getPayPeriodEnd())
                .paymentDate(request.getPaymentDate())
                .paymentMethod(request.getPaymentMethod())
                .currency(request.getCurrency() != null ? request.getCurrency() : "USD")
                .notes(request.getNotes())
                .build();
    }

    public PayrollResponse toResponse(Payroll payroll) {
        return PayrollResponse.builder()
                .id(payroll.getId())
                .employeeId(payroll.getEmployeeId())
                .basicSalary(payroll.getBasicSalary())
                .allowances(payroll.getAllowances())
                .bonuses(payroll.getBonuses())
                .deductions(payroll.getDeductions())
                .tax(payroll.getTax())
                .netSalary(payroll.getNetSalary())
                .payPeriodStart(payroll.getPayPeriodStart())
                .payPeriodEnd(payroll.getPayPeriodEnd())
                .paymentDate(payroll.getPaymentDate())
                .status(payroll.getStatus())
                .paymentMethod(payroll.getPaymentMethod())
                .currency(payroll.getCurrency())
                .notes(payroll.getNotes())
                .createdAt(payroll.getCreatedAt())
                .updatedAt(payroll.getUpdatedAt())
                .build();
    }

    public void updateEntityFromRequest(Payroll payroll, PayrollUpdateRequest request) {
        if (request.getAllowances() != null) {
            payroll.setAllowances(request.getAllowances());
        }
        if (request.getBonuses() != null) {
            payroll.setBonuses(request.getBonuses());
        }
        if (request.getDeductions() != null) {
            payroll.setDeductions(request.getDeductions());
        }
        if (request.getTax() != null) {
            payroll.setTax(request.getTax());
        }
        if (request.getPaymentDate() != null) {
            payroll.setPaymentDate(request.getPaymentDate());
        }
        if (request.getStatus() != null) {
            payroll.setStatus(request.getStatus());
        }
        if (request.getNotes() != null) {
            payroll.setNotes(request.getNotes());
        }
    }
}
