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

/**
 * Outbox Event Publisher
 * 
 * Runs periodically to publish events from the outbox table to Kafka.
 * This ensures reliable event publishing with at-least-once delivery.
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

    private static final int MAX_RETRY_COUNT = 3;

    /**
     * Process pending outbox events every 5 seconds
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

    private void publishEvent(OutboxEvent event) {
        String topic = determineTopicFromEventType(event.getEventType());
        
        kafkaTemplate.send(topic, event.getAggregateId(), event.getPayload())
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to publish event {} to Kafka", event.getId(), ex);
                        throw new RuntimeException("Kafka publish failed", ex);
                    }
                });
        
        log.debug("Published outbox event {} to topic {}", event.getId(), topic);
    }

    private void markAsProcessed(OutboxEvent event) {
        event.setStatus(OutboxEvent.OutboxStatus.PROCESSED);
        event.setProcessedAt(LocalDateTime.now());
        outboxRepository.save(event);
        log.debug("Marked outbox event {} as processed", event.getId());
    }

    private void handlePublishFailure(OutboxEvent event, Exception e) {
        event.setRetryCount(event.getRetryCount() + 1);
        event.setErrorMessage(e.getMessage());
        
        if (event.getRetryCount() >= MAX_RETRY_COUNT) {
            event.setStatus(OutboxEvent.OutboxStatus.FAILED);
            log.error("Outbox event {} failed after {} retries", event.getId(), MAX_RETRY_COUNT);
        }
        
        outboxRepository.save(event);
    }

    private String determineTopicFromEventType(String eventType) {
        // Map event types to Kafka topics
        return "employee-events";  // Can be made configurable
    }

    /**
     * Cleanup old processed events (run daily)
     */
    @Scheduled(cron = "0 0 2 * * ?")  // 2 AM daily
    @Transactional
    public void cleanupOldEvents() {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(7);
        List<OutboxEvent> oldEvents = outboxRepository.findByStatusAndCreatedAtBefore(
                OutboxEvent.OutboxStatus.PROCESSED, cutoffDate);
        
        if (!oldEvents.isEmpty()) {
            outboxRepository.deleteAll(oldEvents);
            log.info("Cleaned up {} old outbox events", oldEvents.size());
        }
    }
}
