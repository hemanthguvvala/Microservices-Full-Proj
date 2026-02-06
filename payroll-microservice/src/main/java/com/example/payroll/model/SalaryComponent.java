package com.example.payroll.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "salary_components", indexes = {
    @Index(name = "idx_payroll_id", columnList = "payroll_id"),
    @Index(name = "idx_component_type", columnList = "component_type")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class SalaryComponent implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Payroll ID is required")
    @Column(name = "payroll_id", nullable = false)
    private Long payrollId;

    @NotBlank(message = "Component name is required")
    @Column(name = "component_name", nullable = false, length = 100)
    private String componentName;

    @Enumerated(EnumType.STRING)
    @Column(name = "component_type", nullable = false, length = 20)
    private ComponentType componentType;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.0", message = "Amount cannot be negative")
    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "is_taxable")
    @Builder.Default
    private Boolean isTaxable = false;

    @Column(name = "description", length = 255)
    private String description;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum ComponentType {
        EARNING,
        DEDUCTION,
        ALLOWANCE,
        BONUS,
        TAX
    }
}
