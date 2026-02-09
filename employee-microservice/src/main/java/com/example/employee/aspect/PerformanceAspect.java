package com.example.employee.aspect;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * Performance Monitoring Aspect — Detects slow methods and reports metrics.
 * 
 * Interview Insight:
 *   "How would you detect slow API endpoints in production without modifying
 *    every method?"
 *   → "Use AOP with @Around advice + Micrometer metrics. Any method exceeding
 *      the configurable threshold is logged as a warning and recorded as a
 *      Prometheus histogram for alerting."
 * 
 * This aspect:
 * 1. Measures execution time of all service/controller methods
 * 2. Warns on methods exceeding the configurable slow threshold
 * 3. Records metrics to Micrometer (Prometheus-compatible)
 * 4. Uses @Value for externalized configuration
 */
@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class PerformanceAspect {

    private final MeterRegistry meterRegistry;

    /**
     * Configurable slow-method threshold in milliseconds.
     * Default: 500ms. Override via application.properties:
     *   app.performance.slow-threshold-ms=1000
     */
    @Value("${app.performance.slow-threshold-ms:500}")
    private long slowThresholdMs;

    @Pointcut("within(com.example.employee.service..*)")
    public void serviceMethods() {}

    @Pointcut("within(com.example.employee.controller..*)")
    public void controllerMethods() {}

    /**
     * Monitors service-layer method performance.
     * Records timing to Micrometer and logs warnings for slow methods.
     */
    @Around("serviceMethods()")
    public Object monitorServicePerformance(ProceedingJoinPoint joinPoint) throws Throwable {
        return monitorPerformance(joinPoint, "service");
    }

    /**
     * Monitors controller-layer endpoint performance.
     * Useful for SLA compliance tracking.
     */
    @Around("controllerMethods()")
    public Object monitorControllerPerformance(ProceedingJoinPoint joinPoint) throws Throwable {
        return monitorPerformance(joinPoint, "controller");
    }

    private Object monitorPerformance(ProceedingJoinPoint joinPoint, String layer) throws Throwable {
        String className = joinPoint.getSignature().getDeclaringType().getSimpleName();
        String methodName = joinPoint.getSignature().getName();

        // Record with Micrometer Timer
        Timer.Sample sample = Timer.start(meterRegistry);

        try {
            long start = System.nanoTime();
            Object result = joinPoint.proceed();
            long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);

            // Log warning if method is slow
            if (durationMs > slowThresholdMs) {
                log.warn("⚠ SLOW METHOD: {}.{}() took {}ms (threshold: {}ms)",
                        className, methodName, durationMs, slowThresholdMs);

                meterRegistry.counter("app.slow.methods",
                        "class", className,
                        "method", methodName,
                        "layer", layer
                ).increment();
            }

            return result;
        } catch (Throwable ex) {
            meterRegistry.counter("app.method.errors",
                    "class", className,
                    "method", methodName,
                    "exception", ex.getClass().getSimpleName()
            ).increment();
            throw ex;
        } finally {
            sample.stop(Timer.builder("app.method.execution")
                    .tag("class", className)
                    .tag("method", methodName)
                    .tag("layer", layer)
                    .description("Method execution time")
                    .register(meterRegistry));
        }
    }
}
