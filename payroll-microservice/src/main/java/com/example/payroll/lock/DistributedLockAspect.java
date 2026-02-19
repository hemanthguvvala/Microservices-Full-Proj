package com.example.payroll.lock;

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
 * AOP aspect implementing distributed locking via Redis SETNX.
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
                    "Could not acquire distributed lock: " + lockKey);
        }

        try {
            log.debug("Distributed lock acquired: {} (owner: {})", lockKey, lockOwner);
            return joinPoint.proceed();
        } finally {
            releaseLock(lockKey, lockOwner);
        }
    }

    private boolean tryAcquireLock(String key, String owner, long leaseTimeMs, long waitTimeMs) {
        long deadline = System.currentTimeMillis() + waitTimeMs;
        long sleepMs = 50;

        while (System.currentTimeMillis() < deadline) {
            Boolean acquired = redisTemplate.opsForValue()
                    .setIfAbsent(key, owner, Duration.ofMillis(leaseTimeMs));

            if (Boolean.TRUE.equals(acquired)) {
                return true;
            }

            try {
                Thread.sleep(Math.min(sleepMs, deadline - System.currentTimeMillis()));
                sleepMs = Math.min(sleepMs * 2, 500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return false;
            }
        }

        return false;
    }

    /**
     * Atomic lock release using Redis Lua script.
     * Interview: "Why not just GET + DELETE?"
     * → Between GET and DELETE, the lock TTL could expire and another instance
     *   acquires it. Our DELETE then releases THEIR lock. The Lua script
     *   executes atomically on the Redis server — no race condition possible.
     */
    private void releaseLock(String key, String owner) {
        String luaScript = "if redis.call('get', KEYS[1]) == ARGV[1] then "
                + "return redis.call('del', KEYS[1]) "
                + "else return 0 end";
        redisTemplate.execute(
                new org.springframework.data.redis.core.script.DefaultRedisScript<>(luaScript, Long.class),
                java.util.List.of(key),
                owner
        );
    }

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
