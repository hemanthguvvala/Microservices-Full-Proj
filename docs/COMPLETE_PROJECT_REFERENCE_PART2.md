# PART 2: DESIGN PATTERNS, DATA LAYER, MESSAGING & RESILIENCE

---

## 6. DESIGN PATTERNS USED IN THIS PROJECT (16+ Patterns)

### 6.1 Saga Pattern
**What:** Manages distributed transactions across microservices as a sequence of local transactions. Each step has a compensating action for rollback.
**Why:** Traditional ACID transactions don't work across microservices (no shared DB). Saga ensures eventual consistency.
**Type Used:** Orchestration-based Saga (central controller coordinates steps).

**Used in:** `employee-microservice` — Employee Onboarding Saga
```
saga/
├── EmployeeOnboardingSaga.java      → Orchestrator
├── SagaInstance.java                → Entity tracking saga state
├── SagaManagementService.java       → Manages saga lifecycle
├── SagaStep.java                    → Individual step definition
└── SagaController.java             → REST API to trigger sagas
```

**Flow:**
```
1. Create Employee (local TX) →
2. Create Payroll via Feign (remote call) →
3. Send Welcome Email via Kafka (async) →
4. If any step fails → Compensate all previous steps in reverse order
```

**Interview Q&A:**
- **Q: Saga vs 2PC (Two-Phase Commit)?**
  A: 2PC = synchronous, all-or-nothing, single transaction coordinator. Blocks resources. Saga = asynchronous, each service has its own transaction + compensation. No resource blocking. 2PC doesn't scale; Saga works at scale (used by Uber, Netflix).

- **Q: Orchestration vs Choreography Saga?**
  A: Orchestration = central coordinator tells each service what to do (our approach). Choreography = services react to events (no coordinator). Orchestration is clearer for complex flows; Choreography avoids a single point of failure.

- **Q: How do you handle partial failures in Saga?**
  A: Compensating transactions — reverse the completed steps. Example: if payroll creation fails, delete the already-created employee. The SagaInstance entity tracks which steps completed.

---

### 6.2 Outbox Pattern
**What:** Ensures reliable event publishing by storing events in a DB table (outbox) within the same transaction as the business operation, then asynchronously publishing them.
**Why:** Solves the dual-write problem — you can't atomically write to a DB AND publish to Kafka. If Kafka is down, events aren't lost.

**Used in:** `employee-microservice`
```
outbox/
├── OutboxEvent.java               → Entity (id, aggregateType, aggregateId, eventType, payload, status, createdAt)
├── OutboxEventRepository.java     → JPA Repository with @Lock(PESSIMISTIC_WRITE)
├── OutboxEventPublisher.java      → @Scheduled poller that publishes pending events to Kafka
├── OutboxService.java             → Creates outbox events within business transactions
```

**Flow:**
```
1. BEGIN TRANSACTION
2. Save Employee to employees table
3. Save OutboxEvent to outbox_events table (status = PENDING)
4. COMMIT TRANSACTION
5. Scheduler polls outbox_events every 5 seconds
6. Publishes PENDING events to Kafka
7. Marks events as PUBLISHED
```

**Interview Q&A:**
- **Q: What is the dual-write problem?**
  A: When you need to write to two systems atomically (DB + message broker). If the app crashes between the two writes, data inconsistency occurs. Outbox pattern solves this by using a single DB transaction.

- **Q: Outbox polling vs CDC (Change Data Capture)?**
  A: Polling = application polls the outbox table (our approach, simpler). CDC = Debezium reads the DB transaction log directly (more efficient, no polling delay, but more complex infrastructure).

---

### 6.3 Anti-Corruption Layer (ACL)
**What:** Translates between your domain model and external/legacy systems. Prevents foreign concepts from leaking into your domain.
**Why:** When integrating with legacy payroll system that has different data formats, field names, and conventions.

**Used in:** `employee-microservice`
```
acl/
├── LegacyPayrollSystemAdapter.java    → Converts legacy format ↔ domain format
├── LegacyPayrollIntegrationService.java → Integration service using the adapter
├── LegacyPayrollResponse.java         → Legacy system's data format
```

```java
@Component
public class LegacyPayrollSystemAdapter {
    public EmployeePayrollDTO adaptFromLegacy(LegacyPayrollResponse legacy) {
        return EmployeePayrollDTO.builder()
            .employeeId(Long.parseLong(legacy.getEmpCode()))  // Legacy: "EMP001" → Domain: 1
            .grossSalary(legacy.getTotalComp())                // Legacy field name → Domain field name
            .build();
    }
}
```

