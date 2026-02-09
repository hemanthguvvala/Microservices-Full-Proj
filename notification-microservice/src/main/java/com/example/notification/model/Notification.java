package com.example.notification.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_recipient", columnList = "recipientId"),
    @Index(name = "idx_status", columnList = "status"),
    @Index(name = "idx_channel_type", columnList = "channelType"),
    @Index(name = "idx_created_date", columnList = "createdDate")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String recipientId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChannelType channelType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationStatus status;

    @Enumerated(EnumType.STRING)
    private Priority priority;

    private String templateName;
    private String attachmentPath;
    private Integer retryCount;
    private LocalDateTime sentAt;
    private LocalDateTime readAt;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdDate;

    @LastModifiedDate
    private LocalDateTime lastModifiedDate;

    @Version
    private Long version;

    /**
     * Channel types the notification can be sent through.
     */
    public enum ChannelType {
        EMAIL, SMS, PUSH, IN_APP
    }

    /**
     * Notification lifecycle status.
     */
    public enum NotificationStatus {
        PENDING, PROCESSING, SENT, DELIVERED, READ, FAILED, CANCELLED
    }

    /**
     * Priority levels for notification processing order.
     */
    public enum Priority {
        LOW, NORMAL, HIGH, URGENT
    }
}
