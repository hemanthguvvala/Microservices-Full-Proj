package com.example.notification.strategy;

import com.example.notification.model.Notification;
import com.example.notification.model.Notification.ChannelType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Email Strategy — Sends notifications via email.
 *
 * @Profile("!test") — This bean is NOT loaded during tests.
 *
 * Interview: "What does @Profile do?"
 *   → "It conditionally registers a bean ONLY when the specified profile
 *      is active. @Profile('prod') = only in prod. @Profile('!test') = 
 *      all profiles EXCEPT test. This avoids sending real emails in tests."
 */
@Component
@Profile("!test")
@Slf4j
public class EmailNotificationStrategy implements NotificationStrategy {

    @Override
    public boolean send(Notification notification) {
        log.info("📧 Sending EMAIL to: {} | Subject: {}",
                notification.getRecipientId(), notification.getTitle());

        // In production: inject JavaMailSender and send real email
        // mailSender.send(createMimeMessage(notification));

        log.info("📧 EMAIL sent successfully to: {}", notification.getRecipientId());
        return true;
    }

    @Override
    public boolean supports(ChannelType channelType) {
        return channelType == ChannelType.EMAIL;
    }

    @Override
    public boolean validate(Notification notification) {
        return NotificationStrategy.super.validate(notification)
                && notification.getRecipientId().contains("@");
    }
}
