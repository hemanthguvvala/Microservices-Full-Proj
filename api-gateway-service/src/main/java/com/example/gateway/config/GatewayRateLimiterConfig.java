package com.example.gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.filter.ratelimit.RedisRateLimiter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import reactor.core.publisher.Mono;

import java.util.Objects;

/**
 * Redis-backed Rate Limiting for API Gateway.
 *
 * Spring Cloud Gateway's RequestRateLimiter uses the TOKEN BUCKET algorithm
 * backed by a Redis Lua script for atomicity.
 *
 * Interview: "How does Redis-backed rate limiting work?"
 * 1. Each request checks a Redis key (e.g., "rate_limit:{clientIp}")
 * 2. Redis Lua script atomically: check available tokens, deduct 1, set TTL
 * 3. If tokens available → allow request
 * 4. If no tokens → return HTTP 429 Too Many Requests
 *
 * Why Redis for distributed rate limiting?
 * → Multiple gateway instances share the same rate limit counters via Redis.
 *   Without Redis, each instance has its own counter → N instances = N × limit.
 *   With Redis: ALL instances share ONE counter → truly N requests/second total.
 *
 * Token Bucket Algorithm:
 * - replenishRate = tokens added per second (steady-state rate)
 * - burstCapacity = max tokens the bucket can hold (burst capacity)
 * - requestedTokens = cost per request (default 1)
 *
 * Example: replenishRate=10, burstCapacity=20
 * → Can burst up to 20 requests instantly, then sustains 10 req/s.
 * → At 11 req/s, the 11th request in any second is rejected.
 *
 * Different limits per service tier:
 * - Public API endpoints: 10 req/s burst 20
 * - Analytics/heavy endpoints: 2 req/s burst 5
 * - Health checks: unlimited (exempt from rate limiting)
 *
 * Interview: "What's the difference between rate limiting at gateway vs application?"
 * Gateway: distributed, stops requests before hitting backend (protects all services)
 * Application (Bucket4j): per-instance, more granular control, can use user-level limits
 * Ideal: Both — gateway stops bulk traffic, app handles fine-grained user quotas
 */
@Configuration
public class GatewayRateLimiterConfig {

    /**
     * PRIMARY KeyResolver: rate limit by authenticated user ID.
     * Extracted from the Authorization header (JWT sub claim).
     *
     * If no auth token present, falls back to IP-based limiting.
     *
     * Interview: "Why rate limit by user ID instead of IP?"
     * IP: Corporate employees all share one IP → entire company rate-limited together
     * User ID: Each user has their own bucket → fair per-user limits
     */
    @Bean
    @Primary
    public KeyResolver userKeyResolver() {
        return exchange -> {
            // Try to get user from Authorization header first
            String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                // Extract 'sub' (subject = user ID) from JWT without full parse
                // In production: use a proper JWT parser or Spring Security context
                String token = authHeader.substring(7);
                // Simple extraction of subject from JWT payload (for demo)
                // Real implementation would decode the JWT properly
                return Mono.just("user:" + token.hashCode());
            }

            // Fallback: rate limit by IP address
            return Mono.just("ip:" + Objects.requireNonNull(
                    exchange.getRequest().getRemoteAddress()).getAddress().getHostAddress());
        };
    }

    /**
     * IP-based KeyResolver (used for public endpoints without auth).
     */
    @Bean("ipKeyResolver")
    public KeyResolver ipKeyResolver() {
        return exchange -> Mono.just("ip:" +
                Objects.requireNonNull(exchange.getRequest().getRemoteAddress())
                       .getAddress().getHostAddress());
    }

    /**
     * API key KeyResolver — for B2B integrations that pass X-API-Key header.
     */
    @Bean("apiKeyResolver")
    public KeyResolver apiKeyResolver() {
        return exchange -> {
            String apiKey = exchange.getRequest().getHeaders().getFirst("X-API-Key");
            if (apiKey != null && !apiKey.isBlank()) {
                return Mono.just("api:" + apiKey);
            }
            // If no API key, use IP
            return Mono.just("ip:" + Objects.requireNonNull(
                    exchange.getRequest().getRemoteAddress()).getAddress().getHostAddress());
        };
    }

    /**
     * Default rate limiter: 10 req/s, burst 20.
     * Used for employee and payroll service routes.
     *
     * Interview: "How does RedisRateLimiter differ from Resilience4j RateLimiter?"
     * RedisRateLimiter: Distributed, stored in Redis, works across all gateway instances
     * Resilience4j: In-memory, per-JVM instance, used in individual microservices
     * Rule: Use RedisRateLimiter at the gateway for global traffic shaping.
     *       Use Resilience4j within services for intra-service call protection.
     */
    @Bean
    @Primary
    public RedisRateLimiter defaultRedisRateLimiter() {
        return new RedisRateLimiter(
            10,   // replenishRate: tokens added per second
            20,   // burstCapacity: max bucket size (allows short bursts)
            1     // requestedTokens: cost per request (1 = default)
        );
    }

    /**
     * Strict rate limiter for analytics/heavy endpoints: 2 req/s, burst 5.
     * Heavy aggregation queries should be throttled more aggressively.
     */
    @Bean("analyticsRateLimiter")
    public RedisRateLimiter analyticsRateLimiter() {
        return new RedisRateLimiter(2, 5, 1);
    }

    /**
     * High-limit rate limiter for health check endpoints: no practical limit.
     * Health checks from K8s probes should never be rate-limited.
     */
    @Bean("healthRateLimiter")
    public RedisRateLimiter healthRateLimiter() {
        return new RedisRateLimiter(1000, 1000, 1);
    }
}
