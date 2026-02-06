package com.example.gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Gateway route configuration.
 * Defines routing rules for microservices.
 */
@Configuration
public class GatewayConfig {

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                // Employee Service Route
                .route("employee-service", r -> r
                        .path("/employee-service/**")
                        .filters(f -> f
                                .stripPrefix(1)
                                .addRequestHeader("X-Gateway-Request", "API-Gateway")
                                .addResponseHeader("X-Gateway-Response", "API-Gateway"))
                        .uri("lb://employee-service"))
                
                // Health Check Route (no strip prefix)
                .route("employee-health", r -> r
                        .path("/actuator/**")
                        .filters(f -> f
                                .addRequestHeader("X-Gateway-Request", "API-Gateway"))
                        .uri("lb://employee-service"))
                
                .build();
    }
}
