package com.example.notification.strategy;

import com.example.notification.model.Notification;

/**
 * Strategy Pattern (GoF) — Notification delivery strategy interface.
 *
 * Interview Insight:
 *   "Explain the Strategy Pattern with a real-world example."
 *   → "Strategy defines a FAMILY OF ALGORITHMS and makes them interchangeable
 *      at runtime. In our notification service, each channel (Email, SMS, Push,
 *      InApp) is a strategy. The service doesn't know HOW to send — it delegates
 *      to the appropriate strategy based on channel type.
 *
 *      Benefits:
 *        1. Open/Closed Principle — add new channels without modifying existing code
 *        2. No if/else or switch chains — polymorphism handles dispatch
 *        3. Each strategy is independently testable
 *        4. Runtime swappable — can change strategy based on config or user preference
 *
 *      Components:
 *        - Strategy (this interface)       → defines the contract
 *        - ConcreteStrategy (Email, SMS)   → implements the algorithm
 *        - Context (NotificationService)   → uses the strategy
 *        - Factory (StrategyFactory)       → selects the strategy"
 *
 *   "How does Strategy differ from Template Method?"
 *   → "Strategy uses COMPOSITION (has-a) — the algorithm is in a separate object.
 *      Template Method uses INHERITANCE (is-a) — the algorithm skeleton is in
 *      the parent class, and subclasses override specific steps."
 */
public interface NotificationStrategy {

    /**
     * Send the notification through this channel.
     *
     * @param notification The notification to send
     * @return true if sent successfully
     */
    boolean send(Notification notification);

    /**
     * Check if this channel supports the given notification type.
     */
    boolean supports(Notification.ChannelType channelType);

    /**
     * Validate that the notification has all required fields for this channel.
     */
    default boolean validate(Notification notification) {
        return notification != null
                && notification.getRecipientId() != null
                && notification.getMessage() != null;
    }
}
