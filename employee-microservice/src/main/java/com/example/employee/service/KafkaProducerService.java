package com.example.employee.service;

import com.example.employee.event.EmployeeEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class KafkaProducerService {
    
    private final KafkaTemplate<String, Object> kafkaTemplate;
    
    @Value("${kafka.topic.employee-events}")
    private String employeeEventsTopic;
    
    /**
     * Publish employee event to Kafka topic
     */
    public void publishEmployeeEvent(EmployeeEvent event) {
        log.info("Publishing employee event: {} - EventId: {}", event.getEventType(), event.getEventId());
        
        CompletableFuture<SendResult<String, Object>> future = 
            kafkaTemplate.send(employeeEventsTopic, event.getEventId(), event);
        
        future.whenComplete((result, ex) -> {
            if (ex == null) {
                log.info("Successfully published event [EventId: {}] to topic [{}] at offset [{}]",
                    event.getEventId(),
                    result.getRecordMetadata().topic(),
                    result.getRecordMetadata().offset());
            } else {
                log.error("Failed to publish event [EventId: {}] to topic [{}]: {}",
                    event.getEventId(),
                    employeeEventsTopic,
                    ex.getMessage());
            }
        });
    }
    
    /**
     * Publish custom message to Kafka topic
     */
    public void publishMessage(String topic, String key, Object message) {
        log.debug("Publishing message to topic: {}", topic);
        
        CompletableFuture<SendResult<String, Object>> future = 
            kafkaTemplate.send(topic, key, message);
        
        future.whenComplete((result, ex) -> {
            if (ex == null) {
                log.debug("Message published successfully to topic: {} at offset: {}",
                    result.getRecordMetadata().topic(),
                    result.getRecordMetadata().offset());
            } else {
                log.error("Failed to publish message to topic {}: {}", topic, ex.getMessage());
            }
        });
    }
}
