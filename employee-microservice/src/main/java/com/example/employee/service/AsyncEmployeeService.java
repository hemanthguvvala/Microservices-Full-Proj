package com.example.employee.service;

import com.example.employee.event.EmployeeEvent;
import com.example.employee.model.Employee;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

/**
 * Async service for non-blocking operations.
 * Methods return CompletableFuture for async processing.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AsyncEmployeeService {

    private final KafkaProducerService kafkaProducerService;

    /**
     * Send employee created notification asynchronously
     */
    @Async("taskExecutor")
    public CompletableFuture<Void> sendEmployeeCreatedNotificationAsync(Employee employee) {
        log.info("Async: Sending employee created notification for ID: {}", employee.getId());
        try {
            // Simulate email sending or external API call
            Thread.sleep(1000);
            log.info("Async: Employee created notification sent successfully for ID: {}", employee.getId());
            return CompletableFuture.completedFuture(null);
        } catch (Exception e) {
            log.error("Async: Failed to send employee created notification: {}", e.getMessage());
            return CompletableFuture.failedFuture(e);
        }
    }

    /**
     * Send employee updated notification asynchronously
     */
    @Async("taskExecutor")
    public CompletableFuture<Void> sendEmployeeUpdatedNotificationAsync(Employee employee) {
        log.info("Async: Sending employee updated notification for ID: {}", employee.getId());
        try {
            // Simulate email sending or external API call
            Thread.sleep(500);
            log.info("Async: Employee updated notification sent successfully for ID: {}", employee.getId());
            return CompletableFuture.completedFuture(null);
        } catch (Exception e) {
            log.error("Async: Failed to send employee updated notification: {}", e.getMessage());
            return CompletableFuture.failedFuture(e);
        }
    }

    /**
     * Send employee deleted notification asynchronously
     */
    @Async("taskExecutor")
    public CompletableFuture<Void> sendEmployeeDeletedNotificationAsync(Long employeeId, String email) {
        log.info("Async: Sending employee deleted notification for ID: {}", employeeId);
        try {
            // Simulate email sending or external API call
            Thread.sleep(500);
            log.info("Async: Employee deleted notification sent successfully for ID: {}", employeeId);
            return CompletableFuture.completedFuture(null);
        } catch (Exception e) {
            log.error("Async: Failed to send employee deleted notification: {}", e.getMessage());
            return CompletableFuture.failedFuture(e);
        }
    }

    /**
     * Publish Kafka event asynchronously
     */
    @Async("taskExecutor")
    public CompletableFuture<Void> publishEventAsync(EmployeeEvent event) {
        log.info("Async: Publishing Kafka event: {}", event.getEventType());
        try {
            kafkaProducerService.publishEmployeeEvent(event);
            log.info("Async: Kafka event published successfully: {}", event.getEventType());
            return CompletableFuture.completedFuture(null);
        } catch (Exception e) {
            log.error("Async: Failed to publish Kafka event: {}", e.getMessage());
            return CompletableFuture.failedFuture(e);
        }
    }

    /**
     * Process bulk employee data asynchronously
     */
    @Async("taskExecutor")
    public CompletableFuture<Integer> processBulkEmployeeDataAsync(int count) {
        log.info("Async: Starting bulk employee data processing for {} records", count);
        try {
            // Simulate long-running bulk processing
            Thread.sleep(count * 100L);
            log.info("Async: Bulk employee data processing completed for {} records", count);
            return CompletableFuture.completedFuture(count);
        } catch (Exception e) {
            log.error("Async: Failed to process bulk employee data: {}", e.getMessage());
            return CompletableFuture.failedFuture(e);
        }
    }
}
