package com.example.payroll.health;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class KafkaHealthIndicator implements HealthIndicator {

    private final KafkaTemplate<String, ?> kafkaTemplate;

    @Override
    public Health health() {
        try {
            // Try to get Kafka metrics to check connectivity
            kafkaTemplate.metrics();
            return Health.up()
                    .withDetail("kafka", "Available")
                    .build();
        } catch (Exception e) {
            log.error("Kafka health check failed", e);
            return Health.down()
                    .withDetail("kafka", "Unavailable")
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }
}
