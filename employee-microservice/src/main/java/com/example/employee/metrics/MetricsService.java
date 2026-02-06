package com.example.employee.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicInteger;

/**
 * Service for tracking custom business metrics.
 * Provides counters and timers for employee operations.
 */
@Slf4j
@Service
public class MetricsService {

    private final MeterRegistry meterRegistry;
    private final Counter employeeCreatedCounter;
    private final Counter employeeUpdatedCounter;
    private final Counter employeeDeletedCounter;
    private final Counter employeeRetrievedCounter;
    private final Counter employeeNotFoundCounter;
    private final Counter employeeValidationErrorCounter;
    
    private final AtomicInteger activeEmployees = new AtomicInteger(0);

    public MetricsService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        // Counters for CRUD operations
        this.employeeCreatedCounter = Counter.builder("employee.created")
                .description("Total number of employees created")
                .tag("operation", "create")
                .register(meterRegistry);

        this.employeeUpdatedCounter = Counter.builder("employee.updated")
                .description("Total number of employees updated")
                .tag("operation", "update")
                .register(meterRegistry);

        this.employeeDeletedCounter = Counter.builder("employee.deleted")
                .description("Total number of employees deleted")
                .tag("operation", "delete")
                .register(meterRegistry);

        this.employeeRetrievedCounter = Counter.builder("employee.retrieved")
                .description("Total number of employees retrieved")
                .tag("operation", "read")
                .register(meterRegistry);

        // Counters for errors
        this.employeeNotFoundCounter = Counter.builder("employee.not.found")
                .description("Total number of employee not found errors")
                .tag("error", "not_found")
                .register(meterRegistry);

        this.employeeValidationErrorCounter = Counter.builder("employee.validation.error")
                .description("Total number of validation errors")
                .tag("error", "validation")
                .register(meterRegistry);

        // Timer for operation duration
        this.employeeOperationTimer = Timer.builder("employee.operation.duration")
                .description("Duration of employee operations")
                .register(meterRegistry);

        // Gauge for active employees count
        meterRegistry.gauge("employee.active.count", activeEmployees);
    }

    public void recordEmployeeCreated() {
        employeeCreatedCounter.increment();
        activeEmployees.incrementAndGet();
        log.debug("Metrics: Employee created counter incremented");
    }

    public void recordEmployeeUpdated() {
        employeeUpdatedCounter.increment();
        log.debug("Metrics: Employee updated counter incremented");
    }

    public void recordEmployeeDeleted() {
        employeeDeletedCounter.increment();
        activeEmployees.decrementAndGet();
        log.debug("Metrics: Employee deleted counter incremented");
    }

    public void recordEmployeeRetrieved() {
        employeeRetrievedCounter.increment();
        log.debug("Metrics: Employee retrieved counter incremented");
    }

    public void recordEmployeeNotFound() {
        employeeNotFoundCounter.increment();
        log.debug("Metrics: Employee not found counter incremented");
    }

    public void recordValidationError() {
        employeeValidationErrorCounter.increment();
        log.debug("Metrics: Validation error counter incremented");
    }

    public Timer.Sample startTimer() {
        return Timer.start();
    }

    public void recordTimer(Timer.Sample sample, String operation) {
        sample.stop(Timer.builder("employee.operation.duration")
                .tag("operation", operation)
                .register(meterRegistry));
        log.debug("Metrics: Recorded operation duration for {}", operation);
    }

    public void setActiveEmployeeCount(int count) {
        activeEmployees.set(count);
    }
}
