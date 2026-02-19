package com.example.notification.service;

import com.example.notification.dto.NotificationFilter;
import com.example.notification.dto.NotificationRequest;
import com.example.notification.dto.NotificationResponse;
import com.example.notification.event.NotificationCreatedEvent;
import com.example.notification.exception.NotificationNotFoundException;
import com.example.notification.kafka.KafkaProducerService;
import com.example.notification.mapper.NotificationMapper;
import com.example.notification.model.Notification;
import com.example.notification.model.Notification.NotificationStatus;
import com.example.notification.repository.NotificationRepository;
import com.example.notification.repository.NotificationSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Notification Service — Combines multiple patterns:
 *   - ApplicationEventPublisher for async notification dispatch
 *   - @Cacheable / @CacheEvict for Redis caching
 *   - JPA Specifications for dynamic search
 *   - @Transactional for data consistency
 *   - Records for immutable DTOs
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository repository;
    private final ApplicationEventPublisher eventPublisher;
    private final KafkaProducerService kafkaProducerService;
    private final NotificationMapper notificationMapper;

    /**
     * Create + publish Spring ApplicationEvent.
     * The event listener will pick it up AFTER the transaction commits.
     */
    @Override
    @Transactional
    @CacheEvict(value = "notifications", allEntries = true)
    public NotificationResponse create(NotificationRequest request) {
        // MapStruct compile-time mapping (replaces manual builder calls)
        Notification notification = notificationMapper.toEntity(request);

        Notification saved = repository.save(notification);
        log.info("Notification created [id={}, channel={}]", saved.getId(), saved.getChannelType());

        // Publish Spring ApplicationEvent — listener fires AFTER_COMMIT
        eventPublisher.publishEvent(new NotificationCreatedEvent(this, saved));

        // Publish Kafka event — other services can track notification lifecycle
        kafkaProducerService.publishNotificationEvent(saved, "CREATED");

        return notificationMapper.toResponse(saved);
    }

    /**
     * Get notification by ID — cached with @Cacheable.
     * Subsequent calls with the same ID hit the cache, not the DB.
     *
     * Interview: "How does @Cacheable work?"
     *   - "Spring intercepts the method call via AOP proxy. It checks the
     *      cache for the key. If found (cache hit), returns cached value
     *      without executing the method. If not found (cache miss),
     *      executes the method and stores the result in the cache."
     */
    @Override
    @Cacheable(value = "notifications", key = "#id")
    public NotificationResponse getById(Long id) {
        return repository.findById(id)
                .map(notificationMapper::toResponse)
                .orElseThrow(() -> new NotificationNotFoundException(id));
    }

    /**
     * Dynamic search using JPA Specifications.
     * Any combination of filter fields works without custom query methods.
     */
    @Override
    public Page<NotificationResponse> search(NotificationFilter filter, Pageable pageable) {
        return repository
                .findAll(NotificationSpecification.buildFrom(filter), pageable)
                .map(notificationMapper::toResponse);
    }

    @Override
    @Cacheable(value = "user-notifications", key = "#recipientId + '-' + #pageable.pageNumber")
    public Page<NotificationResponse> getByRecipient(String recipientId, Pageable pageable) {
        return repository.findByRecipientId(recipientId, pageable)
                .map(notificationMapper::toResponse);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"notifications", "user-notifications"}, allEntries = true)
    public NotificationResponse markAsRead(Long id) {
        Notification notification = repository.findById(id)
                .orElseThrow(() -> new NotificationNotFoundException(id));

        notification.setStatus(NotificationStatus.READ);
        notification.setReadAt(LocalDateTime.now());
        Notification saved = repository.save(notification);

        return notificationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = "user-notifications", allEntries = true)
    public void markAllAsRead(String recipientId) {
        var unread = repository.findByRecipientIdAndStatus(recipientId, NotificationStatus.SENT);
        unread.forEach(n -> {
            n.setStatus(NotificationStatus.READ);
            n.setReadAt(LocalDateTime.now());
        });
        repository.saveAll(unread);
        log.info("Marked {} notifications as read for user: {}", unread.size(), recipientId);
    }

    @Override
    public long getUnreadCount(String recipientId) {
        return repository.countByRecipientIdAndStatusNot(recipientId, NotificationStatus.READ);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"notifications", "user-notifications"}, allEntries = true)
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new NotificationNotFoundException(id);
        }
        repository.deleteById(id);
    }
}
