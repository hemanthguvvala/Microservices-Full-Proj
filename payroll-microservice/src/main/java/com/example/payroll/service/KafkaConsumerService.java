package com.example.payroll.service;

import com.example.payroll.event.PayrollEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class KafkaConsumerService {

    @KafkaListener(topics = "employee-events", groupId = "${spring.kafka.consumer.group-id}")
    public void consumeEmployeeEvent(String message) {
        log.info("Received employee event: {}", message);
        // Handle employee events (e.g., employee created, updated, deleted)
        // Update payroll records if needed
    }

    @KafkaListener(topics = "payroll-events", groupId = "${spring.kafka.consumer.group-id}")
    public void consumePayrollEvent(PayrollEvent event) {
        log.info("Received payroll event: {} for payroll ID: {}", event.getEventType(), event.getPayrollId());
        // Handle internal payroll events if needed
    }
}
