package com.example.employee.config;

import org.springframework.cloud.loadbalancer.core.ServiceInstanceListSupplier;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring Cloud LoadBalancer Configuration
 * Provides client-side load balancing for inter-service communication
 */
@Configuration
public class LoadBalancerConfig {

    /**
     * Custom load balancer configuration
     * Can be customized with different strategies (Round Robin, Random, Weighted, etc.)
     */
    @Bean
    public ServiceInstanceListSupplier discoveryClientServiceInstanceListSupplier(
            ConfigurableApplicationContext context) {
        return ServiceInstanceListSupplier.builder()
                .withDiscoveryClient()
                .withHealthChecks()
                .withCaching()
                .build(context);
    }
}
