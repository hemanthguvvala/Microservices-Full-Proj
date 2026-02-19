package com.example.employee.idempotency;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks an endpoint as idempotent — requires an Idempotency-Key header.
 *
 * Interview: "How do you make POST endpoints safe to retry?"
 * → "We use an Idempotency-Key header (like Stripe/Razorpay). The client sends
 * a unique key with the request. The server stores the key → response mapping
 * in Redis. If the same key is received again, we return the cached response
 * instead of creating a duplicate resource."
 *
 * Interview: "Where do you store idempotency keys?"
 * → "Redis with a TTL (24 hours). Redis is ideal because:
 * 1. Fast lookups (O(1))
 * 2. Automatic expiry via TTL
 * 3. Shared across all service instances"
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface IdempotencyKey {

    /**
     * TTL in seconds for the idempotency key. Default: 24 hours.
     */
    long ttlSeconds() default 86400;
}
