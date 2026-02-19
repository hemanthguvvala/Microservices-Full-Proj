package com.example.employee.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.kafka.core.KafkaTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Outbox Event Publisher — the SINGLE publisher for the Transactional Outbox Pattern.
 *
 * Interview: "How does the Outbox Pattern guarantee exactly-once delivery?"
 * → "Events are written to the outbox table in the SAME transaction as the
 *    business data. This publisher polls for unpublished events and sends
 *    them to Kafka with a BLOCKING .get() call. Only after Kafka acknowledges
 *    do we mark the event as processed. If Kafka fails, the event stays
 *    pending and retries on the next poll cycle. This gives at-least-once
 *    delivery. Combined with idempotent consumers, we get effectively
 *    exactly-once semantics."
 *
 * Interview: "Why blocking .get() instead of async .whenComplete()?"
 * → "Async callbacks run on a different thread. If we mark the event as
 *    processed BEFORE the callback fires, Kafka could still fail — but
 *    we've already committed the status change. .get() blocks until Kafka
 *    acknowledges, ensuring sequential consistency."
 */
@Slf4j
@Service
public class OutboxEventPublisher {

    @Autowired
    private OutboxEventRepository outboxRepository;

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    private static final int MAX_RETRY_COUNT = 5;
    private static final long KAFKA_SEND_TIMEOUT_SECONDS = 10;

    /**
     * Process pending outbox events every 5 seconds.
     * Uses pessimistic locking (SKIP LOCKED in the repository query)
     * to allow multiple instances to poll concurrently without conflicts.
     */
    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEvent> pendingEvents = outboxRepository.findPendingEventsForProcessing();

        if (pendingEvents.isEmpty()) {
            return;
        }

        log.info("Processing {} pending outbox events", pendingEvents.size());

        for (OutboxEvent event : pendingEvents) {
            try {
                publishEvent(event);
                markAsProcessed(event);
            } catch (Exception e) {
                handlePublishFailure(event, e);
            }
        }
    }

    /**
     * Synchronous Kafka send — blocks until broker acknowledgement.
     * Uses the event's topic field (set by OutboxService when the event was created).
     */
    private void publishEvent(OutboxEvent event) {
        String topic = event.getTopic() != null ? event.getTopic()
                : determineTopicFromEventType(event.getEventType());

        try {
            kafkaTemplate.send(topic, event.getAggregateId(), event.getPayload())
                    .get(KAFKA_SEND_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            log.debug("Published outbox event {} to topic {}", event.getId(), topic);
        } catch (Exception e) {
            throw new RuntimeException("Kafka publish failed for event " + event.getId(), e);
        }
    }

    private void markAsProcessed(OutboxEvent event) {
        event.setStatus(OutboxEvent.OutboxStatus.PROCESSED);
        event.setProcessedAt(LocalDateTime.now());
        event.setPublished(true);
        event.setPublishedAt(LocalDateTime.now());
        outboxRepository.save(event);
        log.debug("Marked outbox event {} as processed", event.getId());
    }

    private void handlePublishFailure(OutboxEvent event, Exception e) {
        event.setRetryCount(event.getRetryCount() + 1);
        event.setErrorMessage(e.getMessage());

        if (event.getRetryCount() >= MAX_RETRY_COUNT) {
            event.setStatus(OutboxEvent.OutboxStatus.FAILED);
            log.error("Outbox event {} failed permanently after {} retries: {}",
                    event.getId(), MAX_RETRY_COUNT, e.getMessage());
        } else {
            log.warn("Outbox event {} failed (retry {}/{}): {}",
                    event.getId(), event.getRetryCount(), MAX_RETRY_COUNT, e.getMessage());
        }

        outboxRepository.save(event);
    }

    private String determineTopicFromEventType(String eventType) {
        return "employee-events";
    }

    /**
     * Cleanup old processed events — runs daily at 2 AM.
     * Uses bulk delete query instead of loading entities into memory.
     */
    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void cleanupOldEvents() {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(7);
        int deleted = outboxRepository.deleteProcessedEventsBefore(cutoffDate);
        if (deleted > 0) {
            log.info("Cleaned up {} old outbox events", deleted);
        }
    }
}
