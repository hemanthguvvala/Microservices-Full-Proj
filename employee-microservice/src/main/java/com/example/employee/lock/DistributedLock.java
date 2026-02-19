package com.example.employee.lock;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Distributed Lock annotation — prevents concurrent execution across instances.
 *
 * Interview: "How do you prevent race conditions across multiple service
 * instances?"
 * → "We use Redis-based distributed locks. Before executing a critical section,
 * the method acquires a lock using Redis SETNX (SET if Not eXists) with a TTL.
 * If another instance already holds the lock, the request waits or fails fast."
 *
 * Interview: "Why not use database-level locking?"
 * → "DB locks (SELECT FOR UPDATE) work but:
 * 1. They hold DB connections during the lock period
 * 2. They don't work across different databases
 * 3. They cause contention on the DB connection pool
 * Redis locks are lightweight, fast, and database-independent."
 *
 * Interview: "What about the RedLock algorithm?"
 * → "RedLock uses multiple independent Redis instances to provide
 * stronger consistency guarantees. For most cases, single-node
 * Redis locks with proper TTL are sufficient."
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface DistributedLock {

    /**
     * SpEL expression for the lock key.
     * Example: "'payroll-approve-' + #id" → generates "payroll-approve-123"
     */
    String key();

    /**
     * Maximum time to wait for lock acquisition (seconds). Default: 5s.
     */
    long waitTime() default 5;

    /**
     * Lock auto-release time (seconds). Default: 30s.
     * Prevents deadlocks if the holder crashes.
     */
    long leaseTime() default 30;
}
