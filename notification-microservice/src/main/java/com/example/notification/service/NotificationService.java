package com.example.notification.service;

import com.example.notification.dto.NotificationFilter;
import com.example.notification.dto.NotificationRequest;
import com.example.notification.dto.NotificationResponse;
import com.example.notification.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface NotificationService {

    NotificationResponse create(NotificationRequest request);

    NotificationResponse getById(Long id);

    Page<NotificationResponse> search(NotificationFilter filter, Pageable pageable);

    Page<NotificationResponse> getByRecipient(String recipientId, Pageable pageable);

    NotificationResponse markAsRead(Long id);

    void markAllAsRead(String recipientId);

    long getUnreadCount(String recipientId);

    void delete(Long id);
}
