# PART 4: COMPREHENSIVE INTERVIEW Q&A + QUICK REFERENCE

---

## 25. INTERVIEW QUESTIONS BY TOPIC — COMPLETE Q&A

### 25.1 Core Java Interview Questions

**Q1: What are the new features in Java 17?**
A: Records (immutable data carriers), Sealed Classes (restricted inheritance), Pattern Matching for instanceof, Switch Expressions, Text Blocks, helpful NullPointerExceptions. Our project uses Records for DTOs (NotificationRequest, NotificationResponse, NotificationResult), Sealed Classes for algebraic types (NotificationResult.Success/Failure/Pending).

**Q2: What is the difference between == and equals()?**
A: `==` compares object references (memory address). `equals()` compares object content (overridable). For Records, equals() is auto-generated to compare all fields.

**Q3: What is the difference between String, StringBuilder, and StringBuffer?**
A: String = immutable (thread-safe by default). StringBuilder = mutable, NOT thread-safe (use in single thread). StringBuffer = mutable, thread-safe (synchronized, slower).

**Q4: Explain Java Collections Framework.**
A: List (ordered, duplicates: ArrayList, LinkedList), Set (unique: HashSet, TreeSet), Map (key-value: HashMap, TreeMap, ConcurrentHashMap), Queue (FIFO: LinkedList, PriorityQueue). Our project uses: List<EmployeeDTO>, Set<Role>, Map<ChannelType, NotificationStrategy>, Queue (Kafka consumer internally).

**Q5: What is the difference between final, finally, and finalize()?**
A: `final` = constant variable / uninheritable class / non-overridable method. `finally` = always-execute block after try-catch. `finalize()` = deprecated cleanup before GC (don't use).

**Q6: What are Generics?**
A: Type parameters for classes/methods. `JpaRepository<Employee, Long>` → type-safe: returns Employee, not Object. Compile-time type checking, no casting needed.

**Q7: What is Optional?**
A: Container that may or may not hold a value. Replaces null checks. Used extensively in our repositories: `Optional<Employee> findByEmail(String email)`. Methods: `isPresent()`, `orElseThrow()`, `map()`, `flatMap()`.

**Q8: Explain Stream API.**
A: Functional pipeline for processing collections. Used in our project:
```java
// NotificationStrategyFactory
strategies = strategyList.stream()
    .collect(Collectors.toMap(NotificationStrategy::getChannel, Function.identity()));
```

**Q9: What is CompletableFuture?**
A: Asynchronous computation. Used with @Async in our project. Supports chaining: `thenApply()`, `thenCompose()`, `thenCombine()`, `exceptionally()`.

**Q10: What are Functional Interfaces?**
A: Interface with exactly one abstract method. `@FunctionalInterface`. Examples: Predicate<T>, Function<T,R>, Consumer<T>, Supplier<T>. Used with lambdas and streams throughout the project.

---

### 25.2 Spring Framework Interview Questions

**Q11: What is Inversion of Control (IoC)?**
A: The framework controls object creation and lifecycle, not the developer. Objects declare dependencies, and the IoC container injects them. In our project: all @Service, @Repository, @Component beans are managed by Spring's IoC container.

**Q12: What is Dependency Injection?**
A: A form of IoC where dependencies are provided (injected) to objects rather than created by them. Our project uses constructor injection (via @RequiredArgsConstructor) — the recommended approach.

**Q13: What is the Spring Bean lifecycle?**
A: 1) Instantiation → 2) Populate properties (DI) → 3) BeanNameAware → 4) BeanFactoryAware → 5) Pre-initialization (BeanPostProcessor) → 6) @PostConstruct → 7) InitializingBean → 8) Ready to use → 9) @PreDestroy → 10) DisposableBean → 11) Garbage collected.

**Q14: Explain Spring Boot auto-configuration.**
A: Spring Boot examines classpath, existing beans, and properties to automatically configure beans. Example: if `spring-boot-starter-data-jpa` is on classpath + DataSource is configured → JPA beans are auto-created. Customizable via `application.properties` or `@ConditionalOn*` annotations.

**Q15: What is Spring ApplicationContext?**
A: The central IoC container. Manages beans, handles events, provides internationalization. It extends BeanFactory with enterprise features. In our project, each microservice has its own ApplicationContext.

