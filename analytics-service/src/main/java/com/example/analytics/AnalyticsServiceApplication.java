package com.example.analytics;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.kafka.annotation.EnableKafka;

/**
 * Analytics Microservice — demonstrates gRPC + Protocol Buffers.
 *
 * Responsibilities:
 * - Receive employee lifecycle events via gRPC (from employee-microservice)
 * - Store analytics data (headcount, promotions, transfers) in PostgreSQL
 * - Serve aggregated analytics queries via gRPC streaming
 * - Also consume Kafka events for event-driven analytics ingestion
 *
 * Key patterns demonstrated:
 * - gRPC server (unary + server-streaming + bidirectional streaming)
 * - Protocol Buffers schema-first design
 * - OpenTelemetry trace propagation across gRPC boundaries
 * - Separation of OLTP (employee-service) vs OLAP (analytics-service) data
 *
 * Port allocation:
 * - HTTP (REST/actuator): 8085
 * - gRPC: 9090 (separate port, HTTP/2)
 */
@SpringBootApplication
@EnableDiscoveryClient
@EnableKafka
public class AnalyticsServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AnalyticsServiceApplication.class, args);
    }
}
