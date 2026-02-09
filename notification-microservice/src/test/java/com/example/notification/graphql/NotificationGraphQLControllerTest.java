package com.example.notification.graphql;

import com.example.notification.dto.NotificationResponse;
import com.example.notification.model.Notification.ChannelType;
import com.example.notification.model.Notification.NotificationStatus;
import com.example.notification.model.Notification.Priority;
import com.example.notification.service.NotificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.graphql.GraphQlTest;
import org.springframework.boot.test.mock.bean.MockBean;
import org.springframework.graphql.test.tester.GraphQlTester;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * GraphQL Controller tests — uses Spring's GraphQlTester.
 *
 * Interview Insight:
 *   "@GraphQlTest + GraphQlTester — loads only the GraphQL layer (slice test).
 *    GraphQlTester.document(query).execute() sends queries
 *    and provides a fluent API to assert response paths."
 */
@GraphQlTest(NotificationGraphQLController.class)
@DisplayName("GraphQL Controller Tests")
class NotificationGraphQLControllerTest {

    @Autowired
    private GraphQlTester graphQlTester;

    @MockBean
    private NotificationService notificationService;

    @Test
    @DisplayName("should query single notification by ID")
    void shouldQueryNotificationById() {
        // NotificationResponse: id, recipientId, title, message, channelType, status, priority,
        //                       templateName, sentAt, readAt, createdDate
        NotificationResponse response = new NotificationResponse(
                1L, "user-123", "Test Title", "Test Message",
                ChannelType.EMAIL, NotificationStatus.SENT, Priority.HIGH,
                "system", LocalDateTime.now(), null, LocalDateTime.now());

        when(notificationService.getById(1L)).thenReturn(response);

        graphQlTester.document("""
                    query {
                        notification(id: 1) {
                            id
                            recipientId
                            title
                            message
                            channelType
                            status
                        }
                    }
                """)
                .execute()
                .path("notification.recipientId").entity(String.class).isEqualTo("user-123")
                .path("notification.title").entity(String.class).isEqualTo("Test Title");
    }

    @Test
    @DisplayName("should create notification via mutation")
    void shouldCreateNotificationViaMutation() {
        NotificationResponse response = new NotificationResponse(
                2L, "user-456", "New Alert", "Something happened",
                ChannelType.SMS, NotificationStatus.SENT, Priority.URGENT,
                null, null, null, LocalDateTime.now());

        when(notificationService.create(any())).thenReturn(response);

        graphQlTester.document("""
                    mutation {
                        createNotification(input: {
                            recipientId: "user-456"
                            title: "New Alert"
                            message: "Something happened"
                            channelType: SMS
                            priority: URGENT
                        }) {
                            id
                            recipientId
                            channelType
                            status
                        }
                    }
                """)
                .execute()
                .path("createNotification.channelType").entity(String.class).isEqualTo("SMS");
    }

    @Test
    @DisplayName("should query unread count for recipient")
    void shouldQueryUnreadCount() {
        when(notificationService.getUnreadCount("user-123")).thenReturn(5L);

        graphQlTester.document("""
                    query {
                        unreadCount(recipientId: "user-123")
                    }
                """)
                .execute()
                .path("unreadCount").entity(Long.class).isEqualTo(5L);
    }
}
