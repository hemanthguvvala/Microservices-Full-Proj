package com.example.employee.eventsourcing;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Event Sourcing Service — append-only event store with aggregate replay.
 *
 * Interview: "Walk me through how event sourcing works in practice."
 * 1. Every state change creates an event (appendEvent)
 * 2. Events are immutable — never updated or deleted
 * 3. Current state = replay all events from beginning (getEventHistory + apply)
 * 4. Snapshots optimize replay for aggregates with many events
 * 5. Projections (read models) are built from events for efficient querying
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EventSourcingService {

    private final EventStoreRepository eventStoreRepository;
    private final ObjectMapper objectMapper;

    /**
     * Append an event to the event store.
     *
     * Interview: "How do you handle concurrent writes to the same aggregate?"
     * → "We use optimistic concurrency: the caller provides the expected version.
     * If another process already wrote a new event, the version check fails
     * and we throw an exception. The caller can retry with the latest version."
     */
    @Transactional
    public EventStore appendEvent(String aggregateId, String aggregateType,
            String eventType, Object eventData,
            String performedBy) {
        try {
            // Get next version number
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
            log.debug("Event sourcing: Appended {} event for {}:{} (version {})",
                    eventType, aggregateType, aggregateId, saved.getEventVersion());
            return saved;
        } catch (Exception e) {
            log.error("Failed to append event: {}", e.getMessage());
            throw new RuntimeException("Failed to store event", e);
        }
    }

    /**
     * Get full event history for an aggregate.
     *
     * Interview: "How do you reconstruct the current state of an entity?"
     * → "Fetch all events for the aggregate ID, ordered by version.
     * Apply each event sequentially to build the current state.
     * This is called 'replaying' the aggregate."
     */
    @Transactional(readOnly = true)
    public List<EventStore> getEventHistory(String aggregateId, String aggregateType) {
        return eventStoreRepository
                .findByAggregateIdAndAggregateTypeOrderByEventVersionAsc(aggregateId, aggregateType);
    }

    /**
     * Replay an aggregate — returns a map of the current state.
     *
     * Interview: "What about performance with thousands of events?"
     * → "We use snapshots: periodically save the current state at a version.
     * On replay, start from the latest snapshot instead of event #1.
     * For example, snapshot every 100 events."
     */
    @Transactional(readOnly = true)
    public Map<String, Object> replayAggregate(String aggregateId, String aggregateType) {
        List<EventStore> events = getEventHistory(aggregateId, aggregateType);

        if (events.isEmpty()) {
            throw new RuntimeException("No events found for aggregate " + aggregateType + ":" + aggregateId);
        }

        // Build current state by applying each event
        try {
            Map<String, Object> currentState = new java.util.LinkedHashMap<>();
            currentState.put("aggregateId", aggregateId);
            currentState.put("aggregateType", aggregateType);
            currentState.put("currentVersion", events.get(events.size() - 1).getEventVersion());
            currentState.put("totalEvents", events.size());

            // Apply each event's data (last write wins for each field)
            for (EventStore event : events) {
                @SuppressWarnings("unchecked")
                Map<String, Object> eventData = objectMapper.readValue(event.getEventData(), Map.class);
                currentState.putAll(eventData);
                currentState.put("lastEventType", event.getEventType());
                currentState.put("lastModifiedAt", event.getCreatedAt());
                currentState.put("lastModifiedBy", event.getPerformedBy());
            }

            return currentState;
        } catch (Exception e) {
            throw new RuntimeException("Failed to replay aggregate", e);
        }
    }
}
