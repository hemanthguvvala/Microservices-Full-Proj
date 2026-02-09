package com.example.notification.dto;

import com.example.notification.model.Notification.ChannelType;
import com.example.notification.model.Notification.NotificationStatus;
import com.example.notification.model.Notification.Priority;

import java.time.LocalDateTime;

/**
 * Filter criteria record for dynamic JPA Specification queries.
 *
 * Interview: "How do you build dynamic queries without writing 2^N method combinations?"
 *   → "Use JPA Specifications + a criteria record. Each non-null field adds a WHERE
 *      clause. The Specification builder composes them with AND/OR."
 *
 * @param recipientId  Filter by recipient
 * @param channelType  Filter by channel
 * @param status       Filter by status
 * @param priority     Filter by priority
 * @param fromDate     Created after this date
 * @param toDate       Created before this date
 * @param searchTerm   Full-text search in title + message
 */
public record NotificationFilter(
        String recipientId,
        ChannelType channelType,
        NotificationStatus status,
        Priority priority,
        LocalDateTime fromDate,
        LocalDateTime toDate,
        String searchTerm
) {
    /**
     * Factory for empty filter (no criteria → returns all).
     */
    public static NotificationFilter empty() {
        return new NotificationFilter(null, null, null, null, null, null, null);
    }
}
