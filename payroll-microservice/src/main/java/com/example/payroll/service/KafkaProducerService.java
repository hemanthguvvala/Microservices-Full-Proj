package com.example.payroll.service;

import com.example.payroll.event.PayrollEvent;
import com.example.payroll.model.Payroll;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;

/**
 * Kafka Producer — publishes payroll lifecycle events.
 *
 * Interview: "Why not fire-and-forget for Kafka sends?"
 * → "If the broker is down or the topic doesn't exist, fire-and-forget
 *    silently swallows the exception. The event is lost forever.
 *    Blocking .get() with a timeout ensures we KNOW if the send failed,
 *    and the caller can handle the error (retry, compensate, alert)."
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class KafkaProducerService {

    private final KafkaTemplate<String, PayrollEvent> kafkaTemplate;
    private static final String PAYROLL_TOPIC = "payroll-events";
    private static final long SEND_TIMEOUT_SECONDS = 10;

    public void sendPayrollCreatedEvent(Payroll payroll) {
        PayrollEvent event = buildPayrollEvent(payroll, "CREATED");
        sendEvent(event);
    }

    public void sendPayrollUpdatedEvent(Payroll payroll) {
        PayrollEvent event = buildPayrollEvent(payroll, "UPDATED");
        sendEvent(event);
    }

    public void sendPayrollApprovedEvent(Payroll payroll) {
        PayrollEvent event = buildPayrollEvent(payroll, "APPROVED");
        sendEvent(event);
    }

    public void sendPayrollPaymentInitiatedEvent(Payroll payroll) {
        PayrollEvent event = buildPayrollEvent(payroll, "PAYMENT_INITIATED");
        sendEvent(event);
    }

    public void sendPayrollPaidEvent(Payroll payroll) {
        PayrollEvent event = buildPayrollEvent(payroll, "PAID");
        sendEvent(event);
    }

    private PayrollEvent buildPayrollEvent(Payroll payroll, String eventType) {
        return PayrollEvent.builder()
                .payrollId(payroll.getId())
                .employeeId(payroll.getEmployeeId())
                .netSalary(payroll.getNetSalary())
                .payPeriodStart(payroll.getPayPeriodStart())
                .payPeriodEnd(payroll.getPayPeriodEnd())
                .status(payroll.getStatus().toString())
                .eventType(eventType)
                .timestamp(LocalDateTime.now())
                .build();
    }

    private void sendEvent(PayrollEvent event) {
        try {
            kafkaTemplate.send(PAYROLL_TOPIC, event.getPayrollId().toString(), event)
                    .get(SEND_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            log.info("Sent payroll event: {} for payroll ID: {}", event.getEventType(), event.getPayrollId());
        } catch (Exception e) {
            log.error("Failed to send payroll event: {}", e.getMessage(), e);
            // Re-throw so the caller knows the event wasn't delivered
            throw new RuntimeException("Kafka publish failed for payroll event " + event.getEventType(), e);
        }
    }
}
