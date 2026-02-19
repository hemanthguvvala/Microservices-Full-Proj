package com.example.employee.eventsourcing;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Event Store — stores every state change as an immutable event.
 *
 * Interview: "What is event sourcing?"
 * → "Instead of storing only the current state, we store every change as an
 * event:
 * EmployeeCreated → SalaryUpdated → DepartmentChanged → Promoted → Terminated.
 * The current state is derived by replaying all events in order."
 *
 * Interview: "When would you use event sourcing?"
 * → "Banking (every transaction is an event), trading (audit trail required),
 * compliance-heavy systems (healthcare, finance), and anywhere you need
 * time-travel debugging or complete audit history."
 *
 * Interview: "What are the downsides of event sourcing?"
 * → "1. Complexity — querying current state requires replaying events or
 * maintaining projections
 * 2. Storage growth — events accumulate forever (need snapshotting)
 * 3. Schema evolution — changing event structure is hard
 * 4. Eventual consistency — read models lag behind writes"
 */
@Entity
@Table(name = "event_store", indexes = {
        @Index(name = "idx_event_aggregate", columnList = "aggregateId, aggregateType"),
        @Index(name = "idx_event_type", columnList = "eventType"),
        @Index(name = "idx_event_created", columnList = "createdAt")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventStore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The ID of the aggregate (e.g., employee ID) */
    @Column(nullable = false, length = 100)
    private String aggregateId;

    /** The type of aggregate (e.g., "Employee") */
    @Column(nullable = false, length = 100)
    private String aggregateType;

    /** The type of event (e.g., "CREATED", "SALARY_UPDATED") */
    @Column(nullable = false, length = 100)
    private String eventType;

    /** Serialized event data as JSON */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String eventData;

    /** Monotonically increasing version for ordering */
    @Column(nullable = false)
    private Long eventVersion;

    /** Who triggered this event */
    @Column(length = 100)
    private String performedBy;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
