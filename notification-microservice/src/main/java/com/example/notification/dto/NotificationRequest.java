package com.example.notification.dto;

import com.example.notification.model.Notification.ChannelType;
import com.example.notification.model.Notification.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Java Record DTO — Immutable data carrier (Java 16+).
 *
 * Interview Insight:
 *   "What are Java Records and when should you use them?"
 *   → "Records are immutable data classes introduced in Java 16.
 *      The compiler auto-generates:
 *        - private final fields
 *        - canonical constructor
 *        - getters (e.g., title() not getTitle())
 *        - equals(), hashCode(), toString()
 *
 *      Use records for:
 *        ✓ DTOs (Data Transfer Objects)
 *        ✓ Value objects (DDD)
 *        ✓ Query results / projections
 *        ✓ Compound map keys
 *
 *      Do NOT use for:
 *        ✗ JPA entities (need no-arg constructor + mutable fields)
 *        ✗ Classes needing inheritance (records are implicitly final)
 *        ✗ Spring beans that need proxying (@Service, @Component)"
 *
 *   "Can records have custom constructors?"
 *   → "Yes — compact constructors for validation, and additional
 *      constructors that must delegate to the canonical constructor."
 *
 * @param recipientId  Target user/device ID
 * @param title        Notification title
 * @param message      Notification body
 * @param channelType  Delivery channel (EMAIL, SMS, PUSH, IN_APP)
 * @param priority     Processing priority
 * @param templateName Optional template name for rendering
 */
public record NotificationRequest(
        @NotBlank(message = "Recipient ID is required")
        String recipientId,

        @NotBlank(message = "Title is required")
        String title,

        @NotBlank(message = "Message is required")
        String message,

        @NotNull(message = "Channel type is required")
        ChannelType channelType,

        Priority priority,

        String templateName
) {
    /**
     * Compact constructor — Validation and defaults.
     *
     * Interview: "What is a compact constructor in records?"
     *   → "It's a constructor without parameter list that allows
     *      validation/normalization BEFORE field assignment.
     *      Fields are auto-assigned AFTER the compact constructor body."
     */
    public NotificationRequest {
        if (priority == null) {
            priority = Priority.NORMAL;
        }
    }
}
