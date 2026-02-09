package com.example.employee.aspect;

import com.example.employee.annotation.Auditable;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Arrays;

/**
 * Audit Aspect — Processes methods annotated with @Auditable.
 * 
 * Interview Insight:
 *   "How do you implement audit logging in a Spring Boot application?"
 *   → "Create a custom @Auditable annotation and an @Aspect that intercepts
 *      annotated methods. The aspect captures WHO performed the action,
 *      WHAT was done, WHEN, and the result — then logs it as a structured
 *      audit trail. This keeps audit logic separate from business logic
 *      (Single Responsibility Principle)."
 *
 * This demonstrates:
 *   1. Custom annotation creation
 *   2. AOP @Around with @annotation pointcut
 *   3. MethodSignature reflection to access annotation values
 *   4. SecurityContext integration for user identity
 *   5. MDC (Mapped Diagnostic Context) for correlation
 *   6. Structured audit logging
 */
@Aspect
@Component
@Slf4j
public class AuditableAspect {

    /**
     * Intercepts any method annotated with @Auditable.
     * 
     * The @annotation(auditable) binding makes the annotation instance
     * available as a parameter — this is how we read action/description.
     */
    @Around("@annotation(auditable)")
    public Object auditMethod(ProceedingJoinPoint joinPoint, Auditable auditable) throws Throwable {
        String action = auditable.action();
        String description = auditable.description();
        String user = getCurrentUser();
        String method = joinPoint.getSignature().toShortString();
        String args = Arrays.toString(joinPoint.getArgs());
        Instant timestamp = Instant.now();

        // Store audit context in MDC for log correlation
        MDC.put("audit.action", action);
        MDC.put("audit.user", user);

        log.info("AUDIT START | action={} | user={} | method={} | args={} | description={} | timestamp={}",
                action, user, method, args, description, timestamp);

        try {
            Object result = joinPoint.proceed();

            log.info("AUDIT SUCCESS | action={} | user={} | method={} | timestamp={}",
                    action, user, method, Instant.now());

            return result;
        } catch (Throwable ex) {
            log.error("AUDIT FAILURE | action={} | user={} | method={} | error={} | timestamp={}",
                    action, user, method, ex.getMessage(), Instant.now());
            throw ex;
        } finally {
            MDC.remove("audit.action");
            MDC.remove("audit.user");
        }
    }

    /**
     * Retrieves the current authenticated user from Spring Security context.
     * Returns "SYSTEM" if no authentication is present (e.g., batch jobs).
     */
    private String getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            return auth.getName();
        }
        return "SYSTEM";
    }
}
