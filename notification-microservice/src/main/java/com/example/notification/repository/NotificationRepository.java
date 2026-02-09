package com.example.notification.repository;

import com.example.notification.model.Notification;
import com.example.notification.model.Notification.ChannelType;
import com.example.notification.model.Notification.NotificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository extending JpaSpecificationExecutor for dynamic queries.
 *
 * Interview: "Why extend JpaSpecificationExecutor?"
 *   → "JpaRepository gives fixed CRUD + derived queries.
 *      JpaSpecificationExecutor adds findAll(Specification, Pageable)
 *      which accepts composable, type-safe WHERE clauses at runtime.
 *      This avoids writing 2^N query methods for every filter combination."
 */
@Repository
public interface NotificationRepository
        extends JpaRepository<Notification, Long>, JpaSpecificationExecutor<Notification> {

    Page<Notification> findByRecipientId(String recipientId, Pageable pageable);

    List<Notification> findByRecipientIdAndStatus(String recipientId, NotificationStatus status);

    long countByRecipientIdAndStatusNot(String recipientId, NotificationStatus status);

    @Query("SELECT n FROM Notification n WHERE n.status = :status AND n.createdDate < :cutoff")
    List<Notification> findStaleNotifications(
            @Param("status") NotificationStatus status,
            @Param("cutoff") LocalDateTime cutoff);

    @Modifying
    @Query("UPDATE Notification n SET n.status = :newStatus WHERE n.status = :oldStatus AND n.createdDate < :cutoff")
    int bulkUpdateStatus(
            @Param("oldStatus") NotificationStatus oldStatus,
            @Param("newStatus") NotificationStatus newStatus,
            @Param("cutoff") LocalDateTime cutoff);

    long countByRecipientIdAndChannelTypeAndStatus(String recipientId, ChannelType channelType, NotificationStatus status);
}