**Q16: What are Spring profiles?**
A: Named groups of configurations. Activate with `spring.profiles.active`. Our project uses: `dev` (H2, debug logs), `test` (embedded DB, test data), `prod` (PostgreSQL, minimal logs). Beans can be profile-specific with `@Profile("dev")`.

**Q17: What is the difference between @Component, @Service, @Repository, @Controller?**
A: Functionally equivalent (all detected by component scan). Semantic difference: @Component = generic. @Service = business logic. @Repository = data access (adds exception translation). @Controller = web/MVC. Using correct stereotypes enables targeted AOP pointcuts.

**Q18: What is Spring AOP and where is it used in your project?**
A: Aspect-Oriented Programming — cross-cutting concerns. Our project has 3 aspects: LoggingAspect (log all method entries/exits), PerformanceAspect (measure execution time), AuditableAspect (custom @Auditable annotation tracks who did what). Also, @Transactional, @Cacheable, @CircuitBreaker all work via AOP proxies.

---

### 25.3 Microservices Interview Questions

**Q19: What are microservices?**
A: Small, independently deployable services that own their data and communicate via APIs. Our project has 6: Employee (user data), Payroll (salary/payments), Notification (alerts), API Gateway (routing), Eureka (discovery), Config Server (centralized config).

**Q20: How do microservices communicate in your project?**
A: 8 communication mechanisms:
1. **Synchronous REST** — OpenFeign (Employee ↔ Payroll)
2. **Async Events** — Kafka (Employee → Payroll, Employee → Notification)
3. **GraphQL** — Flexible queries (Notification)
4. **WebSocket STOMP** — Real-time push (Employee status updates)
5. **Service Discovery** — Eureka (dynamic service lookup)
6. **API Gateway** — Spring Cloud Gateway (routing, rate limiting)
7. **Config Server** — Centralized config distribution
8. **ApplicationEvent** — In-JVM events (within Notification service)

**Q21: What is service discovery and how does Eureka work?**
A: Services register with Eureka (heartbeat every 30s). Clients query Eureka for service URLs. If a service goes down, Eureka removes it after 90s. No hardcoded URLs — services found by name. Our Gateway + Employee + Payroll all register.

**Q22: What is an API Gateway?**
A: Single entry point for all client requests. Handles: routing, rate limiting, authentication, CORS, logging, load balancing. Our Gateway runs on port 8080 and routes to all microservices via Eureka.

**Q23: What is the Saga pattern and when do you use it?**
A: Manages distributed transactions across microservices. Each step is a local transaction with a compensating action for rollback. Use when: creating an entity requires coordinating multiple services (e.g., employee onboarding = create employee + create payroll + send notification). Our project uses orchestration-based saga.

