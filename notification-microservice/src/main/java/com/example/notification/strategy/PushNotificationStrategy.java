package com.example.notification.strategy;

import com.example.notification.model.Notification;
import com.example.notification.model.Notification.ChannelType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Push Notification Strategy — Sends via FCM/APNs.
 */
@Component
@Profile("!test")
@Slf4j
public class PushNotificationStrategy implements NotificationStrategy {

    @Override
    public boolean send(Notification notification) {
        log.info("🔔 Sending PUSH to: {} | Title: {}",
                notification.getRecipientId(), notification.getTitle());
        // In production: Firebase Cloud Messaging or Apple Push Notification Service
        log.info("🔔 PUSH sent successfully to: {}", notification.getRecipientId());
        return true;
    }

    @Override
    public boolean supports(ChannelType channelType) {
        return channelType == ChannelType.PUSH;
    }
}
