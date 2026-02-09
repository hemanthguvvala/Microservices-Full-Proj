package com.example.notification.strategy;

import com.example.notification.model.Notification;
import com.example.notification.model.Notification.ChannelType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * SMS Strategy — Sends notifications via SMS gateway.
 */
@Component
@Profile("!test")
@Slf4j
public class SmsNotificationStrategy implements NotificationStrategy {

    @Override
    public boolean send(Notification notification) {
        log.info("📱 Sending SMS to: {} | Message: {}",
                notification.getRecipientId(), notification.getTitle());
        // In production: integrate with Twilio, AWS SNS, or Azure Communication Services
        log.info("📱 SMS sent successfully to: {}", notification.getRecipientId());
        return true;
    }

    @Override
    public boolean supports(ChannelType channelType) {
        return channelType == ChannelType.SMS;
    }
}
