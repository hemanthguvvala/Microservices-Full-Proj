package com.example.notification.model;

/**
 * Sealed Interface — Java 17 Feature for Notification Channels.
 *
 * Interview Insight:
 *   "What are sealed classes/interfaces in Java 17?"
 *   → "Sealed types RESTRICT which classes can implement/extend them using
 *      the 'permits' clause. This gives the compiler exhaustive knowledge
 *      of all subtypes, enabling:
 *        1. Pattern matching in switch (Java 21+)
 *        2. Compile-time exhaustiveness checks
 *        3. Better domain modeling — prevent unauthorized subclassing
 *        4. Algebraic data types (sum types) in Java"
 *
 *   "How is sealed different from final?"
 *   → "final = NO subclasses at all.
 *      sealed = ONLY the listed subclasses are allowed.
 *      non-sealed = subclass of sealed that reopens the hierarchy."
 *
 * Subclasses of a sealed type MUST be:
 *   - final     → cannot be extended further
 *   - sealed    → restricted further
 *   - non-sealed → open for extension (escape hatch)
 *
 * All permitted subtypes must be in the same module (or package in unnamed modules).
 */
public sealed interface NotificationChannel
        permits NotificationChannel.Email,
                NotificationChannel.Sms,
                NotificationChannel.PushNotification,
                NotificationChannel.InApp {

    String getChannelName();
    String getRecipientIdentifier();

    /**
     * Email channel — requires email address.
     * 'record' is implicitly final, which satisfies the sealed requirement.
     *
     * Interview: "Can a record implement a sealed interface?"
     *   → "Yes. Records are implicitly final, which is one of the three
     *      allowed modifiers (final/sealed/non-sealed) for sealed subtypes."
     */
    record Email(String to, String cc, String subject) implements NotificationChannel {
        // Compact constructor — another Java 16+ feature
        public Email {
            if (to == null || to.isBlank()) {
                throw new IllegalArgumentException("Email 'to' cannot be blank");
            }
        }
        @Override public String getChannelName() { return "EMAIL"; }
        @Override public String getRecipientIdentifier() { return to; }
    }

    /**
     * SMS channel — requires phone number.
     */
    record Sms(String phoneNumber) implements NotificationChannel {
        public Sms {
            if (phoneNumber == null || !phoneNumber.matches("\\+?\\d{10,15}")) {
                throw new IllegalArgumentException("Invalid phone number: " + phoneNumber);
            }
        }
        @Override public String getChannelName() { return "SMS"; }
        @Override public String getRecipientIdentifier() { return phoneNumber; }
    }

    /**
     * Push notification — requires device token.
     */
    record PushNotification(String deviceToken, String platform) implements NotificationChannel {
        @Override public String getChannelName() { return "PUSH"; }
        @Override public String getRecipientIdentifier() { return deviceToken; }
    }

    /**
     * In-app notification — non-sealed to allow custom extensions.
     *
     * Interview: "What does 'non-sealed' mean?"
     *   → "It reopens the sealed hierarchy — any class can extend InApp.
     *      This is the 'escape hatch' when you want to allow extension
     *      for one specific branch of the sealed hierarchy."
     */
    non-sealed class InApp implements NotificationChannel {
        private final Long userId;
        public InApp(Long userId) { this.userId = userId; }
        @Override public String getChannelName() { return "IN_APP"; }
        @Override public String getRecipientIdentifier() { return String.valueOf(userId); }
        public Long getUserId() { return userId; }
    }
}