**Q24: What is the Outbox pattern?**
A: Stores events in a DB table within the business transaction. A scheduler polls and publishes to Kafka. Solves the dual-write problem (can't atomically write to DB + Kafka). Our project: OutboxEvent entity + @Scheduled publisher every 5 seconds.

**Q25: What is Circuit Breaker and how does it prevent cascading failures?**
A: Monitors failure rate. When it exceeds threshold (50%), stops all calls (OPEN state). After wait period, tests with limited calls (HALF_OPEN). If successful, resumes (CLOSED). Prevents a failing downstream service from overwhelming the caller and cascading to other services.

**Q26: What is eventual consistency?**
A: In distributed systems, data will become consistent eventually, not immediately. Example: Employee created in PostgreSQL → Event published to Kafka → Payroll service processes event → Now both are consistent. Our project uses this model throughout.

**Q27: How do you handle distributed logging?**
A: MDC (Mapped Diagnostic Context) with correlation IDs. Every request gets a unique ID (`X-Correlation-ID` header). All log entries include this ID. Centralized in ELK stack — search by correlation ID to trace a request across all services.

**Q28: What is CQRS?**
A: Command Query Responsibility Segregation — separate write model (PostgreSQL, normalized) from read model (Elasticsearch, denormalized). Writes go to PostgreSQL → Kafka event → updates Elasticsearch. Reads query Elasticsearch for fast full-text search.

---

### 25.4 Database & JPA Interview Questions

**Q29: JPA vs Hibernate?**
A: JPA = specification (set of interfaces). Hibernate = implementation (most popular). Our project uses Spring Data JPA which wraps Hibernate. We could switch to EclipseLink without changing application code.

**Q30: What is N+1 query problem?**
A: Loading a parent + N children causes N+1 queries. Fix: `@ManyToMany(fetch = FetchType.EAGER)` (careful: loads all), `JOIN FETCH` in JPQL, `@EntityGraph`, batch fetching. Our project uses `FetchType.EAGER` for User→Roles (small set).

**Q31: What is database normalization?**
A: Organizing data to reduce redundancy. 1NF = atomic values. 2NF = no partial dependencies. 3NF = no transitive dependencies. BCNF = every determinant is a candidate key. Our write models are in 3NF; read models (Elasticsearch) are denormalized for performance.

**Q32: Explain ACID properties.**
A: Atomicity (all or nothing), Consistency (valid state → valid state), Isolation (concurrent transactions don't interfere), Durability (committed data survives crashes). PostgreSQL is ACID-compliant. Our @Transactional ensures ACID for local transactions.

**Q33: What is connection pooling?**
A: Reusing database connections instead of creating new ones (expensive). HikariCP (Spring Boot default) — maintains a pool of connections. Config: `spring.datasource.hikari.maximum-pool-size=10`.

**Q34: Explain optimistic vs pessimistic locking in your project.**
A: Optimistic: @Version field. JPA checks version number at commit — if another transaction modified the row, throws OptimisticLockException. We use this on 5 entities. Pessimistic: @Lock(PESSIMISTIC_WRITE). We use this on OutboxEventRepository to prevent duplicate event processing.

**Q35: What are JPA Specifications?**
A: Type-safe, composable query predicates. Build WHERE clauses dynamically by combining specifications with `.and()`, `.or()`, `.not()`. Our notification service uses specs for filtering by recipient, status, channel, and date range.

**Q36: What is Flyway?**
A: Database migration tool. SQL scripts versioned (V1__, V2__) and applied in order. Tracks which migrations have run in `flyway_schema_history` table. Ensures all environments have the same schema.

---

### 25.5 Kafka & Messaging Interview Questions

**Q37: What is Apache Kafka?**
A: Distributed event streaming platform. Producers write events to topics. Topics are divided into partitions. Consumer groups process partitions in parallel. Events are persisted (replayable). Used for: async communication, event sourcing, data pipelines.

**Q38: Kafka architecture components?**
A: Broker (server), Topic (category), Partition (ordered log within topic), Producer (writes events), Consumer (reads events), Consumer Group (parallel consumers), Zookeeper (cluster management, being replaced by KRaft).

**Q39: How does Kafka guarantee message ordering?**
A: Ordering is guaranteed WITHIN a partition only. Use the same key (e.g., employeeId) to route related messages to the same partition. Our project uses employeeId as the partition key.

**Q40: What is Kafka's acks setting?**
A: acks=0 (fire-forget, fastest, may lose data). acks=1 (leader ack, balanced). acks=all (all replicas ack, slowest, no data loss). Our project uses acks=all for durability.

**Q41: What is idempotency in Kafka?**
A: Producer assigns sequence numbers. Broker deduplicates on retry. `enable.idempotence=true`. Prevents duplicate messages when producer retries after timeout.

---

### 25.6 Docker & Kubernetes Interview Questions

**Q42: What is Docker?**
A: Containerization platform. Packages app + dependencies into a portable container. Same image runs everywhere (dev, staging, prod). Our project has 7 Dockerfiles using multi-stage builds.

**Q43: Docker image vs container?**
A: Image = read-only template (blueprint). Container = running instance of an image. Multiple containers can run from the same image. Images are built from Dockerfiles, stored in registries (DockerHub, ECR).

**Q44: What is Kubernetes?**
A: Container orchestration platform. Manages deployments, scaling, networking, storage. Self-healing (restarts failed containers), auto-scaling (HPA), rolling updates, service discovery.

**Q45: Explain Kubernetes objects used in your project.**
A: Deployment (stateless apps — our microservices), StatefulSet (stateful apps — PostgreSQL, Kafka), Service (networking — ClusterIP, LoadBalancer), ConfigMap (configuration), Secret (sensitive data), PersistentVolumeClaim (storage), HPA (auto-scaling), Ingress (external access).

**Q46: What is Helm?**
A: Package manager for Kubernetes. Charts = templates + values. `helm install myapp ./chart` deploys everything. `helm upgrade` for updates. `helm rollback` for reverting. Our project has a Helm chart with dev/prod value files.

**Q47: What is a sidecar pattern?**
A: Running a helper container alongside the main container in the same pod. Examples: log collector, service mesh proxy (Istio envoy), monitoring agent. The sidecar shares the pod's network and storage.

---

### 25.7 Terraform & Cloud Interview Questions

**Q48: What is Infrastructure as Code (IaC)?**
A: Managing infrastructure through code files instead of manual console clicks. Benefits: version controlled, reproducible, reviewable, automatable. Our project uses Terraform for AWS infrastructure.

**Q49: What is Terraform?**
A: IaC tool by HashiCorp. Declarative HCL language — you describe the desired state, Terraform figures out how to get there. Supports AWS, Azure, GCP. Our project has 8 modules managing VPC, EKS, RDS, ElastiCache, MSK, ECR, S3, CloudWatch.

**Q50: What is Terraform state?**
A: terraform.tfstate tracks the mapping between config and real resources. Best practices: remote state (S3), state locking (DynamoDB), never edit manually. `terraform import` for existing resources.

**Q51: Explain the AWS services used in your project's Terraform.**
A: VPC (networking isolation), EKS (managed Kubernetes), RDS (managed PostgreSQL), ElastiCache (managed Redis), MSK (managed Kafka), ECR (Docker registry), S3 (file storage), CloudWatch (logging/monitoring).

---

### 25.8 Testing Interview Questions

**Q52: What is the testing pyramid?**
A: Many unit tests (fast, isolated), fewer integration tests (slower, real dependencies), fewest E2E tests (slowest, full system). Our project: JUnit 5 + Mockito (unit) → @DataJpaTest/@WebMvcTest (slice) → Testcontainers (integration) → Playwright (E2E).

**Q53: What is Mockito?**
A: Mocking framework. `when(...).thenReturn(...)` stubs behavior. `verify(...)` asserts interactions. `@Mock` creates mocks, `@InjectMocks` injects them. Our project uses Mockito in all 7+ unit test classes.

**Q54: What are Testcontainers?**
A: JUnit extension that manages Docker containers in tests. Real PostgreSQL, Redis, Kafka instead of mocks. `@Testcontainers` + `@Container` + `@DynamicPropertySource`. Our project tests against real PostgreSQL.

**Q55: What is MockMvc?**
A: Spring's test support for testing controllers without starting a real server. Performs HTTP requests, asserts responses. Used with @WebMvcTest or @AutoConfigureMockMvc.

---

### 25.9 Design Pattern Interview Questions

**Q56: Name all design patterns used in your project.**
A: 16+ patterns:
1. **Saga** — Distributed transactions (Employee Onboarding)
2. **Outbox** — Reliable event publishing (DB → Kafka)
3. **Anti-Corruption Layer** — Legacy system integration
4. **CQRS** — Separate read/write models (PostgreSQL + Elasticsearch)
5. **Circuit Breaker** — Prevent cascading failures (Resilience4j)
6. **Retry** — Transient failure recovery
7. **Rate Limiter** — Request throttling (Resilience4j + Bucket4j)
8. **Bulkhead** — Resource isolation
9. **Strategy** — Notification channels (Email/SMS/Push/In-App)
10. **Template Method** — Notification processing (AbstractNotificationProcessor)
11. **Observer** — Event-driven (Spring ApplicationEvent)
12. **Adapter** — Legacy system translation
13. **Factory** — Strategy selection (NotificationStrategyFactory)
14. **Builder** — Object construction (@Builder, TopicBuilder)
15. **Repository** — Data access abstraction (JpaRepository)
16. **Proxy** — AOP cross-cutting concerns

**Q57: When would you use Strategy vs Template Method?**
A: Strategy = interchangeable algorithms via composition (different notification channels). Template Method = fixed algorithm skeleton with customizable steps via inheritance (notification processing pipeline). Strategy is more flexible; Template Method enforces structure.

**Q58: Explain the Observer pattern in your project.**
A: NotificationCreatedEvent is published after creating a notification. NotificationEventListener listens and processes asynchronously. The publisher doesn't know about the listener — loose coupling. Uses Spring's ApplicationEvent system with @TransactionalEventListener for transaction safety.

---

### 25.10 Security Interview Questions

**Q59: How does JWT authentication work?**
A: 1) Client sends credentials to /api/auth/login. 2) Server validates against DB (BCrypt hash). 3) Server creates JWT with user info + expiry + HMAC signature. 4) Client stores JWT. 5) Every request includes `Authorization: Bearer <token>`. 6) JwtAuthenticationFilter validates signature and expiry. 7) SecurityContextHolder is populated.

