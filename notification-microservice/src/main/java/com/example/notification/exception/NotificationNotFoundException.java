package com.example.notification.exception;

/**
 * Thrown when a notification is not found by ID.
 */
public class NotificationNotFoundException extends RuntimeException {

    private final Long notificationId;

    public NotificationNotFoundException(Long id) {
        super("Notification not found with id: " + id);
        this.notificationId = id;
    }

    public Long getNotificationId() {
        return notificationId;
    }
}
