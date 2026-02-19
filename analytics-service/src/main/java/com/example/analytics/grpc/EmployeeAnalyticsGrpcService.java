package com.example.analytics.grpc;

import com.example.analytics.model.EmployeeAnalyticsEvent;
import com.example.analytics.service.AnalyticsService;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;
import org.slf4j.MDC;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * gRPC Service Implementation — the core of this microservice.
 *
 * @GrpcService = Spring component that registers itself as a gRPC service
 * on the gRPC port (9090). Different from @RestController which serves HTTP.
 *
 * Interview: "How does gRPC compare to REST?"
 * ┌──────────────────┬───────────────────────┬─────────────────────────────┐
 * │ Feature          │ REST                  │ gRPC                        │
 * ├──────────────────┼───────────────────────┼─────────────────────────────┤
 * │ Protocol         │ HTTP/1.1 or HTTP/2    │ HTTP/2 always               │
 * │ Format           │ JSON (text)           │ Protocol Buffers (binary)   │
 * │ Contract         │ OpenAPI (optional)    │ .proto (mandatory)          │
 * │ Streaming        │ SSE / WebSocket only  │ Native 4 streaming modes    │
 * │ Code gen         │ Optional              │ Required (generated stubs)  │
 * │ Browser support  │ Native                │ Needs gRPC-web proxy        │
 * │ Performance      │ Baseline              │ ~10x smaller, ~5x faster    │
 * │ Best for         │ Public APIs           │ Internal microservices      │
 * └──────────────────┴───────────────────────┴─────────────────────────────┘
 *
 * gRPC's 4 streaming modes:
 * 1. Unary:               single request → single response (like REST)
 * 2. Server streaming:    single request → stream of responses
 * 3. Client streaming:    stream of requests → single response
 * 4. Bidirectional:       stream of requests ↔ stream of responses
 */
@Slf4j
@GrpcService
@RequiredArgsConstructor
public class EmployeeAnalyticsGrpcService extends EmployeeAnalyticsServiceGrpc.EmployeeAnalyticsServiceImplBase {

    private final AnalyticsService analyticsService;

