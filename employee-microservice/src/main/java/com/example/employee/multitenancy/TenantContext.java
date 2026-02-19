package com.example.employee.multitenancy;

/**
 * ThreadLocal holder for the current tenant ID.
 *
 * Interview: "Why use ThreadLocal for tenant context?"
 * → "Each HTTP request runs on its own thread. ThreadLocal provides
 * thread-scoped storage, so tenant ID is automatically available
 * everywhere in the request chain without passing it as a parameter.
 * The filter sets it at the start, and we MUST clear it at the end
 * to prevent thread pool contamination."
 */
public final class TenantContext {

    private static final ThreadLocal<String> CURRENT_TENANT = new ThreadLocal<>();

    private TenantContext() {
        // Utility class
    }

    public static String getCurrentTenant() {
        return CURRENT_TENANT.get();
    }

    public static void setCurrentTenant(String tenantId) {
        CURRENT_TENANT.set(tenantId);
    }

    public static void clear() {
        CURRENT_TENANT.remove();
    }
}
