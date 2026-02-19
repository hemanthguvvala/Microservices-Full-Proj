package com.example.gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Gateway route configuration — routes ALL microservices through the gateway.
 *
 * Interview: "What patterns does an API Gateway implement?"
 *   1. Routing         — maps external URLs to internal services
 *   2. Load Balancing  — lb:// prefix uses Eureka for client-side LB
 *   3. Rate Limiting   — Redis-backed token bucket per client
 *   4. Circuit Breaker — Resilience4j fallback on downstream failure
 *   5. Header Enrichment — adds tracing/gateway headers
 *   6. Path Rewriting  — stripPrefix removes the service prefix
 */
@Configuration
public class GatewayConfig {

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()

                // ── Employee Service ─────────────────────────────────────────
                .route("employee-service", r -> r
                        .path("/employee-service/**")
                        .filters(f -> f
                                .stripPrefix(1)
                                .addRequestHeader("X-Gateway-Request", "API-Gateway")
                                .addResponseHeader("X-Gateway-Response", "API-Gateway")
                                .circuitBreaker(cb -> cb
                                        .setName("employeeServiceCB")
                                        .setFallbackUri("forward:/fallback/employee"))
                                .retry(retryConfig -> retryConfig.setRetries(3)))
                        .uri("lb://employee-service"))

                // ── Payroll Service ──────────────────────────────────────────
                .route("payroll-service", r -> r
                        .path("/payroll-service/**")
                        .filters(f -> f
                                .stripPrefix(1)
                                .addRequestHeader("X-Gateway-Request", "API-Gateway")
                                .addResponseHeader("X-Gateway-Response", "API-Gateway")
                                .circuitBreaker(cb -> cb
                                        .setName("payrollServiceCB")
                                        .setFallbackUri("forward:/fallback/payroll"))
                                .retry(retryConfig -> retryConfig.setRetries(3)))
                        .uri("lb://payroll-service"))

                // ── Notification Service ─────────────────────────────────────
                .route("notification-service", r -> r
                        .path("/notification-service/**")
                        .filters(f -> f
                                .stripPrefix(1)
                                .addRequestHeader("X-Gateway-Request", "API-Gateway")
                                .addResponseHeader("X-Gateway-Response", "API-Gateway")
                                .circuitBreaker(cb -> cb
                                        .setName("notificationServiceCB")
                                        .setFallbackUri("forward:/fallback/notification"))
                                .retry(retryConfig -> retryConfig.setRetries(3)))
                        .uri("lb://notification-service"))

                // ── Health Check Route ───────────────────────────────────────
                .route("employee-health", r -> r
                        .path("/actuator/**")
                        .filters(f -> f
                                .addRequestHeader("X-Gateway-Request", "API-Gateway"))
                        .uri("lb://employee-service"))

                .build();
    }
}