**Q60: What is RBAC?**
A: Role-Based Access Control. Users have roles (ADMIN, HR, USER). Resources require specific roles. `@PreAuthorize("hasRole('ADMIN')")` enforces at method level. SecurityFilterChain enforces at URL level.

**Q61: Why stateless sessions with JWT?**
A: Stateless = no server-side session storage. The JWT itself contains all authentication info. Benefits: horizontally scalable (any instance can validate), no session replication needed, no session hijacking via cookies.

---

### 25.11 React & Frontend Interview Questions

**Q62: What is the virtual DOM?**
A: React's in-memory representation of the real DOM. When state changes, React creates a new virtual DOM, diffs it with the previous one, and applies only the minimal changes to the real DOM (reconciliation).

**Q63: What are React hooks?**
A: Functions that let you use state and lifecycle features in functional components. useState (state), useEffect (side effects), useContext (context), useReducer (complex state), useMemo (memoization), useCallback (function memoization), useRef (mutable ref). Our project has 15+ custom hooks.

**Q64: Redux Toolkit vs React Context?**
A: Redux = complex global state, time-travel debugging, middleware (thunks). Context = simple state passing (theme, auth). Don't use Context for frequently changing state (causes re-renders). Our project uses Redux for global state + React Query for server state.

**Q65: What is React Query?**
A: Server state management library. Handles: fetching, caching, background refetch, pagination, optimistic updates. `useQuery` for reads, `useMutation` for writes. Our project uses it for all API calls instead of useEffect + useState.

