package com.example.employee.aspect;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.*;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Logging Aspect — Cross-cutting concern using AOP.
 * 
 * Interview insight: AOP (Aspect-Oriented Programming) separates cross-cutting
 * concerns (logging, security, transactions) from business logic.
 * 
 * Key concepts:
 *   @Aspect     — Declares a class as an aspect
 *   @Pointcut   — Defines WHERE the advice applies (join points)
 *   @Before     — Runs before the method
 *   @After      — Runs after the method (always)
 *   @AfterReturning — Runs after successful return
 *   @AfterThrowing  — Runs after exception
 *   @Around     — Wraps the method (most powerful)
 * 
 * Weaving: Spring AOP uses runtime proxies (JDK dynamic proxy or CGLIB).
 * AspectJ uses compile-time or load-time weaving (more powerful but complex).
 */
@Aspect
@Component
@Slf4j
public class LoggingAspect {

    // ── Pointcut Definitions ─────────────────────────────────────────────────
    // Pointcuts define WHERE advice is applied using expressions

    /**
     * Matches all methods in all controller classes.
     */
    @Pointcut("within(com.example.employee.controller..*)")
    public void controllerLayer() {}

    /**
     * Matches all methods in all service classes.
     */
    @Pointcut("within(com.example.employee.service..*)")
    public void serviceLayer() {}

    /**
     * Matches all methods in all repository classes.
     */
    @Pointcut("within(com.example.employee.repository..*)")
    public void repositoryLayer() {}

    /**
     * Matches all public methods in any Spring-managed bean.
     */
    @Pointcut("execution(public * com.example.employee..*(..))")
    public void publicMethods() {}

    /**
     * Combines controller + service pointcuts.
     */
    @Pointcut("controllerLayer() || serviceLayer()")
    public void applicationLayer() {}

    // ── @Around Advice — Method Execution Logging + Timing ───────────────────
    /**
     * Logs method entry, exit, and execution time for all controller methods.
     * Interview classic: "How do you implement cross-cutting logging without
     * modifying every controller method?"
     * Answer: "AOP @Around advice with a pointcut on the controller layer."
     */
    @Around("controllerLayer()")
    public Object logControllerMethodExecution(ProceedingJoinPoint joinPoint) throws Throwable {
        String className = joinPoint.getSignature().getDeclaringType().getSimpleName();
        String methodName = joinPoint.getSignature().getName();
        String args = Arrays.toString(joinPoint.getArgs());

        log.info("→ {}.{}() called with args: {}", className, methodName, args);

        long startTime = System.currentTimeMillis();
        try {
            Object result = joinPoint.proceed();
            long duration = System.currentTimeMillis() - startTime;

            log.info("← {}.{}() returned in {}ms", className, methodName, duration);
            return result;
        } catch (Throwable ex) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("✕ {}.{}() threw {} after {}ms: {}",
                    className, methodName, ex.getClass().getSimpleName(), duration, ex.getMessage());
            throw ex;
        }
    }

    // ── @AfterThrowing — Exception Logging ───────────────────────────────────
    /**
     * Logs exceptions from service layer methods.
     * Useful for centralized error monitoring without try-catch in every service.
     */
    @AfterThrowing(pointcut = "serviceLayer()", throwing = "exception")
    public void logServiceException(JoinPoint joinPoint, Throwable exception) {
        String className = joinPoint.getSignature().getDeclaringType().getSimpleName();
        String methodName = joinPoint.getSignature().getName();

        log.error("Exception in {}.{}(): {} - {}",
                className, methodName,
                exception.getClass().getSimpleName(),
                exception.getMessage());
    }

    // ── @Before — Repository Access Logging ──────────────────────────────────
    /**
     * Logs all database access through repositories.
     * In production: useful for debugging slow queries and access patterns.
     */
    @Before("repositoryLayer()")
    public void logRepositoryAccess(JoinPoint joinPoint) {
        String methodName = joinPoint.getSignature().getName();
        String repoName = joinPoint.getSignature().getDeclaringType().getSimpleName();

        log.debug("DB Access: {}.{}()", repoName, methodName);
    }
}
