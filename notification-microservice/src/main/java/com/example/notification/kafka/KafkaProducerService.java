package com.example.notification.kafka;

import com.example.notification.model.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Kafka Producer — Publishes notification lifecycle events to "notification-events" topic.
 *
 * Other services (Employee, Payroll) can subscribe to track notification delivery status.
 *
 * Interview: "How does KafkaTemplate work?"
 *   → KafkaTemplate is the high-level API for sending messages. It wraps
 *     the Kafka Producer and provides send/sendDefault methods that return
 *     CompletableFuture<SendResult>. The template handles serialization,
 *     partitioning, and producer configuration automatically.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class KafkaProducerService {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    private static final String NOTIFICATION_EVENTS_TOPIC = "notification-events";

    /**
     * Publish notification lifecycle event (CREATED, SENT, DELIVERED, FAILED).
     */
    public void publishNotificationEvent(Notification notification, String eventType) {
        Map<String, Object> event = Map.of(
            "eventType", eventType,
            "notificationId", notification.getId(),
            "recipientId", notification.getRecipientId(),
            "channel", notification.getChannelType().name(),
            "status", notification.getStatus().name(),
            "timestamp", java.time.Instant.now().toString()
        );

        String key = "notification-" + notification.getId();

        CompletableFuture<SendResult<String, Object>> future =
            kafkaTemplate.send(NOTIFICATION_EVENTS_TOPIC, key, event);

        future.whenComplete((result, ex) -> {
            if (ex == null) {
                log.info("Published notification event [type={}, id={}] to topic [{}] offset [{}]",
                    eventType,
                    notification.getId(),
                    result.getRecordMetadata().topic(),
                    result.getRecordMetadata().offset());
            } else {
                log.error("Failed to publish notification event [id={}]: {}",
                    notification.getId(), ex.getMessage());
            }
        });
    }
}
