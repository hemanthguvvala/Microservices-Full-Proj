package com.example.notification.strategy;

import com.example.notification.model.Notification;
import com.example.notification.model.Notification.ChannelType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * In-App Notification Strategy — Stored for user to read in the UI.
 *
 * @ConditionalOnProperty — Another conditional bean registration approach.
 *
 * Interview: "@Profile vs @ConditionalOnProperty?"
 *   → "@Profile is all-or-nothing per environment.
 *      @ConditionalOnProperty is fine-grained per feature toggle.
 *
 *      Example: app.notifications.in-app.enabled=true
 *      This lets you enable/disable in-app notifications independently
 *      of the active profile. Better for feature flags."
 */
@Component
@ConditionalOnProperty(name = "app.notifications.in-app.enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
public class InAppNotificationStrategy implements NotificationStrategy {

    @Override
    public boolean send(Notification notification) {
        log.info("💬 Storing IN-APP notification for user: {} | Title: {}",
                notification.getRecipientId(), notification.getTitle());
        // Already persisted in DB — mark as delivered
        log.info("💬 IN-APP notification stored for user: {}", notification.getRecipientId());
        return true;
    }

    @Override
    public boolean supports(ChannelType channelType) {
        return channelType == ChannelType.IN_APP;
    }
}
