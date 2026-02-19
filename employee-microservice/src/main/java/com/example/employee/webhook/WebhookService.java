package com.example.employee.webhook;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.List;

/**
 * Webhook dispatcher — delivers events to registered callback URLs.
 *
 * Interview: "How do you make webhook delivery reliable?"
 * → "1. Retry with exponential backoff (3 attempts)
 * 2. HMAC-SHA256 signature for payload verification
 * 3. Auto-disable after 5 consecutive failures (circuit breaker)
 * 4. Async delivery (doesn't block the main flow)
 * 5. Logging all delivery attempts for debugging"
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookService {

    private final WebhookRegistrationRepository webhookRepository;
    private final ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    /**
     * Dispatch an event to all active webhook registrations.
     */
    @Async
    public void dispatchEvent(String eventType, Object payload) {
        List<WebhookRegistration> registrations = webhookRepository
                .findByActiveTrue();

        for (WebhookRegistration registration : registrations) {
            if (registration.getEventTypes().contains(eventType)) {
                deliverWebhook(registration, eventType, payload);
            }
        }
    }

    private void deliverWebhook(WebhookRegistration registration, String eventType, Object payload) {
        int maxRetries = 3;

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                String body = objectMapper.writeValueAsString(payload);
                String signature = generateHmacSignature(body, registration.getSecret());

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(registration.getCallbackUrl()))
                        .header("Content-Type", "application/json")
                        .header("X-Webhook-Event", eventType)
                        .header("X-Webhook-Signature", "sha256=" + signature)
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .timeout(Duration.ofSeconds(10))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() >= 200 && response.statusCode() < 300) {
                    log.info("Webhook delivered: url={}, event={}, status={}",
                            registration.getCallbackUrl(), eventType, response.statusCode());
                    registration.setFailureCount(0);
                    webhookRepository.save(registration);
                    return;
                }

                log.warn("Webhook delivery failed: url={}, status={}, attempt={}/{}",
                        registration.getCallbackUrl(), response.statusCode(), attempt, maxRetries);

            } catch (Exception e) {
                log.warn("Webhook delivery error: url={}, error={}, attempt={}/{}",
                        registration.getCallbackUrl(), e.getMessage(), attempt, maxRetries);
            }

            // Exponential backoff
            try {
                Thread.sleep((long) Math.pow(2, attempt) * 1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }

        // All retries exhausted
        registration.setFailureCount(registration.getFailureCount() + 1);
        if (registration.getFailureCount() >= registration.getMaxFailures()) {
            registration.setActive(false);
            log.error("Webhook auto-disabled after {} consecutive failures: {}",
                    registration.getMaxFailures(), registration.getCallbackUrl());
        }
        webhookRepository.save(registration);
    }

    private String generateHmacSignature(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(), "HmacSHA256"));
            return Base64.getEncoder().encodeToString(mac.doFinal(payload.getBytes()));
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate HMAC signature", e);
        }
    }
}

@Repository
interface WebhookRegistrationRepository extends JpaRepository<WebhookRegistration, Long> {
    List<WebhookRegistration> findByActiveTrue();
}
