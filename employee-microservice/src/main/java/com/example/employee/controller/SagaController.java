package com.example.employee.controller;

import com.example.employee.saga.SagaInstance;
import com.example.employee.saga.SagaManagementService;
import com.example.employee.saga.dto.EmployeeOnboardingData;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for Saga operations
 */
@Slf4j
@RestController
@RequestMapping("/api/sagas")
@Tag(name = "Saga Management", description = "Saga pattern orchestration endpoints")
public class SagaController {
    
    @Autowired
    private SagaManagementService sagaService;
    
    @PostMapping("/employee-onboarding")
    @Operation(summary = "Start employee onboarding saga")
    public ResponseEntity<SagaInstance> startEmployeeOnboarding(@RequestBody EmployeeOnboardingData data) {
        log.info("Starting employee onboarding saga via API for: {} {}", data.getFirstName(), data.getLastName());
        
        SagaInstance saga = sagaService.startEmployeeOnboardingSaga(data);
        
        return ResponseEntity
                .status(HttpStatus.ACCEPTED)
                .body(saga);
    }
    
    @GetMapping("/{sagaId}")
    @Operation(summary = "Get saga status")
    public ResponseEntity<SagaInstance> getSagaStatus(@PathVariable String sagaId) {
        SagaInstance saga = sagaService.getSagaStatus(sagaId);
        return ResponseEntity.ok(saga);
    }
    
    @PostMapping("/{sagaId}/retry")
    @Operation(summary = "Retry failed saga")
    public ResponseEntity<Void> retrySaga(@PathVariable String sagaId) {
        log.info("Retrying saga: {}", sagaId);
        sagaService.retrySaga(sagaId);
        return ResponseEntity.accepted().build();
    }
}
