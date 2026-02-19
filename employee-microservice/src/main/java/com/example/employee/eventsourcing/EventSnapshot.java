package com.example.employee.eventsourcing;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Event Sourcing Snapshot — periodic checkpoint of aggregate state.
 *
 * Interview: "What is a snapshot in event sourcing and why do you need it?"
 *
 * Problem: Replaying events from the beginning is O(n) where n = event count.
 * After years of operation, an aggregate might have 100,000 events.
 * Replaying 100,000 events to answer "what's this employee's current state?"
 * becomes slow and expensive.
 *
 * Solution: Snapshots
 * → Periodically serialize the aggregate's current state to a snapshot table.
 * → On replay: load the LATEST snapshot, then replay only events AFTER it.
 * → Instead of 100,000 events, you replay maybe 50 (since the last snapshot).
 *
 * Snapshot strategies:
 * 1. Every N events (e.g., snapshot every 100 events) - most common
 * 2. Every T time (e.g., snapshot daily)
 * 3. Explicit trigger (e.g., admin action)
 *
 * Snapshotting rule: NEVER mutate a snapshot. When the state changes after a
 * snapshot, create a NEW snapshot. Snapshots are also append-only.
 *
 * Interview: "How do you handle snapshot + event replay together?"
 * 1. Find the latest snapshot for aggregateId:aggregateType
 * 2. Deserialize snapshot → aggregate state
 * 3. Find all events with version > snapshot.aggregateVersion
 * 4. Apply those events to the snapshot state
 * 5. Result = current state (without replaying from the beginning)
 */
@Entity
@Table(name = "event_snapshots",
       indexes = {
           @Index(name = "idx_snapshot_aggregate", columnList = "aggregate_id, aggregate_type"),
           @Index(name = "idx_snapshot_version", columnList = "aggregate_id, aggregate_version DESC")
       })
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Identifies which aggregate this snapshot belongs to
    @Column(name = "aggregate_id", nullable = false, length = 100)
    private String aggregateId;

    @Column(name = "aggregate_type", nullable = false, length = 80)
    private String aggregateType;          // e.g., "Employee", "PayrollRecord"

    // The event version at which this snapshot was taken
    // All events with version <= this can be skipped during replay
    @Column(name = "aggregate_version", nullable = false)
    private Long aggregateVersion;

    // Serialized aggregate state as JSON
    // Interview: "Why store as JSON instead of a normalized row?"
    // → Aggregates are often complex objects. JSON is schema-flexible.
    //   When aggregate structure changes, old snapshots can be migrated lazily.
    @Column(name = "state_json", columnDefinition = "TEXT", nullable = false)
    private String stateJson;

    // Size of the stateJson (useful for monitoring snapshot growth)
    @Column(name = "state_size_bytes")
    private Integer stateSizeBytes;

    @Column(name = "snapshot_reason", length = 60)
    private String snapshotReason;         // "THRESHOLD_REACHED", "EXPLICIT", "SCHEDULED"

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
