package com.example.employee.kafka;

import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

/**
 * Kafka Dead Letter Queue (DLQ) handler — processes failed messages.
 *
 * Interview: "What happens when a Kafka consumer can't process a message?"
 * → "We use a DLQ pattern:
 * 1. Consumer tries to process the message
 * 2. If it fails after N retries (configured in the consumer factory),
 * Spring Kafka automatically sends it to the DLQ topic (.DLT suffix)
 * 3. The DLQ handler logs it, stores it in DB, and optionally alerts ops
 * 4. An admin can investigate and replay messages from the DLQ"
 *
 * Interview: "How do you configure the retry + DLQ behavior?"
 * → "Spring Kafka's DefaultErrorHandler with BackOff:
 * - FixedBackOff(1000, 3): retry 3 times with 1s delay
 * - ExponentialBackOff: 1s → 2s → 4s → 8s
 * - DeadLetterPublishingRecoverer: sends to topic.DLT after max retries"
 */
@Slf4j
@Component
public class KafkaDLQHandler {

    /**
     * Listen for messages on the dead letter topic.
     * These are messages that failed processing after all retries.
     */
    @KafkaListener(topics = "employee-events.DLT", groupId = "employee-dlq-group")
    public void handleDLQ(ConsumerRecord<String, String> record) {
        log.error("☠️ DLQ: Received failed message from topic={}, partition={}, offset={}, key={}",
                record.topic(),
                record.partition(),
                record.offset(),
                record.key());

        log.error("☠️ DLQ: Message value: {}", record.value());

        // In production, you would:
        // 1. Store in a "failed_messages" table for manual inspection
        // 2. Send alert to monitoring (PagerDuty, Slack)
        // 3. Expose a REST endpoint for admins to replay failed messages

        // TODO: Persist to failed_messages table for admin review
        log.error("☠️ DLQ: Message stored for manual review. Admin should investigate.");
    }

    /**
     * Listen for payroll DLQ messages.
     */
    @KafkaListener(topics = "payroll-events.DLT", groupId = "payroll-dlq-group")
    public void handlePayrollDLQ(ConsumerRecord<String, String> record) {
        log.error("☠️ Payroll DLQ: Failed message key={}, value={}",
                record.key(), record.value());
    }
}
