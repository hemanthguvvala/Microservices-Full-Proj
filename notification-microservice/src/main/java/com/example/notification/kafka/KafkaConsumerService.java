package com.example.notification.kafka;

import com.example.notification.dto.NotificationRequest;
import com.example.notification.model.Notification.ChannelType;
import com.example.notification.model.Notification.Priority;
import com.example.notification.service.NotificationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

/**
 * Kafka Consumer — Listens to "employee-events" topic published by Employee Service.
 *
 * Wiring: Employee Service publishes EmployeeEvent → Kafka → This consumer
 *         → Creates notification in Notification Service.
 *
 * Interview: "How does @KafkaListener work?"
 *   → Spring Kafka creates a ConcurrentMessageListenerContainer that polls
 *     the topic. Each message is deserialized and delivered to the annotated
 *     method. The consumer group ensures each partition is consumed by
 *     only one consumer in the group, enabling horizontal scaling.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class KafkaConsumerService {

    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    /**
     * Consume employee events and create notifications.
     * Employee Service publishes events like CREATED, UPDATED, DELETED, PROMOTED.
     */
    @KafkaListener(
        topics = "employee-events",
        groupId = "notification-group"
    )
    public void consumeEmployeeEvent(
            @Payload String payload,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset) {

        log.info("Received employee event from topic [{}], partition [{}], offset [{}]",
            topic, partition, offset);

        try {
            JsonNode eventNode = objectMapper.readTree(payload);

            String eventType = eventNode.path("eventType").asText("UNKNOWN");
            String employeeId = eventNode.path("employee").path("id").asText("N/A");
            String firstName = eventNode.path("employee").path("firstName").asText("");
            String lastName = eventNode.path("employee").path("lastName").asText("");

            log.info("Processing employee event: type={}, employeeId={}, name={} {}",
                eventType, employeeId, firstName, lastName);

            // Build a notification based on the employee event
            NotificationRequest request = new NotificationRequest(
                employeeId,                                             // recipientId
                buildTitle(eventType, firstName, lastName),             // title
                buildMessage(eventType, firstName, lastName),           // message
                ChannelType.IN_APP,                                    // channelType
                Priority.NORMAL,                                       // priority
                "employee-event-" + eventType.toLowerCase()            // templateName
            );

            notificationService.create(request);
            log.info("Notification created for employee event: {} — employeeId={}", eventType, employeeId);

        } catch (Exception e) {
            log.error("Failed to process employee event at offset {}: {}", offset, e.getMessage(), e);
            // In production: send to dead-letter topic (DLT)
        }
    }

    private String buildTitle(String eventType, String firstName, String lastName) {
        return switch (eventType) {
            case "CREATED"  -> "New Employee: " + firstName + " " + lastName;
            case "UPDATED"  -> "Employee Updated: " + firstName + " " + lastName;
            case "DELETED"  -> "Employee Removed: " + firstName + " " + lastName;
            case "PROMOTED" -> "Employee Promoted: " + firstName + " " + lastName;
            default         -> "Employee Event: " + eventType;
        };
    }

    private String buildMessage(String eventType, String firstName, String lastName) {
        return switch (eventType) {
            case "CREATED"  -> firstName + " " + lastName + " has joined the organization.";
            case "UPDATED"  -> firstName + " " + lastName + "'s profile has been updated.";
            case "DELETED"  -> firstName + " " + lastName + " has been removed from the system.";
            case "PROMOTED" -> "Congratulations! " + firstName + " " + lastName + " has been promoted.";
            default         -> "An employee event (" + eventType + ") occurred for " + firstName + " " + lastName;
        };
    }
}