---

## 26. COMPLETE ANNOTATION QUICK REFERENCE (129 Unique)

### Spring Core (19)
`@SpringBootApplication` `@Configuration` `@Bean` `@Component` `@Service` `@Repository` `@Controller` `@RestController` `@RestControllerAdvice` `@Autowired` `@Qualifier` `@Primary` `@Value` `@Profile` `@ConditionalOnBean` `@ConditionalOnProperty` `@PostConstruct` `@Order` `@Deprecated`

### Spring Web (11)
`@RequestMapping` `@GetMapping` `@PostMapping` `@PutMapping` `@PatchMapping` `@DeleteMapping` `@RequestParam` `@PathVariable` `@RequestBody` `@Valid` `@ExceptionHandler`

### Spring Cloud (5)
`@EnableDiscoveryClient` `@EnableEurekaServer` `@EnableConfigServer` `@EnableFeignClients` `@FeignClient`

### Spring Security (2)
`@EnableWebSecurity` `@EnableMethodSecurity`

### Spring Data / JPA (24)
`@Entity` `@Table` `@Id` `@GeneratedValue` `@Column` `@ManyToMany` `@JoinTable` `@JoinColumn` `@CollectionTable` `@ElementCollection` `@MapKeyColumn` `@Enumerated` `@UniqueConstraint` `@Index` `@Version` `@Lock` `@Query` `@Param` `@Modifying` `@Transactional` `@TransactionalEventListener` `@PrePersist` `@PreUpdate` `@EnableJpaAuditing`

### Spring Data Auditing (5)
`@EntityListeners` `@CreatedDate` `@CreatedBy` `@LastModifiedDate` `@LastModifiedBy`

### Bean Validation (7)
`@NotBlank` `@NotNull` `@Email` `@Size` `@DecimalMin` `@Positive` `@DateTimeFormat`

### Lombok (6)
`@Data` `@Builder` `@NoArgsConstructor` `@AllArgsConstructor` `@RequiredArgsConstructor` `@Slf4j`

### Resilience4j (4)
`@CircuitBreaker` `@Retry` `@RateLimiter` `@Bulkhead`

### Caching (3)
`@EnableCaching` `@Cacheable` `@CacheEvict`

### Kafka (3)
`@KafkaListener` `@Header` `@Payload`

### MongoDB/Elasticsearch (2)
`@Document` `@Field`

### Spring AOP (5)
`@Aspect` `@Around` `@Before` `@AfterThrowing` `@Pointcut`

### Async & Scheduling (5)
`@EnableAsync` `@Async` `@EnableScheduling` `@Scheduled` `@EnableBatchProcessing`

### WebSocket (1)
`@EnableWebSocketMessageBroker`

### GraphQL (3)
`@QueryMapping` `@MutationMapping` `@Argument`

### OpenAPI/Swagger (5)
`@Operation` `@ApiResponse` `@ApiResponses` `@Parameter` `@Tag`

