package com.example.analytics.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Analytics Event — immutable record of every employee state change.
 *
 * Design note: This is an APPEND-ONLY table (like an event store).
 * We never UPDATE or DELETE rows — only INSERT.
 * This makes it ideal for analytics: you can always reconstruct history.
 *
 * Interview: "OLTP vs OLAP — what's the difference?"
 * OLTP (employee-service): normalized, transactional, low latency per row
 * OLAP (analytics-service): denormalized, aggregation-optimized, high throughput reads
 * This table is OLAP — deliberately denormalized for fast aggregation queries.
 */
@Entity
@Table(name = "employee_analytics_events",
       indexes = {
           @Index(name = "idx_analytics_employee", columnList = "employee_id"),
           @Index(name = "idx_analytics_tenant", columnList = "tenant_id"),
           @Index(name = "idx_analytics_dept", columnList = "department"),
           @Index(name = "idx_analytics_type", columnList = "event_type"),
           @Index(name = "idx_analytics_timestamp", columnList = "event_timestamp_ms"),
           @Index(name = "idx_analytics_tenant_dept", columnList = "tenant_id, department")
       })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeAnalyticsEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id", nullable = false, length = 100)
    private String employeeId;

    @Column(name = "tenant_id", nullable = false, length = 100)
    private String tenantId;

    @Column(name = "event_type", nullable = false, length = 60)
    private String eventType;                   // Denormalized string for fast GROUP BY

    @Column(name = "department", length = 100)
    private String department;

    @Column(name = "performed_by", length = 100)
    private String performedBy;

    @Column(name = "event_timestamp_ms", nullable = false)
    private Long eventTimestampMs;

    @Column(name = "correlation_id", length = 100)
    private String correlationId;

    // Denormalized metadata as JSON text — no joins needed for analytics
    @Column(name = "metadata", columnDefinition = "TEXT")
    private String metadataJson;

    // Source of the event: "GRPC" or "KAFKA"
    @Column(name = "source", length = 20)
    private String source;

    @CreationTimestamp
    @Column(name = "ingested_at", updatable = false)
    private LocalDateTime ingestedAt;
}
