package com.example.employee.multitenancy;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Multi-tenancy filter — extracts tenant ID from request header.
 *
 * Interview: "How do you implement multi-tenancy?"
 * → "Three approaches:
 * 1. Database-per-tenant: Complete isolation, expensive to manage
 * 2. Schema-per-tenant: Good isolation, moderate management
 * 3. Row-level (what we use): Shared table with tenant_id column, cheapest
 * but requires careful query filtering.
 *
 * We use approach #3 with a ThreadLocal holder. Every request extracts
 * X-Tenant-ID from the header and stores it. Hibernate filters or
 * service-layer logic appends WHERE tenant_id = ? to every query."
 *
 * Interview: "How do you prevent data leaks between tenants?"
 * → "Defense in depth:
 * 1. Request filter sets tenant context
 * 2. JPA repository methods always filter by tenant
 * 3. Integration tests verify cross-tenant isolation
 * 4. Database-level RLS (Row-Level Security) as a backstop"
 */
@Slf4j
@Component
@Order(1) // Run before other filters
public class TenantFilter implements Filter {

    private static final String TENANT_HEADER = "X-Tenant-ID";
    private static final String DEFAULT_TENANT = "default";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;

        String tenantId = httpRequest.getHeader(TENANT_HEADER);
        if (tenantId == null || tenantId.isBlank()) {
            tenantId = DEFAULT_TENANT;
        }

        TenantContext.setCurrentTenant(tenantId);
        log.debug("Tenant context set: {}", tenantId);

        try {
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