**Interview Q&A:**
- **Q: What is DDD Anti-Corruption Layer?**
  A: A boundary layer that translates between your bounded context and external systems. Prevents your domain model from being "corrupted" by external concepts. It's an isolation pattern.

---

### 6.4 CQRS (Command Query Responsibility Segregation)
**What:** Separates read and write operations — different models/stores for commands (writes) and queries (reads).
**Why:** Reads and writes have different scalability and optimization needs. Searches need Elasticsearch, writes need PostgreSQL.

**Used in:** Employee microservice — PostgreSQL for writes, Elasticsearch for reads/search.
```
PostgreSQL (Write Model) → Kafka Event → Elasticsearch (Read/Search Model)

Write Path: REST POST → EmployeeService → EmployeeRepository (PostgreSQL)
Read Path:  REST GET /search → SearchService → EmployeeSearchRepository (Elasticsearch)
```

**Interview Q&A:**
- **Q: When should you use CQRS?**
  A: When read and write load is significantly different (reads >> writes), when you need different data models for reads (denormalized) vs writes (normalized), when you need different databases for different access patterns.

---

### 6.5 Circuit Breaker Pattern
**What:** Prevents cascading failures when a downstream service is unavailable. Stops sending requests after failure threshold.
**Why:** If payroll-service is down, don't keep retrying — fail fast and return fallback.

**Used in:** `EmployeeService`, `EmployeeClient` (Feign)
**Library:** Resilience4j
```yaml
# application.yml
resilience4j:
  circuitbreaker:
    instances:
      payrollService:
        slidingWindowSize: 10
        failureRateThreshold: 50
        waitDurationInOpenState: 10000
        permittedNumberOfCallsInHalfOpenState: 3
```

**States:** CLOSED → OPEN → HALF_OPEN → CLOSED
```
CLOSED: All calls pass through. Track failure rate.
        If failure rate > 50% → switch to OPEN
OPEN:   All calls rejected immediately (fail-fast). Return fallback.
        After 10 seconds → switch to HALF_OPEN
HALF_OPEN: Allow 3 test calls.
           If successful → back to CLOSED
           If failed → back to OPEN
```

---

### 6.6 Retry Pattern
**What:** Automatically re-attempts failed operations with configurable delays.
**Used in:** `EmployeeService`, `EmployeeClient`
```yaml
resilience4j:
  retry:
    instances:
      payrollService:
        maxAttempts: 3
        waitDuration: 1000
        retryExceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException
```

---

### 6.7 Rate Limiter Pattern
**What:** Controls the number of requests allowed in a time window.
**Used in:** `EmployeeService` (Resilience4j), `NotificationController` (Bucket4j)
```yaml
# Resilience4j Rate Limiter
resilience4j:
  ratelimiter:
    instances:
      default:
        limitForPeriod: 100
        limitRefreshPeriod: 1s
        timeoutDuration: 500ms
```

```java
// Bucket4j Rate Limiter (notification-microservice)
@Configuration
public class RateLimitConfig {
    @Bean
    public Bucket rateLimitBucket() {
        return Bucket.builder()
            .addLimit(Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1))))
            .build();
    }
}
```

**Interview Q&A:**
- **Q: Token Bucket vs Sliding Window rate limiting?**
  A: Token Bucket (Bucket4j): tokens refill at fixed rate, requests consume tokens. Allows bursts. Sliding Window (Resilience4j): counts requests in a rolling time window. No burst tolerance. Token Bucket is more flexible.

---

### 6.8 Bulkhead Pattern
**What:** Isolates different types of workload — prevents one slow call from consuming all threads.
**Used in:** `EmployeeService`
```yaml
resilience4j:
  bulkhead:
    instances:
      payrollService:
        maxConcurrentCalls: 10
        maxWaitDuration: 500ms
```

**Interview Q&A:**
- **Q: What types of Bulkhead exist?**
  A: Semaphore Bulkhead (our project): limits concurrent calls with a semaphore. Thread Pool Bulkhead: uses a separate thread pool. Semaphore is lighter, Thread Pool provides complete isolation.

---

### 6.9 Strategy Pattern
**What:** Defines a family of algorithms, encapsulates each one, and makes them interchangeable. Client chooses the algorithm at runtime.
**Why:** Notification channels (Email, SMS, Push, In-App) have different implementations but the same interface.

