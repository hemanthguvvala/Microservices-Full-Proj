package com.example.notification.template;

import com.example.notification.model.Notification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Bulk Notification Processor — Batch delivery with rate control.
 * Implements Template Method for low/normal priority bulk notifications.
 */
@Component
@Slf4j
public class BulkNotificationProcessor extends AbstractNotificationProcessor {

    @Override
    protected String getProcessorName() {
        return "BulkProcessor";
    }

    @Override
    protected boolean validate(Notification notification) {
        return notification.getRecipientId() != null
                && notification.getMessage() != null
                && notification.getPriority() != Notification.Priority.URGENT;
    }

    @Override
    protected void preProcess(Notification notification) {
        log.info("📦 Queuing bulk notification [id={}] for batch delivery", notification.getId());
        // In production: add to batch queue, apply rate limiting
    }

    @Override
    protected void handleFailure(Notification notification) {
        log.warn("Bulk notification [id={}] failed — moving to dead-letter queue", notification.getId());
        notification.setStatus(Notification.NotificationStatus.FAILED);
        // In production: publish to DLQ for manual retry
    }
}
