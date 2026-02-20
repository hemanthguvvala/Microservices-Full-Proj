package com.example.employee.cloud.gcp;

import com.example.employee.cloud.CloudMessagingService;
import com.google.cloud.spring.pubsub.core.PubSubTemplate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutionException;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GCP Pub/Sub Implementation of CloudMessagingService
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Interview: "How does GCP Pub/Sub compare to SQS and Service Bus?"
 * → Pub/Sub is a topic-based system (like Kafka) with pull subscriptions:
 *   - Topic → multiple subscriptions (fan-out by default)
 *   - Dead-letter topics (equivalent to DLQ)
 *   - Ordering keys = per-key ordering (like Kafka partition key or SQS GroupId)
 *   - At-least-once default; exactly-once on ordered subscriptions
 *   - Auto-scales to millions msg/s with no capacity planning
 *
 * Key difference from Kafka: Pub/Sub is serverless (no brokers to manage).
 * Key difference from SQS: Pub/Sub is topic-based (fan-out), SQS is queue-based (p2p).
 *
 * Auth: Workload Identity → GCP Service Account → Pub/Sub Publisher/Subscriber IAM role
 *
 * Activated when: spring.profiles.active=gcp
 */
@Slf4j
@Service
@Profile("gcp")
@RequiredArgsConstructor
public class GcpPubSubMessagingService implements CloudMessagingService {

    private final PubSubTemplate pubSubTemplate;

    @Override
    public String sendMessage(String topic, String message, String messageGroupId) {
        log.info("GCP Pub/Sub: Publishing to topic={}, orderingKey={}", topic, messageGroupId);

        String messageId;
        try {
            if (messageGroupId != null) {
                // Ordering key ensures per-key ordering in Pub/Sub
                messageId = pubSubTemplate.publish(topic, message,
                        Map.of("ordering-key", messageGroupId,
                               "correlation-id", UUID.randomUUID().toString()))
                        .get();
            } else {
                messageId = pubSubTemplate.publish(topic, message).get();
            }
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Pub/Sub publish failed for topic=" + topic, e);
        }

        log.info("GCP Pub/Sub: Message published, messageId={}", messageId);
        return messageId;
    }

    @Override
    public String sendDelayedMessage(String topic, String message, int delaySeconds) {
        // Pub/Sub doesn't natively support delayed delivery at publish time.
        // Use Cloud Tasks or Cloud Scheduler for delayed processing.
        // For now, publish with a "scheduled-delivery" attribute for consumer to respect.
        log.info("GCP Pub/Sub: Publishing with scheduled-delivery attribute ({}s) to topic={}", delaySeconds, topic);

        String messageId;
        try {
            long deliverAt = System.currentTimeMillis() + (delaySeconds * 1000L);
            messageId = pubSubTemplate.publish(topic, message,
                    Map.of("scheduled-delivery-time", String.valueOf(deliverAt)))
                    .get();
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Pub/Sub delayed publish failed for topic=" + topic, e);
        }

        log.info("GCP Pub/Sub: Scheduled message published, messageId={}", messageId);
        return messageId;
    }
}