**Used in:** `notification-microservice`
```java
// Strategy Interface
public interface NotificationStrategy {
    NotificationResult send(Notification notification);
    ChannelType getChannel();
}

// Concrete Strategies
@Service @Profile("email")
public class EmailNotificationStrategy implements NotificationStrategy { ... }

@Service
public class SmsNotificationStrategy implements NotificationStrategy { ... }

@Service
public class PushNotificationStrategy implements NotificationStrategy { ... }

@Service @ConditionalOnProperty(name = "notification.channel.in-app.enabled", havingValue = "true")
public class InAppNotificationStrategy implements NotificationStrategy { ... }

// Factory (selects strategy at runtime)
@Component
public class NotificationStrategyFactory {
    private final Map<ChannelType, NotificationStrategy> strategies;

    public NotificationStrategyFactory(List<NotificationStrategy> strategyList) {
        strategies = strategyList.stream()
            .collect(Collectors.toMap(NotificationStrategy::getChannel, Function.identity()));
    }

    public NotificationStrategy getStrategy(ChannelType channel) {
        return Optional.ofNullable(strategies.get(channel))
            .orElseThrow(() -> new UnsupportedOperationException("No strategy for: " + channel));
    }
}
```

**Interview Q&A:**
- **Q: Strategy vs Template Method pattern?**
  A: Strategy uses composition (inject different implementations). Template Method uses inheritance (subclass overrides specific steps). Strategy is more flexible; Template Method enforces algorithm structure.

- **Q: How does Spring make Strategy pattern elegant?**
  A: Inject `List<NotificationStrategy>` — Spring auto-discovers all implementations. Build a Map by type. No explicit registration needed. Add a new channel by just creating a new @Service class.

---

### 6.10 Template Method Pattern
**What:** Defines the skeleton of an algorithm in a base class, letting subclasses override specific steps.
**Used in:** `notification-microservice`
```java
// Abstract base class (template)
public abstract class AbstractNotificationProcessor {
    public final NotificationResult process(Notification notification) {
        validate(notification);          // Step 1 (common)
        enrich(notification);            // Step 2 (overridable)
        NotificationResult result = send(notification);  // Step 3 (abstract)
        postProcess(notification, result); // Step 4 (overridable)
        return result;
    }

    protected void validate(Notification notification) { /* common validation */ }
    protected void enrich(Notification notification) { /* default: no-op */ }
    protected abstract NotificationResult send(Notification notification);
    protected void postProcess(Notification notification, NotificationResult result) { /* default: log */ }
}

// Concrete implementations
@Component
public class EmailNotificationProcessor extends AbstractNotificationProcessor {
    @Override
    protected NotificationResult send(Notification notification) {
        // Email-specific sending logic
    }
}

@Component
public class SmsNotificationProcessor extends AbstractNotificationProcessor {
    @Override
    protected void enrich(Notification notification) {
        // SMS-specific enrichment (shorten message)
    }

    @Override
    protected NotificationResult send(Notification notification) {
        // SMS-specific sending logic
    }
}
```

---

### 6.11 Observer Pattern (Event-Driven)
**What:** One-to-many dependency where observers are notified of state changes.
**Used in:** Spring ApplicationEvent system in `notification-microservice`
```java
// Event
public class NotificationCreatedEvent extends ApplicationEvent {
    private final Notification notification;
    public NotificationCreatedEvent(Object source, Notification notification) {
        super(source);
        this.notification = notification;
    }
}

// Publisher (in service)
applicationEventPublisher.publishEvent(new NotificationCreatedEvent(this, notification));

// Listener
@Component
public class NotificationEventListener {
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void handleNotificationCreated(NotificationCreatedEvent event) {
        // Process asynchronously after transaction commits
    }
}
```

**Interview Q&A:**
- **Q: ApplicationEvent vs Kafka events?**
  A: ApplicationEvent is in-JVM only (same microservice). Kafka is distributed across services. Use ApplicationEvent for intra-service events (decoupling within a service), Kafka for inter-service events (decoupling between services).

---

### 6.12 Adapter Pattern
**What:** Converts the interface of one class into another that clients expect.
**Used in:** ACL — `LegacyPayrollSystemAdapter` converts legacy payroll format to domain format.

