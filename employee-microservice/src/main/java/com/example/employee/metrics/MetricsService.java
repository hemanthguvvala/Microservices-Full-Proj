package com.example.employee.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicInteger;

/**
 * Custom business metrics — goes beyond RED metrics (Rate, Errors, Duration).
 *
 * Interview: "What metrics do you track in your microservices?"
 * → "Beyond standard HTTP metrics (request rate, error rate, latency),
 * we track business-specific metrics:
 * 1. employee_created_total — how many employees were onboarded
 * 2. employee_deleted_total — churn indicator
 * 3. payroll_processed_total — business throughput
 * 4. active_employees_gauge — current headcount
 * 5. operation_duration — time to complete business operations
 *
 * These are exposed via /actuator/prometheus and scraped by Prometheus.
 * Grafana dashboards visualize trends; alerts fire on anomalies."
 *
 * Interview: "What's the difference between Counter, Gauge, and Histogram?"
 * → "Counter: monotonically increasing (requests, errors, events created)
 * Gauge: goes up and down (active connections, queue size, active employees)
 * Histogram/Timer: distribution of values (latency percentiles, duration)"
 */
@Slf4j
@Service
public class MetricsService {

    private final MeterRegistry meterRegistry;

    // Counters
    private Counter employeeCreatedCounter;
    private Counter employeeUpdatedCounter;
    private Counter employeeDeletedCounter;
    private Counter outboxEventsPublishedCounter;
    private Counter idempotencyDuplicateCounter;
    private Counter webhookDeliveredCounter;
    private Counter webhookFailedCounter;

    // Gauges
    private final AtomicInteger activeEmployeesGauge = new AtomicInteger(0);
    private final AtomicInteger pendingOutboxEventsGauge = new AtomicInteger(0);

    // Timers
    private Timer employeeCreationTimer;
    private Timer payrollProcessingTimer;

    public MetricsService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @PostConstruct
    public void initMetrics() {
        // Business counters
        employeeCreatedCounter = Counter.builder("employee.created.total")
                .description("Total employees created")
                .tag("service", "employee")
                .register(meterRegistry);

        employeeUpdatedCounter = Counter.builder("employee.updated.total")
                .description("Total employee updates")
                .tag("service", "employee")
                .register(meterRegistry);

        employeeDeletedCounter = Counter.builder("employee.deleted.total")
                .description("Total employees soft-deleted")
                .tag("service", "employee")
                .register(meterRegistry);

        // Infrastructure counters
        outboxEventsPublishedCounter = Counter.builder("outbox.events.published.total")
                .description("Total outbox events published to Kafka")
                .register(meterRegistry);

        idempotencyDuplicateCounter = Counter.builder("idempotency.duplicate.total")
                .description("Total duplicate requests blocked by idempotency")
                .register(meterRegistry);

        webhookDeliveredCounter = Counter.builder("webhook.delivered.total")
                .description("Total webhooks delivered successfully")
                .register(meterRegistry);

        webhookFailedCounter = Counter.builder("webhook.failed.total")
                .description("Total webhook delivery failures")
                .register(meterRegistry);

        // Gauges
        Gauge.builder("employee.active.count", activeEmployeesGauge, AtomicInteger::get)
                .description("Current number of active (non-deleted) employees")
                .register(meterRegistry);

        Gauge.builder("outbox.pending.count", pendingOutboxEventsGauge, AtomicInteger::get)
                .description("Number of pending outbox events")
                .register(meterRegistry);

        // Timers
        employeeCreationTimer = Timer.builder("employee.creation.duration")
                .description("Time to create an employee")
                .register(meterRegistry);

        payrollProcessingTimer = Timer.builder("payroll.processing.duration")
                .description("Time to process a payroll")
                .register(meterRegistry);

        log.info("✅ Custom business metrics initialized");
    }

    // Counter methods
    public void incrementEmployeeCreated() {
        employeeCreatedCounter.increment();
    }

    public void incrementEmployeeUpdated() {
        employeeUpdatedCounter.increment();
    }

    public void incrementEmployeeDeleted() {
        employeeDeletedCounter.increment();
    }

    public void incrementOutboxPublished() {
        outboxEventsPublishedCounter.increment();
    }

    public void incrementIdempotencyDuplicate() {
        idempotencyDuplicateCounter.increment();
    }

    public void incrementWebhookDelivered() {
        webhookDeliveredCounter.increment();
    }

    public void incrementWebhookFailed() {
        webhookFailedCounter.increment();
    }

    // Backward-compatible methods used by EmployeeService
    public void recordEmployeeCreated() {
        employeeCreatedCounter.increment();
    }

    public void recordEmployeeUpdated() {
        employeeUpdatedCounter.increment();
    }

    public void recordEmployeeDeleted() {
        employeeDeletedCounter.increment();
    }

    public void recordEmployeeRetrieved() {
        /* read metric — no counter needed */ }

    public void recordEmployeeNotFound() {
        /* tracked via 404 response metrics */ }

    public void recordValidationError() {
        /* tracked via 400 response metrics */ }

    // Timer methods (backward-compatible)
    public Timer.Sample startTimer() {
        return Timer.start(meterRegistry);
    }

    public void recordTimer(Timer.Sample sample, String operationName) {
        sample.stop(Timer.builder("employee.operation.duration")
                .tag("operation", operationName)
                .register(meterRegistry));
    }

    // Gauge methods
    public void setActiveEmployeeCount(int count) {
        activeEmployeesGauge.set(count);
    }

    public void setPendingOutboxCount(int count) {
        pendingOutboxEventsGauge.set(count);
    }

    // Timer methods
    public Timer getEmployeeCreationTimer() {
        return employeeCreationTimer;
    }

    public Timer getPayrollProcessingTimer() {
        return payrollProcessingTimer;
    }
}