    // ─── 1. Unary RPC ────────────────────────────────────────────────────────
    /**
     * Record a single employee event. Called by employee-microservice after
     * each state change (hire, promote, transfer, etc.).
     *
     * Interview: "How do you handle errors in gRPC unary calls?"
     * → Use io.grpc.Status codes instead of HTTP status codes.
     *   Status.NOT_FOUND, Status.INVALID_ARGUMENT, Status.INTERNAL, etc.
     *   Call responseObserver.onError(Status.NOT_FOUND.withDescription("...").asRuntimeException())
     */
    @Override
    public void recordEmployeeEvent(EmployeeEventRequest request,
                                     StreamObserver<EmployeeEventResponse> responseObserver) {
        // Propagate trace context from gRPC metadata into MDC for log correlation
        MDC.put("correlationId", request.getCorrelationId());
        MDC.put("traceId", request.getTraceId());
        MDC.put("employeeId", request.getEmployeeId());

        log.info("[gRPC-UNARY] Recording event type={} for employeeId={} tenant={}",
                request.getEventType(), request.getEmployeeId(), request.getTenantId());

        try {
            String eventId = analyticsService.recordEvent(
                    request.getEmployeeId(),
                    request.getTenantId(),
                    request.getEventType().name(),
                    request.getDepartment(),
                    request.getPerformedBy(),
                    request.getEventTimestampMs(),
                    request.getMetadataMap(),
                    request.getCorrelationId()
            );

            EmployeeEventResponse response = EmployeeEventResponse.newBuilder()
                    .setSuccess(true)
                    .setEventId(eventId)
                    .setMessage("Event recorded successfully")
                    .setProcessedAtMs(System.currentTimeMillis())
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (Exception e) {
            log.error("[gRPC-UNARY] Failed to record event: {}", e.getMessage(), e);

            // gRPC error handling: never call onNext + onError, only one
            responseObserver.onError(
                io.grpc.Status.INTERNAL
                    .withDescription("Failed to record event: " + e.getMessage())
                    .withCause(e)
                    .asRuntimeException()
            );
        } finally {
            MDC.clear();
        }
    }

    // ─── 2. Server-Streaming RPC ─────────────────────────────────────────────
    /**
     * Stream all events for an employee back to the caller.
     *
     * Interview: "Real-world server streaming use case?"
     * → A dashboard asks: "Show me all events for employee #42 between Jan-Dec"
     *   Instead of loading 10,000 rows into memory and sending one huge JSON,
     *   we stream them one by one. Client can render as they arrive.
     *   Memory-efficient on both sides.
     */
    @Override
    public void streamEmployeeEvents(StreamEventsRequest request,
                                      StreamObserver<EmployeeEventRecord> responseObserver) {
        log.info("[gRPC-SERVER-STREAM] Streaming events for employeeId={}", request.getEmployeeId());

        try {
            var events = analyticsService.getEvents(
                    request.getEmployeeId(),
                    request.getTenantId(),
                    request.getFromTimestampMs(),
                    request.getToTimestampMs()
            );

            // Stream each event to the client
            int count = 0;
            for (EmployeeAnalyticsEvent event : events) {
                if (request.getLimit() > 0 && count >= request.getLimit()) break;

                EmployeeEventRecord record = EmployeeEventRecord.newBuilder()
                        .setEventId(event.getId().toString())
                        .setEmployeeId(event.getEmployeeId())
                        .setTenantId(event.getTenantId())
                        .setEventType(EmployeeEventType.valueOf(event.getEventType()))
                        .setDepartment(event.getDepartment() != null ? event.getDepartment() : "")
                        .setPerformedBy(event.getPerformedBy() != null ? event.getPerformedBy() : "")
                        .setEventTimestampMs(event.getEventTimestampMs())
                        .build();

                responseObserver.onNext(record); // Send one record in the stream
                count++;
            }

            responseObserver.onCompleted(); // Signal: no more records
            log.info("[gRPC-SERVER-STREAM] Streamed {} events for employeeId={}", count, request.getEmployeeId());

        } catch (Exception e) {
            log.error("[gRPC-SERVER-STREAM] Error streaming events: {}", e.getMessage(), e);
            responseObserver.onError(
                io.grpc.Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException()
            );
        }
    }

    // ─── 3. Unary analytics aggregation ──────────────────────────────────────
    @Override
    public void getEmployeeAnalytics(AnalyticsRequest request,
                                      StreamObserver<AnalyticsResponse> responseObserver) {
        log.info("[gRPC-UNARY] Getting analytics for tenant={} dept={}", request.getTenantId(), request.getDepartment());

        try {
            AnalyticsResponse response = analyticsService.buildAnalyticsResponse(
                    request.getTenantId(),
                    request.getFromTimestampMs(),
                    request.getToTimestampMs(),
                    request.getDepartment()
            );

            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (Exception e) {
            log.error("[gRPC-UNARY] Analytics query failed: {}", e.getMessage(), e);
            responseObserver.onError(
                io.grpc.Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException()
            );
        }
    }

    // ─── 4. Bidirectional Streaming RPC ──────────────────────────────────────
    /**
     * Client streams a batch of events; server acks each one.
     *
     * Interview: "When would you use bidirectional streaming?"
     * → High-throughput ingestion where you need per-item acknowledgement.
     *   E.g.: analytics pipeline, IoT sensor data, trading order flow.
     *   Unlike client streaming (single response at end), bidi lets the server
     *   respond to each item independently — backpressure, partial failures.
     *
     * Important: responseObserver is NOT thread-safe. Must synchronize writes
     * or use a dedicated writer thread.
     */
    @Override
    public StreamObserver<EmployeeEventRequest> streamBatchEvents(
            StreamObserver<BatchEventAck> responseObserver) {

        AtomicInteger received = new AtomicInteger(0);
        log.info("[gRPC-BIDI-STREAM] Bidirectional batch stream opened");

        return new StreamObserver<>() {

            @Override
            public void onNext(EmployeeEventRequest request) {
                // Called for EACH event the client sends
                int count = received.incrementAndGet();
                log.debug("[gRPC-BIDI] Received event #{}: type={} for employee={}",
                        count, request.getEventType(), request.getEmployeeId());

                try {
                    String eventId = analyticsService.recordEvent(
                            request.getEmployeeId(),
                            request.getTenantId(),
                            request.getEventType().name(),
                            request.getDepartment(),
                            request.getPerformedBy(),
                            request.getEventTimestampMs(),
                            request.getMetadataMap(),
                            request.getCorrelationId()
                    );

                    // ACK each event
                    BatchEventAck ack = BatchEventAck.newBuilder()
                            .setEventId(eventId)
                            .setAccepted(true)
                            .setAckTimestampMs(System.currentTimeMillis())
                            .build();

                    synchronized (responseObserver) {
                        responseObserver.onNext(ack); // Must synchronize: not thread-safe
                    }

                } catch (Exception e) {
                    // NACK this event but continue the stream
                    BatchEventAck nack = BatchEventAck.newBuilder()
                            .setEventId(UUID.randomUUID().toString())
                            .setAccepted(false)
                            .setReason("Processing failed: " + e.getMessage())
                            .setAckTimestampMs(System.currentTimeMillis())
                            .build();
                    synchronized (responseObserver) {
                        responseObserver.onNext(nack);
                    }
                }
            }

            @Override
            public void onError(Throwable t) {
                // Client closed the stream with an error
                log.error("[gRPC-BIDI] Client stream error after {} events: {}", received.get(), t.getMessage());
            }

            @Override
            public void onCompleted() {
                // Client finished sending — now server can close its half
                log.info("[gRPC-BIDI] Client completed batch of {} events", received.get());
                responseObserver.onCompleted();
            }
        };
    }

    @Override
    public void getDepartmentHeadcount(DepartmentRequest request,
                                        StreamObserver<DepartmentHeadcountResponse> responseObserver) {
        log.info("[gRPC-UNARY] Getting headcount for tenant={}", request.getTenantId());
        try {
            DepartmentHeadcountResponse resp = analyticsService.getDepartmentHeadcount(
                    request.getTenantId(), request.getDepartment()
            );
            responseObserver.onNext(resp);
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(
                io.grpc.Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException()
            );
        }
    }
}
