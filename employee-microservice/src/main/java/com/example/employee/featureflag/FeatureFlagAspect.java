package com.example.employee.featureflag;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * AOP aspect that checks feature flags before method execution.
 *
 * Flag resolution order:
 * 1. Redis key: "feature-flag:{name}" → "true"/"false"
 * 2. Environment variable: FEATURE_FLAG_{NAME} → "true"/"false"
 * 3. Default: enabled (fail-open)
 *
 * Interview: "What's the difference between release flags and ops flags?"
 * → "Release flags are short-lived (enable new feature, remove after rollout).
 * Ops flags are long-lived (kill switch for non-critical features under load).
 * Our implementation supports both — Redis for quick toggling, env vars for
 * defaults."
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class FeatureFlagAspect {

    private final StringRedisTemplate redisTemplate;

    private static final String REDIS_PREFIX = "feature-flag:";

    @Around("@annotation(featureFlag)")
    public Object checkFeatureFlag(ProceedingJoinPoint joinPoint, FeatureFlag featureFlag) throws Throwable {
        String flagName = featureFlag.value();
        boolean enabled = isFeatureEnabled(flagName);

        if (!enabled) {
            log.info("Feature flag '{}' is DISABLED. Blocking execution of {}",
                    flagName, joinPoint.getSignature().toShortString());

            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of(
                            "status", 503,
                            "message", featureFlag.disabledMessage(),
                            "featureFlag", flagName,
                            "enabled", false));
        }

        return joinPoint.proceed();
    }

    /**
     * Check if a feature flag is enabled.
     * Priority: Redis → Environment Variable → Default (enabled)
     */
    public boolean isFeatureEnabled(String flagName) {
        // 1. Check Redis
        try {
            String redisValue = redisTemplate.opsForValue().get(REDIS_PREFIX + flagName);
            if (redisValue != null) {
                return "true".equalsIgnoreCase(redisValue);
            }
        } catch (Exception e) {
            log.warn("Redis unavailable for feature flag check: {}", e.getMessage());
        }

        // 2. Check environment variable
        String envVar = "FEATURE_FLAG_" + flagName.toUpperCase().replace("-", "_");
        String envValue = System.getenv(envVar);
        if (envValue != null) {
            return "true".equalsIgnoreCase(envValue);
        }

        // 3. Default: enabled (fail-open)
        return true;
    }
}
