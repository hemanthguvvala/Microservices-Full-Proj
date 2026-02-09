package com.example.employee.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Custom annotation to mark methods for audit logging via AOP.
 * 
 * Interview Insight:
 *   "How do you create a custom annotation with an AOP aspect?"
 *   → "Define the annotation with @Retention(RUNTIME) so it's available
 *      at runtime for reflection. Then create an @Aspect with a @Pointcut
 *      using @annotation(Auditable) to intercept annotated methods."
 * 
 * Usage:
 * <pre>
 *   @Auditable(action = "CREATE_EMPLOYEE")
 *   public Employee createEmployee(EmployeeDTO dto) { ... }
 * </pre>
 * 
 * @see com.example.employee.aspect.AuditableAspect
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Auditable {

    /**
     * The business action being performed.
     * e.g., "CREATE_EMPLOYEE", "UPDATE_SALARY", "DELETE_EMPLOYEE"
     */
    String action();

    /**
     * Optional description for the audit trail.
     */
    String description() default "";
}
