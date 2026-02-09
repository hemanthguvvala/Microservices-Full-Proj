package com.example.employee.saga;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Saga Pattern Implementation
 * 
 * Manages distributed transactions across multiple microservices.
 * Each saga represents a long-running transaction with compensating actions.
 * 
 * Example: Employee Onboarding Saga
 * 1. Create employee record
 * 2. Create payroll record
 * 3. Assign equipment
 * 4. Grant system access
 * 
 * If any step fails, compensating transactions rollback previous steps.
 */
@Entity
@Table(name = "saga_instances")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SagaInstance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String sagaId;  // UUID for tracking

    @Column(nullable = false)
    private String sagaType;  // EMPLOYEE_ONBOARDING, PAYROLL_PROCESSING

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SagaStatus status;

    @Column(nullable = false)
    private String currentStep;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "saga_steps", joinColumns = @JoinColumn(name = "saga_id"))
    @MapKeyColumn(name = "step_name")
    @Column(name = "step_status")
    private Map<String, String> stepStatuses = new HashMap<>();

    @Column(columnDefinition = "TEXT")
    private String sagaData;  // JSON data for the saga

    @Column
    private LocalDateTime startedAt;

    @Column
    private LocalDateTime completedAt;

    @Column
    private String errorMessage;

    @Version
    private Long version;

    public enum SagaStatus {
        STARTED,
        IN_PROGRESS,
        COMPLETED,
        COMPENSATING,  // Rolling back
        FAILED,
        COMPENSATED    // Rolled back successfully
    }
}