### 6.13 Factory Pattern
**What:** Creates objects without specifying exact classes. Centralizes creation logic.
**Used in:** `NotificationStrategyFactory` — creates the right strategy based on channel type.

### 6.14 Builder Pattern
**What:** Constructs complex objects step by step with a fluent API.
**Used in:** 28 classes via `@Builder` (Lombok). Also used with `TopicBuilder`, `Bucket.builder()`.

### 6.15 Repository Pattern
**What:** Abstracts data access behind interfaces. Domain layer doesn't know about JPA/SQL.
**Used in:** All 11 repository interfaces extending `JpaRepository`.

### 6.16 Proxy Pattern (AOP)
**What:** Spring AOP creates dynamic proxies around beans. The proxy intercepts method calls to add cross-cutting behavior.
**Used in:** All @Transactional, @Cacheable, @CircuitBreaker, @Async methods — Spring creates proxies that wrap the actual bean.

**Interview Q&A:**
- **Q: JDK Dynamic Proxy vs CGLIB Proxy?**
  A: JDK proxy works on interfaces only. CGLIB creates a subclass — works on classes. Spring Boot uses CGLIB by default. That's why you can @Transactional on concrete classes.

---

## 7. DATA LAYER — POLYGLOT PERSISTENCE

### 7.1 PostgreSQL (Primary RDBMS)
**What:** ACID-compliant relational database.
**Used for:** Employees, Users, Roles, Payroll, Payment Transactions, Salary Components, Notifications, Outbox Events, Saga Instances.
**Config:** Master (port 5432) + Read Replica (port 5433).

**JPA Repository Features Used:**
```java
// Standard CRUD
JpaRepository<Employee, Long>   → save(), findById(), findAll(), deleteById()

// Query Methods (Spring generates SQL from method names)
List<Employee> findByDepartment(String department);
Optional<Employee> findByEmail(String email);
Page<Employee> findByStatus(EmployeeStatus status, Pageable pageable);

// Custom JPQL
@Query("SELECT e FROM Employee e WHERE e.salary > :minSalary AND e.department = :dept")
List<Employee> findHighEarners(@Param("minSalary") BigDecimal min, @Param("dept") String dept);

// JPA Specifications (dynamic queries)
Page<Notification> findAll(Specification<Notification> spec, Pageable pageable);
```

### 7.2 JPA Specifications (Dynamic Queries)
**What:** Type-safe, composable query predicates. Build WHERE clauses dynamically.
**Used in:** `notification-microservice`
```java
public class NotificationSpecification {
    public static Specification<Notification> hasRecipient(String recipientId) {
        return (root, query, cb) -> 
            recipientId == null ? null : cb.equal(root.get("recipientId"), recipientId);
    }

    public static Specification<Notification> hasStatus(NotificationStatus status) {
        return (root, query, cb) -> 
            status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<Notification> hasChannel(ChannelType channelType) {
        return (root, query, cb) -> 
            channelType == null ? null : cb.equal(root.get("channelType"), channelType);
    }

    public static Specification<Notification> createdAfter(LocalDateTime date) {
        return (root, query, cb) -> 
            date == null ? null : cb.greaterThanOrEqualTo(root.get("createdDate"), date);
    }
}

// Usage: compose specifications dynamically
Specification<Notification> spec = Specification
    .where(NotificationSpecification.hasRecipient(recipientId))
    .and(NotificationSpecification.hasStatus(status))
    .and(NotificationSpecification.hasChannel(channel));
Page<Notification> results = repository.findAll(spec, pageable);
```

**Interview Q&A:**
- **Q: JPA Specifications vs @Query vs Criteria API?**
  A: @Query = static queries. Criteria API = dynamic but verbose. JPA Specifications = dynamic + composable + type-safe. Specs are the cleanest for complex filter/search endpoints.

---

### 7.3 MongoDB (Document Store)
**What:** NoSQL document database — flexible schema, stores JSON documents.
**Used for:** Audit logs (unstructured, variable fields).
```java
@Document(collection = "audit_logs")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AuditLog {
    @Id
    private String id;
    private String action;
    private String entityType;
    private String entityId;
    private String performedBy;
    private Map<String, Object> changes;  // Flexible — different entities have different fields
    private LocalDateTime timestamp;
}
```

**Interview Q&A:**
- **Q: Why MongoDB for audit logs?**
  A: Audit logs have variable structure (different entities = different fields). Document DB's flexible schema is perfect. Also, audit logs are write-heavy, read-rarely — MongoDB's append-only writes are efficient.

