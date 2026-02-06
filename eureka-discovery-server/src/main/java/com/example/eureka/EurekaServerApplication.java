package com.example.eureka;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

/**
 * Eureka Server Application for Service Discovery.
 * All microservices will register with this server.
 */
@SpringBootApplication
@EnableEurekaServer
public class EurekaServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(EurekaServerApplication.class, args);
        System.out.println("\n" +
                "╔═══════════════════════════════════════════════════════════════╗\n" +
                "║          Eureka Server Started Successfully!                  ║\n" +
                "║                                                               ║\n" +
                "║  Dashboard: http://localhost:8761                             ║\n" +
                "║  Service Registry: http://localhost:8761/eureka/apps          ║\n" +
                "║                                                               ║\n" +
                "║  Registered services will appear in the dashboard             ║\n" +
                "╚═══════════════════════════════════════════════════════════════╝\n");
    }
}
