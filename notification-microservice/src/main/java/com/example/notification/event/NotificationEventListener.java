package com.example.notification.event;

import com.example.notification.model.Notification;
import com.example.notification.strategy.NotificationStrategyFactory;
import com.example.notification.template.AbstractNotificationProcessor;
import com.example.notification.template.BulkNotificationProcessor;
import com.example.notification.template.UrgentNotificationProcessor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Event Listener — Processes NotificationCreatedEvent asynchronously.
 *
 * Demonstrates both @EventListener and @TransactionalEventListener.
 *
 * Interview: "@Async + @EventListener"
 *   → "By default, Spring events are synchronous. Adding @Async makes the
 *      listener run on a separate thread from the TaskExecutor pool.
 *      This prevents the notification sending from blocking the API response."
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventListener {

    private final NotificationStrategyFactory strategyFactory;
    private final UrgentNotificationProcessor urgentProcessor;
    private final BulkNotificationProcessor bulkProcessor;

    /**
     * @TransactionalEventListener — Only fires AFTER the transaction commits.
     * This ensures the notification is persisted before we attempt to send it.
     *
     * If the DB transaction rolls back, this listener does NOT fire —
     * preventing us from sending a notification for data that wasn't saved.
     */
    @Async("notificationTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleNotificationCreated(NotificationCreatedEvent event) {
        Notification notification = event.getNotification();
        log.info("Event received: NotificationCreated [id={}, channel={}]",
                notification.getId(), notification.getChannelType());

        try {
            var strategy = strategyFactory.getStrategy(notification.getChannelType());

            // Select processor based on priority (Template Method Pattern)
            AbstractNotificationProcessor processor =
                    notification.getPriority() == Notification.Priority.URGENT
                            ? urgentProcessor
                            : bulkProcessor;

            processor.process(notification, strategy);
        } catch (Exception e) {
            log.error("Failed to process notification [id={}]: {}",
                    notification.getId(), e.getMessage(), e);
        }
    }
}