---

### 7.4 Elasticsearch (Full-Text Search)
**What:** Distributed search and analytics engine. Inverted index for fast full-text search.
**Used for:** Employee search — name, department, skills with fuzzy matching.
```java
@Document(indexName = "employees")
public class EmployeeSearchDocument {
    @Id private String id;
    @Field(type = FieldType.Text, analyzer = "standard") private String firstName;
    @Field(type = FieldType.Text, analyzer = "standard") private String lastName;
    @Field(type = FieldType.Keyword) private String department;
    @Field(type = FieldType.Keyword) private String status;
    @Field(type = FieldType.Double) private Double salary;
}
```

**Interview Q&A:**
- **Q: Why Elasticsearch instead of SQL LIKE queries?**
  A: LIKE '%keyword%' requires full table scan (O(n)). Elasticsearch uses inverted indexes (O(1) lookup). It supports fuzzy matching, relevance scoring, aggregations, and scales horizontally.

---

### 7.5 Redis (Cache + Rate Limiting)
**What:** In-memory key-value store. Sub-millisecond reads.
**Used for:** Caching employee/notification data, rate limiting (Bucket4j), session storage.
```java
@Configuration
public class RedisConfig {
    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory factory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(30))
            .serializeValuesWith(SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()));
        return RedisCacheManager.builder(factory).cacheDefaults(config).build();
    }
}
```

---

### 7.6 Flyway (Database Migrations)
**What:** Version-controlled database schema migrations. SQL scripts run in order.
**Used in:** employee, notification, payroll microservices.
```
db/migration/
├── V1__create_employees_table.sql
├── V2__create_outbox_events_table.sql
├── V3__create_saga_instances_table.sql
├── V4__add_department_index.sql
```

**Interview Q&A:**
- **Q: Flyway vs Liquibase?**
  A: Flyway uses plain SQL files (simple, familiar). Liquibase uses XML/YAML/JSON (more features, rollback support). Flyway is more popular for its simplicity.

- **Q: How does Flyway track which migrations have run?**
  A: It creates a `flyway_schema_history` table that records each migration's version, checksum, and execution time.

---

## 8. EVENT-DRIVEN ARCHITECTURE (KAFKA)

### 8.1 Architecture
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Employee    │────►│    Kafka    │────►│   Payroll   │
│  Service     │     │   Broker    │     │   Service   │
│  (Producer)  │     │  :9092      │     │  (Consumer) │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                    ┌─────▼─────┐
                    │ Zookeeper │
                    │  :2181    │
                    └───────────┘
