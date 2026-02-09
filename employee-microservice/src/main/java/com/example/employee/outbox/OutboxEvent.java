package com.example.employee.outbox;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Outbox Pattern Implementation
 * 
 * Purpose: Ensures reliable event publishing by storing events in the same
 * database transaction as the business entity, then publishing them separately.
 * 
 * This solves the dual-write problem where saving to DB and publishing to
 * Kafka might not both succeed.
 */
@Entity
@Table(name = "outbox_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OutboxEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String aggregateType;  // Employee, Payroll, etc.

    @Column(nullable = false)
    private String aggregateId;    // Entity ID

    @Column(nullable = false)
    private String eventType;      // CREATED, UPDATED, DELETED

    @Column(nullable = false, columnDefinition = "TEXT")
    private String payload;        // JSON payload

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime processedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OutboxStatus status;

    @Column
    private Integer retryCount;

    @Column
    private String errorMessage;

    @Version
    private Long version;  // Optimistic locking

    public enum OutboxStatus {
        PENDING,
        PROCESSED,
        FAILED
    }
}
