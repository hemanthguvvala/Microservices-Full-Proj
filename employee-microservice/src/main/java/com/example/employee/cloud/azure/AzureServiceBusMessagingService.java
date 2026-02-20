package com.example.employee.cloud.azure;

import com.example.employee.cloud.CloudMessagingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.stereotype.Service;

import jakarta.jms.Message;
import java.util.UUID;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Azure Service Bus Implementation of CloudMessagingService
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Interview: "How does Azure Service Bus compare to SQS?"
 * → Service Bus is more feature-rich: sessions (ordered groups), scheduled
 *   delivery, dead-letter sub-queue, duplicate detection window, transactions.
 *   SQS is simpler (just a queue) but scales to 300K msg/s standard.
 *
 * Key design decisions:
 * - Queue per bounded context (employee-events, payroll-events)
 * - Sessions enabled for per-employee ordering (sessionId = employeeId)
 * - Scheduled enqueue for delayed processing (e.g., probation reminders)
 * - Dead-letter queue auto configured (maxDeliveryCount = 5)
 *
 * Auth: Managed Identity via Workload Identity Federation → RBAC on namespace
 *
 * Activated when: spring.profiles.active=azure
 */
@Slf4j
@Service
@Profile("azure")
@RequiredArgsConstructor
public class AzureServiceBusMessagingService implements CloudMessagingService {

    private final JmsTemplate jmsTemplate;

    @Override
    public String sendMessage(String queueOrTopic, String message, String messageGroupId) {
        log.info("Azure Service Bus: Sending to queue={}, sessionId={}", queueOrTopic, messageGroupId);

        String messageId = UUID.randomUUID().toString();

        jmsTemplate.send(queueOrTopic, session -> {
            Message jmsMessage = session.createTextMessage(message);
            jmsMessage.setJMSMessageID(messageId);
            if (messageGroupId != null) {
                // Azure Service Bus sessions for per-group ordering
                jmsMessage.setStringProperty("JMSXGroupID", messageGroupId);
            }
            return jmsMessage;
        });

        log.info("Azure Service Bus: Message sent, messageId={}", messageId);
        return messageId;
    }

    @Override
    public String sendDelayedMessage(String queueOrTopic, String message, int delaySeconds) {
        log.info("Azure Service Bus: Sending scheduled message ({}s) to queue={}", delaySeconds, queueOrTopic);

        String messageId = UUID.randomUUID().toString();

        jmsTemplate.send(queueOrTopic, session -> {
            Message jmsMessage = session.createTextMessage(message);
            jmsMessage.setJMSMessageID(messageId);
            // Azure Service Bus scheduled enqueue time
            jmsMessage.setLongProperty("x-opt-scheduled-enqueue-time",
                    System.currentTimeMillis() + (delaySeconds * 1000L));
            return jmsMessage;
        });

        log.info("Azure Service Bus: Scheduled message sent, messageId={}", messageId);
        return messageId;
    }
}
