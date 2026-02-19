package com.example.gateway.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Fallback Controller — returns graceful error responses when circuit breaker opens.
 *
 * Interview: "What happens when a downstream service is unavailable?"
 *   → "The circuit breaker opens after the failure threshold is reached.
 *      Instead of returning a 500 error, the gateway routes to a fallback
 *      handler that returns a meaningful 503 response with retry guidance."
 */
@RestController
@RequestMapping("/fallback")
public class FallbackController {

    @GetMapping("/employee")
    public ResponseEntity<Map<String, Object>> employeeFallback() {
        return buildFallbackResponse("employee-service");
    }

    @GetMapping("/payroll")
    public ResponseEntity<Map<String, Object>> payrollFallback() {
        return buildFallbackResponse("payroll-service");
    }

    @GetMapping("/notification")
    public ResponseEntity<Map<String, Object>> notificationFallback() {
        return buildFallbackResponse("notification-service");
    }

    private ResponseEntity<Map<String, Object>> buildFallbackResponse(String serviceName) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                        "status", 503,
                        "error", "Service Unavailable",
                        "message", serviceName + " is temporarily unavailable. Please try again later.",
                        "timestamp", LocalDateTime.now().toString()
                ));
    }
}
