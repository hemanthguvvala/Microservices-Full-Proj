package com.example.notification.repository;

import com.example.notification.dto.NotificationFilter;
import com.example.notification.model.Notification;
import com.example.notification.model.Notification.ChannelType;
import com.example.notification.model.Notification.NotificationStatus;
import com.example.notification.model.Notification.Priority;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * JPA Specification Tests — validates composable queries.
 *
 * @DataJpaTest loads only JPA / Repository layer with in-memory H2.
 */
@DataJpaTest
@ActiveProfiles("test")
class NotificationSpecificationTest {

    @Autowired
    private NotificationRepository repository;

    @BeforeEach
    void setUp() {
        repository.deleteAll();

        repository.saveAll(List.of(
                Notification.builder()
                        .recipientId("user-1")
                        .title("Welcome Email")
                        .message("Welcome to the platform")
                        .channelType(ChannelType.EMAIL)
                        .status(NotificationStatus.SENT)
                        .priority(Priority.LOW)
                        .createdDate(LocalDateTime.now().minusDays(10))
                        .lastModifiedDate(LocalDateTime.now())
                        .retryCount(0)
                        .build(),
                Notification.builder()
                        .recipientId("user-1")
                        .title("Urgent Alert")
                        .message("Server is down")
                        .channelType(ChannelType.PUSH)
                        .status(NotificationStatus.PENDING)
                        .priority(Priority.URGENT)
                        .createdDate(LocalDateTime.now().minusHours(1))
                        .lastModifiedDate(LocalDateTime.now())
                        .retryCount(0)
                        .build(),
                Notification.builder()
                        .recipientId("user-2")
                        .title("SMS Verification")
                        .message("Your code is 1234")
                        .channelType(ChannelType.SMS)
                        .status(NotificationStatus.DELIVERED)
                        .priority(Priority.HIGH)
                        .createdDate(LocalDateTime.now().minusDays(2))
                        .lastModifiedDate(LocalDateTime.now())
                        .retryCount(0)
                        .build()
        ));
    }

    @Test
    @DisplayName("should filter by recipientId")
    void shouldFilterByRecipient() {
        Specification<Notification> spec = NotificationSpecification.hasRecipientId("user-1");
        List<Notification> result = repository.findAll(spec);
        assertThat(result).hasSize(2);
        assertThat(result).allMatch(n -> n.getRecipientId().equals("user-1"));
    }

    @Test
    @DisplayName("should filter by channelType")
    void shouldFilterByChannel() {
        Specification<Notification> spec = NotificationSpecification.hasChannelType(ChannelType.SMS);
        List<Notification> result = repository.findAll(spec);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("SMS Verification");
    }

    @Test
    @DisplayName("should filter by priority")
    void shouldFilterByPriority() {
        Specification<Notification> spec = NotificationSpecification.hasPriority(Priority.URGENT);
        List<Notification> result = repository.findAll(spec);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("Urgent Alert");
    }

    @Test
    @DisplayName("should filter by search term in title")
    void shouldFilterBySearchTerm() {
        Specification<Notification> spec = NotificationSpecification.containsSearchTerm("alert");
        List<Notification> result = repository.findAll(spec);
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("should compose multiple specifications with AND")
    void shouldComposeMultipleSpecs() {
        NotificationFilter filter = new NotificationFilter(
                "user-1", null, null, Priority.URGENT, null, null, null);

        Specification<Notification> spec = NotificationSpecification.buildFrom(filter);
        Page<Notification> result = repository.findAll(spec, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getTitle()).isEqualTo("Urgent Alert");
    }

    @Test
    @DisplayName("should return all when empty filter")
    void shouldReturnAllWithEmptyFilter() {
        NotificationFilter filter = NotificationFilter.empty();
        Specification<Notification> spec = NotificationSpecification.buildFrom(filter);
        List<Notification> result = repository.findAll(spec);
        assertThat(result).hasSize(3);
    }

    @Test
    @DisplayName("should filter by date range")
    void shouldFilterByDateRange() {
        Specification<Notification> spec = NotificationSpecification.createdAfter(
                LocalDateTime.now().minusDays(3));
        List<Notification> result = repository.findAll(spec);
        assertThat(result).hasSize(2); // SMS (2 days ago) + Push (1 hour ago)
    }
}
