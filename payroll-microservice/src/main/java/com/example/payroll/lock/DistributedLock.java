package com.example.payroll.lock;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Distributed Lock annotation — prevents concurrent execution across instances.
 * Uses Redis SETNX with TTL for lock acquisition.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface DistributedLock {

    /** SpEL expression for the lock key. */
    String key();

    /** Maximum time to wait for lock acquisition (seconds). */
    long waitTime() default 5;

    /** Lock auto-release time (seconds). */
    long leaseTime() default 30;
}
