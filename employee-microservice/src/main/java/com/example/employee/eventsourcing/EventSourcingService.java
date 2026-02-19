package com.example.employee.eventsourcing;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Event Sourcing Service with Snapshot optimization.
 *
 * Interview: "Walk me through how event sourcing works in practice."
 * 1. Every state change creates an event (appendEvent)
 * 2. Events are immutable -- never updated or deleted
 * 3. Current state = replay all events from beginning (getEventHistory + apply)
 * 4. Snapshots optimize replay: start from snapshot, replay only delta events
 * 5. Projections (read models) are built from events for efficient querying
 *
 * Interview: "What is a snapshot in event sourcing?"
 * -> Without snapshots: replay ALL events to get current state = O(n)
 *    An employee with 3 years of changes might have 5000 events.
 *    With snapshots: load latest checkpoint + replay only events since it = O(delta)
 *    We take a snapshot every SNAPSHOT_THRESHOLD events.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EventSourcingService {

    private static final int SNAPSHOT_THRESHOLD = 100; // Take snapshot every 100 events

    private final EventStoreRepository eventStoreRepository;
    private final EventSnapshotRepository snapshotRepository;
    private final ObjectMapper objectMapper;

    /**
     * Append an event to the event store.
     * After appending, check if we should take a new snapshot.
     *
     * Interview: "How do you handle concurrent writes to the same aggregate?"
     * -> We use optimistic concurrency: the caller provides the expected version.
     *    If another process already wrote a new event, the version check fails
     *    and we throw an exception. The caller can retry with the latest version.
     */
    @Transactional
    public EventStore appendEvent(String aggregateId, String aggregateType,
            String eventType, Object eventData,
            String performedBy) {
        try {
            Long currentVersion = eventStoreRepository
                    .findMaxVersionByAggregateIdAndAggregateType(aggregateId, aggregateType)
                    .orElse(0L);

            EventStore event = EventStore.builder()
                    .aggregateId(aggregateId)
                    .aggregateType(aggregateType)
                    .eventType(eventType)
                    .eventData(objectMapper.writeValueAsString(eventData))
                    .eventVersion(currentVersion + 1)
                    .performedBy(performedBy)
                    .build();

            EventStore saved = eventStoreRepository.save(event);
            log.debug("[EVENT-STORE] Appended {} v{} for {}:{}",
                    eventType, saved.getEventVersion(), aggregateType, aggregateId);

            // Auto-snapshot check: if event count since last snapshot exceeds threshold
            checkAndTakeSnapshot(aggregateId, aggregateType, saved.getEventVersion());

            return saved;

        } catch (Exception e) {
            throw new RuntimeException("Failed to append event", e);
        }
    }

    /**
     * Replay aggregate using snapshot optimization.
     *
     * Algorithm:
     * 1. Find latest snapshot (if any)
     * 2. If snapshot exists: deserialize it and only replay events AFTER it
     * 3. If no snapshot: replay all events from beginning
     *
     * Performance: O(1) snapshot load + O(events since snapshot) replay
     * vs O(total events) without snapshots
     */
    @Transactional(readOnly = true)
    public Map<String, Object> replayAggregate(String aggregateId, String aggregateType) {
        try {
            Optional<EventSnapshot> latestSnapshot =
                    snapshotRepository.findLatestSnapshot(aggregateId, aggregateType);

            List<EventStore> events;
            Map<String, Object> currentState = new LinkedHashMap<>();

            if (latestSnapshot.isPresent()) {
                EventSnapshot snapshot = latestSnapshot.get();
                log.debug("[EVENT-REPLAY] Using snapshot v{} for {}:{} (skipping {} events)",
                        snapshot.getAggregateVersion(), aggregateType, aggregateId,
                        snapshot.getAggregateVersion());

                // Deserialize snapshot state
                @SuppressWarnings("unchecked")
                Map<String, Object> snapshotState =
                        objectMapper.readValue(snapshot.getStateJson(), Map.class);
                currentState.putAll(snapshotState);

                // Only load events AFTER the snapshot (the delta)
                events = eventStoreRepository
                        .findByAggregateIdAndAggregateTypeAndEventVersionGreaterThanOrderByEventVersionAsc(
                                aggregateId, aggregateType, snapshot.getAggregateVersion());

                log.debug("[EVENT-REPLAY] Replaying {} delta events after snapshot", events.size());
            } else {
                // No snapshot: full replay from beginning
                events = eventStoreRepository
                        .findByAggregateIdAndAggregateTypeOrderByEventVersionAsc(aggregateId, aggregateType);

                if (events.isEmpty()) {
                    throw new RuntimeException("No events found for " + aggregateType + ":" + aggregateId);
                }
                log.debug("[EVENT-REPLAY] Full replay: {} events for {}:{}", events.size(), aggregateType, aggregateId);
            }

            // Apply events to build current state
            currentState.put("aggregateId", aggregateId);
            currentState.put("aggregateType", aggregateType);

            for (EventStore event : events) {
                @SuppressWarnings("unchecked")
                Map<String, Object> eventData = objectMapper.readValue(event.getEventData(), Map.class);
                currentState.putAll(eventData);
                currentState.put("lastEventType", event.getEventType());
                currentState.put("currentVersion", event.getEventVersion());
                currentState.put("lastModifiedAt", event.getCreatedAt());
                currentState.put("lastModifiedBy", event.getPerformedBy());
            }

            currentState.put("totalEventsReplayed", events.size());
            currentState.put("snapshotUsed", latestSnapshot.isPresent());

            return currentState;

        } catch (Exception e) {
            throw new RuntimeException("Failed to replay aggregate", e);
        }
    }

    /**
     * Explicitly take a snapshot of the current aggregate state.
     * Called manually by admin API or automatically after threshold.
     *
     * Interview: "When should you snapshot?"
     * -> Common strategies:
     *    1. Every N events (simplest, most common)
     *    2. Every T time (e.g., nightly)
     *    3. On explicit user request
     *    4. Before a schema migration (safety checkpoint)
     */
    @Transactional
    public EventSnapshot takeSnapshot(String aggregateId, String aggregateType, String reason) {
        try {
            Map<String, Object> currentState = replayAggregate(aggregateId, aggregateType);

            Long currentVersion = eventStoreRepository
                    .findMaxVersionByAggregateIdAndAggregateType(aggregateId, aggregateType)
                    .orElse(0L);

            String stateJson = objectMapper.writeValueAsString(currentState);

            EventSnapshot snapshot = EventSnapshot.builder()
                    .aggregateId(aggregateId)
                    .aggregateType(aggregateType)
                    .aggregateVersion(currentVersion)
                    .stateJson(stateJson)
                    .stateSizeBytes(stateJson.length())
                    .snapshotReason(reason)
                    .build();

            EventSnapshot saved = snapshotRepository.save(snapshot);
            log.info("[SNAPSHOT] Took snapshot v{} for {}:{} reason={} size={}bytes",
                    currentVersion, aggregateType, aggregateId, reason, stateJson.length());

            return saved;

        } catch (Exception e) {
            throw new RuntimeException("Failed to take snapshot", e);
        }
    }

    /**
     * Auto-snapshot: check if we've accumulated SNAPSHOT_THRESHOLD events
     * since the last snapshot, and if so, take a new one.
     */
    private void checkAndTakeSnapshot(String aggregateId, String aggregateType, long currentVersion) {
        try {
            Optional<EventSnapshot> latest = snapshotRepository.findLatestSnapshot(aggregateId, aggregateType);
            long fromVersion = latest.map(EventSnapshot::getAggregateVersion).orElse(0L);
            long eventsSinceSnapshot = currentVersion - fromVersion;

            if (eventsSinceSnapshot >= SNAPSHOT_THRESHOLD) {
                log.info("[SNAPSHOT] Auto-snapshot triggered: {} events since last snapshot for {}:{}",
                        eventsSinceSnapshot, aggregateType, aggregateId);
                takeSnapshot(aggregateId, aggregateType, "THRESHOLD_REACHED");
            }
        } catch (Exception e) {
            // Snapshot failure should NOT fail the main operation
            log.warn("[SNAPSHOT] Auto-snapshot failed for {}:{}: {}", aggregateType, aggregateId, e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<EventStore> getEventHistory(String aggregateId, String aggregateType) {
        return eventStoreRepository
                .findByAggregateIdAndAggregateTypeOrderByEventVersionAsc(aggregateId, aggregateType);
    }
}
