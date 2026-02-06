package com.example.employee.controller;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller for exposing custom business metrics.
 * Provides endpoints to view custom employee operation metrics.
 */
@RestController
@RequestMapping("/api/metrics")
@RequiredArgsConstructor
@Tag(name = "Metrics", description = "Custom business metrics API")
public class MetricsController {

    private final MeterRegistry meterRegistry;

    @GetMapping("/employee-operations")
    @Operation(summary = "Get employee operation metrics", 
               description = "Returns custom metrics for employee CRUD operations")
    public ResponseEntity<Map<String, Object>> getEmployeeOperationMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        
        // Get employee operation counters
        Counter createdCounter = meterRegistry.find("employee.created").counter();
        Counter updatedCounter = meterRegistry.find("employee.updated").counter();
        Counter deletedCounter = meterRegistry.find("employee.deleted").counter();
        Counter retrievedCounter = meterRegistry.find("employee.retrieved").counter();
        Counter notFoundCounter = meterRegistry.find("employee.not.found").counter();
        Counter validationErrorCounter = meterRegistry.find("employee.validation.error").counter();
        
        metrics.put("employeesCreated", createdCounter != null ? createdCounter.count() : 0);
        metrics.put("employeesUpdated", updatedCounter != null ? updatedCounter.count() : 0);
        metrics.put("employeesDeleted", deletedCounter != null ? deletedCounter.count() : 0);
        metrics.put("employeesRetrieved", retrievedCounter != null ? retrievedCounter.count() : 0);
        metrics.put("employeeNotFoundErrors", notFoundCounter != null ? notFoundCounter.count() : 0);
        metrics.put("validationErrors", validationErrorCounter != null ? validationErrorCounter.count() : 0);
        
        // Get active employee count
        Double activeEmployees = meterRegistry.find("employee.active.count").gauge() != null 
            ? meterRegistry.find("employee.active.count").gauge().value() 
            : 0.0;
        metrics.put("activeEmployees", activeEmployees.intValue());
        
        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/resilience")
    @Operation(summary = "Get resilience4j metrics", 
               description = "Returns circuit breaker, retry, and rate limiter metrics")
    public ResponseEntity<Map<String, Object>> getResilienceMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        
        // Circuit breaker metrics
        Map<String, Object> circuitBreaker = new HashMap<>();
        Double cbSuccessful = getMetricValue("resilience4j.circuitbreaker.calls", "kind", "successful");
        Double cbFailed = getMetricValue("resilience4j.circuitbreaker.calls", "kind", "failed");
        Double cbNotPermitted = getMetricValue("resilience4j.circuitbreaker.calls", "kind", "not_permitted");
        
        circuitBreaker.put("successfulCalls", cbSuccessful != null ? cbSuccessful.longValue() : 0);
        circuitBreaker.put("failedCalls", cbFailed != null ? cbFailed.longValue() : 0);
        circuitBreaker.put("notPermittedCalls", cbNotPermitted != null ? cbNotPermitted.longValue() : 0);
        
        String cbState = getCircuitBreakerState();
        circuitBreaker.put("state", cbState);
        
        metrics.put("circuitBreaker", circuitBreaker);
        
        // Retry metrics
        Map<String, Object> retry = new HashMap<>();
        Double retrySuccessful = getMetricValue("resilience4j.retry.calls", "kind", "successful_without_retry");
        Double retrySuccessfulAfterRetry = getMetricValue("resilience4j.retry.calls", "kind", "successful_with_retry");
        Double retryFailed = getMetricValue("resilience4j.retry.calls", "kind", "failed_without_retry");
        Double retryFailedAfterRetry = getMetricValue("resilience4j.retry.calls", "kind", "failed_with_retry");
        
        retry.put("successfulWithoutRetry", retrySuccessful != null ? retrySuccessful.longValue() : 0);
        retry.put("successfulWithRetry", retrySuccessfulAfterRetry != null ? retrySuccessfulAfterRetry.longValue() : 0);
        retry.put("failedWithoutRetry", retryFailed != null ? retryFailed.longValue() : 0);
        retry.put("failedWithRetry", retryFailedAfterRetry != null ? retryFailedAfterRetry.longValue() : 0);
        
        metrics.put("retry", retry);
        
        // Rate limiter metrics
        Map<String, Object> rateLimiter = new HashMap<>();
        Double available = getGaugeValue("resilience4j.ratelimiter.available.permissions");
        Double waiting = getGaugeValue("resilience4j.ratelimiter.waiting_threads");
        
        rateLimiter.put("availablePermissions", available != null ? available.intValue() : 0);
        rateLimiter.put("waitingThreads", waiting != null ? waiting.intValue() : 0);
        
        metrics.put("rateLimiter", rateLimiter);
        
        // Bulkhead metrics
        Map<String, Object> bulkhead = new HashMap<>();
        Double availableCalls = getGaugeValue("resilience4j.bulkhead.available.concurrent.calls");
        Double maxAllowed = getGaugeValue("resilience4j.bulkhead.max.allowed.concurrent.calls");
        
        bulkhead.put("availableConcurrentCalls", availableCalls != null ? availableCalls.intValue() : 0);
        bulkhead.put("maxAllowedConcurrentCalls", maxAllowed != null ? maxAllowed.intValue() : 0);
        
        metrics.put("bulkhead", bulkhead);
        
        return ResponseEntity.ok(metrics);
    }
    
    private Double getMetricValue(String metricName, String tagKey, String tagValue) {
        Counter counter = meterRegistry.find(metricName).tag(tagKey, tagValue).counter();
        return counter != null ? counter.count() : null;
    }
    
    private Double getGaugeValue(String metricName) {
        return meterRegistry.find(metricName).gauge() != null 
            ? meterRegistry.find(metricName).gauge().value() 
            : null;
    }
    
    private String getCircuitBreakerState() {
        // Check circuit breaker state gauge
        Double stateOpen = meterRegistry.find("resilience4j.circuitbreaker.state")
            .tag("state", "open").gauge() != null 
            ? meterRegistry.find("resilience4j.circuitbreaker.state").tag("state", "open").gauge().value() 
            : 0.0;
        Double stateHalfOpen = meterRegistry.find("resilience4j.circuitbreaker.state")
            .tag("state", "half_open").gauge() != null 
            ? meterRegistry.find("resilience4j.circuitbreaker.state").tag("state", "half_open").gauge().value() 
            : 0.0;
        
        if (stateOpen > 0) return "OPEN";
        if (stateHalfOpen > 0) return "HALF_OPEN";
        return "CLOSED";
    }
}
