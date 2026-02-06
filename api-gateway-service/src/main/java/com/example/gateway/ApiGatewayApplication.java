package com.example.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

/**
 * API Gateway Application.
 * Routes requests to appropriate microservices and provides cross-cutting concerns.
 */
@SpringBootApplication
@EnableDiscoveryClient
public class ApiGatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
        System.out.println("\n" +
                "╔═══════════════════════════════════════════════════════════════╗\n" +
                "║            API Gateway Started Successfully!                  ║\n" +
                "║                                                               ║\n" +
                "║  Gateway URL: http://localhost:8080                           ║\n" +
                "║                                                               ║\n" +
                "║  Routes:                                                      ║\n" +
                "║    /employee-service/** → Employee Service                    ║\n" +
                "║                                                               ║\n" +
                "║  Features:                                                    ║\n" +
                "║    ✓ Service Discovery (Eureka)                               ║\n" +
                "║    ✓ Load Balancing                                           ║\n" +
                "║    ✓ Rate Limiting                                            ║\n" +
                "║    ✓ Request/Response Logging                                 ║\n" +
                "╚═══════════════════════════════════════════════════════════════╝\n");
    }
}