```

### 8.2 Producer Configuration
```java
@Configuration
public class KafkaConfig {
    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Bean
    public ProducerFactory<String, String> producerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.ACKS_CONFIG, "all");  // Wait for all replicas
        config.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);  // Exactly-once
        return new DefaultKafkaProducerFactory<>(config);
    }

    @Bean
    public NewTopic employeeTopic() {
        return TopicBuilder.name("employee-events")
            .partitions(3)
            .replicas(1)
            .build();
    }
}
```

### 8.3 Consumer Configuration
```java
@KafkaListener(topics = "${kafka.topic.employee-events}", groupId = "${spring.kafka.consumer.group-id}")
public void consumeEmployeeEvent(
    @Payload String message,
    @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
    @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
    @Header(KafkaHeaders.OFFSET) long offset
) {
    log.info("Received: topic={}, partition={}, offset={}", topic, partition, offset);
    processEvent(objectMapper.readValue(message, EmployeeEvent.class));
}
```

**Interview Q&A:**
- **Q: What is a Consumer Group?**
  A: Multiple consumer instances sharing the same group-id. Kafka assigns each partition to exactly one consumer in the group. Enables parallel processing and scaling.

- **Q: What is acks=all?**
  A: Producer waits until ALL in-sync replicas acknowledge the message. Strongest durability guarantee. acks=0 (fire-forget), acks=1 (leader only), acks=all (all replicas).

- **Q: What is Kafka idempotence?**
  A: Prevents duplicate messages from producer retries. Producer assigns a sequence number to each message; broker deduplicates. Enabled via `enable.idempotence=true`.

- **Q: How does Kafka guarantee ordering?**
  A: Ordering is guaranteed within a partition, not across partitions. Use the same key (e.g., employeeId) to route related messages to the same partition.

- **Q: Kafka vs RabbitMQ?**
  A: Kafka = log-based, persistent, replayable, high throughput, consumer pulls. RabbitMQ = queue-based, message deleted after consumption, broker pushes. Kafka for event streaming; RabbitMQ for traditional task queues.

---

## 9. SPRING HATEOAS

**What:** Hypermedia As The Engine Of Application State — REST responses include links to related resources.
**Why:** Self-documenting APIs — clients discover available actions from the response, not hardcoded URLs.

**Used in:** `notification-microservice`
```java
@GetMapping("/{id}")
public EntityModel<NotificationResponse> getById(@PathVariable Long id) {
    NotificationResponse notification = notificationService.getById(id);
    EntityModel<NotificationResponse> model = EntityModel.of(notification);
    model.add(linkTo(methodOn(NotificationController.class).getById(id)).withSelfRel());
    model.add(linkTo(methodOn(NotificationController.class).markAsRead(id)).withRel("mark-read"));
    model.add(linkTo(methodOn(NotificationController.class).delete(id)).withRel("delete"));
    return model;
}
```

**Response:**
```json
{
  "id": 1,
  "title": "Welcome",
  "message": "Welcome aboard!",
  "_links": {
    "self": { "href": "http://localhost:8084/api/v1/notifications/1" },
    "mark-read": { "href": "http://localhost:8084/api/v1/notifications/1/read" },
    "delete": { "href": "http://localhost:8084/api/v1/notifications/1" }
  }
}
```

**Interview Q&A:**
- **Q: What is Richardson Maturity Model?**
  A: Level 0 = HTTP as transport. Level 1 = Resources. Level 2 = HTTP verbs + status codes. Level 3 = Hypermedia controls (HATEOAS). Our project reaches Level 3 in the notification service.

---

## 10. FILE UPLOAD

**Used in:** `notification-microservice`
```java
@RestController
@RequestMapping("/api/v1/files")
public class FileController {
    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> upload(@RequestParam("file") MultipartFile file) {
        // Validate file type, size
        // Store file
        // Return file metadata
    }
}
```

**Interview Q&A:**
- **Q: How do you handle large file uploads?**
  A: Configure `spring.servlet.multipart.max-file-size` and `max-request-size`. Stream to storage (S3/disk) instead of loading into memory. Use chunked upload for very large files.

---

## 11. SPRING BATCH

**What:** Framework for batch processing — large volumes of data in scheduled jobs.
**Why:** Periodic data processing (generate reports, sync data, cleanup).

**Used in:** `employee-microservice`
```java
@Configuration
@EnableBatchProcessing
public class BatchConfiguration {
    @Bean
    public Job importEmployeeJob(JobBuilderFactory jobs, Step step1) {
        return jobs.get("importEmployeeJob")
            .incrementer(new RunIdIncrementer())
            .start(step1)
            .build();
    }
}
```

**Interview Q&A:**
- **Q: What are the core Spring Batch concepts?**
  A: Job = entire batch process. Step = single phase of a Job. ItemReader = read data. ItemProcessor = transform data. ItemWriter = write data. JobRepository = stores job execution metadata.

---

## 12. WEBSOCKET (STOMP)

**What:** Full-duplex communication — server can push messages to clients.
**Used for:** Real-time employee status updates.

**Used in:** `employee-microservice`
```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");       // Subscribe to
        registry.setApplicationDestinationPrefixes("/app");  // Send to
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOrigins("*").withSockJS();
    }
}
```

**Interview Q&A:**
- **Q: WebSocket vs SSE vs Long Polling?**
  A: WebSocket = full-duplex, persistent connection. SSE = server-to-client only, simpler. Long Polling = client polls, server holds response. WebSocket for two-way real-time; SSE for push-only updates.

---

## 13. SECURITY — JWT + RBAC DEEP DIVE

### 13.1 Authentication Flow
```
1. POST /api/auth/register → Create user with hashed password (BCrypt)
2. POST /api/auth/login → Validate credentials → Generate JWT token
3. Client stores JWT in localStorage/cookie
4. All subsequent requests: Authorization: Bearer <JWT>
5. JwtAuthenticationFilter validates token on every request
6. SecurityContextHolder populated with user details
```

### 13.2 JWT Token Structure
```
Header:      { "alg": "HS512", "typ": "JWT" }
Payload:     { "sub": "username", "roles": ["ADMIN"], "iat": ..., "exp": ... }
Signature:   HMACSHA512(base64(header) + "." + base64(payload), secret)
```

### 13.3 Security Configuration
```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) {
        http.csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**", "/actuator/**").permitAll()
                .requestMatchers(HttpMethod.DELETE, "/api/v1/employees/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
```

**Interview Q&A:**
- **Q: Why disable CSRF for REST APIs?**
  A: CSRF attacks exploit cookie-based auth. Our API uses JWT in the Authorization header (not cookies), so CSRF protection is unnecessary. Stateless = no session cookies.

- **Q: How do you handle JWT expiration?**
  A: Access tokens have short TTL (e.g., 15 min). Refresh tokens have longer TTL (e.g., 7 days). Client uses refresh token to get new access token without re-login.

- **Q: BCrypt vs SHA-256 for password hashing?**
  A: BCrypt is intentionally slow (configurable work factor), resistant to brute force. SHA-256 is fast — vulnerable to rainbow table attacks. BCrypt also includes a random salt automatically.

---

## 14. OBSERVABILITY STACK

### 14.1 Distributed Tracing (Zipkin + Jaeger)
**What:** Tracks a request across all microservices. Each request gets a unique trace ID.
**How:** Spring Boot Micrometer auto-propagates trace IDs via HTTP headers.
```
Client → Gateway (traceId=abc) → Employee Service (traceId=abc) → Payroll Service (traceId=abc)
```

### 14.2 Metrics (Prometheus + Grafana)
**What:** Prometheus scrapes `/actuator/prometheus`. Grafana visualizes with dashboards.
**Custom Metrics:**
```java
@Service
public class MetricsService {
    private final MeterRegistry meterRegistry;

    public void recordEmployeeCreation() {
        meterRegistry.counter("employee.created.total").increment();
    }

    public void recordResponseTime(String operation, long duration) {
        meterRegistry.timer("api.response.time", "operation", operation)
            .record(Duration.ofMillis(duration));
    }
}
```

### 14.3 ELK Stack (Elasticsearch + Logstash + Kibana)
**What:** Centralized logging — collect logs from all services, search and visualize.
```
Microservices → Logstash → Elasticsearch → Kibana (dashboard)
```

### 14.4 MDC (Mapped Diagnostic Context)
**What:** Correlation IDs in log entries — trace a request across all log lines.
```java
@Component
@Order(1)
public class CorrelationIdFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, ...) {
        String correlationId = request.getHeader("X-Correlation-ID");
        if (correlationId == null) correlationId = UUID.randomUUID().toString();
        MDC.put("correlationId", correlationId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}
```

**Interview Q&A:**
- **Q: What is the difference between logging, metrics, and tracing?**
  A: Logging = discrete events (text). Metrics = aggregated numbers (counters, gauges, histograms). Tracing = request flow across services (spans). All three are needed for full observability.

---

## 15. GRAPHQL DEEP DIVE

### 15.1 Schema
```graphql
# notification-microservice/src/main/resources/graphql/schema.graphqls
type Query {
    notification(id: ID!): Notification
    notifications(recipientId: String!): [Notification]
    notificationsByStatus(status: String!): [Notification]
    unreadCount(recipientId: String!): Int
}

type Mutation {
    createNotification(input: NotificationInput!): Notification
    markAsRead(id: ID!): Notification
    markAllAsRead(recipientId: String!): Int
    deleteNotification(id: ID!): Boolean
}

type Notification {
    id: ID!
    recipientId: String!
    title: String!
    message: String!
    channelType: String!
    status: String!
    priority: String
    templateName: String
    sentAt: String
    readAt: String
    createdDate: String
}

input NotificationInput {
    recipientId: String!
    title: String!
    message: String!
    channelType: String!
    priority: String
    templateName: String
}
```

### 15.2 Controller
```java
@Controller
@RequiredArgsConstructor
public class NotificationGraphQLController {
    @QueryMapping
    public NotificationResponse notification(@Argument Long id) {
        return notificationService.getById(id);
    }

    @MutationMapping
    public NotificationResponse createNotification(@Argument NotificationRequest input) {
        return notificationService.create(input);
    }
}
```

**Interview Q&A:**
- **Q: How does Spring handle GraphQL vs REST simultaneously?**
  A: GraphQL runs on `/graphql` endpoint. REST runs on `/api/v1/*`. They share the same service layer but have separate controllers. GraphQL uses @QueryMapping/@MutationMapping; REST uses @GetMapping/@PostMapping.

---
