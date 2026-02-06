package com.example.employee.health;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.stereotype.Component;

/**
 * Custom health indicator for Redis connectivity.
 * Checks if Redis cache is available.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RedisHealthIndicator implements HealthIndicator {

    private final RedisConnectionFactory redisConnectionFactory;

    @Override
    public Health health() {
        try {
            RedisConnection connection = redisConnectionFactory.getConnection();
            String pong = connection.ping();
            connection.close();
            
            if ("PONG".equalsIgnoreCase(pong)) {
                return Health.up()
                        .withDetail("redis", "Available")
                        .withDetail("response", pong)
                        .build();
            } else {
                return Health.down()
                        .withDetail("redis", "Unexpected response")
                        .withDetail("response", pong)
                        .build();
            }
        } catch (Exception e) {
            log.error("Redis health check failed", e);
            return Health.down()
                    .withDetail("redis", "Unavailable")
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }
}
