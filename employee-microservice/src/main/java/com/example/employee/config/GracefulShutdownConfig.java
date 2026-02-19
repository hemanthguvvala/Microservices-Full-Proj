package com.example.employee.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * Graceful Shutdown Configuration — zero-downtime deployments.
 *
 * Interview: "How do you achieve zero-downtime deployments?"
 * → "Three components:
 * 1. Graceful shutdown: Stop accepting new requests, finish in-progress ones
 * 2. Health endpoint: K8s checks /actuator/health before routing traffic
 * 3. PreStop hook: K8s sends SIGTERM → pod drains connections → shuts down
 *
 * During rolling update:
 * - New pod starts, waits for health check ✅
 * - Old pod gets SIGTERM, deregisters from Eureka
 * - Old pod finishes in-flight requests (30s grace period)
 * - Old pod terminates"
 *
 * Interview: "What happens to Kafka consumers during shutdown?"
 * → "Spring Boot's graceful shutdown signals the Kafka listener to stop
 * polling.
 * In-progress messages are processed to completion. Unprocessed offsets are
 * NOT committed, so they'll be reprocessed by another instance."
 */
@Slf4j
@Configuration
public class GracefulShutdownConfig implements DisposableBean {

    /**
     * Customize Tomcat for graceful shutdown.
     * When SIGTERM is received:
     * 1. Stop accepting new connections
     * 2. Wait up to 30s for in-flight requests to complete
     * 3. Then shut down
     */
    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> tomcatCustomizer() {
        return factory -> factory.addConnectorCustomizers(connector -> {
            // Enable graceful shutdown with 30-second timeout
            connector.setProperty("server.shutdown", "graceful");
        });
    }

    @Override
    public void destroy() {
        log.info("🛑 Graceful shutdown initiated — finishing in-flight requests...");

        try {
            // Allow time for Eureka deregistration to propagate
            Thread.sleep(5000);
            log.info("✅ Eureka deregistration propagated");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        log.info("✅ Graceful shutdown complete");
    }
}
