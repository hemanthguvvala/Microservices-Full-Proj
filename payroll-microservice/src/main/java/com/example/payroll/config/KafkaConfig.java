package com.example.payroll.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    @Bean
    public NewTopic payrollEventsTopic() {
        return TopicBuilder.name("payroll-events")
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic employeeEventsTopic() {
        return TopicBuilder.name("employee-events")
                .partitions(3)
                .replicas(1)
                .build();
    }
}
