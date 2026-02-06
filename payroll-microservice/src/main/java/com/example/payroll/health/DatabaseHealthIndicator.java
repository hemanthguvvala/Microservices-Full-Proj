package com.example.payroll.health;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseHealthIndicator implements HealthIndicator {

    private final DataSource dataSource;

    @Override
    public Health health() {
        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(1000)) {
                return Health.up()
                        .withDetail("database", "Available")
                        .withDetail("type", connection.getMetaData().getDatabaseProductName())
                        .build();
            } else {
                return Health.down()
                        .withDetail("database", "Connection validation failed")
                        .build();
            }
        } catch (Exception e) {
            log.error("Database health check failed", e);
            return Health.down()
                    .withDetail("database", "Unavailable")
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }
}