### MapStruct (2)
`@Mapper` `@Mapping`

### Custom (3)
`@Auditable` `@Target` `@Retention`

### Test (19)
`@Test` `@BeforeEach` `@DisplayName` `@Nested` `@ExtendWith` `@SpringBootTest` `@WebMvcTest` `@DataJpaTest` `@GraphQlTest` `@AutoConfigureMockMvc` `@AutoConfigureTestDatabase` `@ActiveProfiles` `@TestMethodOrder` `@Mock` `@MockBean` `@InjectMocks` `@Testcontainers` `@Container` `@DynamicPropertySource`

---

## 27. COMPLETE PORT & SERVICE MAP

| Service | Port | Technology | Purpose |
|---|---|---|---|
| **API Gateway** | 8080 | Spring Cloud Gateway | Single entry point, routing, rate limiting |
| **Employee Service** | 8081 | Spring Boot + PostgreSQL | Employee CRUD, CQRS, Saga, Security |
| **Payroll Service** | 8083 | Spring Boot + PostgreSQL | Payroll processing, payments |
| **Notification Service** | 8084 | Spring Boot + PostgreSQL | Multi-channel notifications, GraphQL |
| **Eureka Server** | 8761 | Spring Cloud Netflix | Service discovery & registration |
| **Config Server** | 8888 | Spring Cloud Config | Centralized configuration |
| **PostgreSQL Master** | 5432 | PostgreSQL 15 | Primary relational database |
| **PostgreSQL Replica** | 5433 | PostgreSQL 15 | Read replica |
| **MongoDB** | 27017 | MongoDB 7 | Audit logs (document store) |
| **Redis** | 6379 | Redis 7 | Caching + rate limiting |
| **Elasticsearch** | 9200 | Elasticsearch 8.11 | Full-text search |
| **Kafka** | 9092 | Confluent Kafka 7.5 | Event streaming |
| **Zookeeper** | 2181 | Confluent Zookeeper | Kafka cluster management |
| **Prometheus** | 9090 | Prometheus | Metrics collection |
| **Grafana** | 3000 | Grafana | Metrics visualization |
| **Zipkin** | 9411 | Zipkin | Distributed tracing |
| **Jaeger** | 16686 | Jaeger | Distributed tracing (alternative) |
| **Kibana** | 5601 | Kibana | Log visualization |
| **Swagger UI** | 8081/swagger-ui | OpenAPI 3 | API documentation |
| **GraphiQL** | 8084/graphiql | GraphQL | GraphQL IDE |
| **React Frontend** | 5173 | Vite dev server | Web UI |
| **Storybook** | 6006 | Storybook 7 | Component gallery |

---

## 28. TECHNOLOGY COMPARISON CHEAT SHEET

### When to Use What
| Need | Technology | Why |
|---|---|---|
| CRUD API | REST (Spring MVC) | Simple, well-understood, HTTP standard |
| Flexible queries | GraphQL | Client specifies needed fields, no over-fetching |
| Real-time updates | WebSocket (STOMP) | Full-duplex, server push |
| Async communication | Kafka | Durable, replayable, high throughput |
| In-JVM events | ApplicationEvent | Decoupling within a service, no network overhead |
| Primary data store | PostgreSQL | ACID, relational integrity, mature |
| Full-text search | Elasticsearch | Inverted index, fuzzy matching, aggregations |
| Audit logs | MongoDB | Flexible schema, write-optimized |
| Caching | Redis | Distributed, sub-millisecond, TTL |
| API documentation | OpenAPI/Swagger | Industry standard, interactive UI |
| Object mapping | MapStruct | Compile-time, zero runtime overhead |
| Fault tolerance | Resilience4j | Lightweight, functional, Spring Boot integration |
| DB migrations | Flyway | SQL-based, version controlled, simple |
| Containerization | Docker | Portable, reproducible environments |
| Orchestration | Kubernetes | Auto-scaling, self-healing, rolling updates |
| Infrastructure | Terraform | IaC, multi-cloud, state management |
| CI/CD | GitHub Actions | Git-native, free tier, matrix builds |
| Unit testing | JUnit 5 + Mockito | Standard, rich assertions, mocking |
| Integration testing | Testcontainers | Real databases in tests |
| E2E testing | Playwright | Cross-browser, reliable, auto-wait |
| Component docs | Storybook | Visual testing, isolation, design system |

---

