package com.example.payroll.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "payrolls", indexes = {
        @Index(name = "idx_employee_id", columnList = "employee_id"),
        @Index(name = "idx_pay_period_start", columnList = "pay_period_start"),
        @Index(name = "idx_status", columnList = "status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
@SQLDelete(sql = "UPDATE payrolls SET deleted = true, deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted = false")
public class Payroll implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Employee ID is required")
    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @NotNull(message = "Basic salary is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Basic salary must be positive")
    @Column(name = "basic_salary", nullable = false, precision = 10, scale = 2)
    private BigDecimal basicSalary;

    @DecimalMin(value = "0.0", message = "Allowances cannot be negative")
    @Column(name = "allowances", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal allowances = BigDecimal.ZERO;

    @DecimalMin(value = "0.0", message = "Bonuses cannot be negative")
    @Column(name = "bonuses", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal bonuses = BigDecimal.ZERO;

    @DecimalMin(value = "0.0", message = "Deductions cannot be negative")
    @Column(name = "deductions", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal deductions = BigDecimal.ZERO;

    @DecimalMin(value = "0.0", message = "Tax cannot be negative")
    @Column(name = "tax", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal tax = BigDecimal.ZERO;

    @Column(name = "net_salary", precision = 10, scale = 2)
    private BigDecimal netSalary;

    @NotNull(message = "Pay period start date is required")
    @Column(name = "pay_period_start", nullable = false)
    private LocalDate payPeriodStart;

    @NotNull(message = "Pay period end date is required")
    @Column(name = "pay_period_end", nullable = false)
    private LocalDate payPeriodEnd;

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private PayrollStatus status = PayrollStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 20)
    @Builder.Default
    private PaymentMethod paymentMethod = PaymentMethod.BANK_TRANSFER;

    @Column(name = "currency", length = 3)
    @Builder.Default
    private String currency = "USD";

    @Column(name = "notes", length = 500)
    private String notes;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Soft delete fields
    @Column(nullable = false)
    @Builder.Default
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Version
    @Column(name = "version")
    private Long version;

    @PrePersist
    @PreUpdate
    public void calculateNetSalary() {
        this.netSalary = basicSalary
                .add(allowances)
                .add(bonuses)
                .subtract(deductions)
                .subtract(tax);
    }

    public enum PayrollStatus {
        PENDING,
        APPROVED,
        PROCESSING,
        PAID,
        FAILED,
        CANCELLED
    }

    public enum PaymentMethod {
        BANK_TRANSFER,
        CHECK,
        CASH,
        DIGITAL_WALLET
    }
}
