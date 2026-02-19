package com.example.employee.lock;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.core.DefaultParameterNameDiscoverer;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.expression.EvaluationContext;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.UUID;

/**
 * AOP aspect that implements distributed locking using Redis.
 *
 * Interview: "Walk me through the distributed lock lifecycle."
 * 1. Build lock key from SpEL expression + method args
 * 2. Try to acquire lock: SETNX with unique owner ID + TTL
 * 3. If acquired → execute method → release lock (only if we still own it)
 * 4. If not acquired → retry with backoff until waitTime expires
 * 5. If waitTime exceeded → throw exception (fail fast)
 *
 * Interview: "What's the fencing token problem?"
 * → "If a lock holder is paused (GC, network), the lock expires and another
 * process acquires it. When the original holder resumes, it might execute
 * without knowing the lock was lost. Solution: use a fencing token (monotonic
 * counter) that the resource checks before accepting writes."
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class DistributedLockAspect {

    private final StringRedisTemplate redisTemplate;
    private final ExpressionParser parser = new SpelExpressionParser();
    private final DefaultParameterNameDiscoverer nameDiscoverer = new DefaultParameterNameDiscoverer();

    private static final String LOCK_PREFIX = "distributed-lock:";

    @Around("@annotation(distributedLock)")
    public Object around(ProceedingJoinPoint joinPoint, DistributedLock distributedLock) throws Throwable {
        String lockKey = LOCK_PREFIX + resolveKey(joinPoint, distributedLock.key());
        String lockOwner = UUID.randomUUID().toString();
        long waitTimeMs = distributedLock.waitTime() * 1000;
        long leaseTimeMs = distributedLock.leaseTime() * 1000;

        boolean acquired = tryAcquireLock(lockKey, lockOwner, leaseTimeMs, waitTimeMs);

        if (!acquired) {
            throw new IllegalStateException(
                    "Could not acquire distributed lock: " + lockKey +
                            ". Another process is currently executing this operation.");
        }

        try {
            log.debug("Distributed lock acquired: {} (owner: {})", lockKey, lockOwner);
            return joinPoint.proceed();
        } finally {
            releaseLock(lockKey, lockOwner);
            log.debug("Distributed lock released: {} (owner: {})", lockKey, lockOwner);
        }
    }

    /**
     * Try to acquire the lock with retry and exponential backoff.
     */
    private boolean tryAcquireLock(String key, String owner, long leaseTimeMs, long waitTimeMs) {
        long deadline = System.currentTimeMillis() + waitTimeMs;
        long sleepMs = 50; // Start with 50ms backoff

        while (System.currentTimeMillis() < deadline) {
            Boolean acquired = redisTemplate.opsForValue()
                    .setIfAbsent(key, owner, Duration.ofMillis(leaseTimeMs));

            if (Boolean.TRUE.equals(acquired)) {
                return true;
            }

            try {
                Thread.sleep(Math.min(sleepMs, deadline - System.currentTimeMillis()));
                sleepMs = Math.min(sleepMs * 2, 500); // Exponential backoff, max 500ms
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return false;
            }
        }

        return false;
    }

    /**
     * Release the lock ONLY if we still own it (prevents releasing another holder's
     * lock).
     *
     * Interview: "Why check ownership before releasing?"
     * → "If our lock expired (TTL) and another process acquired it,
     * we must NOT delete their lock. We check that the value matches
     * our unique owner ID before deleting."
     */
    private void releaseLock(String key, String owner) {
        String currentOwner = redisTemplate.opsForValue().get(key);
        if (owner.equals(currentOwner)) {
            redisTemplate.delete(key);
        }
    }

    /**
     * Resolve SpEL expression to get the actual lock key.
     */
    private String resolveKey(ProceedingJoinPoint joinPoint, String spelExpression) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String[] paramNames = nameDiscoverer.getParameterNames(signature.getMethod());

        EvaluationContext context = new StandardEvaluationContext();
        Object[] args = joinPoint.getArgs();

        if (paramNames != null) {
            for (int i = 0; i < paramNames.length; i++) {
                context.setVariable(paramNames[i], args[i]);
            }
        }

        return parser.parseExpression(spelExpression).getValue(context, String.class);
    }
}
