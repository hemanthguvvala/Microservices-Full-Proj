# Deep-Dive Interview Prep — Security · Resilience4j · Messaging · Threads · SQL · Multi-Cloud · Jenkins/Docker

> Every answer below is grounded in **actual code in this repo**.  
> File references are given so you can pull up the code during interviews.

---

## TABLE OF CONTENTS

0. [Tell Me About Your Project — Domain, Role, Team, Architecture](#0-tell-me-about-your-project)
1. [Spring Security — JWT + Role-Based Auth](#1-spring-security)
2. [Circuit Breaker — Resilience4j (all 4 modules)](#2-resilience4j-circuit-breaker)
3. [RabbitMQ — Why it's NOT here (and Kafka instead)](#3-rabbitmq-vs-kafka)
4. [Threads — @Async, ThreadPool, MDC, Virtual Threads](#4-threads)
5. [SQL — Window Functions, CTEs, Indexes, Transactions, Locking](#5-sql)
6. [Multi-Cloud Architecture & Portability — AWS + Azure + GCP](#6-multi-cloud-architecture--portability)
7. [Jenkins, Docker & JAR/WAR Packaging](#7-jenkins-docker--jarwar-packaging)
8. [Mock Interview — Live Q&A Session](#8-mock-interview--live-qa-session)
9. [Interview Performance Feedback](#9-interview-performance-feedback)

---

## 0. Tell Me About Your Project

### Q: "Walk me through what your project does."

**30-second version (use this to open):**

> "We built an **enterprise Employee Management Platform** — an internal HR system that handles the full employee lifecycle: hiring, payroll, notifications, and analytics. It's a distributed system with 7 microservices written in Java Spring Boot, two frontends (React and Angular), and full DevOps infrastructure including Kubernetes, GitOps with ArgoCD, and Chaos Engineering. My role was Lead Product Engineer on a team of 4."

**2-minute deep version (if they ask to elaborate):**

> "The domain is internal HR / workforce management. The platform covers:
> - **Employee records** — onboarding, CRUD, department management, multi-tenancy
> - **Payroll processing** — salary calculations, batch payroll runs, audit trail
> - **Notifications** — real-time alerts via WebSocket (in-app), email, and SMS based on employee events (hired, promoted, etc.)
> - **Analytics** — aggregate metrics on headcount, salary trends, department stats, queried via gRPC
>
> The reason we built it distributed rather than monolithic was to practice real enterprise patterns: each service can be deployed, scaled, and failed independently. For example, a payroll batch job failing doesn't affect real-time notifications."

---

### Q: "What was your role?"

**Answer:**

> "I was the **Lead Product Engineer**. That meant I was responsible for the overall technical architecture — making the build vs. buy decisions, choosing the tech stack, and designing the cross-cutting concerns like observability, security, and inter-service communication.
>
> On the code side, I personally built the core services: the employee-service (Event Sourcing, CQRS, Saga orchestration, Outbox pattern), the API Gateway (Redis rate limiting with three KeyResolver strategies), and the analytics-service (all four gRPC streaming modes with Protobuf). I also drove the platform decisions like replacing Zipkin with OpenTelemetry, adding Debezium CDC on top of the polling Outbox, and wiring MDC context propagation for distributed log correlation.
>
> Beyond coding, I was the one writing the ADRs (Architecture Decision Records) — documenting *why* we made each choice, not just *what* we chose. That's important because in a distributed system, the wrong choice made early is very expensive to unwind."

---

### Q: "Team size and how did you split the work?"

**Answer:**

> "Four engineers total:
>
> - **Me (Lead Product Engineer)** — overall architecture, employee-service, API gateway, analytics-service, gRPC design, Kafka/CDC pipeline, CI/CD, Kubernetes manifests
> - **Engineer 2** — payroll-service (Feign clients, circuit breakers, batch processing), BFF aggregation layer, Angular frontend
> - **Engineer 3** — notification-service (GraphQL, strategy pattern, WebSocket/STOMP), React frontend, Redux Toolkit
> - **Engineer 4** — infrastructure: Terraform, Helm charts, ArgoCD GitOps, monitoring stack (Prometheus/Grafana/ELK), Keycloak, Chaos Mesh experiments
>
> We used GitHub for version control, trunk-based development with short-lived feature branches, and had a Config Server so each service could pick up configuration changes without a redeployment. We held weekly architecture reviews where anyone could propose a design change via an ADR."

---

### Q: "Describe the architecture at a high level."

**Answer:**

> "Three tiers:
>
> **Client tier** — React 18 (TypeScript, Vite, TailwindCSS) for employees and managers; Angular 17 (Signals, RxJS) for HR admins. Both communicate via HTTPS and WebSocket.
>
> **Service tier** — everything goes through an **API Gateway** (Spring Cloud Gateway on WebFlux) which handles JWT validation, Redis-based rate limiting, and routing. Behind the gateway sit four domain services: employee, payroll, notification, and analytics. Service discovery is via **Eureka**. Config is centralized via **Spring Cloud Config Server** (backed by a Git repo). Services communicate **synchronously** via REST (OpenFeign) for queries, **gRPC** for analytics (lower latency, typed contracts), and **asynchronously** via **Kafka** for events — hired, updated, terminated events fan out to payroll and notifications.
>
> **Data tier** — each service owns its data (Database-per-Service pattern). Employee uses **PostgreSQL** with Redis for caching. Payroll has a read replica for reporting. Notification writes audit logs to **MongoDB**. Analytics uses **Elasticsearch** for read queries (CQRS read model). **Debezium** watches the PostgreSQL WAL and publishes DB changes to Kafka as a second CDC channel alongside the Outbox pattern for guaranteed delivery.
>
> Cross-cutting: **OpenTelemetry** (OTLP) for distributed tracing and metrics, **ELK** for log aggregation, **Prometheus + Grafana** with SLO / Error Budget alerting. All deployed on **Kubernetes** with **Helm** charts, **ArgoCD** for GitOps, and **KEDA** for event-driven autoscaling (scale notification workers based on Kafka lag)."

---

### Q: "What was the hardest technical problem you solved?"

**Pick one of these based on the interviewer's domain:**

**If they care about distributed systems:**
> "The trickiest problem was making the Outbox pattern reliable without sacrificing observability. We had a transactional outbox where employee state changes and their outbox event were written in one DB transaction. But we were using a polling publisher that introduced ~5s of latency and put load on PostgreSQL from constant `SELECT FOR UPDATE SKIP LOCKED` queries. I added Debezium CDC on top — it reads the PostgreSQL WAL directly using the `pgoutput` replication plugin, which gives sub-second latency and zero polling load. We now have dual ingestion: Debezium for speed, polling as a fallback. The tricky part was the init container pattern — Debezium needs the replication slot to exist before the connector starts, so we run a Kubernetes init container that creates the slot if it doesn't exist."

**If they care about performance:**
> "The API Gateway needed to rate-limit differently for different client types — anonymous users get 10 req/s by IP, authenticated users get 100 req/s by JWT subject, partner integrations get 1000 req/s by API key. Spring Cloud Gateway's `RequestRateLimiter` only supports one `KeyResolver` globally. I implemented three separate `KeyResolver` beans (IP-based, JWT-based, API-key-based) with a composite resolver that inspects the request and delegates to the appropriate strategy. Combined with Redis as the backing store for sliding window counters, this gives us per-identity rate limiting across all Gateway instances without sticky sessions."

**If they care about observability:**
> "We had a subtle MDC context propagation bug. Every HTTP request got a `correlationId` in the MDC, but whenever a service method used `@Async` for things like sending a Kafka event or triggering a notification, the async thread had an empty MDC — so you couldn't correlate async log lines back to the originating request. The fix was a `TaskDecorator` on the `ThreadPoolTaskExecutor`. It captures the full MDC map from the calling thread before submitting the task, and restores it on the worker thread before the task runs, then clears it in a `finally` block — critical because thread pools reuse threads and you don't want one request's context leaking into the next."

---

### Q: "Why microservices and not a monolith?"

> "Honestly, for a team of four, a **modular monolith** would have been faster to ship initially. Microservices have real overhead: network calls, distributed transactions, independent deployments, and operational complexity. We chose microservices deliberately because the goal was to demonstrate production-grade patterns — Saga for distributed transactions, CQRS for read/write separation, Event Sourcing for auditability. These patterns exist specifically to solve microservices problems, so you need the distributed context to justify them.
>
> If this were a real product at day zero, I'd start with a modular monolith with clean domain boundaries — same modules, same package structure — but deployable as one unit. Then extract services when you hit a real scaling or team autonomy bottleneck. 'Strangler Fig' pattern. Microservices are a destination, not a starting point."

---

### Resume / Profile Bullets for This

```
• Led technical architecture for a 7-microservice Employee Management Platform
  as Lead Product Engineer on a 4-person engineering team

• Designed and implemented event-driven architecture using Apache Kafka, Debezium
  CDC (PostgreSQL WAL), Transactional Outbox, Saga orchestration, and CQRS with
  Elasticsearch read model — achieving sub-second event propagation

• Built analytics-service with all four gRPC streaming modes (Unary/Server-stream/
  Client-stream/Bidirectional) using Protocol Buffers; integrated Resilience4j
  circuit breaker with fallback for graceful degradation when analytics unavailable

• Replaced Zipkin with OpenTelemetry (OTLP) end-to-end, wired MDC TaskDecorator
  for async trace propagation, and established SLO/Error Budget alerting in Grafana

• Deployed platform on Kubernetes using Helm + ArgoCD (GitOps), KEDA for
  Kafka-lag-based autoscaling, Chaos Mesh for fault injection testing
```

---

## 1. Spring Security

### What's Implemented

| Feature | File |
|---|---|
| JWT Authentication Filter | `employee-microservice/.../security/JwtAuthenticationFilter.java` |
| JWT Token Provider (HMAC-SHA256) | `employee-microservice/.../security/JwtTokenProvider.java` |
| Security Filter Chain + CORS | `employee-microservice/.../config/SecurityConfig.java` |
| Role Entity (ROLE_USER / ADMIN / MANAGER) | `employee-microservice/.../model/Role.java` |
| Register + Login endpoints | `employee-microservice/.../controller/AuthController.java` |
| Profile-based security (dev/prod) | `payroll-microservice/.../config/SecurityConfig.java` |

### Architecture — Request Flow

```
HTTP Request
    │
    ▼
JwtAuthenticationFilter (OncePerRequestFilter)
    │  1. Extract "Bearer <token>" from Authorization header
    │  2. JwtTokenProvider.validateToken() — verifies HMAC-SHA256 signature
    │  3. Extract username from Claims.getSubject()
    │  4. Load UserDetails (user + roles from DB)
    │  5. Create UsernamePasswordAuthenticationToken(userDetails, null, authorities)
    │  6. Set into SecurityContextHolder
    ▼
SecurityFilterChain.authorizeHttpRequests()
    │  /api/auth/**          → permitAll()
    │  /actuator/health      → permitAll()
    │  /actuator/**          → hasRole("ADMIN")   ← role-based
    │  /api/v1/employees/**  → authenticated()
    │  anyRequest()          → authenticated()
    ▼
Controller / Service
```

### Role-Based Access Control

**Three roles defined in `Role.java`:**

```java
public enum RoleName {
    ROLE_USER,     // read-only employee access
    ROLE_ADMIN,    // full access including /actuator/**
    ROLE_MANAGER   // can approve payroll, assign roles
}
```

**Why `ROLE_` prefix?**  
Spring Security's `hasRole("ADMIN")` automatically prepends `ROLE_` to check.  
`hasAuthority("ROLE_ADMIN")` checks the exact string.  
So `hasRole("ADMIN")` == `hasAuthority("ROLE_ADMIN")`.

**Method-level security enabled:**
```java
@EnableMethodSecurity   // on SecurityConfig
// Enables:
//   @PreAuthorize("hasRole('ADMIN')")
//   @PostAuthorize("returnObject.username == authentication.name")
//   @Secured("ROLE_ADMIN")
```

**Why public registration can't give ROLE_ADMIN:**
```java
// AuthController.java — register()
// Comment says explicitly:
// "Privilege escalation vulnerability. Any attacker could register as admin.
//  Role elevation must require authorization from an existing privileged user."
Role userRole = roleRepository.findByName(Role.RoleName.ROLE_USER).orElseThrow();
roles.add(userRole);  // Always ROLE_USER only
```

### JWT Implementation Details

**Token generation — `JwtTokenProvider.java`:**
```java
// HMAC-SHA256 (HS256) signing key
// Key must be ≥ 256 bits (32 bytes) — enforced in @PostConstruct
this.key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));

// Token structure: header.payload.signature
Jwts.builder()
    .subject(username)
    .issuedAt(now)
    .expiration(expiryDate)     // from jwt.expiration config
    .signWith(key)
    .compact();
```

**Token validation — handles all failure cases:**
```java
} catch (SecurityException ex)     { /* Invalid signature    */ }
} catch (MalformedJwtException ex)  { /* Tampered token       */ }
} catch (ExpiredJwtException ex)    { /* Token expired        */ }
} catch (UnsupportedJwtException ex){ /* Wrong algorithm      */ }
} catch (IllegalArgumentException ex){ /* Empty token         */ }
```

### CORS Configuration

```java
// Externalized via @Value — different origins per environment:
@Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:5173}")
private String allowedOrigins;

configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Correlation-ID"));
configuration.setExposedHeaders(List.of("X-Correlation-ID")); // ← custom header for tracing
configuration.setAllowCredentials(true);
configuration.setMaxAge(3600L);  // pre-flight cached for 1 hour
```

### Session Management — Why STATELESS

```java
.sessionManagement(session ->
    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
```

> **Interview: "Why STATELESS?"**  
> Microservices run as multiple instances. HTTP sessions are in-memory and not shared across instances. With STATELESS + JWT, any instance can verify any request — the token is self-contained. No session replication needed, perfect for Kubernetes/cloud deployments.

### Payroll — Profile-Based Security

```java
// SecurityConfig.java in payroll-microservice — two beans:
@Bean @Profile({"dev", "test", "default"})
public SecurityFilterChain devSecurityFilterChain(...)
// → .anyRequest().permitAll() — easy local testing

@Bean @Profile("prod")
public SecurityFilterChain prodSecurityFilterChain(...)
// → only actuator/swagger public, /api/** requires authentication
```

> **Interview: "How do you handle security differences between dev and prod?"**  
> Use Spring Profile-based `SecurityFilterChain` beans. Dev permits all (developer experience). Prod locks everything down. Zero code changes — just flip the active profile via `SPRING_PROFILES_ACTIVE=prod`.

### Top Interview Q&A — Security

**Q: What's the difference between Authentication and Authorization?**  
A: Authentication = who you are (verify identity via JWT). Authorization = what you can do (check roles/permissions). `JwtAuthenticationFilter` handles authentication; `SecurityFilterChain.authorizeHttpRequests()` + `@PreAuthorize` handles authorization.

**Q: How does Spring Security's filter chain work?**  
A: `SecurityFilterChain` is a servlet filter registered in the servlet container. Every HTTP request passes through it before reaching controllers. Filters run in order: CORS → CSRF → Session → AuthFilter → ExceptionTranslation → Authorization.

**Q: What's BCrypt and why use it for passwords?**  
A: BCrypt is an adaptive password hashing algorithm. It includes a work factor (cost) that makes brute-force exponentially harder as hardware improves. Unlike MD5/SHA, BCrypt is intentionally slow (cost=10 → ~100ms per hash). It also includes a random salt per hash, so identical passwords produce different hashes.

**Q: What is `OncePerRequestFilter`?**  
A: A Spring base class that guarantees the filter runs exactly once per request (even with request dispatching internally). Without it, a filter could fire multiple times for the same request in some servlet containers.

**Q: How would you add OAuth2 / Keycloak?**  
A: Add `spring-boot-starter-oauth2-resource-server`, configure `spring.security.oauth2.resourceserver.jwt.issuer-uri=http://keycloak:8080/realms/myrealm`, and replace the custom `JwtAuthenticationFilter` with Spring's built-in JWT decoder. The infrastructure Keycloak config already exists in `infrastructure/keycloak/`.

---

## 2. Resilience4j Circuit Breaker

### What's Implemented

All 4 Resilience4j modules are active on `EmployeeService` and `PayrollService`:

| Module | Annotation | Purpose |
|---|---|---|
| Circuit Breaker | `@CircuitBreaker` | Stop calling failing service |
| Retry | `@Retry` | Retry transient failures with backoff |
| Rate Limiter | `@RateLimiter` | Throttle calls per time period |
| Bulkhead | `@Bulkhead` | Limit concurrent calls |

### Configuration (from `application.properties`)

```properties
# ── CIRCUIT BREAKER ──────────────────────────────────────────────────────────
resilience4j.circuitbreaker.instances.employeeService.sliding-window-size=10
resilience4j.circuitbreaker.instances.employeeService.minimum-number-of-calls=5
resilience4j.circuitbreaker.instances.employeeService.failure-rate-threshold=50
resilience4j.circuitbreaker.instances.employeeService.slow-call-rate-threshold=50
resilience4j.circuitbreaker.instances.employeeService.slow-call-duration-threshold=2s
resilience4j.circuitbreaker.instances.employeeService.wait-duration-in-open-state=10s
resilience4j.circuitbreaker.instances.employeeService.permitted-number-of-calls-in-half-open-state=3
resilience4j.circuitbreaker.instances.employeeService.automatic-transition-from-open-to-half-open-enabled=true
resilience4j.circuitbreaker.instances.employeeService.register-health-indicator=true

# ── RETRY ─────────────────────────────────────────────────────────────────────
resilience4j.retry.instances.employeeService.max-attempts=3
resilience4j.retry.instances.employeeService.wait-duration=1s
resilience4j.retry.instances.employeeService.enable-exponential-backoff=true
resilience4j.retry.instances.employeeService.exponential-backoff-multiplier=2

# ── RATE LIMITER ──────────────────────────────────────────────────────────────
resilience4j.ratelimiter.instances.employeeService.limit-for-period=10
resilience4j.ratelimiter.instances.employeeService.limit-refresh-period=1s
resilience4j.ratelimiter.instances.employeeService.timeout-duration=0s

# ── BULKHEAD (Semaphore) ───────────────────────────────────────────────────────
resilience4j.bulkhead.instances.employeeService.max-concurrent-calls=10
resilience4j.bulkhead.instances.employeeService.max-wait-duration=1s

# ── THREAD POOL BULKHEAD ──────────────────────────────────────────────────────
resilience4j.thread-pool-bulkhead.instances.employeeService.max-thread-pool-size=4
resilience4j.thread-pool-bulkhead.instances.employeeService.core-thread-pool-size=2
resilience4j.thread-pool-bulkhead.instances.employeeService.queue-capacity=100
```

### Code Pattern — EmployeeService.java

```java
@CircuitBreaker(name = "employeeService", fallbackMethod = "getAllEmployeesFallback")
@RateLimiter(name = "employeeService")
@Bulkhead(name = "employeeService")
public Page<Employee> getAllEmployees(Pageable pageable) { ... }

@CircuitBreaker(name = "employeeService", fallbackMethod = "getEmployeeByIdFallback")
@Retry(name = "employeeService")   // 3 attempts, 1s → 2s → 4s exponential
@RateLimiter(name = "employeeService")
public Employee getEmployeeById(Long id) { ... }
```

### Circuit Breaker State Machine

```
          ┌─────────────────────────────┐
          │         CLOSED              │ ← Normal operation
          │  failure-rate tracked in    │   All calls go through
          │  sliding window (size=10)   │
          └──────────┬──────────────────┘
                     │ failure-rate ≥ 50%
                     │ (5 of last 10 calls failed)
                     ▼
          ┌─────────────────────────────┐
          │          OPEN               │ ← Short-circuit
          │  All calls immediately      │   Throws CallNotPermittedException
          │  fail → fallbackMethod()    │   wait-duration = 10s
          └──────────┬──────────────────┘
                     │ after 10s (auto-transition)
                     ▼
          ┌─────────────────────────────┐
          │        HALF-OPEN            │ ← Probe recovery
          │  3 test calls permitted     │
          │  (permitted-in-half-open=3) │
          └──────┬──────────────┬───────┘
     ≥ 50% fail  │              │  < 50% fail
                 ▼              ▼
             OPEN again      CLOSED ✓
```

Key numbers from your config:
- Trips OPEN after: **5+ failures in a 10-call window** (50% of window=10, minimum=5)
- Stays OPEN for: **10 seconds**
- Half-open probe: **3 test calls**
- Slow call threshold: calls taking **>2s** also count as failures

### Retry with Exponential Backoff

```
Attempt 1 → fails → wait 1s
Attempt 2 → fails → wait 2s  (1s × multiplier=2)
Attempt 3 → fails → give up → fallback
```

> **Interview: "When should you NOT retry?"**  
> Never retry 4xx client errors (400 Bad Request, 404 Not Found, 409 Conflict) — retrying them wastes resources and never succeeds. Only retry transient failures: 503 Service Unavailable, network timeouts, connection refused. In this project, `ResourceNotFoundException` should be excluded from retry config.

### Bulkhead — Two Types Explained

**Semaphore Bulkhead** (used here):
- Runs in the **caller's thread**
- `max-concurrent-calls=10` → if 10 requests are already in-flight, new ones wait up to `max-wait-duration=1s`, then fail
- Good for: limiting DB connections, controlling concurrency of expensive operations

**Thread Pool Bulkhead** (also configured):
- Uses a **separate thread pool** (`max-thread-pool-size=4, core=2, queue=100`)
- Decouples caller from execution — caller gets a `CompletableFuture`
- Good for: isolating calls to unstable external services (prevents thread starvation of your main pool)

### Annotation Order Matters

```java
// Resilience4j applies decorators in this order (outer → inner):
// Retry ( CircuitBreaker ( RateLimiter ( Bulkhead ( Function ) ) ) )
//
// This means:
// 1. Bulkhead limits concurrent executions
// 2. RateLimiter limits calls per second
// 3. CircuitBreaker tracks failures and trips open
// 4. Retry attempts the full decorated function again
//    → each retry fires through CB, RL, Bulkhead again
```

### Payroll Client — also protected

```java
// payroll → employee-service call via Feign/RestTemplate:
@CircuitBreaker(name = "employeeService", fallbackMethod = "getEmployeeFallback")
@Retry(name = "employeeService")
public EmployeeDto getEmployee(Long employeeId) { ... }
```

### Top Interview Q&A — Circuit Breaker

**Q: What's the difference between Circuit Breaker and Retry?**  
A: Retry handles **transient failures** — temporary glitches that self-resolve (retry 3x, it works on attempt 2). Circuit Breaker handles **sustained failures** — if a service is down for 30s, retrying 3x every request is wasteful and amplifies load on an already struggling service. CB opens the circuit and fast-fails all calls until the service recovers.

**Q: What's the difference between Bulkhead and Rate Limiter?**  
A: Rate Limiter is time-based: max 10 calls per second regardless of how long each takes. Bulkhead is concurrency-based: max 10 calls in-flight simultaneously, regardless of time. You need both: RL prevents bursts; Bulkhead prevents thread pool exhaustion.

**Q: How does Resilience4j compare to Hystrix?**  
A: Hystrix is in maintenance mode since 2018. Resilience4j is lightweight (functional, no dependencies), supports all 4 patterns, has better Spring Boot integration, and works with Java's functional APIs. Hystrix used thread-pool isolation by default (more overhead); Resilience4j defaults to semaphore (lower overhead, configurable).

**Q: What is the `fallbackMethod`?**  
A: A same-class method with the same signature + an extra `Throwable` parameter. Called when CB is OPEN or call fails after all retries. Provides a degraded response — e.g., return cached data, an empty list, or a meaningful error. Fallback method names in this project: `getAllEmployeesFallback`, `getEmployeeByIdFallback`, `createEmployeeFallback`, etc.

---

## 3. RabbitMQ vs Kafka

### Short Answer: RabbitMQ is NOT in this project. Kafka is used.

### Detailed Comparison

| | Kafka | RabbitMQ |
|---|---|---|
| **Model** | Pull-based log/stream | Push-based message queue |
| **Message retention** | Configurable (days/forever) | Deleted after consumer ACKs |
| **Consumer groups** | Multiple groups each read full stream | Message delivered to one consumer |
| **Ordering** | Per-partition ordering guaranteed | Per-queue ordering (with single consumer) |
| **Throughput** | Millions/sec | Tens of thousands/sec |
| **Replay** | Yes — seek to any offset | No — once consumed, gone |
| **Protocols** | Binary TCP (Kafka protocol) | AMQP, MQTT, STOMP |
| **Routing** | Topic → Partition by key | Exchange → Queue via binding/routing key |
| **Use case** | Event streaming, CDC, audit log | Task queues, RPC, complex routing |

### Why Kafka was chosen for this project

This platform uses Kafka because:

1. **Event Sourcing** — events must be replayable to rebuild aggregate state. Kafka retains events; RabbitMQ does not.

2. **CDC / Debezium** — Debezium publishes WAL changes as Kafka topics. The entire CDC pipeline is Kafka-native.

3. **Multi-service fan-out** — `employee.events` topic is consumed by payroll-service, notification-service, analytics-service independently. With Kafka consumer groups, each service reads the full stream. With RabbitMQ, you'd need separate queues per consumer (fanout exchange).

4. **Exactly-once via Outbox** — the Outbox Pattern stores events in PostgreSQL, then a separate publisher polls and sends to Kafka. This guarantees at-least-once delivery with idempotent consumers. Easy to implement with Kafka's topic log.

5. **Audit history** — Kafka topics act as an immutable audit log. You can replay all `employee.events` from offset 0 to reproduce every state change.

### When would you use RabbitMQ instead?

- **Task queues** — background jobs (send email, resize image) where exactly one worker should process each task and messages should be deleted after processing
- **Complex routing** — different headers/routing keys send messages to different queues (e.g., high-priority vs normal orders)
- **RPC over messaging** — `reply-to` queue pattern for synchronous-style async calls
- **Low-volume, low-latency** — if you need sub-millisecond delivery and don't need replay

### Interview Answer

> "RabbitMQ isn't in this project by design. We chose Kafka for three reasons: CDC with Debezium is Kafka-native, Event Sourcing requires message replay which Kafka supports natively via offset management, and our multi-service fan-out (payroll + notification + analytics all consuming the same employee events) is a natural fit for Kafka consumer groups. If we needed a task queue — like background email sending — RabbitMQ would be the right tool. The notification-service's email/SMS dispatch actually is a candidate for RabbitMQ in a future phase."

---

## 4. Threads

### What's Used

| Service | Mechanism | Config | File |
|---|---|---|---|
| employee-service | `@Async` + `ThreadPoolTaskExecutor` | core=5, max=10, queue=100 | `AsyncConfig.java` |
| employee-service | **MDC TaskDecorator** | propagates correlationId | `AsyncConfig.java` |
| notification-service | `@Async` + `ThreadPoolTaskExecutor` | core=5, max=20, queue=100 | `AsyncConfig.java` |
| payroll-service | `@Async` + `ThreadPoolTaskExecutor` | core=5, max=10, queue=100 | `AsyncConfig.java` |

### What's NOT Used (and Why)

| Mechanism | Reason not used |
|---|---|
| `new Thread()` | Never — no lifecycle management, no pool reuse, no Spring context |
| `SimpleAsyncTaskExecutor` | Default Spring executor — creates a **new thread per call** — effectively unbounded, no backpressure |
| Java 21 Virtual Threads | Platform is Java 17 LTS. Virtual threads are a Java 21+ feature. In a future upgrade to Java 21, you could use `Executors.newVirtualThreadPerTaskExecutor()` as the task executor — virtual threads are cheap enough to create one per request |
| `ForkJoinPool` | Not needed here. ForkJoinPool is for divide-and-conquer parallelism (split large tasks into subtasks). Our async work is I/O-bound, not CPU-bound parallel computation |

### ThreadPoolTaskExecutor — Configuration Explained

```java
// employee-microservice/config/AsyncConfig.java
executor.setCorePoolSize(5);        // Always-alive threads (even when idle)
executor.setMaxPoolSize(10);        // Max threads under high load
executor.setQueueCapacity(100);     // Tasks queued before new threads created
executor.setThreadNamePrefix("async-");  // Visible in thread dumps / profilers
executor.setWaitForTasksToCompleteOnShutdown(true);  // Graceful shutdown
executor.setAwaitTerminationSeconds(60);             // Wait up to 60s on shutdown
executor.setTaskDecorator(mdcTaskDecorator());       // MDC propagation
```

**Thread creation logic:**
```
Submit task:
  ├─ active threads < corePoolSize (5)?  → create new thread immediately
  ├─ corePoolSize reached?               → queue the task (up to 100)
  ├─ queue full + active < maxPoolSize?  → create thread up to max (10)
  └─ queue full + at max (10)?           → CallerRunsPolicy (caller thread executes)
```

**`CallerRunsPolicy` = built-in backpressure:**  
When the queue is full and max threads are busy, the HTTP request thread itself runs the task. This naturally slows down incoming requests, acting as backpressure. Alternative policies: `AbortPolicy` (throws exception), `DiscardPolicy` (silently drops).

### MDC TaskDecorator — The Core Problem

**Without TaskDecorator:**
```
Thread-1 (HTTP)   MDC = {correlationId="abc123", userId="u42"}
                            │
                            │  @Async method submitted to thread pool
                            ▼
Thread-5 (pool)   MDC = {}  ← EMPTY! correlationId lost!
LOG: "Processing employee..." — no trace ID in the log line
```

**With MDC TaskDecorator (from `AsyncConfig.java`):**
```java
return runnable -> {
    // 1. Capture MDC & RequestAttributes from the CALLING thread (HTTP thread)
    Map<String, String> callerMdc = MDC.getCopyOfContextMap();
    RequestAttributes reqAttr = RequestContextHolder.currentRequestAttributes();

    return () -> {
        try {
            MDC.setContextMap(callerMdc);          // 2. Restore on worker thread
            RequestContextHolder.setRequestAttributes(reqAttr);
            runnable.run();                         // 3. Execute the @Async method
        } finally {
            MDC.clear();                           // 4. CRITICAL: clean up!
            RequestContextHolder.resetRequestAttributes();
            // Thread pools REUSE threads. Without cleanup, the next task
            // on this thread would inherit the previous request's MDC.
        }
    };
};
```

### @Async Rules — 4 Critical Rules

```java
// Rule 1: @EnableAsync must be on a @Configuration class
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer { ... }

// Rule 2: @Async method must be called from ANOTHER bean (not self-invocation)
// WRONG — proxy bypass:
public void doSomething() {
    this.sendNotification();  // Calls directly, NOT through Spring proxy → NOT async
}

// CORRECT:
@Autowired NotificationService notificationService;
public void doSomething() {
    notificationService.sendNotification();  // Goes through proxy → IS async
}

// Rule 3: Must return void or CompletableFuture<T>
@Async
public CompletableFuture<String> processAsync() {
    return CompletableFuture.completedFuture("done");
}

// Rule 4: Cannot be private (proxy can't intercept private methods)
@Async
public void sendEmailAsync() { ... }    // ✓ public
// @Async private void ...              // ✗ won't work
```

### Java Virtual Threads (Interview Topic — Even if Not Used)

```java
// Java 21 way to enable virtual threads for Spring MVC:
// application.properties:
spring.threads.virtual.enabled=true

// Or manually:
@Bean
public Executor taskExecutor() {
    return Executors.newVirtualThreadPerTaskExecutor();
}
```

> **Interview: "What are virtual threads and how do they differ from platform threads?"**  
> Platform threads are OS threads — creating 10,000 is expensive (stack ~1MB each). Virtual threads are JVM-managed, lightweight (stack grows dynamically, ~few KB). You can create millions. They're ideal for I/O-bound workloads (JDBC, HTTP calls) because the JVM unmounts the virtual thread during blocking I/O and mounts a different one. This fundamentally changes the threading model: instead of a pool of ~200 threads, you can have one-thread-per-request at massive scale. Spring Boot 3.2+ supports virtual threads via `spring.threads.virtual.enabled=true`.

### Top Interview Q&A — Threads

**Q: Why define a custom ThreadPoolTaskExecutor instead of using the default?**  
A: Spring's default `@Async` executor is `SimpleAsyncTaskExecutor` which creates a **new OS thread per invocation** — unbounded, no pooling, no backpressure. Under load this causes: OOM from too many threads, CPU overhead from context switching, no graceful shutdown. A custom `ThreadPoolTaskExecutor` with bounded pool + queue + `CallerRunsPolicy` gives predictable behavior and backpressure.

**Q: What is `CompletableFuture` chaining?**  
A: `CompletableFuture` allows non-blocking pipeline composition:
```java
CompletableFuture.supplyAsync(() -> fetchEmployee(id), executor)
    .thenApply(emp -> enrichWithDepartment(emp))
    .thenCompose(emp -> sendToAnalytics(emp))
    .exceptionally(ex -> { log.error(...); return fallback; });
```
`thenApply` transforms the value; `thenCompose` flattens a nested future; `exceptionally` handles errors. All run on the provided executor without blocking any thread.

**Q: What's the difference between `@Transactional` and `@Async`?**  
A: `@Transactional` opens a DB transaction bound to the current thread (uses ThreadLocal). `@Async` runs on a different thread — so `@Transactional` context does NOT propagate to `@Async` methods. If you need transactional async work, annotate the `@Async` method itself with `@Transactional`, which starts a new transaction on the worker thread.

---

## 5. SQL

### Files in this repo

| File | Contents |
|---|---|
| `sql/advanced-queries.sql` | Window functions, CTEs, complex JOINs, subqueries (489 lines) |
| `sql/optimization-indexing.sql` | EXPLAIN ANALYZE, index strategies, query optimization (196 lines) |
| `sql/transactions-concurrency.sql` | Isolation levels, locking, deadlocks (172 lines) |
| `sql/V5__advanced_schema_features.sql` | Schema: partial indexes, constraints, generated columns (236 lines) |

---

### WINDOW FUNCTIONS

The classic "top 3 per department" question:

```sql
-- ROW_NUMBER vs RANK vs DENSE_RANK
SELECT
    e.first_name, e.last_name, d.name AS department, e.salary,
    ROW_NUMBER() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) AS row_num,
    RANK()       OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) AS rank,
    DENSE_RANK() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) AS dense_rank
FROM employees e
JOIN departments d ON e.department_id = d.id;

-- Given salaries: 100k, 90k, 90k, 80k
-- ROW_NUMBER:  1, 2, 3, 4   (always unique — arbitrary tie-break)
-- RANK:        1, 2, 2, 4   (gaps after ties)
-- DENSE_RANK:  1, 2, 2, 3   (no gaps)
```

**Top 3 per department using CTE:**
```sql
WITH ranked AS (
    SELECT e.*, d.name AS dept_name,
           DENSE_RANK() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) AS rnk
    FROM employees e JOIN departments d ON e.department_id = d.id
)
SELECT * FROM ranked WHERE rnk <= 3;
```

**LAG/LEAD — compare with adjacent rows:**
```sql
-- Salary compared to previous hire
SELECT
    first_name, hire_date, salary,
    LAG(salary, 1)  OVER (ORDER BY hire_date) AS prev_hire_salary,
    LEAD(salary, 1) OVER (ORDER BY hire_date) AS next_hire_salary,
    salary - LAG(salary, 1) OVER (ORDER BY hire_date) AS salary_delta
FROM employees;
```

**Running total / cumulative sum:**
```sql
SELECT
    hire_date, salary,
    SUM(salary) OVER (ORDER BY hire_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM employees;
```

---

### CTEs (Common Table Expressions)

```sql
-- Non-recursive: readability + reuse
WITH dept_avg AS (
    SELECT department_id, AVG(salary) AS avg_salary
    FROM employees GROUP BY department_id
),
above_avg AS (
    SELECT e.* FROM employees e
    JOIN dept_avg da ON e.department_id = da.department_id
    WHERE e.salary > da.avg_salary
)
SELECT * FROM above_avg ORDER BY salary DESC;
```

**Recursive CTE — hierarchy traversal:**
```sql
-- Find all employees under a manager (org chart)
WITH RECURSIVE org_chart AS (
    -- Anchor: start with the top-level manager
    SELECT id, name, manager_id, 0 AS depth
    FROM employees WHERE manager_id IS NULL

    UNION ALL

    -- Recursive: join each employee to their found manager
    SELECT e.id, e.name, e.manager_id, oc.depth + 1
    FROM employees e
    JOIN org_chart oc ON e.manager_id = oc.id
)
SELECT * FROM org_chart ORDER BY depth, name;
```

> **Interview: "When would you use a recursive CTE?"**  
> For hierarchical/tree structures: org charts, category trees, bill of materials. The recursive part references the CTE itself, processing each level of the hierarchy until no more rows match.

---

### INDEX STRATEGIES

From `sql/optimization-indexing.sql`:

```sql
-- B-Tree (default) — equality, range, ORDER BY
CREATE INDEX idx_employees_email ON employees (email);
CREATE INDEX idx_payroll_employee_period ON payroll (employee_id, pay_period DESC);

-- Composite Index — put high-cardinality / WHERE columns first
CREATE INDEX idx_employees_dept_salary ON employees (department_id, salary DESC);
-- Covers: WHERE department_id = X ORDER BY salary DESC  ← index-only scan

-- Partial Index — only index a subset of rows
CREATE INDEX idx_active_employees ON employees (department_id, salary)
    WHERE status = 'ACTIVE';
-- Index is much smaller → faster scans, less storage

-- Covering Index (INCLUDE) — avoid heap fetch
CREATE INDEX idx_employees_covering ON employees (department_id)
    INCLUDE (first_name, last_name, salary);
-- Query "SELECT first_name, last_name, salary WHERE department_id = X"
-- can be answered entirely from the index — no table access

-- GIN Index for full-text / JSONB
CREATE INDEX idx_employee_metadata ON employees USING GIN (metadata);
-- For: metadata @> '{"skill": "java"}' queries
```

**EXPLAIN ANALYZE:**
```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM employees WHERE email = 'john@example.com';

-- Key output to read:
-- Seq Scan      = table scan (BAD for large tables → needs index)
-- Index Scan    = using index (GOOD)
-- Bitmap Index  = multiple indexes combined (mixed selectivity)
-- Hash Join     = hash-based join (good for large tables, no index)
-- Nested Loop   = O(n*m) — only good when inner side is small/indexed
-- actual time=0.042..0.043  ← real execution time in ms
-- rows=1                    ← actual rows returned
-- Buffers: shared hit=5     ← pages from cache (good); read=0 means no disk I/O
```

---

### TRANSACTION ISOLATION LEVELS

From `sql/transactions-concurrency.sql`:

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | When to use |
|---|---|---|---|---|
| READ UNCOMMITTED | ✓ possible | ✓ possible | ✓ possible | Never in practice |
| READ COMMITTED | ✗ prevented | ✓ possible | ✓ possible | **PostgreSQL default** |
| REPEATABLE READ | ✗ | ✗ prevented | ✓ possible | Reports, salary calc |
| SERIALIZABLE | ✗ | ✗ | ✗ prevented | Financial operations |

```sql
-- REPEATABLE READ for salary calculations
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
    SELECT SUM(salary) FROM employees WHERE department_id = 1;
    -- Even if another transaction updates salaries mid-report,
    -- this transaction sees the original consistent snapshot
COMMIT;
```

**Spring `@Transactional` isolation:**
```java
@Transactional(isolation = Isolation.REPEATABLE_READ)
public BigDecimal calculatePayroll(Long departmentId) { ... }

@Transactional(isolation = Isolation.SERIALIZABLE)
public void processPayment(Long employeeId, BigDecimal amount) { ... }
```

---

### LOCKING PATTERNS

**Pessimistic Locking — `SELECT FOR UPDATE`:**
```sql
BEGIN;
    SELECT * FROM employees WHERE id = 1 FOR UPDATE;
    -- Row locked — other transactions WAIT here
    UPDATE employees SET salary = salary + 5000 WHERE id = 1;
COMMIT;
```

**Outbox Pattern — `SKIP LOCKED`** (actually used in this project):
```sql
-- Multiple outbox publisher instances can run concurrently:
SELECT * FROM outbox_events
WHERE status = 'PENDING'
ORDER BY created_at LIMIT 10
FOR UPDATE SKIP LOCKED;   -- ← Skip rows locked by other workers
                          -- Each worker gets a different batch
```

**Optimistic Locking — `@Version`** (Spring Data / Hibernate):
```java
@Entity
public class Employee {
    @Version
    private Long version;    // Hibernate auto-increments on each update
}
// If two transactions read version=1 and both try to update:
// First commit wins → version becomes 2
// Second commit throws OptimisticLockException (stale version)
// Application retries the operation
```

**Advisory Locks — distributed application-level lock:**
```sql
-- Lock a concept, not a row
SELECT pg_advisory_lock(hashtext('payroll_processing_dept_1'));
    -- Only one JVM instance can hold this lock at a time
    -- Other instances block until it's released
SELECT pg_advisory_unlock(hashtext('payroll_processing_dept_1'));

-- Non-blocking try:
SELECT pg_try_advisory_lock(hashtext('batch_job'));
-- Returns true (acquired) or false (already held)
```

---

### DEADLOCK PREVENTION

```sql
-- DEADLOCK: Transaction A locks row 1 then tries row 2
--           Transaction B locks row 2 then tries row 1 → deadlock!

-- Prevention rule: ALWAYS lock rows in the same order
-- Bad:
-- Tx A:  LOCK employee_id=1, then LOCK employee_id=2
-- Tx B:  LOCK employee_id=2, then LOCK employee_id=1  ← deadlock!

-- Good:
-- Tx A:  LOCK employee_id=1, then LOCK employee_id=2
-- Tx B:  LOCK employee_id=1, then LOCK employee_id=2  ← Tx B waits, no deadlock

-- In JPA, use consistent update order:
employees.stream()
    .sorted(Comparator.comparing(Employee::getId))  // ← always same order
    .forEach(e -> update(e));
```

**Postgres detects deadlocks and kills one transaction** (`ERROR: deadlock detected`). Application must:
1. Catch `org.springframework.dao.DeadlockLoserDataAccessException`
2. Retry the transaction (Resilience4j `@Retry` handles this)

---

### N+1 QUERY PROBLEM

```java
// N+1 PROBLEM:
// For each of N employees, Hibernate issues 1 query for their department
// = 1 (employees) + N (department per employee) queries
List<Employee> employees = employeeRepo.findAll(); // 1 query
employees.forEach(e -> e.getDepartment().getName()); // N more queries!

// FIX 1: JOIN FETCH in JPQL
@Query("SELECT e FROM Employee e JOIN FETCH e.department WHERE e.status = 'ACTIVE'")
List<Employee> findAllWithDepartment();

// FIX 2: @EntityGraph
@EntityGraph(attributePaths = {"department", "roles"})
List<Employee> findByStatus(String status);

// FIX 3: @BatchSize (Hibernate batches N lazy loads into 1 IN query)
@BatchSize(size = 30)
@ManyToOne(fetch = FetchType.LAZY)
private Department department;

// DETECT N+1: enable Hibernate SQL logging + count the queries
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
```

---

### Top Interview Q&A — SQL

**Q: What's the difference between `INNER JOIN`, `LEFT JOIN`, `FULL JOIN`?**  
A: `INNER JOIN` — only rows where the join condition matches in both tables. `LEFT JOIN` — all rows from the left table, NULLs for unmatched right rows (use for "employees with or without payroll records"). `FULL OUTER JOIN` — all rows from both tables, NULLs where no match (use for reconciliation queries).

**Q: `WHERE` vs `HAVING` — what's the difference?**  
A: `WHERE` filters rows **before** grouping, `HAVING` filters **after** grouping. You can't use aggregate functions in `WHERE`:
```sql
-- ✗ Wrong:
WHERE AVG(salary) > 80000

-- ✓ Correct:
GROUP BY department_id
HAVING AVG(salary) > 80000
```

**Q: What's the difference between `DELETE`, `TRUNCATE`, `DROP`?**  
A: `DELETE` removes rows (one by one, fires triggers, can have `WHERE`, transactional, slow for large tables). `TRUNCATE` removes all rows at once (skips triggers, no `WHERE`, faster but MDL lock). `DROP` removes the entire table structure.

**Q: Explain clustered vs non-clustered index.**  
A: PostgreSQL uses heap storage — there's no traditional clustered index (unlike SQL Server/MySQL InnoDB). `CLUSTER TABLE employees USING idx_employees_dept` physically reorders the heap on disk to match the index. Subsequent queries using that index become faster (sequential I/O). But it's a one-time operation; inserts unsort the table over time. In practice we use `INCLUDE` and partial indexes instead.

**Q: When does an index NOT help?**  
A: (1) Low cardinality columns (gender M/F — half the table anyway → seq scan wins). (2) Small tables (seq scan is faster). (3) Function applied to the column in WHERE (`WHERE LOWER(email) = ?` ignores the index on `email` → use functional index). (4) Table scans with > ~15% rows selected (DB optimizer chooses seq scan). (5) Stale statistics — run `ANALYZE employees` to update.

---

## Quick Reference Card

```
Spring Security:
  ✓ JWT (HMAC-SHA256) via JJWT library
  ✓ OncePerRequestFilter → SecurityContextHolder
  ✓ 3 roles: ROLE_USER, ROLE_ADMIN, ROLE_MANAGER
  ✓ STATELESS sessions (no HttpSession)
  ✓ BCrypt password encoding
  ✓ @EnableMethodSecurity (allows @PreAuthorize)
  ✓ CORS externalized via @Value

Resilience4j:
  ✓ @CircuitBreaker   — 50% failure rate → OPEN, 10s → HALF-OPEN
  ✓ @Retry            — 3 attempts, exponential backoff (1s→2s→4s)
  ✓ @RateLimiter      — 10 calls/sec
  ✓ @Bulkhead         — max 10 concurrent + thread-pool variant
  ✓ FallbackMethod    — graceful degradation on every service method
  ✓ Health indicators — visible in /actuator/health

Threading:
  ✓ @Async with custom ThreadPoolTaskExecutor (NOT SimpleAsyncTaskExecutor)
  ✓ MDC TaskDecorator — propagates correlationId to async threads
  ✓ CallerRunsPolicy  — backpressure when queue full
  ✓ Graceful shutdown — await 60s for in-flight tasks
  ✗ RabbitMQ — not used (Kafka handles all messaging)
  ✗ Virtual threads  — Java 17 project; would use in Java 21 upgrade

SQL:
  ✓ Window functions: ROW_NUMBER/RANK/DENSE_RANK, LAG/LEAD, running totals
  ✓ CTEs (recursive for hierarchies, non-recursive for readability)
  ✓ Composite/Partial/Covering indexes
  ✓ EXPLAIN (ANALYZE, BUFFERS) — seq scan vs index scan
  ✓ Isolation levels: READ COMMITTED (default), REPEATABLE READ for reports
  ✓ FOR UPDATE / FOR UPDATE SKIP LOCKED (Outbox pattern)
  ✓ @Version optimistic locking in Hibernate
  ✓ N+1 prevention: JOIN FETCH, @EntityGraph, @BatchSize
```

---

## 6. Multi-Cloud Architecture & Portability

### Q: "How does your application support multiple cloud providers?"

**Answer:** Strategy Pattern with Spring Profiles. I defined three abstraction interfaces — `CloudStorageService`, `CloudMessagingService`, `CloudSecretService` — each with 3 implementations activated by `@Profile("aws")`, `@Profile("azure")`, or `@Profile("gcp")`.

```
@Profile("aws")  → AwsS3StorageService       (S3Client, KMS, pre-signed URLs)
@Profile("azure")→ AzureBlobStorageService    (BlobServiceClient, SAS tokens)
@Profile("gcp")  → GcpCloudStorageService     (Google Storage, V4 signed URLs)
```

The `EmployeeDocumentController` injects `CloudStorageService` — **zero cloud-specific imports** in the controller. To switch clouds, change `SPRING_PROFILES_ACTIVE=aws` to `azure` or `gcp`. No code changes needed.

**Key files:** `cloud/CloudStorageService.java`, `cloud/aws/AwsS3StorageService.java`, `cloud/azure/AzureBlobStorageService.java`, `cloud/gcp/GcpCloudStorageService.java`, `controller/EmployeeDocumentController.java`

---

### Q: "Compare AWS S3 vs Azure Blob Storage vs Google Cloud Storage"

| Feature | AWS S3 | Azure Blob | GCP Cloud Storage |
|---|---|---|---|
| **Upload** | `PutObjectRequest` + `S3Client` | `BlobClient.upload()` | `Storage.create(BlobInfo)` |
| **Pre-signed/SAS** | `S3Presigner.presignGetObject()` | `BlobSasPermission` + `generateSas()` | `V4SignUrl` with `SignUrlOption` |
| **Encryption** | KMS SSE (`x-amz-server-side-encryption`) | Azure-managed keys (default) | Google-managed keys (default) |
| **Container concept** | Bucket | Container (within Storage Account) | Bucket |
| **Lifecycle tiering** | Standard → IA → Glacier | Hot → Cool → Archive | Standard → Nearline → Coldline → Archive |

---

### Q: "How do you handle credentials across clouds without storing secrets in CI/CD?"

**OIDC Workload Identity Federation** — all 3 clouds use keyless authentication:

- **AWS:** GitHub Actions → `AssumeRoleWithWebIdentity` → IRSA (pod-level IAM via ServiceAccount annotation). Zero static access keys.
- **Azure:** GitHub Actions → Federated Credential → Managed Identity. `AZURE_CLIENT_ID` + `AZURE_TENANT_ID` only (no secret).
- **GCP:** GitHub Actions → Workload Identity Federation → `google-github-actions/auth`. Service account binding via `iam.workloadIdentityUser`.

In the application code:
- AWS: IRSA auto-provides credentials to the SDK via `DefaultCredentialsProvider`
- Azure: `DefaultAzureCredential()` picks up Managed Identity automatically
- GCP: Workload Identity injects credentials into the pod via projected service account token

---

### Q: "Walk me through your Terraform multi-cloud strategy"

**Structure:** `terraform/` for AWS (8 files), `terraform/azure/` (8 files + env/), `terraform/gcp/` (8 files + env/). Each cloud module is self-contained with its own provider, backend, and variable definitions.

**Consistency across clouds:**
- Same services (K8s, PostgreSQL, Redis, messaging, registry, storage, monitoring) — cloud-native implementations
- Same environment strategy: `dev.tfvars` (minimal) vs `prod.tfvars` (HA, zone-redundant, production sizing)
- Same security posture: private subnets, managed identity for workloads, encryption at rest + in transit

**CI/CD:** `.github/workflows/terraform-multi-cloud.yml` uses a GitHub Actions matrix strategy to run `terraform plan/apply` for all 3 clouds. Path-based change detection ensures only modified cloud modules trigger plans.

---

### Q: "What messaging systems do you use across clouds and how do they compare?"

| Feature | AWS SQS/SNS | Azure Event Hubs | GCP Pub/Sub |
|---|---|---|---|
| **Pattern** | Point-to-point (SQS) + Fan-out (SNS→SQS) | Kafka protocol (consumer groups) | Topic + Subscription (push/pull) |
| **Ordering** | SQS FIFO (MessageGroupId) | Partition-based ordering | Ordering keys |
| **Dead letter** | DLQ with maxReceiveCount | Capture to Blob Storage | Dead-letter topic + subscription |
| **Exactly-once** | SQS FIFO + DeduplicationId | Event Hubs partitions (at-least-once) | Exactly-once delivery (native) |
| **Schema** | No native schema registry | Avro via Schema Registry add-on | Avro schema enforcement (native) |

**Application code:** `CloudMessagingService` interface with `sendMessage(topic, payload, messageGroupId)`. AWS impl uses `SqsTemplate`, Azure uses `JmsTemplate`, GCP uses `PubSubTemplate`. The `messageGroupId` maps to FIFO group (AWS), JMSXGroupID session (Azure), or ordering key (GCP).

---

### Cloud Section Interview Prep Checklist
```
✓ Multi-cloud strategy pattern explanation (interface + @Profile)
✓ S3 vs Blob vs GCS comparison (upload, pre-signed, encryption)
✓ OIDC federation for all 3 clouds (keyless CI/CD)
✓ Terraform structure (24 modules, 3 clouds, env/ parity)
✓ Messaging comparison (SQS FIFO vs Event Hubs vs Pub/Sub)
✓ Identity: IRSA vs Workload Identity vs Managed Identity
✓ Cost optimization: Spot (AWS/Azure) vs Preemptible (GCP)
✓ Monitoring: CloudWatch vs App Insights vs Cloud Monitoring
```

---

## 7. Jenkins, Docker & JAR/WAR Packaging

### Q: "Describe your Jenkins pipeline"

**Answer:** Declarative pipeline with 11 stages in a single `Jenkinsfile`:

```
Checkout → Build (JAR/WAR) → Parallel Tests (Unit + Integration + Frontend)
→ Code Coverage (JaCoCo 70%) → SonarQube + Quality Gate → Security Scan
(OWASP + Trivy) → Publish to Nexus → Docker Build & Push → Deploy (K8s or
Tomcat) → Smoke Tests
```

Key features:
- **Parameterized:** `DEPLOY_ENV` (dev/staging/prod), `CLOUD_PROVIDER` (aws/azure/gcp), `PACKAGING` (jar/war)
- **Parallel testing** cuts pipeline from 15 min → 7 min (unit + integration + frontend run simultaneously)
- **Quality gates:** If SonarQube fails (`waitForQualityGate`), pipeline aborts before deploy
- **Automatic rollback:** If K8s rollout fails, `kubectl rollout undo` fires automatically in `post { failure }` block
- **Slack notifications:** Success/failure with build metadata (version, branch, duration)

**Key file:** `Jenkinsfile` (root of project)

---

### Q: "What's the difference between JAR and WAR?"

| Aspect | JAR | WAR |
|---|---|---|
| **What it is** | Fat/uber JAR — application + embedded Tomcat bundled together | Web Archive — application code only, no servlet container |
| **Server** | Embedded Tomcat (inside the JAR) | External Tomcat / WildFly / JBoss deploys it |
| **How to run** | `java -jar employee-service.jar` | Copy `.war` to Tomcat's `webapps/` directory |
| **Dockerfile** | `eclipse-temurin:17-jre-alpine` (250MB) | `tomcat:10.1-jre17-temurin` (400MB) |
| **Use case** | Cloud-native, Docker, Kubernetes | Legacy enterprise, shared application servers |
| **Deployment** | Container orchestration (K8s, ECS) | Tomcat Manager API, SCP, Cargo Maven plugin |
| **Spring Boot config** | Just `main()` method | Needs `ServletInitializer extends SpringBootServletInitializer` |
| **Tomcat dependency** | `compile` scope (bundled in JAR) | `provided` scope (server supplies it) |

**How we support both:**
```xml
<!-- pom.xml — Maven profile switching -->
<packaging>${packaging.type}</packaging>   <!-- Property, not hardcoded -->

<!-- Default: JAR -->
<properties>
    <packaging.type>jar</packaging.type>
</properties>

<!-- WAR profile: mvn package -Pwar-packaging -->
<profile>
    <id>war-packaging</id>
    <properties>
        <packaging.type>war</packaging.type>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-tomcat</artifactId>
            <scope>provided</scope>  <!-- Server provides Tomcat -->
        </dependency>
    </dependencies>
</profile>
```

**Key files:** `employee-microservice/pom.xml` (profiles section), `ServletInitializer.java`

---

### Q: "Explain your Dockerfile — what's multi-stage build?"

**Answer:**
```dockerfile
# Stage 1: BUILD (large image — Maven + JDK, ~800MB)
FROM maven:3.8.7-eclipse-temurin-17-alpine AS build
COPY pom.xml .
RUN mvn dependency:go-offline      # Layer cache — deps don't redownload
COPY src ./src
RUN mvn clean package -DskipTests  # Produces fat JAR

# Stage 2: RUNTIME (small image — JRE only, ~250MB)
FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S spring && adduser -S spring -G spring  # Non-root
USER spring:spring
COPY --from=build /app/target/*.jar app.jar
HEALTHCHECK CMD wget --spider http://localhost:8081/actuator/health
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
```

**Why multi-stage?**
1. **Image size:** 800MB → 250MB (Maven + JDK are discarded after build)
2. **Security:** No build tools in production image — smaller attack surface
3. **Layer caching:** `pom.xml` is copied before `src/` — dependencies only re-download when `pom.xml` changes
4. **Non-root:** Container runs as `spring:spring`, not root — principle of least privilege
5. **JVM tuning:** `-XX:+UseContainerSupport` makes JVM respect cgroup memory limits (critical for K8s)

---

### Q: "What is .dockerignore and why does it matter?"

Without `.dockerignore`, `docker build` sends the **entire directory** (including `target/`, `.git/`, test files) as build context to the Docker daemon. With it:
- Build context drops from ~500MB → ~5MB (100× faster)
- Sensitive files (`.git/`, credentials) never enter the image
- Cache invalidation is more stable (IDE files don't trigger rebuilds)

---

### Q: "GitHub Actions vs Jenkins — when would you use each?"

| Feature | GitHub Actions | Jenkins |
|---|---|---|
| **Hosting** | SaaS (GitHub-managed runners) | Self-hosted (your servers) |
| **Config** | YAML workflows in `.github/workflows/` | Groovy `Jenkinsfile` in repo root |
| **Scaling** | Auto-scaled runners | Manual agent provisioning |
| **Plugins** | Marketplace actions | 1800+ plugins (Nexus, SonarQube, etc.) |
| **Cost** | Free for public repos | Free but you pay for infrastructure |
| **Best for** | CI, open source, cloud-native | Enterprise CD, complex approvals, legacy |

**In this project:** GitHub Actions handles CI (14 pipelines — build, test, security scan). Jenkins handles CD to production (Nexus publishing, multi-cloud deploy, approval gates). Both exist because real enterprises often use both.

---

### Jenkins + Docker + JAR/WAR Interview Prep Checklist
```
✓ Jenkinsfile declarative pipeline (11 stages, parallel, parameterized)
✓ JAR vs WAR explanation (embedded vs external Tomcat)
✓ Maven profile switching (-Pwar-packaging)
✓ ServletInitializer for WAR deployment
✓ Multi-stage Docker build (why, layer caching, size reduction)
✓ Non-root containers, HEALTHCHECK, JVM container support
✓ .dockerignore purpose and impact
✓ Docker build targets (jar-runtime vs war-runtime)
✓ Nexus artifact publishing (releases vs snapshots)
✓ GitHub Actions vs Jenkins comparison
✓ SonarQube quality gate in Jenkins (waitForQualityGate)
✓ Automatic rollback (kubectl rollout undo)
```

---

## 8. Mock Interview — Live Q&A Session

> All answers below are grounded in actual code files.
> Use these as rehearsed answers, not scripts — know the code, not the paragraph.

---

### Q2: "Why Event Sourcing for employee data?"

**Code reference**: `employee-microservice/.../eventsourcing/EventSourcingService.java`

**Key facts from code**:
- `SNAPSHOT_THRESHOLD = 100` — snapshot auto-created every 100 events
- `replayAggregate()` loads latest snapshot + delta events only → O(delta), not O(n)
- Snapshot failure is try-catch isolated — snapshot fail never fails the main event write

**90-second answer**:

> CRUD destroys history entirely — an audit table is a side-effect that can drift or be skipped. With Event Sourcing, events are immutable append-only truth; the current state is a derived view.
>
> The business justification here is HR compliance — you need to know *who changed what, and when*, not just the current value. Event Sourcing gives you that natively.
>
> The performance concern is replay cost. We solve it with snapshots: every 100 events we materialize a snapshot. On read, we load the latest snapshot plus only the delta events since then — worst case 99 events, not the full history. Snapshot failure is caught and swallowed; it never blocks the event write.

**Gaps to name if asked**:
- No CQRS read model yet — reads query the same event store
- Snapshot strategy is count-based (every 100 events), not complexity-based

---

### Q3: "Two managers edit the same employee record simultaneously — who wins?"

**Code reference**: `employee-microservice/.../eventsourcing/EventStore.java` + Flyway V4 migration

**Key facts from code**:
- V4 migration adds `UNIQUE (aggregate_id, aggregate_type, event_version)` on the `event_store` table
- First writer commits event at version N — second writer tries same version N → `DataIntegrityViolationException` → transaction rolls back
- No `expectedVersion` parameter on the public API today

**90-second answer**:

> The concurrency guard is a database `UNIQUE` constraint across `(aggregate_id, aggregate_type, event_version)` — added in Flyway V4 migration.
>
> When two managers submit simultaneously, both generate event version N. The first to hit the DB commits. PostgreSQL's unique constraint rejects the second insert with a constraint violation. Spring wraps that as `DataIntegrityViolationException` — first writer wins, second gets a transaction rollback.
>
> Current gap: it returns a 500. Production-correct is a 409 Conflict with a message like "record updated since you loaded it, please refresh." The proper fix is an explicit `expectedVersion` parameter on the command — client sends the version it read, server rejects if current version differs. Classic optimistic concurrency.

---

### Q4: "Walk me through the Saga for a new hire — what are the steps, and what happens if step 3 fails?"

**Code reference**: `employee-microservice/.../saga/EmployeeOnboardingSaga.java` + `SagaInstance.java`

**Key facts from code**:
- 4 steps: `CREATE_EMPLOYEE` → `CREATE_PAYROLL` (Feign HTTP) → `SEND_WELCOME_EMAIL` → `GRANT_SYSTEM_ACCESS`
- `SagaStatus` enum: `STARTED / IN_PROGRESS / COMPLETED / COMPENSATING / FAILED / COMPENSATED`
- Compensation iterates `stepStatuses` in reverse — CREATE_PAYROLL compensation deletes payroll record
- Email compensation is semantic (can't unsend) — gated by `isEmailSent` flag, sends a cancellation email instead
- `sagaData` carries JSON context forward (employeeId, payrollId, etc.)

**90-second answer**:

> Four steps: create employee record, create payroll record via Feign HTTP call, send welcome email, grant system access. State machine tracks `STARTED → IN_PROGRESS → COMPLETED`.
>
> If step 3 (email) fails — which means the email service is down — the saga enters `COMPENSATING` state. Compensation runs in reverse: revoke system access (not granted yet), skip email (it failed), delete payroll record, delete employee record. Each step's `compensate()` is idempotent.
>
> Email is a special case: you can't unsend an email. If the email sent successfully but the next step failed, compensation doesn't try to "un-email" — instead it sends a cancellation email. This is called semantic compensation, and it's gated by an explicit `isEmailSent` boolean on the saga data.
>
> **Limitation I'd flag**: this is a synchronous in-process orchestrator. If the pod dies mid-saga, the in-flight saga instance is lost. Production-correct is an event-driven orchestrator with saga state persisted to DB and Kafka events driving transitions.

---

### Q5: "API Gateway rate limiting — how does it actually work?"

**Code reference**: `api-gateway-service/.../config/GatewayRateLimiterConfig.java` + `GatewayConfig.java`

**Key facts from code**:
- Token bucket: `replenishRate=10 req/s`, `burstCapacity=20`
- Redis Lua script executes atomically — no TOCTOU race
- 3 `KeyResolver` beans: JWT (`user:<hash>`), IP (`ip:x.x.x.x`), API key (`api:<key>`)
- `@Primary` on JWT resolver — active by default
- Redis down → fail closed (deny all traffic)

**90-second answer**:

> Token bucket algorithm — each user gets a conceptual bucket refilled at 10 tokens/second, bursting up to 20. Each request consumes one token. At burst capacity, requests 11-20 are accepted; 21+ are rejected with 429.
>
> State lives in Redis. The increment and check is a Lua script that runs atomically on the Redis instance — no two Gateway pods can race on the same key. That's important because the Gateway is horizontally scaled.
>
> There are three key resolution strategies: by JWT subject (default), by IP, by API key header. JWT per-user is the `@Primary` — we don't use IP because a corporate proxy makes all 500 employees look like one IP.
>
> **Failure mode**: if Redis goes down, the rate limiter fails closed — it denies all traffic. That's a deliberate choice for security, but in practice it means Redis is in your critical path. Production fix is Redis Sentinel or Cluster, plus a circuit breaker that can fail-open for specific routes.

---

### Q6: "Why did you add Debezium CDC if you already had the Outbox pattern?"

**Code reference**: `employee-microservice/.../outbox/OutboxEventPublisher.java` + `infrastructure/debezium/employee-db-connector.json`

**Key facts from code**:
- `OutboxEventPublisher`: `@Scheduled(fixedDelay=5000)` — 5-second polling latency floor
- `.get(10, SECONDS)` blocking send — tied to app pod lifecycle
- Debezium: `pgoutput` logical decoding, `debezium_employee_slot` replication slot, Outbox Event Router SMT
- SMT reads `type` + `aggregateType` → routes to `employee.${routedByValue}.events` topics

**90-second answer**:

> The polling Outbox solves dual-write, but has three structural problems: 5-second latency floor, constant SELECT pressure on the outbox table, and liveness tied to the app pod — if the pod crashes mid-batch, events are delayed until restart.
>
> Debezium reads the PostgreSQL WAL via `pgoutput` logical replication. The replication slot (`debezium_employee_slot`) guarantees no row is skipped — it tracks LSN so even a Debezium restart catches up. Latency drops to sub-100ms.
>
> The Outbox Event Router SMT transforms raw CDC records into domain events. It reads the `type` and `aggregateType` columns and routes to dynamically named Kafka topics — `employee.employee.events`, `employee.payroll.events` — without any application code.
>
> We kept both: Outbox for application-initiated events where transactional consistency is paramount, Debezium for high-throughput change streams. They serve different consumers.
>
> **Gap I'd flag**: the replication slot holds WAL until Debezium consumes it. If the connector is down for hours, WAL bloat can fill the disk. We learned this in staging — connector crashed, 6 hours later disk was full. Fix: monitor `confirmed_flush_lsn` advancing and alert if it stalls.

---

### Q7: "How does the notification service deduplicate — what if Kafka delivers a message twice?"

**Code reference**: `notification-microservice/.../kafka/KafkaConsumerService.java`

**Key facts from code**:
- `@KafkaListener` calls `notificationService.create()` directly
- **No deduplication logic exists** — every message triggers a new notification record

**Honest answer** (this is a known gap — own it, frame it):

> Honestly, it doesn't — and that's a real gap.
>
> The current `KafkaConsumerService` calls `notificationService.create()` for every message with no idempotency check. At-least-once delivery from Kafka means a rebalance, pod restart, or broker hiccup can redeliver a message and result in duplicate notifications — duplicate emails or SMS.
>
> The correct fix is a `processed_events` table with a unique constraint on `(event_id, consumer_group)`. Before processing, check if the event ID already exists. Wrap the business write and the `processedEvent.save()` in a single `@Transactional` block — the constraint prevents concurrent double-inserts.
>
> There's a second gap: the Outbox event payload doesn't surface a globally unique `eventId` into the Kafka message. Without that, consumers can't even perform the check. Fix: include a `correlationId` or `eventId` derived from the outbox row's UUID in the Kafka message headers or payload.
>
> Shipping without this was a calculated risk — the failure mode is duplicate notifications, not data corruption. Production fix is straightforward; it just wasn't prioritized in the initial build.

**Gap framing formula** (memorize this):
> *"Current implementation does X. Production-correct is Y because [specific failure mode]. We shipped X because [honest reason — time, priority, calculated risk]."*

---

### Q8: "You chose gRPC bidi streaming for analytics — why that mode specifically?"

**Code reference**: `analytics-service/.../grpc/EmployeeAnalyticsGrpcService.java` + `employee_analytics.proto`

**Key facts from code**:
- `StreamBatchEvents` is bidi streaming — client streams batches, server acks each
- `synchronized(responseObserver)` — StreamObserver is NOT thread-safe
- `BatchEventAck` carries `eventsProcessed`, `status`, `message`
- `onError()` vs `onNext(nack)` — NACK keeps stream alive, `onError` terminates it

**90-second answer**:

> The analytics use case is bulk historical backfill — clients send millions of events from warehouse exports. Four mode options in gRPC: unary, server-stream, client-stream, bidi.
>
> Unary per event means N round trips — prohibitive. Client streaming gives one response at end of batch, but no per-item acknowledgment — if the server processes 90% and crashes, the client doesn't know which 90% to skip on retry.
>
> Bidi streaming gives you one persistent HTTP/2 connection. Client pipelines batches; server acks each batch individually via `BatchEventAck`. If batch 7 fails, server sends a NACK for batch 7 only — client can retry that specific batch while batches 8-10 continue in flight. That's the key operational advantage.
>
> Implementation detail worth flagging: `StreamObserver` is not thread-safe. If the processing logic is async, you must synchronize before calling `responseObserver.onNext()`. That's the `synchronized(responseObserver)` block in the code.
>
> Design choice on errors: for a bad batch we send `onNext(nack)` not `onError()`. `onError` terminates the entire stream. NACK keeps it alive for the rest of the batch. `onError` is reserved for unrecoverable stream-level failures.

---

### Q9: "Tell me about a time you had a technical disagreement with your team."

> *(Behavioral STAR answer — no code lookup needed)*

**Situation**: Designing the event pipeline. Engineer A wanted to keep only the polling Outbox — "it works, it's simple, no new infra." Engineer B wanted Debezium CDC — sub-100ms latency, WAL-native. Both were right about their own concerns.

**Task**: As lead, I needed a decision without losing consensus or bulldozing either position.

**Action**: Before the architecture meeting I asked each engineer to prepare the *other's* argument — A had to present the case for Debezium, B had to present the case for Outbox. This steelmanning exercise de-escalated it immediately. It stopped being "my idea vs your idea" and became "which tradeoffs do we accept?"

Resolution: run both. Outbox for transaction-critical application events (guaranteed dual-write with business data). Debezium for high-throughput change streams consumed downstream. Different consumers, different SLAs.

**Result**: Shipped both paths. Six weeks later in staging, Debezium connector crashed and ran unmonitored for 6 hours — WAL bloat filled the disk. A's concern about operational complexity was validated. We added monitoring on `confirmed_flush_lsn` and an alert on slot lag. I made sure A presented this at the team retrospective — framed as "A's concern was right, here's the runbook we now have," not "I was wrong."

**What I'd do differently**: The ADR for Debezium (ADR-011) should have listed *operational prerequisites* — replication slot monitoring — as conditions for merging, not as follow-up items. Shipping the infra without the monitoring was the actual gap.

---

### Q10: "Walk me through an Architecture Decision Record you wrote."

**Code reference**: `docs/adr/ADR-010-gRPC-for-analytics-service.md`

**Key facts from code**:
- Alternatives table: REST (rejected — no streaming differentiation), Kafka-only (rejected — no per-item ack), gRPC (chosen)
- Consequences: `+` Protobuf type safety, compile-time breaking change detection; `-` two `.proto` copies, no shared module
- Gap documented: field number drift between client and server proto copies → silent Protobuf corruption

**90-second answer**:

> ADR-010 chose gRPC over REST and Kafka-only for the analytics service.
>
> REST was eliminated because HTTP/1.1 request-per-event is prohibitive for batch backfill, and REST streaming is non-standard. Kafka-only was honestly considered — simpler infra, team already knew it. I documented *why we didn't choose it*: Kafka has no per-item acknowledgment on produce; we'd lose granular NACK capability for partial-batch failures.
>
> The real production justification I sharpen it to now: Protobuf schema contract with compile-time breaking change detection. A field rename in REST JSON or Kafka Avro without a schema registry is invisible until runtime — null pointer or type error in production at 2am. With `.proto` files and generated stubs, it blows up the build.
>
> What I'd change about the ADR format: there's a documented gap — two copies of the `.proto` file, one in analytics-service and one in the client. Field number drift between them causes silent Protobuf corruption (no error thrown; fields silently deserialize to zero/empty). I documented this as a follow-up item. It should have been a **prerequisite condition** for merging. I now structure ADRs with a "Conditions" section — things that must be true before this decision ships, not things we'll fix later.

---

## 9. Interview Performance Feedback

> Received after the 10-question mock session. Use as a calibration baseline.

### Overall Verdict: **Strong Hire at Lead Level** (touching Staff territory)

| Dimension | Score | Notes |
|---|---|---|
| Technical depth | 9/10 | Code-grounded, specific values, honest about limits |
| System design thinking | 9/10 | Named failure modes and production gaps unprompted |
| Honest self-assessment | 10/10 | Named gaps before being asked — deduplication, WAL bloat |
| Leadership & conflict resolution | 8/10 | Good story; could sharpen the "what I'd do differently" |
| Answer conciseness | 6/10 | Tendency to over-explain; interviewers have to interrupt |
| Handling gaps under pressure | 8/10 | Good framing; needs tighter "gap sentence" formula |

---

### Three Areas to Sharpen

#### 1. Answer Length — Lead with the headline

**Pattern**: Give the 90-second answer, then pause. Say: *"Want me to go deeper on any of that?"*

Never front-load all the depth. Interviewers who want more will ask. Those who don't will be lost before you hit your best point.

> **Rule**: answer → pause → offer depth. Not depth → more depth → summary.

#### 2. Gap Framing — Memorize this sentence

> *"Current implementation does X. Production-correct is Y because [specific failure mode]. We shipped X because [honest reason — time, priority, calculated risk]."*

Apply to every known gap:
- **Deduplication**: Current = none. Correct = `processed_events` table + unique constraint. Shipped without because failure mode is duplicate notification, not data corruption.
- **Concurrency**: Current = 500 on version conflict. Correct = 409 + `expectedVersion` param. Shipped without because Outbox throughput is low.
- **Proto sync**: Current = two copies. Correct = shared lib / proto registry. Shipped without because internal service boundary, caught at deploy time anyway.

#### 3. ADR Business Justification — One crisp sentence

> *"The real production justification is Protobuf schema contract and compile-time breaking change detection — a field rename in REST JSON or Kafka Avro is invisible until runtime. With `.proto`, it blows up the build, not production at 2am."*

Always anchor ADR choices to a **specific failure mode in the alternative**, not just "it's better."

---

### Next Behavioral Areas to Drill

#### Operational Incident Story
**Question**: *"Tell me about a time something broke in production."*

**Material**: WAL bloat in staging — Debezium connector crashed, ran unmonitored 6 hours, disk filled.

**Structure to use**:
1. Timeline — when detected, what the symptom was (disk alert, not Debezium alert)
2. Immediate remediation — drop the inactive replication slot, restart connector
3. Root cause — no monitoring on `confirmed_flush_lsn` / slot lag
4. Preventive change — `pg_replication_slots` query added to dashboards, PagerDuty alert on stall > 30 min
5. What you'd do differently — slot lag in ADR-011 as a prerequisite, not a follow-up

#### Stakeholder Communication
**Question**: *"How do you explain a technical delay or architecture decision to a non-technical stakeholder?"*

**Material**: Adding Debezium increased infra complexity. Frame it as:
> "We added a component that costs some operational overhead but eliminates a class of data-consistency bugs that would cost significantly more in customer trust and manual recovery per incident."

**Rule**: Never say "technical debt" to a product manager. Say "risk we deferred" and name the specific risk and its consequence.

#### Team Growth
**Question**: *"How did you help a junior engineer level up?"*

**Material**: Brought junior engineers into the ADR process — not just implementing, but writing the alternatives table. Steelmanning exercise as a learning tool. Had Engineer A present the WAL bloat retrospective at team meeting — ownership of the lesson, not blame.

**Key point**: Growth isn't just code review; it's giving ownership of a decision and its post-mortem, including when it doesn't go perfectly.
