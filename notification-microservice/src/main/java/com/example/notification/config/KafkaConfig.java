package com.example.notification.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

/**
 * Kafka Topic Configuration — creates topics on startup.
 *
 * Interview: "How does NewTopic work?"
 *   → Spring Kafka auto-creates topics when KafkaAdmin bean detects
 *     NewTopic beans. Uses AdminClient under the hood to create
 *     topics with the specified partitions and replicas.
 */
@Configuration
public class KafkaConfig {

    public static final String EMPLOYEE_EVENTS_TOPIC = "employee-events";
    public static final String NOTIFICATION_EVENTS_TOPIC = "notification-events";

    @Bean
    public NewTopic employeeEventsTopic() {
        return TopicBuilder.name(EMPLOYEE_EVENTS_TOPIC)
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic notificationEventsTopic() {
        return TopicBuilder.name(NOTIFICATION_EVENTS_TOPIC)
                .partitions(3)
                .replicas(1)
                .build();
    }
}
