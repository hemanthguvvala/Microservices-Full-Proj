package com.example.employee.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Outbox Service
 * 
 * Used by business services to save events to the outbox table
 * in the same transaction as the business entity.
 */
@Slf4j
@Service
public class OutboxService {

    @Autowired
    private OutboxEventRepository outboxRepository;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Save event to outbox in the same transaction as the entity
     */
    @Transactional
    public void saveEvent(String aggregateType, String aggregateId, 
                         String eventType, Object payload) {
        try {
            String payloadJson = objectMapper.writeValueAsString(payload);
            
            OutboxEvent event = OutboxEvent.builder()
                    .aggregateType(aggregateType)
                    .aggregateId(aggregateId)
                    .eventType(eventType)
                    .topic(aggregateType.toLowerCase() + "-events")
                    .payload(payloadJson)
                    .createdAt(LocalDateTime.now())
                    .status(OutboxEvent.OutboxStatus.PENDING)
                    .retryCount(0)
                    .build();
            
            outboxRepository.save(event);
            log.debug("Saved event to outbox: {} {} {}", aggregateType, aggregateId, eventType);
        } catch (Exception e) {
            log.error("Failed to save event to outbox", e);
            throw new RuntimeException("Failed to save outbox event", e);
        }
    }
}
