package com.example.notification.template;

import com.example.notification.model.Notification;
import com.example.notification.strategy.NotificationStrategy;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;

/**
 * Template Method Pattern (GoF) — Defines the skeleton of the notification
 * processing algorithm, deferring specific steps to subclasses.
 *
 * Interview Insight:
 *   "Explain the Template Method Pattern."
 *   → "Template Method defines the SKELETON of an algorithm in a base class,
 *      and lets subclasses OVERRIDE specific steps without changing the
 *      overall structure. It uses INHERITANCE (is-a relationship).
 *
 *      The algorithm structure: validate → preProcess → send → postProcess → handleResult
 *      Each subclass customizes HOW each step works, but the ORDER is fixed.
 *
 *      Real examples in Spring:
 *        - JdbcTemplate.execute()  — template for JDBC operations
 *        - RestTemplate.exchange() — template for HTTP calls
 *        - AbstractController.handleRequest() → handleRequestInternal()
 *
 *      Template Method vs Strategy:
 *        Template Method = inheritance (is-a), fixed algorithm structure
 *        Strategy = composition (has-a), swappable algorithm objects"
 *
 *   "What are 'hook methods' in Template Method?"
 *   → "Methods with a default (often empty) implementation that subclasses
 *      CAN override but don't HAVE to. In contrast, abstract methods MUST
 *      be overridden. Hooks add optional extension points."
 *
 * Algorithm steps (fixed order):
 *   1. validate()      — abstract: subclass defines validation rules
 *   2. preProcess()     — hook: optional preprocessing (logging, enrichment)
 *   3. send()           — delegated to the Strategy (composition)
 *   4. postProcess()    — hook: optional postprocessing (metrics, audit)
 *   5. handleFailure()  — abstract: subclass defines failure handling
 */
@Slf4j
public abstract class AbstractNotificationProcessor {

    /**
     * Template Method — The fixed algorithm structure.
     * This method is FINAL to prevent subclasses from changing the workflow.
     */
    public final Notification process(Notification notification, NotificationStrategy strategy) {
        log.info("Processing notification [id={}] via {}", notification.getId(), getProcessorName());

        // Step 1: Validate
        if (!validate(notification)) {
            log.warn("Validation failed for notification [id={}]", notification.getId());
            notification.setStatus(Notification.NotificationStatus.FAILED);
            return notification;
        }

        // Step 2: Pre-process (hook)
        preProcess(notification);

        // Step 3: Send via strategy
        notification.setStatus(Notification.NotificationStatus.PROCESSING);
        boolean success = strategy.send(notification);

        // Step 4: Handle result
        if (success) {
            notification.setStatus(Notification.NotificationStatus.SENT);
            notification.setSentAt(LocalDateTime.now());
            postProcess(notification);  // Step 5: Post-process (hook)
        } else {
            handleFailure(notification);
        }

        return notification;
    }

    // ── Abstract methods — MUST be implemented by subclasses ─────────────────

    /** Processor name for logging/metrics. */
    protected abstract String getProcessorName();

    /** Validate the notification before sending. */
    protected abstract boolean validate(Notification notification);

    /** Handle send failure (retry, dead-letter, alert, etc.). */
    protected abstract void handleFailure(Notification notification);

    // ── Hook methods — CAN be overridden optionally ──────────────────────────

    /** Pre-processing: enrich, transform, log. Default: no-op. */
    protected void preProcess(Notification notification) {
        // Default: no-op. Subclasses can override.
    }

    /** Post-processing: metrics, audit trail. Default: logging. */
    protected void postProcess(Notification notification) {
        log.info("Notification [id={}] sent successfully via {}",
                notification.getId(), getProcessorName());
    }
}
