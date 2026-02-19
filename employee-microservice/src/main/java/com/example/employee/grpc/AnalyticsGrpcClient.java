package com.example.employee.grpc;

import com.example.analytics.grpc.EmployeeAnalyticsServiceGrpc;
import com.example.analytics.grpc.EmployeeEventRequest;
import com.example.analytics.grpc.EmployeeEventResponse;
import com.example.analytics.grpc.AnalyticsRequest;
import com.example.analytics.grpc.AnalyticsResponse;
import io.grpc.StatusRuntimeException;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * gRPC Client — calls analytics-service using generated stubs.
 *
 * @GrpcClient("analytics-service") injects a channel to analytics-service.
 * The channel is configured via grpc.client.analytics-service.* in application.yml
 *
 * Interview: "What are blocking stub vs async stub vs reactive stub in gRPC?"
 *
 * BlockingStub (used here):
 *   - Simplest API. Blocks the calling thread until response arrives.
 *   - ✓ Familiar, easy to reason about
 *   - ✗ Ties up a thread — not suitable for high-concurrency reactive apps
 *   Use when: simple request-response in a standard Spring MVC thread pool
 *
 * AsyncStub (FutureStub / async):
 *   - Returns ListenableFuture (Guava) or uses StreamObserver callbacks
 *   - ✓ Non-blocking, ideal for CompletableFuture chains
 *   Use when: Spring MVC but want non-blocking remote calls
 *
 * ReactiveStub (reactor-grpc):
 *   - Returns Mono<T> / Flux<T> — native Project Reactor types
 *   ✓ Perfect for Spring WebFlux apps
 *   Use when: full reactive stack
 *
 * Retries + Deadlines:
 *   Interview: "What happens if analytics-service is down when gRPC is called?"
 *   → gRPC has built-in deadline support: if analytics doesn't respond within
 *     the deadline, the client gets DEADLINE_EXCEEDED Status.
 *     We combine this with:
 *     1. Resilience4j @CircuitBreaker — stop calling after N failures
 *     2. Fallback — log warning + continue without analytics (it's not critical)
 */
@Slf4j
@Component
public class AnalyticsGrpcClient {

    // @GrpcClient injects a managed channel + stub to "analytics-service"
    // Channel is configured in application.yml under grpc.client.analytics-service.*
    // It handles: connection pooling, TLS, load balancing, keep-alive
    @GrpcClient("analytics-service")
    private EmployeeAnalyticsServiceGrpc.EmployeeAnalyticsServiceBlockingStub analyticsStub;

    /**
     * Send an analytics event to analytics-service via gRPC.
     * Called after every employee state change.
     *
     * Non-critical path: if analytics fails, employee operation still succeeds.
     * We log the error and continue — analytics is eventually consistent via Kafka.
     */
    public void recordAnalyticsEvent(String employeeId,
                                      String tenantId,
                                      String eventType,
                                      String department,
                                      String performedBy,
                                      Map<String, String> metadata) {
        try {
            String correlationId = MDC.get("correlationId") != null ? MDC.get("correlationId") : "";
            String traceId       = MDC.get("traceId") != null ? MDC.get("traceId") : "";

            EmployeeEventRequest request = EmployeeEventRequest.newBuilder()
                    .setEmployeeId(employeeId)
                    .setTenantId(tenantId != null ? tenantId : "default")
                    .setEventType(com.example.analytics.grpc.EmployeeEventType.valueOf(eventType))
                    .setDepartment(department != null ? department : "")
                    .setPerformedBy(performedBy != null ? performedBy : "system")
                    .setEventTimestampMs(System.currentTimeMillis())
                    .setCorrelationId(correlationId)
                    .setTraceId(traceId)
                    .putAllMetadata(metadata != null ? metadata : Map.of())
                    .build();

            // Blocking call — waits for analytics-service to respond
            // Deadline is configured at channel level in application.yml
            EmployeeEventResponse response = analyticsStub.recordEmployeeEvent(request);

            if (response.getSuccess()) {
                log.debug("[gRPC] Analytics event recorded: eventId={} type={} employee={}",
                        response.getEventId(), eventType, employeeId);
            } else {
                log.warn("[gRPC] Analytics rejected event: {} — {}", eventType, response.getMessage());
            }

        } catch (StatusRuntimeException e) {
            // gRPC-specific error handling — use Status codes, not HTTP codes
            // io.grpc.Status.Code: OK, NOT_FOUND, INVALID_ARGUMENT, UNAVAILABLE, DEADLINE_EXCEEDED, etc.
            switch (e.getStatus().getCode()) {
                case UNAVAILABLE ->
                    log.warn("[gRPC] Analytics-service unavailable — event will arrive via Kafka: {}", e.getMessage());
                case DEADLINE_EXCEEDED ->
                    log.warn("[gRPC] Analytics-service deadline exceeded after timeout: {}", e.getMessage());
                default ->
                    log.error("[gRPC] Unexpected error calling analytics-service: code={} msg={}",
                            e.getStatus().getCode(), e.getMessage(), e);
            }
            // Don't rethrow — analytics is non-critical.
            // The same event will arrive via Kafka (dual ingestion path).
        }
    }

    /**
     * Query aggregated analytics.
     * Used by REST dashboard endpoint in EmployeeController.
     */
    public AnalyticsResponse getAnalytics(String tenantId, long fromMs, long toMs, String department) {
        try {
            AnalyticsRequest request = AnalyticsRequest.newBuilder()
                    .setTenantId(tenantId != null ? tenantId : "default")
                    .setFromTimestampMs(fromMs)
                    .setToTimestampMs(toMs)
                    .setDepartment(department != null ? department : "")
                    .build();

            return analyticsStub.getEmployeeAnalytics(request);

        } catch (StatusRuntimeException e) {
            log.error("[gRPC] Failed to get analytics: {}", e.getMessage());
            return AnalyticsResponse.getDefaultInstance();
        }
    }
}
