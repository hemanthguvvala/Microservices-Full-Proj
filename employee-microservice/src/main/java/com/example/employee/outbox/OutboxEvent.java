package com.example.employee.outbox;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Transactional Outbox Pattern — guarantees at-least-once event delivery.
 *
 * Interview: "How do you solve the dual-write problem?"
 *   → "Instead of writing to DB and Kafka separately (which can fail halfway),
 *      we write the event to an outbox table in the SAME database transaction.
 *      A separate poller/CDC reads unpublished events and sends them to Kafka.
 *      If Kafka publishing fails, the poller retries. If it succeeds, it marks
 *      the event as published."
 *
 * Interview: "What's the difference between polling publisher and CDC?"
 *   → "Polling (what we implement here) queries the outbox table periodically.
 *      CDC (Change Data Capture, e.g., Debezium) watches the DB transaction log
 *      and streams changes in real-time. CDC is lower latency but requires
 *      infrastructure (Debezium + Kafka Connect)."
 */
@Entity
@Table(name = "outbox_events", indexes = {
    @Index(name = "idx_outbox_published", columnList = "published"),
    @Index(name = "idx_outbox_created_at", columnList = "createdAt")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OutboxEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The type of aggregate this event belongs to (e.g., "Employee") */
    @Column(nullable = false, length = 100)
    private String aggregateType;

    /** The ID of the aggregate instance */
    @Column(nullable = false, length = 100)
    private String aggregateId;

    /** The type of event (e.g., "CREATED", "UPDATED", "DELETED") */
    @Column(nullable = false, length = 100)
    private String eventType;

    /** The Kafka topic to publish to */
    @Column(nullable = false, length = 255)
    private String topic;

    /** Serialized event payload as JSON */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String payload;

    /** Whether this event has been published to Kafka */
    @Column(nullable = false)
    @Builder.Default
    private Boolean published = false;

    /** When the event was published */
    private LocalDateTime publishedAt;

    /** Number of publish attempts */
    @Column(nullable = false)
    @Builder.Default
    private Integer retryCount = 0;

    /** When the event was processed */
    private LocalDateTime processedAt;

    /** Error message from last failed attempt */
    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** Processing status of the outbox event */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private OutboxStatus status = OutboxStatus.PENDING;

    public enum OutboxStatus {
        PENDING,
        PROCESSED,
        FAILED
    }
}
