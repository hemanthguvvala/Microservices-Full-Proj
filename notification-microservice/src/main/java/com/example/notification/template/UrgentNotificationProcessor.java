package com.example.notification.template;

import com.example.notification.model.Notification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Urgent Notification Processor — Immediate delivery with retries.
 * Implements Template Method for high-priority notifications.
 */
@Component
@Slf4j
public class UrgentNotificationProcessor extends AbstractNotificationProcessor {

    private static final int MAX_RETRIES = 3;

    @Override
    protected String getProcessorName() {
        return "UrgentProcessor";
    }

    @Override
    protected boolean validate(Notification notification) {
        return notification.getRecipientId() != null
                && notification.getMessage() != null
                && notification.getPriority() == Notification.Priority.URGENT;
    }

    @Override
    protected void preProcess(Notification notification) {
        log.warn("⚡ URGENT notification — escalating priority for [id={}]", notification.getId());
        notification.setRetryCount(0);
    }

    @Override
    protected void handleFailure(Notification notification) {
        int retries = notification.getRetryCount() != null ? notification.getRetryCount() : 0;
        if (retries < MAX_RETRIES) {
            notification.setRetryCount(retries + 1);
            log.warn("URGENT notification failed, retry {}/{} for [id={}]",
                    retries + 1, MAX_RETRIES, notification.getId());
            notification.setStatus(Notification.NotificationStatus.PENDING);
        } else {
            log.error("URGENT notification FAILED after {} retries [id={}]", MAX_RETRIES, notification.getId());
            notification.setStatus(Notification.NotificationStatus.FAILED);
        }
    }

    @Override
    protected void postProcess(Notification notification) {
        super.postProcess(notification);
        log.info("⚡ Urgent notification delivered in real-time [id={}]", notification.getId());
    }
}
