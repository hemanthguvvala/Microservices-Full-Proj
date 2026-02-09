package com.example.employee.saga;

import java.util.List;

/**
 * Saga Orchestrator Interface
 * 
 * Defines the contract for saga execution.
 * Each saga type implements this interface.
 */
public interface SagaOrchestrator {
    
    /**
     * Start the saga
     */
    void start(SagaInstance saga);
    
    /**
     * Execute the next step
     */
    void executeNextStep(SagaInstance saga);
    
    /**
     * Compensate (rollback) the saga
     */
    void compensate(SagaInstance saga);
    
    /**
     * Get all steps in this saga
     */
    List<String> getSteps();
    
    /**
     * Get saga type identifier
     */
    String getSagaType();
}
