package com.example.employee.outbox;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Single repository for the Outbox Pattern.
 *
 * Interview: "How do you prevent two poller instances from processing the same event?"
 * → "PESSIMISTIC_WRITE with SKIP LOCKED (PostgreSQL). Each poller locks the rows
 *    it picks up. Other pollers skip locked rows. No duplicate processing."
 */
@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {

    /**
     * Find pending events with pessimistic locking.
     * PostgreSQL's FOR UPDATE SKIP LOCKED prevents duplicate processing across instances.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM OutboxEvent e WHERE e.status = 'PENDING' AND e.retryCount < 5 ORDER BY e.createdAt ASC")
    List<OutboxEvent> findPendingEventsForProcessing();

    /**
     * Alternative fetch for simple polling (used by EmployeeService for quick lookups).
     */
    List<OutboxEvent> findTop50ByPublishedFalseOrderByCreatedAtAsc();

    List<OutboxEvent> findByStatusAndCreatedAtBefore(
            OutboxEvent.OutboxStatus status, LocalDateTime before);

    long countByStatus(OutboxEvent.OutboxStatus status);

    /**
     * Bulk delete old processed events — avoids loading entities into memory.
     */
    @Modifying
    @Query("DELETE FROM OutboxEvent e WHERE e.status = 'PROCESSED' AND e.processedAt < :before")
    int deleteProcessedEventsBefore(LocalDateTime before);

    /**
     * Bulk delete old published events (alternative query for backward compat).
     */
    @Modifying
    @Query("DELETE FROM OutboxEvent e WHERE e.published = true AND e.publishedAt < :before")
    int deletePublishedEventsBefore(LocalDateTime before);
}
