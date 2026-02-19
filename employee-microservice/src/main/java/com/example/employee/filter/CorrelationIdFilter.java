package com.example.employee.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

/**
 * Correlation ID filter — propagates trace IDs across service boundaries.
 *
 * Interview: "How do you trace a request across multiple microservices?"
 * → "We use a Correlation ID (also called X-Request-ID). The API Gateway
 * generates a UUID and passes it via HTTP header. Each service:
 * 1. Extracts the header (or generates one if missing)
 * 2. Adds it to MDC (Mapped Diagnostic Context) for structured logging
 * 3. Forwards it to downstream service calls
 * 4. All log entries from all services share the same ID
 *
 * Combined with centralized logging (ELK), you can search by correlation ID
 * to see the full request trace across all services."
 *
 * Interview: "How does this differ from distributed tracing (Zipkin/Jaeger)?"
 * → "Distributed tracing captures timing and spans (parent-child
 * relationships).
 * Correlation IDs are simpler — just a shared ID for log correlation.
 * In practice, you use both: Zipkin for performance analysis, correlation IDs
 * for log searching."
 */
@Slf4j
@Component
@Order(0) // Run before all other filters
public class CorrelationIdFilter implements Filter {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    private static final String MDC_KEY = "correlationId";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // Extract correlation ID from header, or generate a new one
        String correlationId = httpRequest.getHeader(CORRELATION_ID_HEADER);
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }

        // Add to MDC for structured logging (all log entries get this ID)
        MDC.put(MDC_KEY, correlationId);

        // Add to response header for client visibility
        httpResponse.setHeader(CORRELATION_ID_HEADER, correlationId);

        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY);
        }
    }
}
