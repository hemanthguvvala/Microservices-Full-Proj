package com.example.employee.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Employee entity with soft delete and multi-tenancy support.
 *
 * Interview: "How do you handle data deletion in a compliance-regulated
 * system?"
 * → "We use soft deletes — @SQLDelete overrides DELETE to SET deleted=true.
 * 
 * @SQLRestriction automatically appends WHERE deleted=false to all queries.
 *                 The data remains in the DB for audit/compliance but is
 *                 invisible to the app."
 *
 *                 Interview: "What about GDPR right-to-erasure?"
 *                 → "Soft delete is step 1. For true erasure, we have a
 *                 scheduled job that
 *                 anonymizes PII (name, email, phone) after the retention
 *                 period expires,
 *                 keeping the record for referential integrity but removing
 *                 personal data."
 */
@Entity
@Table(name = "employees")
@EntityListeners(AuditingEntityListener.class)
@SQLDelete(sql = "UPDATE employees SET deleted = true, deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted = false")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Employee implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "First name is required")
    @Column(nullable = false)
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Column(nullable = false)
    private String lastName;

    @Email(message = "Email should be valid")
    @NotBlank(message = "Email is required")
    @Column(unique = true, nullable = false)
    private String email;

    @NotBlank(message = "Department is required")
    private String department;

    @NotBlank(message = "Position is required")
    private String position;

    @Column(length = 20)
    private String status = "ACTIVE";

    @NotNull(message = "Salary is required")
    @Column(precision = 12, scale = 2)
    private BigDecimal salary;

    private LocalDate hireDate;

    @Column(length = 15)
    private String phoneNumber;

    // ── Multi-tenancy ────────────────────────────────────────────────────────
    @Column(name = "tenant_id", length = 50)
    private String tenantId;

    // ── Soft Delete ──────────────────────────────────────────────────────────
    @Column(nullable = false)
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // ── Audit fields ─────────────────────────────────────────────────────────
    @CreatedDate
    @Column(name = "created_date", updatable = false)
    private LocalDateTime createdDate;

    @LastModifiedDate
    @Column(name = "last_modified_date")
    private LocalDateTime lastModifiedDate;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "last_modified_by")
    private String lastModifiedBy;

    @Version
    private Long version;
}
