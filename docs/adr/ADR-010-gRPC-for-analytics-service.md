# ADR-010: Use gRPC for analytics-service Inter-Service Communication

**Date**: 2026-02-19
**Status**: Accepted
**Deciders**: Platform Engineering Team

---

## Context

The analytics-service needs to receive high-frequency event data from employee-service. We evaluated three options:

1. **REST (HTTP/1.1 + JSON)** — existing pattern used by all other service-to-service calls
2. **Kafka** — async messaging already used for event-driven communication
3. **gRPC (HTTP/2 + Protobuf)** — binary RPC with schema enforcement and streaming support

The analytics pipeline has two characteristics that make it different from other integrations:
- **High-frequency writes** — every employee CRUD operation triggers an analytics event
- **Non-critical path** — if analytics fails, the primary business operation must not fail

Additionally, this system is used as a reference architecture and interview reference, so it benefits from demonstrating gRPC alongside REST.

---

## Decision

We will use **gRPC** as the primary communication protocol between employee-service and analytics-service, implementing all 4 gRPC streaming modes as a reference implementation.

**Implementation details:**
- analytics-service runs a gRPC server on port 9090 (`@GrpcService`)
- employee-service uses `@GrpcClient` with `grpc-client-spring-boot-starter`
- Service discovery via Eureka: `grpc.client.analytics-service.address=discovery:///analytics-service`
- gRPC port registered in Eureka metadata (`eureka.instance.metadata-map.grpc.port=9090`)
- Client deadline: 2 seconds — prevents blocking the main thread
- Error handling: `StatusRuntimeException` with `UNAVAILABLE` / `DEADLINE_EXCEEDED` → log + continue

---

## 4 Streaming Modes in `employee_analytics.proto`

```protobuf
service EmployeeAnalyticsService {
  // Mode 1: Unary — one request, one response
  rpc RecordEmployeeEvent(EmployeeEventRequest) returns (EmployeeEventResponse);

  // Mode 2: Server Streaming — one request, stream of responses
  rpc StreamEmployeeEvents(StreamEventsRequest) returns (stream EmployeeEvent);

  // Mode 3: Client Streaming — stream of requests, one response
  rpc RecordBatchEvents(stream EmployeeEventRequest) returns (BatchSummaryResponse);

  // Mode 4: Bidirectional Streaming — concurrent streams in both directions
  rpc StreamBatchEvents(stream EmployeeEventRequest) returns (stream BatchEventAck);
}
```

---

## Consequences

### Positive
- **3–10x smaller payload** than JSON — Protobuf binary encoding
- **HTTP/2 multiplexing** — multiple streams over one connection, no head-of-line blocking
- **Schema enforcement at compile time** — `.proto` file is the contract; breaking changes are caught at build time
- **All 4 streaming modes** — demonstrates complete gRPC feature set (interview value)
- **Graceful fallback** — analytics is non-critical; client logs and continues on error

### Negative
- **Not human-readable** — binary protocol requires tooling (grpcurl, Postman gRPC) for debugging
- **Separate port** — requires additional K8s Service port + dedicated Ingress with `backend-protocol: GRPC`
- **Build complexity** — requires `os-maven-plugin` + `protobuf-maven-plugin` to generate stubs
- **Two .proto files to keep in sync** — analytics-service and employee-microservice both own a copy

### Mitigations
- gRPC reflection enabled in dev profile for `grpcurl` introspection
- K8s gRPC Ingress documented in `k8s/services/analytics-service.yaml`
- Protobuf copy managed via `employee-microservice/src/main/proto/` (should be extracted to shared module in production)

---

## Alternatives Considered

| Option | Reason Not Chosen |
|--------|-------------------|
| REST | No streaming support; JSON overhead at high frequency; already used for all other calls — reduced differentiation |
| Kafka only | Analytics events already published via Kafka; adding a second consumer is simpler but doesn't demonstrate gRPC |
| GraphQL subscriptions | Overkill for analytics ingest; GraphQL is already used in notification-service |

---

## References
- [gRPC Spring Boot Starter](https://yidongnan.github.io/grpc-spring-boot-starter/)
- [Protocol Buffers Language Guide](https://protobuf.dev/programming-guides/proto3/)
- `analytics-service/src/main/proto/employee_analytics.proto`
- `employee-microservice/src/main/java/com/example/employee/grpc/AnalyticsGrpcClient.java`
