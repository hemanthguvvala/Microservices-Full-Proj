package com.example.employee.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Correlation ID Filter — Enables distributed request tracing via MDC.
 * 
 * Interview Insight:
 *   "How do you trace a request across multiple microservices?"
 *   → "Use a Correlation ID (X-Correlation-ID header). The first service
 *      generates a UUID and puts it in MDC (Mapped Diagnostic Context).
 *      SLF4J's MDC makes it available in every log statement automatically.
 *      When calling downstream services via Feign/RestTemplate, propagate
 *      the header. This way, a single request can be traced across all
 *      services by searching logs for the correlation ID."
 * 
 * How MDC works:
 *   - MDC is a thread-local map managed by SLF4J
 *   - Values put into MDC are available in log patterns via %X{key}
 *   - Add to logback pattern: %X{correlationId} to include in every log line
 *   - Must be cleared after request to prevent thread-pool leaks
 * 
 * This filter:
 *   1. Reads X-Correlation-ID from incoming request header
 *   2. If absent, generates a new UUID
 *   3. Puts it into MDC for all log statements
 *   4. Adds it to the response header for client-side tracing
 *   5. Cleans up MDC after request completes (prevents memory leaks)
 * 
 * @Order(Ordered.HIGHEST_PRECEDENCE) ensures this runs BEFORE all other filters
 * including Spring Security, so every log line has the correlation ID.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class CorrelationIdFilter extends OncePerRequestFilter {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    public static final String CORRELATION_ID_MDC_KEY = "correlationId";
    public static final String REQUEST_METHOD_MDC_KEY = "httpMethod";
    public static final String REQUEST_URI_MDC_KEY = "requestUri";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        try {
            // 1. Extract or generate correlation ID
            String correlationId = request.getHeader(CORRELATION_ID_HEADER);
            if (correlationId == null || correlationId.isBlank()) {
                correlationId = UUID.randomUUID().toString();
            }

            // 2. Put into MDC — available in all log statements for this thread
            MDC.put(CORRELATION_ID_MDC_KEY, correlationId);
            MDC.put(REQUEST_METHOD_MDC_KEY, request.getMethod());
            MDC.put(REQUEST_URI_MDC_KEY, request.getRequestURI());

            // 3. Add to response header for client-side tracing
            response.setHeader(CORRELATION_ID_HEADER, correlationId);

            log.debug("Request started: {} {} [correlationId={}]",
                    request.getMethod(), request.getRequestURI(), correlationId);

            // 4. Continue filter chain
            filterChain.doFilter(request, response);

        } finally {
            // 5. CRITICAL: Always clear MDC to prevent thread-pool memory leaks
            // In servlet containers with thread pools, MDC values from one request
            // could leak into another request if not cleared.
            log.debug("Request completed: {} {}", request.getMethod(), request.getRequestURI());
            MDC.clear();
        }
    }

    /**
     * Skip filtering for static resources and actuator health checks.
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/actuator/health") || path.startsWith("/favicon");
    }
}
