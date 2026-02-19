package com.example.employee.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.header.internals.RecordHeader;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Async Request-Reply Pattern — non-blocking inter-service communication.
 *
 * Interview: "How do you handle request-reply over Kafka?"
 * → "Synchronous REST calls between services create tight coupling and
 * cascading failures. The Async Request-Reply pattern:
 * 1. Service A sends a request to 'employee-request' topic with a
 * correlation ID and reply-to topic in Kafka headers
 * 2. Service B processes the request and sends response to the
 * 'employee-reply' topic with the same correlation ID
 * 3. Service A correlates the response using the ID
 *
 * Benefits: Decoupled services, no cascading failures, natural load leveling."
 *
 * Interview: "What about timeout handling?"
 * → "The requesting service sets a TTL on the correlation. If no response
 * arrives within the TTL, it times out and returns a fallback response."
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AsyncRequestReplyHandler {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    private static final String REQUEST_TOPIC = "employee-request";
    private static final String REPLY_TOPIC = "employee-reply";

    /**
     * Send a request message with correlation ID for async request-reply.
     */
    public String sendRequest(String key, Object payload) {
        String correlationId = UUID.randomUUID().toString();

        ProducerRecord<String, Object> record = new ProducerRecord<>(REQUEST_TOPIC, key, payload);
        record.headers().add(new RecordHeader("correlationId",
                correlationId.getBytes(StandardCharsets.UTF_8)));
        record.headers().add(new RecordHeader("replyTo",
                REPLY_TOPIC.getBytes(StandardCharsets.UTF_8)));

        kafkaTemplate.send(record);
        log.debug("Async request sent: correlationId={}, key={}", correlationId, key);

        return correlationId;
    }

    /**
     * Handle incoming requests and send replies.
     */
    @KafkaListener(topics = REQUEST_TOPIC, groupId = "employee-request-group")
    public void handleRequest(ConsumerRecord<String, Object> record) {
        String correlationId = extractHeader(record, "correlationId");
        String replyTo = extractHeader(record, "replyTo");

        log.info("Async request received: correlationId={}, key={}", correlationId, record.key());

        // Process the request (in a real implementation, delegate to service layer)
        Object response = processRequest(record.key(), record.value());

        // Send reply with same correlation ID
        if (replyTo != null) {
            ProducerRecord<String, Object> reply = new ProducerRecord<>(replyTo, record.key(), response);
            reply.headers().add(new RecordHeader("correlationId",
                    correlationId != null ? correlationId.getBytes(StandardCharsets.UTF_8) : new byte[0]));

            kafkaTemplate.send(reply);
            log.info("Async reply sent: correlationId={}", correlationId);
        }
    }

    private Object processRequest(String key, Object value) {
        // Placeholder — actual processing would be delegated to the service layer
        return java.util.Map.of(
                "status", "processed",
                "key", key,
                "timestamp", java.time.Instant.now().toString());
    }

    private String extractHeader(ConsumerRecord<?, ?> record, String headerName) {
        var header = record.headers().lastHeader(headerName);
        return header != null ? new String(header.value(), StandardCharsets.UTF_8) : null;
    }
}
