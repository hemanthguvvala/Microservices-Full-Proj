package com.example.notification.exception;

/**
 * Thrown when API rate limit (Bucket4j) is exceeded.
 */
public class RateLimitExceededException extends RuntimeException {

    public RateLimitExceededException(String message) {
        super(message);
    }
}
