package com.example.notification.event;

import com.example.notification.model.Notification;
import org.springframework.context.ApplicationEvent;

/**
 * Spring ApplicationEvent — Internal event-driven communication.
 *
 * Interview Insight:
 *   "What is Spring's ApplicationEvent and how does it differ from Kafka?"
 *   → "ApplicationEvent is Spring's INTERNAL pub/sub mechanism:
 *        - Synchronous by default (same thread, same JVM)
 *        - No network overhead — in-process only
 *        - Transactional — events can be published within @Transactional
 *        - @TransactionalEventListener — fires AFTER commit/rollback
 *
 *      Kafka is EXTERNAL pub/sub:
 *        - Asynchronous, distributed across JVMs/services
 *        - Durable (persisted to disk, replayed)
 *        - Network overhead
 *
 *      Use ApplicationEvent for INTRA-service decoupling.
 *      Use Kafka for INTER-service communication."
 *
 *   "When should you use @EventListener vs @TransactionalEventListener?"
 *   → "@EventListener fires immediately when publishEvent() is called.
 *      @TransactionalEventListener fires AFTER the transaction commits
 *      (AFTER_COMMIT phase). Use it when you want to ensure the DB write
 *      succeeded before triggering side effects like sending notifications."
 */
public class NotificationCreatedEvent extends ApplicationEvent {

    private final Notification notification;

    public NotificationCreatedEvent(Object source, Notification notification) {
        super(source);
        this.notification = notification;
    }

    public Notification getNotification() {
        return notification;
    }
}
