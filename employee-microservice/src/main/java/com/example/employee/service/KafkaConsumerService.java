package com.example.employee.service;

import com.example.employee.event.EmployeeEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class KafkaConsumerService {
    
    private final ObjectMapper objectMapper;
    
    /**
     * Listen to employee events topic
     */
    @KafkaListener(
        topics = "${kafka.topic.employee-events}",
        groupId = "${spring.kafka.consumer.group-id}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeEmployeeEvent(
            @Payload Object payload,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset) {
        
        try {
            // Convert payload to EmployeeEvent
            EmployeeEvent event = objectMapper.convertValue(payload, EmployeeEvent.class);
            
            log.info("Consumed employee event from topic [{}], partition [{}], offset [{}]",
                topic, partition, offset);
            log.info("Event Details - Type: {}, EventId: {}, Employee: {} {}, PerformedBy: {}",
                event.getEventType(),
                event.getEventId(),
                event.getEmployee().getFirstName(),
                event.getEmployee().getLastName(),
                event.getPerformedBy());
            
            // Process the event based on type
            processEvent(event);
            
        } catch (Exception e) {
            log.error("Error processing employee event from offset {}: {}", offset, e.getMessage(), e);
        }
    }
    
    /**
     * Process employee event based on type
     */
    private void processEvent(EmployeeEvent event) {
        switch (event.getEventType()) {
            case CREATED:
                handleEmployeeCreated(event);
                break;
            case UPDATED:
                handleEmployeeUpdated(event);
                break;
            case DELETED:
                handleEmployeeDeleted(event);
                break;
            default:
                log.warn("Unknown event type: {}", event.getEventType());
        }
    }
    
    private void handleEmployeeCreated(EmployeeEvent event) {
        log.info("🎉 Processing CREATED event for employee: {} {}",
            event.getEmployee().getFirstName(),
            event.getEmployee().getLastName());
        
        // Add your business logic here:
        // - Send welcome email
        // - Create user account
        // - Setup access permissions
        // - Notify HR department
        // - Update analytics
        
        log.info("✅ Successfully processed employee creation event");
    }
    
    private void handleEmployeeUpdated(EmployeeEvent event) {
        log.info("🔄 Processing UPDATED event for employee: {} {}",
            event.getEmployee().getFirstName(),
            event.getEmployee().getLastName());
        
        // Add your business logic here:
        // - Send notification email
        // - Update related systems
        // - Audit trail logging
        // - Sync with external systems
        
        log.info("✅ Successfully processed employee update event");
    }
    
    private void handleEmployeeDeleted(EmployeeEvent event) {
        log.info("🗑️ Processing DELETED event for employee: {} {}",
            event.getEmployee().getFirstName(),
            event.getEmployee().getLastName());
        
        // Add your business logic here:
        // - Revoke access permissions
        // - Archive employee data
        // - Send exit notifications
        // - Update payroll system
        // - Cleanup related resources
        
        log.info("✅ Successfully processed employee deletion event");
    }
}
