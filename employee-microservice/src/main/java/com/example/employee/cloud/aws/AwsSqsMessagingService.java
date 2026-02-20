package com.example.employee.cloud.aws;

import com.example.employee.cloud.CloudMessagingService;
import io.awspring.cloud.sqs.operations.SqsTemplate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AWS SQS Implementation of CloudMessagingService
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Interview: "Why SQS when you already have Kafka?"
 * → Kafka = internal event streaming (Outbox CDC, analytics, consumer groups).
 *   SQS = external integration (webhook delivery, cross-account, dead-letter).
 *   SQS FIFO guarantees exactly-once + ordering within a message group.
 *   SQS Standard gives at-least-once at massive scale (300K msg/s).
 *
 * Key design decisions:
 * - FIFO queue for employee lifecycle events (order matters)
 * - Standard queue for notification delivery (order doesn't matter)
 * - DLQ configured at queue level — failed messages auto-redirect after 3 retries
 * - MessageGroupId = employeeId → guarantees per-employee ordering in FIFO
 *
 * Activated when: spring.profiles.active=aws
 */
@Slf4j
@Service
@Profile("aws")
@RequiredArgsConstructor
public class AwsSqsMessagingService implements CloudMessagingService {

    private final SqsTemplate sqsTemplate;

    @Override
    public String sendMessage(String queueOrTopic, String message, String messageGroupId) {
        log.info("AWS SQS: Sending message to queue={}, groupId={}", queueOrTopic, messageGroupId);

        var sendResult = sqsTemplate.send(to -> {
            to.queue(queueOrTopic)
              .payload(message);
            if (messageGroupId != null) {
                to.header("message-group-id", messageGroupId)
                  .header("message-deduplication-id", UUID.randomUUID().toString());
            }
        });

        String messageId = sendResult.messageId().toString();
        log.info("AWS SQS: Message sent, messageId={}", messageId);
        return messageId;
    }

    @Override
    public String sendDelayedMessage(String queueOrTopic, String message, int delaySeconds) {
        log.info("AWS SQS: Sending delayed message ({}s) to queue={}", delaySeconds, queueOrTopic);

        var sendResult = sqsTemplate.send(to ->
            to.queue(queueOrTopic)
              .payload(message)
              .delaySeconds(delaySeconds)
        );

        String messageId = sendResult.messageId().toString();
        log.info("AWS SQS: Delayed message sent, messageId={}", messageId);
        return messageId;
    }
}
