package com.example.notification.dto;

import com.example.notification.model.Notification.ChannelType;
import com.example.notification.model.Notification.NotificationStatus;
import com.example.notification.model.Notification.Priority;

import java.time.LocalDateTime;

/**
 * Response Record — Immutable response DTO.
 *
 * Records + HATEOAS: The controller wraps this in EntityModel<> to add
 * hypermedia links (self, collection, mark-read, etc.).
 */
public record NotificationResponse(
        Long id,
        String recipientId,
        String title,
        String message,
        ChannelType channelType,
        NotificationStatus status,
        Priority priority,
        String templateName,
        LocalDateTime sentAt,
        LocalDateTime readAt,
        LocalDateTime createdDate
) {
    /**
     * Static factory method — cleaner than constructor for mapping.
     */
    public static NotificationResponse from(com.example.notification.model.Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getRecipientId(),
                n.getTitle(),
                n.getMessage(),
                n.getChannelType(),
                n.getStatus(),
                n.getPriority(),
                n.getTemplateName(),
                n.getSentAt(),
                n.getReadAt(),
                n.getCreatedDate()
        );
    }
}
