package com.example.employee.webhook;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Webhook registration — allows external systems to subscribe to events.
 *
 * Interview: "How do you notify external systems of changes?"
 * → "We support webhooks. External systems register a callback URL and
 * the event types they're interested in. When those events occur,
 * we POST the event payload to their URL with HMAC signature verification."
 */
@Entity
@Table(name = "webhook_registrations")
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebhookRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The callback URL to POST events to */
    @Column(nullable = false)
    private String callbackUrl;

    /** Comma-separated list of event types (e.g., "CREATED,UPDATED,DELETED") */
    @Column(nullable = false)
    private String eventTypes;

    /** HMAC secret for signature verification */
    @Column(nullable = false)
    private String secret;

    /** Whether this webhook is active */
    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    /** Number of consecutive failures */
    @Column(nullable = false)
    @Builder.Default
    private Integer failureCount = 0;

    /**
     * Max consecutive failures before auto-disabling (circuit breaker for webhooks)
     */
    @Column(nullable = false)
    @Builder.Default
    private Integer maxFailures = 5;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
