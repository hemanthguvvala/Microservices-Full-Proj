package com.example.employee.saga;

import com.example.employee.saga.dto.EmployeeOnboardingData;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Service to initiate and manage sagas
 */
@Slf4j
@Service
@Transactional
public class SagaManagementService {
    
    @Autowired
    private SagaInstanceRepository sagaRepository;
    
    @Autowired
    private EmployeeOnboardingSaga employeeOnboardingSaga;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    /**
     * Start employee onboarding saga
     */
    public SagaInstance startEmployeeOnboardingSaga(EmployeeOnboardingData data) {
        try {
            log.info("Starting employee onboarding saga for: {} {}", data.getFirstName(), data.getLastName());
            
            // Create saga instance
            SagaInstance saga = new SagaInstance();
            saga.setSagaId(UUID.randomUUID().toString());
            saga.setSagaType("EMPLOYEE_ONBOARDING");
            saga.setStatus(SagaInstance.SagaStatus.STARTED);
            saga.setSagaData(objectMapper.writeValueAsString(data));
            
            // Save saga instance
            saga = sagaRepository.save(saga);
            
            // Start execution asynchronously (in production, use @Async or message queue)
            employeeOnboardingSaga.start(saga);
            
            return saga;
            
        } catch (Exception e) {
            log.error("Failed to start employee onboarding saga", e);
            throw new RuntimeException("Failed to start onboarding saga: " + e.getMessage(), e);
        }
    }
    
    /**
     * Get saga status
     */
    public SagaInstance getSagaStatus(String sagaId) {
        return sagaRepository.findBySagaId(sagaId)
                .orElseThrow(() -> new RuntimeException("Saga not found: " + sagaId));
    }
    
    /**
     * Retry failed saga
     */
    public void retrySaga(String sagaId) {
        SagaInstance saga = getSagaStatus(sagaId);
        
        if (saga.getStatus() == SagaInstance.SagaStatus.FAILED) {
            log.info("Retrying failed saga: {}", sagaId);
            saga.setStatus(SagaInstance.SagaStatus.IN_PROGRESS);
            sagaRepository.save(saga);
            employeeOnboardingSaga.executeNextStep(saga);
        } else {
            throw new IllegalStateException("Cannot retry saga in status: " + saga.getStatus());
        }
    }
}
