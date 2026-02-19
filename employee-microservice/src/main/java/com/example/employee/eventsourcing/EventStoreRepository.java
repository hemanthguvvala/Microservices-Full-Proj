package com.example.employee.eventsourcing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EventStoreRepository extends JpaRepository<EventStore, Long> {

    /** Get all events for an aggregate, ordered by version */
    List<EventStore> findByAggregateIdAndAggregateTypeOrderByEventVersionAsc(
            String aggregateId, String aggregateType);

    /** Get the latest version number for an aggregate */
    @Query("SELECT MAX(e.eventVersion) FROM EventStore e " +
            "WHERE e.aggregateId = :aggregateId AND e.aggregateType = :aggregateType")
    Optional<Long> findMaxVersionByAggregateIdAndAggregateType(
            String aggregateId, String aggregateType);

    /** Get all events of a specific type */
    List<EventStore> findByEventTypeOrderByCreatedAtDesc(String eventType);
}
