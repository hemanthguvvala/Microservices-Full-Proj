package com.example.employee.idempotency;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;
import java.util.Map;

/**
 * Idempotency interceptor — checks Redis for duplicate requests.
 *
 * Flow:
 * 1. Client sends POST with header: Idempotency-Key: <UUID>
 * 2. Interceptor checks Redis: "idempotency:<key>" exists?
 * 3. If YES → return cached response (409 Conflict with original data)
 * 4. If NO → proceed with request, store response in Redis on completion
 *
 * Interview: "What happens if the server crashes between processing and storing
 * the key?"
 * → "The idempotency key won't be in Redis, so a retry will reprocess.
 * This gives us at-least-once semantics. Combined with the outbox pattern
 * and database constraints (unique email), we get effective exactly-once."
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class IdempotencyInterceptor implements HandlerInterceptor {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String IDEMPOTENCY_HEADER = "Idempotency-Key";
    private static final String REDIS_PREFIX = "idempotency:";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
            Object handler) throws Exception {
        // Only check methods annotated with @IdempotencyKey
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }

        IdempotencyKey annotation = handlerMethod.getMethodAnnotation(IdempotencyKey.class);
        if (annotation == null) {
            return true;
        }

        String idempotencyKey = request.getHeader(IDEMPOTENCY_HEADER);

        // No header provided — proceed without idempotency check
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return true;
        }

        String redisKey = REDIS_PREFIX + idempotencyKey;
        String cachedResponse = redisTemplate.opsForValue().get(redisKey);

        if (cachedResponse != null) {
            // Duplicate request — return cached response
            log.info("Idempotency: Duplicate request detected for key: {}", idempotencyKey);
            response.setStatus(HttpStatus.CONFLICT.value());
            response.setContentType("application/json");
            response.getWriter().write(objectMapper.writeValueAsString(Map.of(
                    "status", 409,
                    "message", "Duplicate request. Original response returned.",
                    "idempotencyKey", idempotencyKey,
                    "originalResponse", cachedResponse)));
            return false;
        }

        // First time — store a processing marker with TTL
        redisTemplate.opsForValue().set(
                redisKey,
                "PROCESSING",
                Duration.ofSeconds(annotation.ttlSeconds()));

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
            Object handler, Exception ex) {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return;
        }

        IdempotencyKey annotation = handlerMethod.getMethodAnnotation(IdempotencyKey.class);
        if (annotation == null) {
            return;
        }

        String idempotencyKey = request.getHeader(IDEMPOTENCY_HEADER);
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return;
        }

        String redisKey = REDIS_PREFIX + idempotencyKey;

        if (response.getStatus() >= 200 && response.getStatus() < 300) {
            // Success — update marker with actual status
            redisTemplate.opsForValue().set(
                    redisKey,
                    "COMPLETED:" + response.getStatus(),
                    Duration.ofSeconds(annotation.ttlSeconds()));
        } else {
            // Failed — remove the processing marker so client can retry
            redisTemplate.delete(redisKey);
        }
    }
}
