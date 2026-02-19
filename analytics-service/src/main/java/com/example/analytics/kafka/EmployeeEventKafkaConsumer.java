package com.example.analytics.kafka;

import com.example.analytics.service.AnalyticsService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.MDC;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

/**
 * Kafka Consumer — alternative ingestion path for analytics events.
 *
 * Interview: "Why have BOTH gRPC AND Kafka for analytics ingestion?"
 *
 * gRPC (synchronous):
 *   + Immediate ack back to caller — knows the event was recorded
 *   + Strong consistency — if gRPC returns success, data is persisted
 *   - Caller blocks waiting for analytics service to respond
 *   - If analytics service is down, caller gets an error
 *
 * Kafka (asynchronous):
 *   + Fire-and-forget — caller never blocks
 *   + Decoupled — analytics service can be down, events queue up
 *   + Replay — reprocess hours of events after a bug fix
 *   - Eventual consistency — event arrives seconds later
 *   - No per-event ack back to caller
 *
 * In production: use Kafka for normal flow (resilience), gRPC for
 * real-time dashboards that need immediate consistency.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmployeeEventKafkaConsumer {

    private final AnalyticsService analyticsService;
    private final ObjectMapper objectMapper;

    /**
     * Consume employee events from the main topic.
     * manual ACK mode: only commit offset if processing succeeds.
     *
     * Interview: "What's the difference between at-least-once and exactly-once in Kafka?"
     * at-most-once:  auto-commit before processing — may LOSE events on crash
     * at-least-once: manual commit after processing — may DUPLICATE events on crash
     *                → handle with idempotency key (correlationId dedup)
     * exactly-once:  Kafka transactions + producer idempotence — complex but possible
     *                → use when financial records or inventory counts must be exact
     */
    @KafkaListener(
            topics = "${analytics.kafka.topic.employee-events:employee-events}",
            groupId = "${analytics.kafka.consumer.group-id:analytics-employee-consumer}",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeEmployeeEvent(ConsumerRecord<String, String> record,
                                      Acknowledgment acknowledgment,
                                      @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
                                      @Header(KafkaHeaders.OFFSET) long offset) {

        log.info("[KAFKA] Received employee event: partition={} offset={} key={}",
                partition, offset, record.key());

        try {
            JsonNode node = objectMapper.readTree(record.value());

            String employeeId   = node.path("employeeId").asText("");
            String tenantId     = node.path("tenantId").asText("default");
            String eventType    = node.path("eventType").asText("EMPLOYEE_UPDATED");
            String department   = node.path("department").asText("");
            String performedBy  = node.path("performedBy").asText("system");
            String correlationId = node.path("correlationId").asText();

            MDC.put("correlationId", correlationId);
            MDC.put("employeeId", employeeId);

            analyticsService.recordEventFromKafka(
                    employeeId, tenantId, eventType, department, performedBy, correlationId
            );

            acknowledgment.acknowledge(); // Manual offset commit AFTER successful processing
            log.info("[KAFKA] Analytics event recorded for employeeId={} type={}", employeeId, eventType);

        } catch (Exception e) {
            log.error("[KAFKA] Failed to process analytics event: partition={} offset={} error={}",
                    partition, offset, e.getMessage(), e);
            // Don't ack — message will be redelivered (at-least-once semantics)
            // In production: after N retries, use KafkaUtils.seek() to skip + send to DLQ
        } finally {
            MDC.clear();
        }
    }
}
