package com.example.notification.scheduler;

import com.example.notification.model.Notification.NotificationStatus;
import com.example.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled Tasks — cron-based background jobs.
 *
 * Interview Insight:
 *   "How does @Scheduled work in Spring?"
 *   → "Requires @EnableScheduling on a @Configuration class.
 *
 *      @Scheduled options:
 *        fixedRate   = 5000   — every 5s from START of previous
 *        fixedDelay  = 5000   — 5s after END of previous
 *        cron        = '0 0/5 * * * ?' — cron expression
 *        initialDelay = 10000 — wait 10s before first run
 *
 *      Cron format (Spring uses 6 fields):
 *        sec min hour day month weekday
 *        '0 0 2 * * ?'    — daily at 2 AM
 *        '0 0/30 * * * ?' — every 30 minutes
 *        '0 0 9-17 * * MON-FRI' — hourly, business hours, weekdays
 *
 *      Threading: all @Scheduled run on 1 thread by default.
 *        → Define TaskScheduler bean with pool size > 1, or use @Async
 *
 *      Production considerations:
 *        - Use ShedLock or Quartz for distributed scheduling (multiple instances)
 *        - @Scheduled on a single instance → duplicate work in cluster
 *        - ShedLock uses DB lock to ensure only one instance runs
 *        - Quartz supports persistent jobs with clustering"
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationScheduler {

    private final NotificationRepository notificationRepository;

    /**
     * Cleanup stale notifications older than 90 days — runs daily at 3 AM.
     */
    @Scheduled(cron = "0 0 3 * * ?")
    @Transactional
    public void cleanupStaleNotifications() {
        log.info("Running scheduled cleanup of stale notifications...");
        LocalDateTime cutoff = LocalDateTime.now().minusDays(90);

        var staleNotifications = notificationRepository.findStaleNotifications(
                List.of(NotificationStatus.READ, NotificationStatus.DISMISSED), cutoff);

        if (!staleNotifications.isEmpty()) {
            notificationRepository.deleteAll(staleNotifications);
            log.info("Cleaned up {} stale notifications older than {}", staleNotifications.size(), cutoff);
        } else {
            log.info("No stale notifications to clean up");
        }
    }

    /**
     * Retry failed notifications — runs every 15 minutes.
     */
    @Scheduled(fixedRate = 900_000, initialDelay = 60_000)
    @Transactional
    public void retryFailedNotifications() {
        log.info("Running scheduled retry of failed notifications...");
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);

        var failedNotifications = notificationRepository.findStaleNotifications(
                List.of(NotificationStatus.FAILED), oneHourAgo);

        int retried = 0;
        for (var notification : failedNotifications) {
            if (notification.getRetryCount() < 3) {
                notification.setStatus(NotificationStatus.PENDING);
                notification.setRetryCount(notification.getRetryCount() + 1);
                notificationRepository.save(notification);
                retried++;
            }
        }

        log.info("Retried {} failed notifications (skipped {} at max retries)",
                retried, failedNotifications.size() - retried);
    }

    /**
     * Log notification statistics — runs every hour.
     */
    @Scheduled(cron = "0 0 * * * ?")
    public void logNotificationStats() {
        long total = notificationRepository.count();
        log.info("Notification statistics — Total: {}", total);
    }
}
