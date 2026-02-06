package com.example.payroll.service;

import com.example.payroll.event.PayrollEvent;
import com.example.payroll.model.Payroll;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class KafkaProducerService {

    private final KafkaTemplate<String, PayrollEvent> kafkaTemplate;
    private static final String PAYROLL_TOPIC = "payroll-events";

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
            kafkaTemplate.send(PAYROLL_TOPIC, event.getPayrollId().toString(), event);
            log.info("Sent payroll event: {} for payroll ID: {}", event.getEventType(), event.getPayrollId());
        } catch (Exception e) {
            log.error("Failed to send payroll event: {}", e.getMessage(), e);
        }
    }
}
