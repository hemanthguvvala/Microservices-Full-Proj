package com.example.employee.outbox;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {

    /**
     * Find pending events with pessimistic locking to prevent duplicate processing
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM OutboxEvent e WHERE e.status = 'PENDING' AND e.retryCount < 3 ORDER BY e.createdAt ASC")
    List<OutboxEvent> findPendingEventsForProcessing();

    List<OutboxEvent> findByStatusAndCreatedAtBefore(
            OutboxEvent.OutboxStatus status, LocalDateTime before);

    long countByStatus(OutboxEvent.OutboxStatus status);
}
