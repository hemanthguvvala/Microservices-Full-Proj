package com.example.notification.service;

import com.example.notification.dto.NotificationFilter;
import com.example.notification.dto.NotificationRequest;
import com.example.notification.dto.NotificationResponse;
import com.example.notification.exception.NotificationNotFoundException;
import com.example.notification.model.Notification;
import com.example.notification.model.Notification.ChannelType;
import com.example.notification.model.Notification.NotificationStatus;
import com.example.notification.model.Notification.Priority;
import com.example.notification.repository.NotificationRepository;
import com.example.notification.strategy.NotificationStrategy;
import com.example.notification.strategy.NotificationStrategyFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for NotificationServiceImpl — Mockito-based isolation tests.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationService Unit Tests")
class NotificationServiceImplTest {

    @Mock
    private NotificationRepository repository;

    @Mock
    private NotificationStrategyFactory strategyFactory;

    @Mock
    private NotificationStrategy emailStrategy;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private NotificationServiceImpl service;

    private Notification sampleNotification;
    private NotificationRequest sampleRequest;

    @BeforeEach
    void setUp() {
        sampleNotification = Notification.builder()
                .id(1L)
                .recipientId("user-123")
                .title("Test Notification")
                .message("Hello world")
                .channelType(ChannelType.EMAIL)
                .status(NotificationStatus.PENDING)
                .priority(Priority.MEDIUM)
                .createdDate(LocalDateTime.now())
                .lastModifiedDate(LocalDateTime.now())
                .retryCount(0)
                .version(0L)
                .build();

        sampleRequest = new NotificationRequest(
                "user-123", "Test Notification", "Hello world",
                ChannelType.EMAIL, Priority.MEDIUM, null, null, null);
    }

    @Nested
    @DisplayName("create()")
    class CreateTests {

        @Test
        @DisplayName("should create notification, dispatch strategy, and publish event")
        void shouldCreateAndDispatch() {
            when(repository.save(any(Notification.class))).thenReturn(sampleNotification);
            when(strategyFactory.getStrategy(ChannelType.EMAIL)).thenReturn(emailStrategy);

            NotificationResponse response = service.create(sampleRequest);

            assertThat(response).isNotNull();
            assertThat(response.recipientId()).isEqualTo("user-123");
            assertThat(response.title()).isEqualTo("Test Notification");

            verify(repository).save(any(Notification.class));
            verify(strategyFactory).getStrategy(ChannelType.EMAIL);
            verify(emailStrategy).send(any(Notification.class));
            verify(eventPublisher).publishEvent(any());
        }

        @Test
        @DisplayName("should set status to FAILED when strategy throws")
        void shouldHandleStrategyFailure() {
            when(strategyFactory.getStrategy(ChannelType.EMAIL)).thenReturn(emailStrategy);
            doThrow(new RuntimeException("SMTP down")).when(emailStrategy).send(any());
            when(repository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

            NotificationResponse response = service.create(sampleRequest);

            assertThat(response).isNotNull();
            // save called twice: initial + status update on failure
            verify(repository, times(2)).save(any(Notification.class));

            ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
            verify(repository, times(2)).save(captor.capture());
            Notification failedNotification = captor.getAllValues().get(1);
            assertThat(failedNotification.getStatus()).isEqualTo(NotificationStatus.FAILED);
        }
    }

    @Nested
    @DisplayName("getById()")
    class GetByIdTests {

        @Test
        @DisplayName("should return notification when found")
        void shouldReturnNotification() {
            when(repository.findById(1L)).thenReturn(Optional.of(sampleNotification));

            NotificationResponse response = service.getById(1L);

            assertThat(response.id()).isEqualTo(1L);
            assertThat(response.title()).isEqualTo("Test Notification");
        }

        @Test
        @DisplayName("should throw NotificationNotFoundException when not found")
        void shouldThrowWhenNotFound() {
            when(repository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.getById(999L))
                    .isInstanceOf(NotificationNotFoundException.class)
                    .hasMessageContaining("999");
        }
    }

    @Nested
    @DisplayName("search() — JPA Specifications")
    class SearchTests {

        @Test
        @DisplayName("should apply specification filters and return paged results")
        @SuppressWarnings("unchecked")
        void shouldSearchWithSpecifications() {
            NotificationFilter filter = new NotificationFilter(
                    "user-123", ChannelType.EMAIL, null, null, null, null, null);
            PageRequest pageable = PageRequest.of(0, 10);
            Page<Notification> page = new PageImpl<>(List.of(sampleNotification));

            when(repository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);

            Page<NotificationResponse> result = service.search(filter, pageable);

            assertThat(result.getTotalElements()).isEqualTo(1);
            assertThat(result.getContent().get(0).recipientId()).isEqualTo("user-123");
        }
    }

    @Nested
    @DisplayName("markAsRead()")
    class MarkAsReadTests {

        @Test
        @DisplayName("should update status to READ and set readAt timestamp")
        void shouldMarkAsRead() {
            when(repository.findById(1L)).thenReturn(Optional.of(sampleNotification));
            when(repository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

            NotificationResponse response = service.markAsRead(1L);

            assertThat(response.status()).isEqualTo(NotificationStatus.READ);
            ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
            verify(repository).save(captor.capture());
            assertThat(captor.getValue().getReadAt()).isNotNull();
        }
    }
}
