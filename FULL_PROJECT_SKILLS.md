# Full-Stack Microservices Project — Complete Skills & Technologies

> **Total:** 5 Java microservices + React SPA + 8-service monitoring stack + CI/CD + Docker + K8s + AWS Terraform
> **Backend:** 83 Java source files | **Frontend:** 60+ TypeScript/React files | **Infra:** 6 Dockerfiles + 2 Docker Compose
> **Cloud:** 15 K8s manifests + Helm chart + 8 Terraform modules | **SQL:** 4 advanced query files (window functions, CTEs, optimization)

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Java & Spring Boot Core](#2-java--spring-boot-core)
3. [Microservices Patterns](#3-microservices-patterns)
4. [Data Layer (Polyglot Persistence)](#4-data-layer-polyglot-persistence)
5. [Event-Driven Architecture (Kafka)](#5-event-driven-architecture-kafka)
6. [Distributed Patterns (Saga, Outbox, ACL)](#6-distributed-patterns-saga-outbox-acl)
7. [Resilience Patterns (Resilience4j)](#7-resilience-patterns-resilience4j)
8. [Security (JWT + RBAC)](#8-security-jwt--rbac)
9. [Observability Stack](#9-observability-stack)
10. [API Gateway & Service Mesh](#10-api-gateway--service-mesh)
11. [Batch Processing](#11-batch-processing)
12. [Real-Time (WebSocket)](#12-real-time-websocket)
13. [Frontend (React + TypeScript)](#13-frontend-react--typescript)
14. [Frontend Engineering Infrastructure](#14-frontend-engineering-infrastructure)
15. [DevOps & Containerization](#15-devops--containerization)
16. [Testing Strategy](#16-testing-strategy)
17. [Documentation & Architecture Decisions](#17-documentation--architecture-decisions)
18. [Service Map & Port Reference](#18-service-map--port-reference)
19. [Kubernetes & Container Orchestration](#19-kubernetes--container-orchestration)
20. [AWS Cloud Infrastructure (Terraform)](#20-aws-cloud-infrastructure-terraform)
21. [Advanced SQL & Database Engineering](#21-advanced-sql--database-engineering)
22. [Interview Summary Table](#22-interview-summary-table)

---

## 1. System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                 │
│   React SPA (Vite + TypeScript + TailwindCSS)                       │
│   Redux Toolkit │ React Query │ MSW │ Storybook │ Playwright        │
└─────────────────────────┬────────────────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼────────────────────────────────────────────┐
│              API GATEWAY (Spring Cloud Gateway :8080)                │
│   Route-based routing │ Rate Limiting (Redis) │ Global Logging      │
│   CORS │ Load Balancing │ Eureka Discovery                          │
└──────┬──────────────────┬───────────────────────────────────────────┘
       │                  │
┌──────▼──────┐   ┌──────▼──────┐   ┌─────────────────┐
│  Employee   │   │   Payroll   │   │  Config Server  │
│  Service    │◄──►   Service   │   │  :8888          │
│  :8081      │   │   :8083     │   │  (centralized   │
│             │   │             │   │   config)        │
└──────┬──────┘   └──────┬──────┘   └─────────────────┘
       │                 │
       │   ┌─────────────┘
       │   │
┌──────▼───▼──────────────────────────────────────────────────────────┐
│                     DATA & MESSAGING LAYER                          │
│                                                                     │
│  PostgreSQL (master + replica)  │  MongoDB (audit logs)             │
│  Elasticsearch (full-text)      │  Redis (cache + rate limiting)    │
│  Apache Kafka (events)          │  Flyway (migrations)              │
└─────────────────────────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY LAYER                               │
│  Prometheus + Grafana │ ELK Stack │ Zipkin + Jaeger │ Actuator      │
└─────────────────────────────────────────────────────────────────────┘
```

**Used by:** Netflix, Amazon, Uber, Spotify, LinkedIn — this is the standard microservices architecture.

---

## 2. Java & Spring Boot Core

### Technologies
| Technology | Version | Purpose |
|---|---|---|
| **Java** | 17 (LTS) | Language with records, sealed classes, text blocks |
| **Spring Boot** | 3.2.0 | Application framework |
| **Spring Cloud** | 2023.0.0 | Microservices toolkit |
| **Maven** | 3.x | Build & dependency management |
| **Lombok** | Latest | Boilerplate reduction (@Data, @Builder, @Slf4j) |

### Spring Boot Features Used
- ✅ **Auto-configuration** — Convention over configuration
- ✅ **Profiles** — dev, test, prod with profile-specific properties
- ✅ **Actuator** — /health, /metrics, /info, /env, /prometheus endpoints
- ✅ **Bean Validation** — @NotBlank, @Email, @Positive, @Size on DTOs
- ✅ **CommandLineRunner** — Data initialization on startup
- ✅ **@Scheduled** — Cron jobs for batch processing, outbox polling
- ✅ **@Async** — Non-blocking operations with ThreadPoolTaskExecutor
- ✅ **@ConditionalOnBean** — Conditional component registration

**📁 Key Files:**
- `employee-microservice/pom.xml` — 38 dependencies
- `payroll-microservice/pom.xml` — 30 dependencies

**Interview Talking Point:**
> "The project uses Spring Boot 3.2 with Java 17, leveraging the latest Spring Cloud 2023.0.0 for microservices infrastructure. Each service is independently deployable with its own database, uses Spring profiles for environment-specific config, and exposes Actuator endpoints for monitoring."

---

## 3. Microservices Patterns

### Service Discovery (Netflix Eureka)
- ✅ **Eureka Server** — Service registry on port 8761
- ✅ **Eureka Clients** — All services register on startup
- ✅ **Self-preservation mode** — Prevents cascading deregistration
- ✅ **Health check** — Services report health via Actuator

**📁 Files:**
- `eureka-discovery-server/` — `@EnableEurekaServer`
- All services use `@EnableDiscoveryClient`

### Centralized Configuration (Spring Cloud Config)
- ✅ **Config Server** — Port 8888, secured with Basic Auth
- ✅ **Native profile** — File-based config repository
- ✅ **Per-service configs** — `employee-service.yml`, `payroll-service.yml`, `api-gateway.yml`
- ✅ **Common config** — Shared `application.yml` for all services
- ✅ **Config client** — Services pull config on startup

**📁 Files:**
- `config-server/` — `@EnableConfigServer`
- `config-repository/` — 4 YAML files (common + per-service)

### Inter-Service Communication (OpenFeign)
- ✅ **Declarative HTTP clients** — `@FeignClient` with service discovery
- ✅ **Load balancing** — Spring Cloud LoadBalancer integration
- ✅ **Circuit breaker fallbacks** — `@CircuitBreaker` on Feign methods
- ✅ **Bidirectional communication** — Employee ↔ Payroll

**📁 Files:**
- `employee-microservice/.../client/PayrollServiceClient.java` — Feign client with fallback
- `payroll-microservice/.../client/EmployeeClient.java` — Feign client with circuit breaker

**Interview Talking Point:**
> "Services discover each other through Eureka, communicate via OpenFeign declarative clients with built-in load balancing, and pull configuration from a centralized Config Server on startup. This is the Netflix OSS stack that thousand-engineer orgs like Netflix and Uber refined."

---

## 4. Data Layer (Polyglot Persistence)

### PostgreSQL (Primary RDBMS)
- ✅ **JPA/Hibernate** — ORM with entity mapping
- ✅ **Master-Replica Read/Write Splitting** — `AbstractRoutingDataSource`
- ✅ **Optimistic Locking** — `@Version` on entities
- ✅ **JPA Auditing** — `@CreatedDate`, `@LastModifiedDate`, `@CreatedBy`, `@LastModifiedBy`
- ✅ **HikariCP** — Connection pooling (max 20, min 5)
- ✅ **Flyway Migrations** — Versioned SQL schema (V1, V2)
- ✅ **Indices** — Database indices on frequently queried columns

**📁 Key Files:**
- `config/DataSourceConfig.java` — Master + Replica datasource routing
- `config/ReplicationRoutingDataSource.java` — Route reads to replica based on `@Transactional(readOnly=true)`
- `db/migration/V1__Initial_schema.sql` — Flyway migration

### MongoDB (Audit Logs)
- ✅ **Spring Data MongoDB** — `MongoRepository` abstraction
- ✅ **Document model** — Flexible schema for audit `oldValues`/`newValues` maps
- ✅ **Async writes** — `@Async` audit logging for zero latency impact

**📁 Files:**
- `document/AuditLog.java` — `@Document(collection="audit_logs")`
- `repository/mongo/AuditLogRepository.java` — MongoDB repository

### Elasticsearch (Full-Text Search)
- ✅ **Spring Data Elasticsearch** — `ElasticsearchRepository`
- ✅ **Full-text search** — Analyzed fields with standard analyzer
- ✅ **Dual-write** — PostgreSQL for truth, ES for search
- ✅ **Batch sync** — Spring Batch ETL job (PostgreSQL → Elasticsearch)

**📁 Files:**
- `document/EmployeeSearchDocument.java` — `@Document(indexName="employees")`
- `service/EmployeeSearchService.java` — Index, search, delete operations

### Redis (Caching + Rate Limiting)
- ✅ **Spring Cache** — `@Cacheable`, `@CacheEvict` on service methods
- ✅ **JSON serialization** — `GenericJackson2JsonRedisSerializer`
- ✅ **TTL** — 1-hour cache expiry
- ✅ **Gateway rate limiting** — Redis-backed leaky bucket (10 req/s, burst 20)

**📁 Files:**
- `config/RedisConfig.java` — CacheManager, RedisTemplate with JSON serializer

**Interview Talking Point:**
> "We used polyglot persistence — PostgreSQL for transactional data with master-replica read/write splitting via Spring's AbstractRoutingDataSource, MongoDB for flexible audit logs, Elasticsearch for full-text search, and Redis for caching with 1-hour TTL. Flyway manages schema migrations. This is the same data architecture Netflix and Amazon use — right database for each use case."

---

## 5. Event-Driven Architecture (Kafka)

- ✅ **Kafka Producer** — Employee/Payroll events published to topics
- ✅ **Kafka Consumer** — `@KafkaListener` for async processing
- ✅ **Idempotent Producer** — `enable.idempotence=true` prevents duplicate messages
- ✅ **Topic Configuration** — Auto-created with partition/replica settings
- ✅ **Event Schema** — `EmployeeEvent` (CREATED, UPDATED, DELETED), `PayrollEvent` (CREATED, APPROVED, PAID)
- ✅ **JSON Serialization** — Jackson-based message serialization
- ✅ **Error Handling** — Consumer error handlers with logging

**📁 Files:**
- `config/KafkaConfig.java` — Producer/Consumer factories, topic creation, idempotent config
- `service/KafkaProducerService.java` — Event publishing with KafkaTemplate
- `service/KafkaConsumerService.java` — Event consumption with `@KafkaListener`
- `event/EmployeeEvent.java` — Event schema

**Interview Talking Point:**
> "We use Kafka for asynchronous event-driven communication between services. When an employee is created, an event is published to Kafka — the payroll service consumes it to set up payroll automatically. The producer is configured as idempotent to prevent duplicate message delivery. This decouples services so they can evolve independently — the same pattern LinkedIn uses to process millions of events per second."

---

## 6. Distributed Patterns (Saga, Outbox, ACL)

### Saga Pattern (Orchestration)
- ✅ **4-step saga:** CREATE_EMPLOYEE → CREATE_PAYROLL → SEND_WELCOME_EMAIL → GRANT_SYSTEM_ACCESS
- ✅ **Compensating transactions** — Each step has a rollback action
- ✅ **Saga state machine** — STARTED → IN_PROGRESS → COMPLETED / COMPENSATING → FAILED / COMPENSATED
- ✅ **Persistence** — Saga state stored in `saga_instances` table
- ✅ **Retry** — Failed sagas can be retried via API
- ✅ **Optimistic locking** — `@Version` prevents concurrent saga updates
- ✅ **Feign integration** — Steps call other services via Feign clients

**📁 Files:**
- `saga/SagaOrchestrator.java` — Interface with `start()`, `executeNextStep()`, `compensate()`
- `saga/EmployeeOnboardingSaga.java` — 4-step saga with compensation
- `saga/SagaInstance.java` — JPA entity tracking saga state
- `saga/SagaManagementService.java` — Start, query, retry operations
- `controller/SagaController.java` — REST API for saga management

### Outbox Pattern
- ✅ **Dual-write prevention** — Event saved in same DB transaction as entity
- ✅ **Scheduled polling** — Outbox table polled every 5 seconds
- ✅ **Pessimistic locking** — `@Lock(PESSIMISTIC_WRITE)` prevents duplicate processing
- ✅ **Status tracking** — PENDING → PROCESSED / FAILED
- ✅ **Kafka publishing** — Polled events published to Kafka topics
- ✅ **Optimistic locking** — `@Version` on outbox events

**📁 Files:**
- `outbox/OutboxEvent.java` — Entity with aggregateType, payload, status
- `outbox/OutboxService.java` — Save event in same transaction
- `outbox/OutboxEventPublisher.java` — `@Scheduled(fixedDelay=5000)` polling
- `outbox/OutboxEventRepository.java` — `@Lock(PESSIMISTIC_WRITE)` query

### Anti-Corruption Layer (ACL)
- ✅ **Adapter pattern** — Bidirectional mapping between domain model and legacy format
- ✅ **Field translation** — `firstName` ↔ `fName`, `salary` ↔ `monthlySal` (monthly conversion)
- ✅ **Code mapping** — Department names ↔ legacy dept codes (ENG=001, etc.)
- ✅ **Date format conversion** — ISO-8601 ↔ legacy `dd/MM/yyyy`
- ✅ **Status mapping** — Domain status ↔ legacy codes (A=Active, I=Inactive, etc.)
- ✅ **Integration service** — REST client for legacy system sync

**📁 Files:**
- `anticorruption/LegacyPayrollSystemAdapter.java` — Bidirectional translator
- `anticorruption/LegacyPayrollSystemDTO.java` — Legacy field names
- `anticorruption/LegacyPayrollIntegrationService.java` — Sync service

**Interview Talking Point:**
> "For distributed transactions, I implemented the Saga pattern with orchestration — a 4-step employee onboarding flow with compensating transactions for each step. The Outbox pattern solves the dual-write problem by saving events in the same database transaction as the entity, then a scheduled poller publishes them to Kafka with pessimistic locking to prevent duplicates. The Anti-Corruption Layer translates between our clean domain model and a legacy payroll system with different field names, date formats, and status codes."

---

## 7. Resilience Patterns (Resilience4j)

- ✅ **Circuit Breaker** — CLOSED → OPEN → HALF_OPEN with configurable thresholds
- ✅ **Retry** — Exponential backoff with max 3 attempts
- ✅ **Rate Limiter** — 10 requests/second with timeout
- ✅ **Bulkhead** — Semaphore + thread pool isolation
- ✅ **Fallback Methods** — Graceful degradation when services are down
- ✅ **Micrometer Integration** — Resilience4j metrics exported to Prometheus
- ✅ **Feign + Circuit Breaker** — `PayrollServiceFallback` returns cached/default data

**Configuration (in application.properties):**
```
Circuit Breaker: 50% failure rate, sliding window 10, wait 10s in OPEN
Retry: max 3 attempts, 1s wait, 2x multiplier
Rate Limiter: 10 requests/s, 500ms timeout
Bulkhead: max 10 concurrent, max 20 queue wait
```

**📁 Files:**
- `service/EmployeeService.java` — `@CircuitBreaker`, `@Retry`, `@RateLimiter`, `@Bulkhead` on all methods
- `client/PayrollServiceFallback.java` — Feign fallback implementation
- `controller/MetricsController.java` — Exposes Resilience4j metrics

**Interview Talking Point:**
> "Every service method has Resilience4j annotations — circuit breaker opens at 50% failure rate and prevents cascading failures, retry with exponential backoff handles transient errors, rate limiter protects against request floods, and bulkhead limits concurrent calls. Feign clients have fallback implementations that return cached data when downstream services are unavailable. All resilience metrics are exported to Prometheus."

---

## 8. Security (JWT + RBAC)

- ✅ **Spring Security 6** — Filter-based security with `SecurityFilterChain`
- ✅ **JWT Tokens** — HS256 HMAC-SHA, configurable expiry
- ✅ **Stateless Sessions** — `SessionCreationPolicy.STATELESS`
- ✅ **BCrypt** — Password hashing
- ✅ **Role-Based Access Control** — ROLE_USER, ROLE_ADMIN, ROLE_MANAGER
- ✅ **Method Security** — `@EnableMethodSecurity` for `@PreAuthorize`
- ✅ **Custom UserDetailsService** — Loads user + roles from database
- ✅ **JWT Filter** — `OncePerRequestFilter` extracts Bearer token, validates, sets SecurityContext
- ✅ **Login/Register endpoints** — /api/auth/login, /api/auth/register
- ✅ **Config Server security** — Basic Auth (config-admin/config-secret)

**📁 Files:**
- `config/SecurityConfig.java` — Security filter chain, BCrypt, endpoint rules
- `security/JwtTokenProvider.java` — Generate, validate, parse JWT
- `security/JwtAuthenticationFilter.java` — Extract Bearer token, set SecurityContext
- `security/CustomUserDetailsService.java` — Load user with roles
- `dto/LoginRequest.java`, `dto/RegisterRequest.java`, `dto/JwtResponse.java`
- `controller/AuthController.java` — Login/register REST endpoints
- `model/User.java`, `model/Role.java` — User + role entities with `@ManyToMany`

**Interview Talking Point:**
> "Authentication uses stateless JWT with HS256 signing. The JwtAuthenticationFilter extends OncePerRequestFilter to extract the Bearer token, validate it, and set the SecurityContext. We have RBAC with three roles — USER, ADMIN, MANAGER — enforced via Spring Security's method security. Passwords are BCrypt hashed. The Config Server uses separate Basic Auth to protect externalized secrets."

---

## 9. Observability Stack

### Monitoring (Prometheus + Grafana)
- ✅ **Micrometer** — Metrics bridge from Spring to Prometheus
- ✅ **Custom metrics** — Counters, timers, gauges for CRUD operations
- ✅ **Prometheus scraping** — All 4 services + Node Exporter + infra
- ✅ **Grafana dashboards** — Pre-provisioned with auto-configured datasources
- ✅ **JVM metrics** — Memory, GC, threads, classloader
- ✅ **HTTP metrics** — Request count, duration, error rate

### Logging (ELK Stack)
- ✅ **Elasticsearch** — 8.11.0, log storage & search
- ✅ **Logstash** — Log pipeline with 2 workers, batch size 125
- ✅ **Kibana** — 8.11.0, log visualization & dashboards

### Distributed Tracing
- ✅ **Micrometer Tracing** — Trace context propagation across services
- ✅ **Zipkin** — Trace collector and UI (port 9411)
- ✅ **Jaeger** — Alternative tracing UI (port 16686)
- ✅ **Brave bridge** — `micrometer-tracing-bridge-brave` + `zipkin-reporter-brave`

### Health Monitoring
- ✅ **Custom HealthIndicators** — Database, Kafka, Redis checks
- ✅ **Actuator endpoints** — /health, /health/liveness, /health/readiness
- ✅ **Docker HEALTHCHECK** — Every container has health checks

**📁 Files:**
- `monitoring/docker-compose-monitoring.yml` — 8 monitoring services
- `monitoring/prometheus/prometheus.yml` — Scrape configs for all services
- `monitoring/grafana/provisioning/` — Auto-provisioned datasources + dashboards
- `monitoring/logstash/` — Pipeline configuration
- `health/DatabaseHealthIndicator.java`, `KafkaHealthIndicator.java`, `RedisHealthIndicator.java`
- `metrics/MetricsService.java` — Custom Micrometer metrics
- `controller/MetricsController.java` — Metrics REST API

**Interview Talking Point:**
> "We have full observability: Prometheus scrapes metrics from all services including custom business metrics (employee creation rate, payroll processing time), Grafana displays pre-provisioned dashboards, ELK Stack (Elasticsearch + Logstash + Kibana) for centralized logging, and both Zipkin and Jaeger for distributed tracing across service boundaries. Each service has custom health indicators for its dependencies."

---

## 10. API Gateway & Service Mesh

- ✅ **Spring Cloud Gateway** — Reactive, non-blocking gateway
- ✅ **Route Configuration** — Path-based routing to downstream services
- ✅ **Service Discovery Integration** — `lb://employee-service` (load-balanced)
- ✅ **Rate Limiting** — Redis-backed, 10 req/s with burst of 20
- ✅ **Global Logging Filter** — Logs all request/response method + URI + status
- ✅ **CORS Configuration** — Frontend origin allowed
- ✅ **Timeout Configuration** — Connect + response timeouts
- ✅ **StripPrefix** — Strips service prefix from routed path

**📁 Files:**
- `api-gateway-service/config/GatewayConfig.java` — Route definitions
- `api-gateway-service/filter/LoggingFilter.java` — `GlobalFilter` implementation
- `api-gateway-service/application.properties` — Rate limiting, CORS, timeouts

**Interview Talking Point:**
> "The API Gateway uses Spring Cloud Gateway (reactive, non-blocking) with route-based routing via Eureka service discovery. It handles cross-cutting concerns: Redis-backed rate limiting (10 req/s burst 20), CORS, global request/response logging, and timeout enforcement. This is the single entry point for all client requests."

---

## 11. Batch Processing

- ✅ **Spring Batch** — ETL job framework
- ✅ **Chunk-based processing** — Reader → Processor → Writer (chunk=100)
- ✅ **PostgreSQL → Elasticsearch sync** — Full reindex job
- ✅ **Scheduled execution** — Daily ES sync (midnight), hourly cleanup, 10-min audit sync
- ✅ **Job parameters** — `RunIdIncrementer` for re-runnable jobs

**📁 Files:**
- `batch/BatchConfiguration.java` — ETL job definition (ItemReader, ItemProcessor, ItemWriter)
- `batch/BatchJobScheduler.java` — `@Scheduled` cron triggers

**Interview Talking Point:**
> "Spring Batch handles ETL jobs — the primary one syncs employee data from PostgreSQL to Elasticsearch for search. It uses chunk-based processing with a size of 100 for memory efficiency. Jobs are scheduled via cron: full ES reindex at midnight, audit log cleanup hourly. Spring Batch handles retry, skip, and restart automatically."

---

## 12. Real-Time (WebSocket)

- ✅ **STOMP protocol** — Structured messaging over WebSocket
- ✅ **SockJS fallback** — For browsers without WebSocket support
- ✅ **Topic broadcasting** — `/topic/employees`, `/topic/system`
- ✅ **User queues** — `/queue/notifications` (per-user messages)
- ✅ **SimpMessagingTemplate** — Server-push to connected clients
- ✅ **Frontend integration** — `@stomp/stompjs` + SockJS client

**📁 Files:**
- `websocket/WebSocketConfig.java` — `@EnableWebSocketMessageBroker`, STOMP endpoints
- `websocket/WebSocketNotificationService.java` — Broadcast + user-specific messaging
- `websocket/NotificationMessage.java` — DTO

**Interview Talking Point:**
> "Real-time notifications use STOMP over WebSocket with SockJS fallback. When an employee is created or updated, the service broadcasts to all connected dashboard clients via SimpMessagingTemplate. We support both topic-based broadcasting and user-specific queues for targeted notifications."

---

## 13. Frontend (React + TypeScript)

### Core Stack
| Technology | Version | Purpose |
|---|---|---|
| React | 18.2 | UI framework (concurrent features) |
| TypeScript | 5.3 | Type safety (strict mode) |
| Vite | 5.0 | Build tool (HMR, ESBuild) |
| TailwindCSS | 3.3 | Utility-first CSS |

### State Management
- ✅ **Redux Toolkit 2.0** — Global state (`createSlice`, `createAsyncThunk`)
- ✅ **React Query 5.17** — Server state (caching, background refetch, mutations)
- ✅ **Context API** — Auth, theme, notifications
- ✅ **Zustand 4.4** — Lightweight stores

### Forms & Validation
- ✅ **React Hook Form 7.49** — Performant forms (uncontrolled)
- ✅ **Zod 3.22** — Schema validation with `z.infer<typeof schema>` type inference

### Production Features
- ✅ **Sentry 7.91** — Error tracking with source maps
- ✅ **i18next 23.7** — Internationalization (en/es/fr)
- ✅ **Web Vitals 3.5** — Core Web Vitals monitoring (LCP, FID, CLS)
- ✅ **PWA** — Service worker, manifest, offline page
- ✅ **Dark mode** — Theme context with system preference detection
- ✅ **Analytics** — GA + Mixpanel tracking
- ✅ **15 custom hooks** — useDebounce, useThrottle, useLocalStorage, useMediaQuery, etc.
- ✅ **File handling** — Drag & drop upload, CSV/Excel/PDF export
- ✅ **Virtualization** — react-window for large lists
- ✅ **Lazy loading** — Code splitting with React.lazy + Suspense

**Interview Talking Point:**
> "The frontend uses React 18 with TypeScript in strict mode, Vite for fast builds, and a three-layer state management approach: Redux Toolkit for global UI state, React Query for server state with automatic caching and background refetch, and Context for cross-cutting concerns like auth and theme. We have 15 custom hooks, i18n in 3 languages, Sentry error tracking, Core Web Vitals monitoring, and a full PWA setup."

---

## 14. Frontend Engineering Infrastructure

> These are the tools that 500+ person engineering teams actually set up — not application features, but engineering workflow.

| Tool | What It Solves | Who Uses It |
|---|---|---|
| **Storybook** | Component documentation & visual testing | Shopify, IBM, Microsoft |
| **Playwright** | Cross-browser E2E testing (Chromium/Firefox/WebKit) | Microsoft, Google |
| **GitHub Actions** | 7-job CI/CD pipeline with quality gates | Every MNC |
| **Husky + commitlint** | Git hook enforcement + Conventional Commits | Angular, Vue, React |
| **MSW** | Network-level API mocking for dev + test | GitHub, Remix, Chrome team |
| **Accessibility** | WCAG 2.1 AA compliance + axe-core auditing | Legal requirement (ADA/EU) |
| **Docker + Nginx** | 25MB production image, security headers, SPA routing | Every container deploy |
| **Resilient API Client** | Retry, circuit breaker, request dedup, token refresh | Netflix, Stripe, Uber |
| **Structured Logging** | JSON logs, PII redaction, batch shipping to DataDog | Every production system |
| **Feature Flags SDK** | LaunchDarkly-style toggles for gradual rollout | Netflix (~2000 flags) |
| **Design Tokens** | Semantic color/spacing system for multi-theme support | Shopify Polaris, IBM Carbon |
| **SonarQube** | Code quality gates (coverage, security, tech debt) | Banks, healthcare, enterprise |

**📁 Key Files:**
- `.storybook/` — Config + 2 design system component stories
- `playwright.config.ts` + `e2e/` — 5 browser projects, 16 E2E tests
- `.github/workflows/frontend-ci.yml` — Lint → Test → E2E → Build → Deploy → Lighthouse → Security
- `.husky/` + `commitlint.config.js` + `.prettierrc.js` — Code quality at commit time
- `src/mocks/` — MSW handlers for all API endpoints
- `src/utils/accessibility.ts` — axe-core, focus traps, screen reader announcements
- `Dockerfile` + `nginx.conf` — Multi-stage build, security headers, caching
- `src/lib/apiClient.ts` — Retry + circuit breaker + dedup + token refresh queue
- `src/lib/logger.ts` — Structured logging with PII redaction, batch shipping
- `src/lib/featureFlags.ts` — Provider, hooks, declarative `<Feature>` component
- `src/lib/designTokens.ts` — Primitives → semantics → CSS vars → Tailwind
- `sonar-project.properties` — SonarQube/SonarCloud config

---

## 15. DevOps & Containerization

### Docker
- ✅ **Multi-stage builds** — All 6 Dockerfiles use builder → slim runtime pattern
- ✅ **Non-root users** — Security best practice in every container
- ✅ **HEALTHCHECK** — Container health checks for orchestration
- ✅ **Build args** — Environment variables injected at build time
- ✅ **Optimized layers** — Dependencies cached, source changes are cheap rebuilds

### Docker Compose
- ✅ **Infrastructure stack** — Zookeeper, Kafka, Redis, MongoDB, Elasticsearch, PostgreSQL Replica
- ✅ **Monitoring stack** — Prometheus, Grafana, ELK, Zipkin, Jaeger, Node Exporter (8 services)

### CI/CD
- ✅ **Frontend pipeline** — 7-job GitHub Actions (lint → typecheck → unit tests → E2E matrix → build → deploy staging/prod → Lighthouse + security)
- ✅ **Backend pipeline** — Maven build with PostgreSQL + Redis test services, JaCoCo coverage, Codecov upload
- ✅ **Coverage enforcement** — JaCoCo 70% (backend), Jest 80% (frontend)
- ✅ **Security scanning** — npm audit + Snyk vulnerability scan

**📁 Files:**
- 6 `Dockerfile` files (employee, payroll, gateway, eureka, config, frontend)
- `employee-microservice/docker-compose.yml` — 6 infrastructure services
- `monitoring/docker-compose-monitoring.yml` — 8 monitoring services
- `.github/workflows/frontend-ci.yml` — 7-job pipeline
- `payroll-microservice/.github/workflows/ci-cd.yml` — Backend CI

**Interview Talking Point:**
> "Every service has a multi-stage Dockerfile — Maven build stage then Eclipse Temurin 17 JRE Alpine for runtime. All containers run as non-root with health checks. Docker Compose orchestrates 14 services (6 infrastructure + 8 monitoring). CI/CD enforces quality gates: lint, type-check, 80% test coverage, E2E across 3 browsers, security audit, and Lighthouse performance scores before deployment."

---

## 16. Testing Strategy

### Backend Testing
| Level | Framework | Coverage | Key Pattern |
|---|---|---|---|
| **Unit Tests** | JUnit 5 + Mockito + AssertJ | JaCoCo 70% | `@Mock`, `@InjectMocks`, `verify()` |
| **Integration Tests** | `@SpringBootTest` | Full context | PostgreSQL + H2 |
| **Repository Tests** | `@DataJpaTest` | JPA layer | In-memory H2 |
| **Controller Tests** | MockMvc | Web layer | `@WebMvcTest` |
| **Kafka Tests** | spring-kafka-test | Messaging | `@EmbeddedKafka` |
| **Batch Tests** | spring-batch-test | Batch jobs | `@SpringBatchTest` |

### Frontend Testing
| Level | Framework | Coverage | Key Pattern |
|---|---|---|---|
| **Unit Tests** | Jest 29.7 + RTL 14.1 | 80% threshold | `render()`, `userEvent`, `screen.getByRole()` |
| **E2E Tests** | Playwright | 3 browsers × 16 tests | `page.route()` for API mocking |
| **Visual Tests** | Storybook + Chromatic | Component stories | Screenshot comparison |
| **API Mocking** | MSW 2.0 | Network level | Service worker interception |

**📁 Test Files:**
- `employee-microservice/src/test/` — Controller, Service, Repository, Integration, Mapper tests
- `payroll-microservice/src/test/` — Controller, Service, Repository tests
- `frontend-react/e2e/` — Auth + Employee E2E suites
- `frontend-react/src/mocks/` — MSW handlers
- `frontend-react/.storybook/` — Visual testing config

**Interview Talking Point:**
> "We have a comprehensive testing pyramid: backend uses JUnit 5 with Mockito for unit tests, @DataJpaTest for repository tests, @WebMvcTest with MockMvc for controller tests, and @SpringBootTest for integration tests — all enforced by JaCoCo at 70% coverage. Frontend uses Jest + React Testing Library at 80% coverage, Playwright for cross-browser E2E tests across Chromium, Firefox, and WebKit, MSW for deterministic API mocking, and Storybook with Chromatic for visual regression testing."

---

## 17. Documentation & Architecture Decisions

### Architecture Decision Records (ADRs)
| ADR | Decision | Why |
|---|---|---|
| ADR-001 | Microservices over Monolith | Independent scaling, team autonomy, tech diversity |
| ADR-002 | Kafka for Event-Driven | Async decoupling, at-least-once delivery, replay capability |
| ADR-003 | Database Per Service | Data isolation, independent schema evolution |
| ADR-005 | Saga Pattern | Distributed transactions without 2PC |
| ADR-006 | Outbox Pattern | Reliable event publishing without dual-write |
| ADR-009 | Anti-Corruption Layer | Clean domain boundary with legacy systems |

### Other Documentation
- ✅ **Architecture Diagrams** — Mermaid-based system diagrams
- ✅ **Operational Runbook** — Incident response procedures
- ✅ **Performance Benchmarks** — Load testing results
- ✅ **Saga Implementation** — Detailed saga flow documentation
- ✅ **Quick Start Guides** — Service startup instructions
- ✅ **READMEs** — Per-service documentation

**📁 Files:**
- `docs/adr/` — 6 Architecture Decision Records
- `docs/diagrams/` — Architecture diagrams
- `docs/OPERATIONAL_RUNBOOK.md`, `docs/PERFORMANCE_BENCHMARKS.md`
- Service-level READMEs in each microservice directory

---

## 18. Service Map & Port Reference

```
PORT    SERVICE                     STACK
─────   ────────────────────────    ──────────────────
5173    Frontend (Vite dev)         React + TypeScript
8080    API Gateway                 Spring Cloud Gateway
8081    Employee Service            Spring Boot + JPA
8083    Payroll Service             Spring Boot + JPA
8761    Eureka Discovery            Spring Cloud Netflix
8888    Config Server               Spring Cloud Config

5432    PostgreSQL (master)         Primary database
5433    PostgreSQL (replica)        Read replica
6379    Redis                       Cache + rate limiting
9092    Kafka                       Event streaming
2181    Zookeeper                   Kafka coordination
27017   MongoDB                     Audit logs
9200    Elasticsearch               Full-text search

9090    Prometheus                  Metrics collection
3000    Grafana                     Dashboards
5601    Kibana                      Log visualization
9411    Zipkin                      Distributed tracing
16686   Jaeger                      Distributed tracing
5000    Logstash                    Log pipeline
9100    Node Exporter               System metrics
```

**Total: 20 services** (5 app + 7 data/messaging + 8 monitoring)

---

## 19. Kubernetes & Container Orchestration

### K8s Manifest Structure (`k8s/`)
```
k8s/
├── base/
│   ├── namespace.yaml          # employee-platform namespace
│   ├── configmap.yaml          # Shared config (K8s DNS replaces Eureka)
│   ├── secrets.yaml            # DB creds, JWT, config-server (base64)
│   └── ingress.yaml            # NGINX Ingress + NetworkPolicies + PDBs
├── services/
│   ├── employee-service.yaml   # Deployment + Service + HPA + ServiceAccount
│   ├── payroll-service.yaml    # Deployment + Service + HPA + ServiceAccount
│   ├── api-gateway.yaml        # Deployment + Service + HPA
│   └── frontend.yaml           # Deployment (NGINX) + Service + HPA
├── infrastructure/
│   ├── postgresql.yaml         # StatefulSet + PVC + Headless Service
│   ├── redis.yaml              # Deployment + Service (LRU eviction)
│   ├── kafka.yaml              # Kafka + Zookeeper StatefulSets
│   └── mongodb-elasticsearch.yaml  # StatefulSets with PVCs
├── monitoring/
│   └── prometheus-grafana.yaml # RBAC + K8s service discovery + dashboards
├── overlays/
│   ├── dev/kustomization.yaml  # Dev: 1 replica, lower resources, no HPA
│   └── prod/kustomization.yaml # Prod: 3 replicas, higher resources
└── kustomization.yaml          # Base Kustomize config
```

### Key K8s Concepts Demonstrated
| Concept | Implementation | File |
|---|---|---|
| **Deployments** | RollingUpdate (maxSurge=1, maxUnavailable=0) | `services/*.yaml` |
| **StatefulSets** | PostgreSQL, Kafka, MongoDB, Elasticsearch | `infrastructure/*.yaml` |
| **Services** | ClusterIP (internal), Headless (StatefulSet DNS) | All service files |
| **Ingress** | NGINX, path-based routing, TLS, rate limiting | `base/ingress.yaml` |
| **HPA** | CPU/Memory autoscaling, scale-up/down policies | `services/*.yaml` |
| **ConfigMaps** | Non-secret config, K8s DNS endpoints, JAVA_OPTS | `base/configmap.yaml` |
| **Secrets** | base64 encoded, notes on External Secrets Operator | `base/secrets.yaml` |
| **NetworkPolicies** | Zero-trust: gateway→services, services→DB only | `base/ingress.yaml` |
| **PodDisruptionBudget** | minAvailable=1 for all services | `base/ingress.yaml` |
| **RBAC** | ServiceAccounts, ClusterRole for Prometheus | `monitoring/` |
| **Resource Limits** | requests + limits for CPU/memory on every container | All deployments |
| **Health Probes** | startupProbe + livenessProbe + readinessProbe | All deployments |
| **Kustomize Overlays** | dev (1 replica, debug) vs prod (3 replicas, warn) | `overlays/` |
| **Anti-Affinity** | Spread pods across nodes (topology key) | `services/*.yaml` |
| **Graceful Shutdown** | preStop hook (sleep 10) + terminationGracePeriod | `services/*.yaml` |
| **IRSA** | ServiceAccount annotations for AWS IAM roles | `services/*.yaml` |

### Helm Chart (`helm/employee-platform/`)
```
helm/employee-platform/
├── Chart.yaml              # Chart metadata + Bitnami dependencies
├── values.yaml             # Default values (dev)
├── values-prod.yaml        # Production overrides (managed services)
└── templates/
    ├── _helpers.tpl         # Go template functions (DRY)
    └── employee-service.yaml # Templatized deployment
```
- **Bitnami dependencies:** PostgreSQL, Redis, Kafka charts
- **Production:** Disables K8s-hosted DBs, uses AWS managed services
- **Commands:** `helm install`, `helm upgrade -f values-prod.yaml`, `helm rollback`

---

## 20. AWS Cloud Infrastructure (Terraform)

### Terraform Module Structure (`terraform/`)
```
terraform/
├── main.tf              # Provider config, S3 backend, data sources
├── variables.tf         # All input variables with validation
├── vpc.tf               # VPC, subnets, NAT Gateway, flow logs
├── eks.tf               # EKS cluster, node groups, IRSA, LB controller
├── rds.tf               # PostgreSQL RDS (multi-AZ, read replica, Performance Insights)
├── elasticache-msk.tf   # ElastiCache Redis + MSK Kafka
├── s3-cloudwatch.tf     # S3 buckets + CloudWatch alarms + SNS alerts
├── ecr-outputs.tf       # ECR repos + all outputs
└── env/
    ├── dev.tfvars        # Dev: t3.medium, 2 nodes, small DBs
    └── prod.tfvars       # Prod: m5.xlarge, 5 nodes, r6g.large DBs
```

### AWS Services Used
| Service | Purpose | Key Features |
|---|---|---|
| **VPC** | Network isolation | 3 AZs, public/private subnets, NAT Gateway, flow logs |
| **EKS** | Managed Kubernetes | v1.28, managed node groups, spot instances, IRSA |
| **RDS PostgreSQL** | Primary database | Multi-AZ, read replica (CQRS), Performance Insights, gp3 |
| **ElastiCache** | Redis caching | Replication group, TLS, automatic failover |
| **MSK** | Managed Kafka | 3 brokers (prod), CloudWatch logging |
| **ECR** | Container registry | Immutable tags, CVE scanning, lifecycle policy |
| **S3** | Object storage | Versioning, KMS encryption, lifecycle (→ IA → Glacier) |
| **CloudWatch** | Monitoring/alerts | RDS CPU, storage, EKS nodes, Redis cache hit rate |
| **SNS** | Alert notifications | Email alerts for all CloudWatch alarms |
| **IAM** | Access management | IRSA (pod-level IAM), least privilege policies |

### Infrastructure Patterns
- **Remote State:** S3 + DynamoDB locking (never local state in production)
- **IRSA:** Each microservice gets its own IAM role via ServiceAccount annotation
- **Spot Instances:** Cost optimization for non-critical workloads (up to 90% savings)
- **Multi-AZ:** VPC subnets, RDS, ElastiCache spread across 3 availability zones
- **Encryption:** At rest (KMS) + in transit (TLS) for all data stores
- **Cost Optimization:** Single NAT in dev, one-per-AZ in prod; Spot for non-critical
- **Environment Parity:** Same Terraform, different tfvars (dev vs prod)

---

## 21. Advanced SQL & Database Engineering

### SQL Files (`sql/`)
```
sql/
├── advanced-queries.sql          # Window functions, CTEs, JOINs, subqueries
├── optimization-indexing.sql     # EXPLAIN ANALYZE, index strategies, anti-patterns
├── V5__advanced_schema_features.sql  # Materialized views, partitioning, triggers, RLS
└── transactions-concurrency.sql  # Isolation levels, locking, deadlock prevention
```

### SQL Skills Demonstrated
| Category | Techniques |
|---|---|
| **Window Functions** | ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD, NTILE, FIRST_VALUE, running totals, moving averages |
| **CTEs** | Regular CTEs, recursive CTEs (org hierarchy, date series), multiple CTEs |
| **Complex JOINs** | Multi-table, Self-JOIN, LATERAL JOIN, FULL OUTER JOIN, reconciliation |
| **Subqueries** | Scalar, correlated, EXISTS (vs IN), ANY/ALL |
| **Aggregations** | GROUP BY + HAVING, ROLLUP, CUBE, GROUPING SETS, FILTER |
| **Indexing** | B-Tree, composite, partial, covering (INCLUDE), GIN, expression, CONCURRENTLY |
| **Optimization** | EXPLAIN ANALYZE, keyset pagination, batch operations, anti-patterns |
| **Schema Features** | Materialized views, table partitioning (RANGE), triggers, stored functions |
| **Security** | Row Level Security (RLS), audit triggers (JSONB change log) |
| **Transactions** | Isolation levels, SELECT FOR UPDATE, SKIP LOCKED (job queue), advisory locks |
| **Concurrency** | Optimistic locking (@Version), pessimistic locking, deadlock prevention |
| **Monitoring** | pg_stat_statements, pg_stat_user_tables, unused index detection |

---

## 22. Interview Summary Table

| Category | Backend (Java) | Frontend (React) | Infrastructure | Cloud & SQL |
|---|---|---|---|---|
| **Framework** | Spring Boot 3.2, Spring Cloud 2023 | React 18, Vite 5, TypeScript 5.3 | Docker, nginx, GitHub Actions | Terraform ~5.30, Helm 3 |
| **Architecture** | 5 microservices, API Gateway, Eureka, Config Server | Component-based SPA, Design System | Multi-stage builds, health checks | EKS, VPC (3 AZ), K8s manifests |
| **Data** | PostgreSQL (master+replica), MongoDB, Elasticsearch | Redux Toolkit, React Query, Zustand | Redis caching, Flyway migrations | RDS Multi-AZ, ElastiCache, S3 |
| **Messaging** | Kafka (producer + consumer, idempotent) | WebSocket (STOMP + SockJS) | Zookeeper coordination | MSK (managed Kafka) |
| **Patterns** | Saga, Outbox, ACL, CQRS, Circuit Breaker | Feature Flags, Design Tokens, API Client | Observability (Prometheus+ELK+Zipkin) | IRSA, Kustomize overlays, HPA |
| **Security** | JWT + RBAC (3 roles), BCrypt, Spring Security 6 | Protected routes, token refresh queue | CSP headers, SonarQube, Snyk | NetworkPolicies, RLS, KMS encryption |
| **Resilience** | Resilience4j (4 patterns), Feign fallbacks | Retry, circuit breaker, request dedup | Rate limiting (Gateway + Redis) | PDB, anti-affinity, Spot instances |
| **Testing** | JUnit 5, Mockito, MockMvc, @DataJpaTest, Testcontainers | Jest, RTL, Playwright (3 browsers), MSW | JaCoCo 70%, Jest 80%, Codecov | EXPLAIN ANALYZE, index strategies |
| **SQL** | JPA, Flyway, @Query, Native Queries | — | — | Window functions, CTEs, partitioning, triggers, RLS |
| **Docs** | 6 ADRs, OpenAPI/Swagger, Runbook | Storybook, SKILLS.md | Architecture diagrams | Terraform outputs, Helm values |

---

## 22. AOP (Aspect-Oriented Programming) — Cross-Cutting Concerns

### What's Implemented
| Aspect | File | Purpose |
|--------|------|---------|
| **LoggingAspect** | `aspect/LoggingAspect.java` | @Around on controllers (entry/exit/timing), @AfterThrowing on services, @Before on repositories |
| **PerformanceAspect** | `aspect/PerformanceAspect.java` | Slow method detection (configurable threshold), Micrometer metrics per method, @Around service+controller |
| **AuditableAspect** | `aspect/AuditableAspect.java` | Custom @Auditable annotation processing, captures WHO/WHAT/WHEN, SecurityContext + MDC integration |
| **@Auditable** | `annotation/Auditable.java` | Custom annotation with `action` + `description` attributes |

### Interview Topics Covered
- Pointcut expressions: `within()`, `execution()`, `@annotation()`
- Advice types: `@Before`, `@After`, `@AfterReturning`, `@AfterThrowing`, `@Around`
- Join points vs pointcuts, ProceedingJoinPoint
- Spring AOP (proxy-based) vs AspectJ (compile-time weaving)
- Custom annotations with `@Retention(RUNTIME)` + `@Target(METHOD)`
- AOP ordering with `@Order`

---

## 23. MapStruct — Compile-Time Bean Mapping

### What's Implemented
| Feature | Detail |
|---------|--------|
| **MapStruct EmployeeMapper** | `@Mapper(componentModel = "spring")` interface replacing manual mapper |
| **Expression mapping** | `@Mapping(target = "fullName", expression = "java(...)")` for computed fields |
| **@MappingTarget** | Partial entity updates without creating new objects |
| **Null safety** | `NullValuePropertyMappingStrategy.IGNORE` + `NullValueCheckStrategy.ALWAYS` |
| **Annotation processor** | `maven-compiler-plugin` with `mapstruct-processor` + `lombok-mapstruct-binding` |
| **Manual mapper preserved** | `EmployeeManualMapper.java` kept as `@Deprecated` for interview comparison |

### Interview Topics Covered
- MapStruct vs ModelMapper vs Dozer (compile-time vs runtime reflection)
- Lombok + MapStruct binding configuration
- `@MappingTarget` for partial updates vs full object creation
- `unmappedTargetPolicy`, `nullValueCheckStrategy` options
- Generated code location: `target/generated-sources/annotations/`

---

## 24. Testcontainers — Real Database Integration Testing

### What's Implemented
| Feature | Detail |
|---------|--------|
| **PostgreSQLContainer** | `postgres:15-alpine` container in `EmployeeTestcontainersIT.java` |
| **@DynamicPropertySource** | Injects container's random JDBC URL/port into Spring config |
| **Singleton pattern** | `static @Container` shared across all test methods |
| **Auto-exclusion** | Disables Kafka, Redis, MongoDB, Elasticsearch, Batch autoconfiguration |
| **Full CRUD tests** | Create, paginate, unique constraint, update, delete — all on real PostgreSQL |
| **Dependencies** | testcontainers-bom, junit-jupiter, postgresql, kafka modules in pom.xml |

### Interview Topics Covered
- Why H2 is insufficient: different SQL dialect, missing JSONB/ARRAY/window functions
- Testcontainers lifecycle: pull → start → health check → inject → test → destroy
- `@DynamicPropertySource` vs `@TestPropertySource` (static vs dynamic)
- Singleton container (static) vs per-test container (non-static) trade-offs
- Test slicing: `@AutoConfigureTestDatabase(replace = NONE)`

---

## 25. Production Hardening & Best Practices

### What's Implemented
| Feature | File | Detail |
|---------|------|--------|
| **MDC Correlation ID Filter** | `filter/CorrelationIdFilter.java` | `X-Correlation-ID` header → MDC → all logs → response header |
| **12-Factor App prod config** | `application-prod.properties` | All secrets via `${ENV_VAR}` — PostgreSQL, Redis, Kafka, Eureka |
| **HikariCP tuning** | `application-prod.properties` | Pool sizing, idle timeout, max lifetime, connection timeout |
| **CORS Configuration** | `SecurityConfig.java` | `CorsConfigurationSource` bean with externalized allowed origins |
| **API Versioning** | `EmployeeController.java` | URL-based: `/api/v1/employees` (most common strategy) |
| **Constructor Injection** | `EmployeeController.java` | Replaced `@Autowired` field injection with constructor injection |
| **Root docker-compose.yml** | `docker-compose.yml` | Full-system orchestration: 13 services with health checks, volumes, networks |
| **Employee CI/CD Pipeline** | `.github/workflows/employee-ci.yml` | 5-job pipeline: build+test, quality, security scan, Docker build, staging deploy |

### Interview Topics Covered
- MDC (Mapped Diagnostic Context): thread-local, `%X{correlationId}` in log pattern, must clear
- 12-Factor App: config in env vars, not in code — `${DB_URL:default}`
- CORS: Same-Origin Policy, preflight OPTIONS, `Access-Control-Allow-*` headers
- API Versioning strategies: URL path (v1/), header, query param, media type
- Constructor injection vs field injection (testability, immutability, required dependencies)
- Docker Compose: `depends_on` with `condition: service_healthy`, named networks

---

## 26. GraphQL (Spring for GraphQL)

**Files:** `notification-microservice/src/main/resources/graphql/schema.graphqls`, `NotificationGraphQLController.java`, `NotificationGraphQLControllerTest.java`

**Concepts Covered:**
- Schema-first development with `.graphqls` files: types, enums, Query, Mutation, Input
- `@QueryMapping` — binds Java methods to GraphQL query operations
- `@MutationMapping` — binds Java methods to GraphQL mutation operations
- `@Argument` — extracts arguments from GraphQL request
- Over-fetching vs under-fetching problem (REST vs GraphQL)
- Pagination in GraphQL — custom `NotificationPage` type
- GraphiQL — interactive browser-based query IDE (dev only)
- Testing: `@GraphQlTest` + `GraphQlTester` — slice test for GraphQL layer

**Interview Questions This Answers:**
- "When would you choose GraphQL over REST?" (client-driven queries, nested data, mobile bandwidth)
- "How does GraphQL resolve N+1?" (DataLoader / @BatchMapping)
- "How do you test GraphQL in Spring?" (@GraphQlTest slice test)

---

## 27. Java 17 Records

**Files:** `NotificationRequest.java`, `NotificationResponse.java`, `NotificationFilter.java`

**Concepts Covered:**
- `public record Foo(String bar)` — compact, immutable data carriers
- Auto-generated `equals()`, `hashCode()`, `toString()`, accessor methods
- Compact constructors for validation / defaults
- Records are implicitly `final` — cannot be extended
- Records as DTOs — replacing verbose POJOs
- Static factory methods on records — `NotificationResponse.from(entity)`
- Records with Bean Validation (`@NotBlank`, `@NotNull`)
- When NOT to use records: JPA entities (need mutability), inheritance needed

**Interview Questions This Answers:**
- "What are Java Records and when do you use them?" (immutable DTOs, value objects)
- "Records vs Lombok @Value?" (Records are language-level, no annotation processor)
- "Can you use Records as JPA entities?" (No — JPA needs no-arg constructor + setters)

---

## 28. Sealed Classes & Interfaces (Java 17)

**Files:** `NotificationChannel.java`

**Concepts Covered:**
- `public sealed interface NotificationChannel permits Email, Sms, PushNotification, InApp`
- Implementing classes must be `final`, `sealed`, or `non-sealed`
- Records as permitted subtypes (implicitly final)
- `non-sealed` modifier — reopens the hierarchy for extension
- Pattern matching readiness (Java 21 switch expressions)
- Sealed vs enum: sealed allows different fields per subtype; enum is same shape
- Sealed vs abstract: sealed restricts who can implement (compiler-enforced closed hierarchy)

**Interview Questions This Answers:**
- "What are sealed classes in Java?" (restricted inheritance — compiler knows all subtypes)
- "Sealed vs final vs non-sealed?" (final = closed; sealed = whitelist; non-sealed = reopen)
- "Real-world use cases?" (domain modeling, payment types, notification channels, AST nodes)

---

## 29. JPA Specifications (Criteria API)

**Files:** `NotificationSpecification.java`, `NotificationRepository.java`, `NotificationSpecificationTest.java`

**Concepts Covered:**
- `JpaSpecificationExecutor<T>` — adds `findAll(Specification<T>, Pageable)` to repositories
- `Specification<T>` — functional interface wrapping `Predicate` from Criteria API
- Composable predicates: `.and()`, `.or()` — build dynamic queries
- 7 composable specifications: `hasRecipientId`, `hasChannelType`, `hasStatus`, `hasPriority`, `createdAfter`, `createdBefore`, `containsSearchTerm`
- `buildFrom(NotificationFilter)` — combines all filters with AND logic
- Avoids 2^N query method explosion (finByStatusAndChannelAndPriority... grows exponentially)
- Type-safe queries — compile-time checking vs string-based JPQL

**Interview Questions This Answers:**
- "How do you build dynamic/complex queries in Spring Data JPA?" (Specifications)
- "Specifications vs @Query vs Criteria API?" (Specs = composable + reusable + type-safe)
- "How do you avoid query method explosion?" (Specifications compose filters at runtime)

---

## 30. Strategy Pattern (GoF Behavioral)

**Files:** `NotificationStrategy.java`, `EmailNotificationStrategy.java`, `SmsNotificationStrategy.java`, `PushNotificationStrategy.java`, `InAppNotificationStrategy.java`, `NotificationStrategyFactory.java`

**Concepts Covered:**
- Strategy interface with `send()`, `supports()`, `default validate()`
- 4 concrete strategies — each handles a different notification channel
- `NotificationStrategyFactory` — injects `List<NotificationStrategy>` → builds `Map<ChannelType, Strategy>` for O(1) lookup
- Open/Closed Principle: add new channels without modifying existing code
- Spring IoC auto-discovers all `@Component` implementations of the interface
- Combined with `@Profile("!test")` — strategies not loaded in test profile
- Combined with `@ConditionalOnProperty` — InApp strategy toggled by config

**Interview Questions This Answers:**
- "Strategy vs Template Method?" (Strategy = entire algorithm is swappable; Template Method = skeleton fixed, steps vary)
- "How does Spring IoC enable Strategy?" (inject List<Interface> → all implementations auto-discovered)
- "How do you add a new notification channel?" (create new @Component implementing NotificationStrategy — zero existing code changes)

---

## 31. Template Method Pattern (GoF Behavioral)

**Files:** `AbstractNotificationProcessor.java`, `UrgentNotificationProcessor.java`, `BulkNotificationProcessor.java`

**Concepts Covered:**
- `final process()` — defines the algorithm skeleton (can't be overridden)
- Abstract methods: `getProcessorName()`, `validate()`, `handleFailure()` — subclasses MUST implement
- Hook methods: `preProcess()`, `postProcess()` — optional overrides with default behavior
- UrgentProcessor — immediate dispatch with 3 retries
- BulkProcessor — batch processing with DLQ (dead-letter queue) fallback
- Spring uses this pattern: `JdbcTemplate`, `RestTemplate`, `AbstractController`
- Template Method vs Strategy: TM = "fill in the blanks"; Strategy = "plug in whole algorithm"

**Interview Questions This Answers:**
- "Template Method vs Strategy?" (TM = inheritance, fixed skeleton; Strategy = composition, swap algorithms)
- "What are hook methods?" (optional extension points with sensible defaults)
- "Where does Spring use Template Method?" (JdbcTemplate, RestTemplate, AbstractController)

---

## 32. Spring ApplicationEvent & @TransactionalEventListener

**Files:** `NotificationCreatedEvent.java`, `NotificationEventListener.java`

**Concepts Covered:**
- `extends ApplicationEvent` — Spring's internal pub/sub (in-process, same JVM)
- `ApplicationEventPublisher.publishEvent()` — fire-and-forget event dispatch
- `@TransactionalEventListener(phase = AFTER_COMMIT)` — listener runs ONLY after transaction commits
- `@Async("notificationTaskExecutor")` — listener runs on separate thread pool
- Decouples service from side effects (logging, analytics, further processing)
- ApplicationEvent vs Kafka: ApplicationEvent = same JVM, synchronous by default; Kafka = distributed, async, persistent
- `@EventListener` vs `@TransactionalEventListener` — timing guarantees

**Interview Questions This Answers:**
- "ApplicationEvent vs Kafka?" (ApplicationEvent = in-process; Kafka = cross-service, persistent)
- "What is @TransactionalEventListener?" (fires after transaction phase — AFTER_COMMIT avoids processing on rollback)
- "How do you make event listeners async?" (@Async with a named TaskExecutor)

---

## 33. @Profile & @ConditionalOnProperty

**Files:** `EmailNotificationStrategy.java`, `SmsNotificationStrategy.java`, `PushNotificationStrategy.java`, `InAppNotificationStrategy.java`, `CacheConfig.java`

**Concepts Covered:**
- `@Profile("!test")` — bean NOT loaded when test profile is active
- `@ConditionalOnProperty(name = "app.notifications.in-app.enabled", havingValue = "true", matchIfMissing = true)`
- Profile-based configuration: `application.yml`, `application-prod.yml`, `application-test.yml`
- Conditional bean loading — feature flags without code changes
- `matchIfMissing = true` — bean loads by default when property is absent
- `@Profile` vs `@ConditionalOnProperty` — profiles are coarse-grained (env); conditional is fine-grained (feature flag)

**Interview Questions This Answers:**
- "How do you manage environment-specific config?" (@Profile + application-{profile}.yml)
- "@Profile vs @ConditionalOnProperty?" (Profile = env grouping; Conditional = individual feature toggles)
- "How do you disable a bean in tests?" (@Profile("!test") or @ConditionalOnProperty)

---

## 34. HATEOAS (REST Level 3 — Hypermedia)

**Files:** `NotificationController.java`, `NotificationControllerTest.java`

**Concepts Covered:**
- Richardson Maturity Model: Level 0 (SOAP) → Level 1 (resources) → Level 2 (HTTP verbs) → Level 3 (HATEOAS)
- `EntityModel<T>` — wraps resource + hypermedia links
- `CollectionModel<EntityModel<T>>` — wraps collection + links
- `WebMvcLinkBuilder.linkTo(methodOn(Controller.class).method())` — type-safe link generation
- Conditional links: `mark-read` link only appears when status != READ
- `_links` JSON structure: `self`, `collection`, `mark-read`, `delete`
- Benefits: discoverability, evolvability, self-documenting API
- Testing: asserting `_links.self.href` exists in MockMvc

**Interview Questions This Answers:**
- "What is HATEOAS?" (Hypermedia As The Engine Of Application State — REST Level 3)
- "Why are hypermedia links useful?" (clients discover actions; server can change URLs)
- "EntityModel vs CollectionModel vs RepresentationModel?" (single vs collection vs custom)

---

## 35. File Upload (MultipartFile)

**Files:** `FileController.java`, `NotificationControllerTest.java`

**Concepts Covered:**
- `@RequestParam("file") MultipartFile file` — Spring file upload binding
- `MultipartFile` API: `getOriginalFilename()`, `getContentType()`, `getSize()`, `getInputStream()`
- Batch upload: `@RequestParam("files") MultipartFile[] files`
- UUID filename generation — never use original filename (path traversal attack)
- Content-type validation — whitelist allowed MIME types
- File size validation — `spring.servlet.multipart.max-file-size`
- Download with `Resource` + `Content-Disposition` header
- `MaxUploadSizeExceededException` handling in GlobalExceptionHandler
- Testing: `MockMultipartFile` + `multipart("/api/v1/files")`

**Interview Questions This Answers:**
- "How does Spring handle file uploads?" (MultipartFile + MultipartResolver)
- "What security risks exist with file uploads?" (path traversal, malware, size bombs, type spoofing)
- "How do you test file upload endpoints?" (MockMultipartFile in MockMvc)

---

## 36. Bucket4j Rate Limiting (Token Bucket Algorithm)

**Files:** `RateLimitConfig.java`, `RateLimitExceededException.java`, `GlobalExceptionHandler.java`

**Concepts Covered:**
- Token Bucket Algorithm: bucket holds N tokens, each request consumes 1, tokens refill at fixed rate
- `Bandwidth.classic(capacity, Refill.greedy(rate, duration))` — 60 requests/minute, burst of 80
- Per-client tracking: `ConcurrentHashMap<String, Bucket>` keyed by IP
- `X-Forwarded-For` header handling for clients behind proxy/load balancer
- `Filter` interface — intercepts all requests before controllers
- HTTP 429 Too Many Requests response via `RateLimitExceededException`
- Bucket4j vs Resilience4j @RateLimiter: Bucket4j = flexible token bucket; Resilience4j = simpler annotation-based
- Production: Redis-backed Bucket4j ProxyManager for distributed rate limiting

**Interview Questions This Answers:**
- "How do you implement rate limiting?" (Token bucket, sliding window, fixed window algorithms)
- "Bucket4j vs Resilience4j RateLimiter?" (Bucket4j = per-request token bucket; Resilience4j = method-level)
- "How do you rate limit in a distributed system?" (Redis-backed token bucket, API Gateway)

---

## 37. @Scheduled Tasks & Async Processing

**Files:** `NotificationScheduler.java`, `AsyncConfig.java`

**Concepts Covered:**
- `@EnableScheduling` on application class
- `@Scheduled(cron = "0 0 3 * * ?")` — daily at 3 AM (stale notification cleanup)
- `@Scheduled(fixedRate = 900_000, initialDelay = 60_000)` — every 15 minutes (retry failed)
- `@Scheduled(cron = "0 0 * * * ?")` — hourly stats logging
- Cron format: `sec min hour day month weekday`
- `@EnableAsync` + `ThreadPoolTaskExecutor` with bounded pool + CallerRunsPolicy
- Named executors: `@Async("notificationTaskExecutor")`
- `CallerRunsPolicy` — backpressure: caller thread runs task when queue full
- ShedLock for distributed scheduling (one instance runs in cluster)

**Interview Questions This Answers:**
- "How does @Scheduled work?" (@EnableScheduling + cron/fixedRate/fixedDelay)
- "What happens with @Scheduled in a cluster?" (duplicate execution — use ShedLock or Quartz)
- "@Async rules?" (must be on public method, called from another bean, return void or CompletableFuture)

---

## 38. RFC 7807 ProblemDetail (Spring Boot 3+)

**Files:** `GlobalExceptionHandler.java`, `NotificationNotFoundException.java`, `RateLimitExceededException.java`

**Concepts Covered:**
- `@RestControllerAdvice` — global exception handler for all controllers
- `ProblemDetail.forStatusAndDetail()` — RFC 7807 standard error response
- Custom properties: `timestamp`, `notificationId`, `fieldErrors`
- Exception mapping: NotFound → 404, RateLimit → 429, Validation → 400, FileSize → 413
- `MethodArgumentNotValidException` — Bean Validation failures with field-level errors
- `ProblemDetail` vs ad-hoc error maps — standardized, machine-readable error format

**Interview Questions This Answers:**
- "How do you handle exceptions globally?" (@RestControllerAdvice + @ExceptionHandler)
- "What is RFC 7807?" (Standard error format: type, title, status, detail, instance)
- "How do you return validation errors?" (MethodArgumentNotValidException → field-level error map)

---

### What This Project Demonstrates

```
JUNIOR:     CRUD + REST + Single DB
MID-LEVEL:  Microservices + Kafka + Docker + Basic SQL
SENIOR:     Saga + Outbox + ACL + Resilience4j + Full Testing + Observability + K8s Deployments
STAFF:      Config Server + Read Replicas + Polyglot DB + CI/CD + Design System + Feature Flags + Terraform IaC + Helm
PRINCIPAL:  Architecture Decisions (ADRs) + Operational Runbook + Performance Benchmarks + EKS + IRSA + Advanced SQL + RLS
DISTINGUISHED: AOP + MapStruct + Testcontainers + MDC Correlation + 12-Factor Config + Full docker-compose + API Versioning + CORS
ARCHITECT:  GraphQL + Java Records + Sealed Classes + JPA Specifications + Strategy Pattern + Template Method + HATEOAS + Bucket4j + @Scheduled + ApplicationEvent + File Upload + @Profile + @ConditionalOnProperty + RFC 7807
```

**This is an ARCHITECT-level full-stack distributed systems project.** Every pattern implemented is production-grade and used at companies with 500-10,000+ engineers. Covers 6 microservices, 38 skill sections, 12+ design patterns, Kubernetes + Helm + Terraform, and comprehensive testing (unit, integration, slice, GraphQL, Testcontainers).
