package com.example.employee.cloud;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Cloud Messaging Abstraction — Strategy Pattern for Multi-Cloud Portability
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Interview: "Your Kafka handles internal events. How do you handle cloud-native
 *            messaging for external integrations?"
 * → Kafka for internal event streaming (Outbox, CDC, analytics).
 *   Cloud-native queues (SQS / Service Bus / Pub/Sub) for external webhook
 *   deliveries, dead-letter queues, and cross-account communication.
 *   Same Strategy pattern: interface + 3 profile-activated implementations.
 */
public interface CloudMessagingService {

    /**
     * Send a message to a cloud queue/topic.
     *
     * @param queueOrTopic The queue URL (SQS), queue name (Service Bus), or topic (Pub/Sub)
     * @param message      The message body (JSON string)
     * @param messageGroupId Optional group ID for FIFO ordering (null for standard)
     * @return The message ID assigned by the cloud provider
     */
    String sendMessage(String queueOrTopic, String message, String messageGroupId);

    /**
     * Send a message with a delay (delayed visibility).
     *
     * @param queueOrTopic The target queue/topic
     * @param message      The message body
     * @param delaySeconds Delay before the message becomes visible to consumers
     * @return The message ID
     */
    String sendDelayedMessage(String queueOrTopic, String message, int delaySeconds);
}