## 29. COMMON MISTAKES & BEST PRACTICES

### Anti-Patterns Avoided in This Project
| Anti-Pattern | What We Do Instead |
|---|---|
| Shared database across services | Each service owns its database |
| Synchronous chains (A→B→C→D) | Async via Kafka where possible |
| Hardcoded URLs | Service discovery via Eureka |
| Monolithic config | Config Server + profiles |
| No circuit breaker | Resilience4j on all inter-service calls |
| Manual mapping | MapStruct (compile-time code generation) |
| System.out.println | SLF4J + @Slf4j + MDC correlation |
| Catch-all exception handler | Specific @ExceptionHandler for each type |
| Field injection everywhere | Constructor injection via @RequiredArgsConstructor |
| No API versioning | URL path versioning (/api/v1/) |
| No database migrations | Flyway versioned migrations |
| Manual testing only | Testing pyramid (unit → slice → integration → E2E) |
| No documentation | OpenAPI/Swagger + GraphiQL + ADRs |

---

## 30. PROJECT MATURITY LEVEL MAPPING

| Level | Skills Demonstrated |
|---|---|
| **JUNIOR** | CRUD REST APIs, JPA entities, Spring Boot basics, SQL |
| **MID** | Design patterns, testing (unit + integration), Docker, security |
| **SENIOR** | Microservices patterns (Saga, Outbox, CQRS), Kafka, Resilience4j, Kubernetes |
| **STAFF** | System design, Terraform, CI/CD, observability, production configs |
| **PRINCIPAL** | ADRs, multi-DB architecture, performance optimization, team-scale infrastructure |
| **DISTINGUISHED** | Cross-cutting concerns (AOP), custom annotations, GraphQL + REST hybrid |
| **ARCHITECT** | Full system design, technology selection rationale, cost optimization, scaling strategy |

**This project demonstrates skills from JUNIOR through ARCHITECT level.**

---

## 31. STUDY ORDER (Recommended Learning Path)

```
Week 1: Java 17 + Spring Boot basics → Employee CRUD
Week 2: JPA deep dive + Flyway → Database layer
Week 3: Security (JWT + RBAC) → Authentication/Authorization
Week 4: Design patterns (Strategy, Template, Builder, Factory)
Week 5: Microservices patterns (Saga, Outbox, CQRS, ACL)
Week 6: Kafka + Resilience4j + Redis caching
Week 7: Docker + Kubernetes + Helm + CI/CD
Week 8: Terraform + Observability + GraphQL + Advanced SQL
```

---

## 32. QUICK COMMAND REFERENCE

```bash
# Start everything
docker-compose up -d

# Individual services
cd employee-microservice && mvn spring-boot:run -Dspring-boot.run.profiles=dev
cd payroll-microservice && mvn spring-boot:run
cd notification-microservice && mvn spring-boot:run

# Build all
mvn clean package -DskipTests

# Run tests
mvn test                           # Unit tests
mvn verify                         # Unit + Integration tests
mvn test -pl employee-microservice # Single service tests

# Docker
docker build -t employee-service:latest ./employee-microservice
docker-compose logs -f employee-service

# Kubernetes
kubectl apply -k k8s/overlays/dev/
kubectl get pods -n microservices
kubectl logs -f deployment/employee-service -n microservices
helm install myapp ./helm -f helm/values-dev.yaml

# Terraform
cd terraform && terraform init && terraform plan && terraform apply

# API Testing
curl http://localhost:8080/api/v1/employees              # Via Gateway
curl http://localhost:8081/api/v1/employees              # Direct
curl http://localhost:8084/graphql -X POST -H "Content-Type: application/json" \
  -d '{"query":"{ notifications(recipientId: \"user1\") { id title } }"}'

# Monitoring
open http://localhost:9090        # Prometheus
open http://localhost:3000        # Grafana
open http://localhost:9411        # Zipkin
open http://localhost:5601        # Kibana
open http://localhost:8081/swagger-ui.html  # Swagger
open http://localhost:8084/graphiql         # GraphQL IDE
```

---

**END OF COMPLETE PROJECT REFERENCE & INTERVIEW GUIDE**

> **Total Coverage:** 129 annotations · 16+ design patterns · 65+ interview Q&A · 22+ services · 8 communication mechanisms · Full-stack (Java + React + DevOps + Cloud)
> **Files:** This document is Part 4 of 4. See Parts 1-3 for detailed coverage.
