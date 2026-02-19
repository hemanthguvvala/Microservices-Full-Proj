package com.example.employee.eventsourcing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EventSnapshotRepository extends JpaRepository<EventSnapshot, Long> {

    /**
     * Find the most recent snapshot for a given aggregate.
     * Used as the starting point for replay optimization.
     */
    @Query("SELECT s FROM EventSnapshot s WHERE s.aggregateId = :aggregateId" +
           " AND s.aggregateType = :aggregateType" +
           " ORDER BY s.aggregateVersion DESC LIMIT 1")
    Optional<EventSnapshot> findLatestSnapshot(
            @Param("aggregateId") String aggregateId,
            @Param("aggregateType") String aggregateType);

    /**
     * Count total events recorded after a specific aggregate version.
     * Used to decide whether a new snapshot should be taken
     * (e.g., if > 100 events since last snapshot → take a new one).
     */
    @Query("SELECT COUNT(e) FROM EventStore e WHERE e.aggregateId = :aggregateId" +
           " AND e.aggregateType = :aggregateType" +
           " AND e.eventVersion > :fromVersion")
    long countEventsSinceSnapshot(
            @Param("aggregateId") String aggregateId,
            @Param("aggregateType") String aggregateType,
            @Param("fromVersion") long fromVersion);
}
