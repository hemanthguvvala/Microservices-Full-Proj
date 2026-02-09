package com.example.notification.config;

import com.example.notification.exception.RateLimitExceededException;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Bucket4j Rate Limiting Filter — per-client token bucket.
 *
 * Interview Insight:
 *   "How do you implement rate limiting in a Spring app?"
 *   → "Common approaches:
 *        1. API Gateway level (Spring Cloud Gateway + Redis RateLimiter)
 *        2. Application level:
 *           a. Resilience4j @RateLimiter — method-level, thread-blocking
 *           b. Bucket4j — token bucket algorithm, high performance
 *           c. Spring Cloud Gateway RedisRateLimiter — distributed via Redis
 *
 *      Token Bucket Algorithm:
 *        - Bucket holds N tokens (capacity)
 *        - Each request consumes 1 token
 *        - Tokens refill at a fixed rate
 *        - Request rejected if bucket empty
 *        - Allows bursts up to bucket capacity
 *
 *      Bucket4j advantages:
 *        - Java 8+ native, no external dependencies for local
 *        - Thread-safe via CAS (compare-and-swap)
 *        - Supports distributed rate limiting via JCache/Redis
 *        - Multiple bandwidth limits (e.g., 100/min AND 1000/hour)
 *
 *      Per-client tracking: use IP or API key as Map key.
 *      Production: use Redis-backed Bucket4j for distributed."
 */
@Configuration
@Order(1)
public class RateLimitConfig implements Filter {

    // Per-IP token buckets (in production, use Redis-backed ProxyManager)
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    private static final int REQUESTS_PER_MINUTE = 60;
    private static final int BURST_CAPACITY = 80;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        String path = httpRequest.getRequestURI();

        // Only rate-limit API endpoints
        if (path.startsWith("/api/")) {
            String clientId = getClientId(httpRequest);
            Bucket bucket = buckets.computeIfAbsent(clientId, k -> createBucket());

            if (bucket.tryConsume(1)) {
                chain.doFilter(request, response);
            } else {
                throw new RateLimitExceededException(
                        "Rate limit exceeded for client: " + clientId +
                                ". Limit: " + REQUESTS_PER_MINUTE + " requests/minute");
            }
        } else {
            chain.doFilter(request, response);
        }
    }

    private Bucket createBucket() {
        Bandwidth limit = Bandwidth.classic(
                BURST_CAPACITY,
                Refill.greedy(REQUESTS_PER_MINUTE, Duration.ofMinutes(1))
        );
        return Bucket.builder().addLimit(limit).build();
    }

    private String getClientId(HttpServletRequest request) {
        // Use X-Forwarded-For if behind a proxy/load balancer
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isEmpty()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
