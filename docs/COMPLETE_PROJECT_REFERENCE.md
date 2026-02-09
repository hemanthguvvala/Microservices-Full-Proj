# COMPLETE PROJECT REFERENCE & INTERVIEW GUIDE

> **Project:** Full-Stack Microservices Platform (Employee + Payroll + Notification)
> **Stack:** Java 17 · Spring Boot 3.2 · Spring Cloud 2023.0 · React 18 · TypeScript · PostgreSQL · MongoDB · Elasticsearch · Redis · Kafka · Docker · Kubernetes · Terraform · AWS
> **Scale:** 6 Microservices · 162 Java Files · 42 Frontend Files · 129 Unique Annotations · 16+ Design Patterns · 20+ Services

---

# PART 1: CORE JAVA & SPRING BOOT — EVERY ANNOTATION, CONCEPT & INTERVIEW Q&A

---

## 1. JAVA 17 FEATURES USED IN THIS PROJECT

### 1.1 Records (Java 16+)
**What:** Immutable data carriers — compiler auto-generates `equals()`, `hashCode()`, `toString()`, getters, and constructor.
**Why:** Eliminates boilerplate for DTOs/value objects. Replaces classes with 50+ lines of getters/setters.

**Used in:** `notification-microservice`
```java
// notification-microservice/src/main/java/com/example/notification/dto/NotificationRequest.java
public record NotificationRequest(
    @NotBlank String recipientId,
    @NotBlank String title,
    @NotBlank String message,
    @NotNull ChannelType channelType,
    Priority priority,
    String templateName
) {}
```

**Interview Q&A:**
- **Q: What is a Java Record?**
  A: A Record is a special class introduced in Java 16 that provides a compact syntax for declaring classes that are transparent holders for shallowly immutable data. The compiler generates constructor, getters, equals(), hashCode(), and toString().

- **Q: Can Records implement interfaces?**
  A: Yes, records can implement interfaces but cannot extend other classes (they implicitly extend java.lang.Record).

- **Q: Can Records have additional methods?**
  A: Yes, you can add custom methods, static methods, and compact constructors for validation.

- **Q: Are Records truly immutable?**
  A: Records are shallowly immutable — the fields themselves are final, but if a field holds a mutable object (like a List), that object can still be modified.

- **Q: Can you use Records with JPA?**
  A: Records cannot be JPA entities (entities need no-arg constructors and mutable fields) but are perfect for DTOs, projections, and value objects.

---

### 1.2 Sealed Classes (Java 17)
**What:** Restricts which classes can extend/implement a class/interface. Enables exhaustive pattern matching.
**Why:** Type-safe hierarchies — compiler enforces all subtypes are known at compile time.

**Used in:** `notification-microservice`
```java
// notification-microservice/src/main/java/com/example/notification/dto/NotificationResult.java
public sealed interface NotificationResult permits
    NotificationResult.Success,
    NotificationResult.Failure,
    NotificationResult.Pending {

    record Success(String notificationId, String channel) implements NotificationResult {}
    record Failure(String reason, String channel) implements NotificationResult {}
    record Pending(String notificationId, String reason) implements NotificationResult {}
}
```

**Interview Q&A:**
- **Q: What are Sealed Classes?**
  A: Sealed classes restrict which other classes may extend them using the `permits` keyword. This gives developers explicit control over inheritance hierarchies.

- **Q: What's the difference between sealed, final, and non-sealed?**
  A: `final` = no subclasses; `sealed` = only permitted subclasses; `non-sealed` = open for any subclass (used to break the seal in a hierarchy).

- **Q: Why use Sealed Classes with Records?**
  A: Combining sealed interfaces with records creates algebraic data types — exhaustive, type-safe result types (like Success/Failure/Pending in our notification microservice).

- **Q: How do sealed classes help with pattern matching?**
  A: The compiler knows all possible subtypes, so switch expressions can verify exhaustiveness at compile time.

---

### 1.3 Text Blocks (Java 15+)
**What:** Multi-line string literals using `"""` triple quotes.
**Used in:** GraphQL schema strings, SQL queries, JSON templates across the project.

### 1.4 Pattern Matching for instanceof (Java 16+)
**What:** Eliminates explicit casting after instanceof checks.
```java
// Before
if (obj instanceof String) {
    String s = (String) obj;
}
// After (Java 16+)
if (obj instanceof String s) {
    // use s directly
}
```

### 1.5 Switch Expressions (Java 14+)
**What:** Switch as an expression returning a value, using arrow syntax.
```java
String label = switch (status) {
    case SENT -> "Delivered";
    case FAILED -> "Error";
    case PENDING -> "Waiting";
};
```

---

## 2. EVERY SPRING ANNOTATION USED — COMPLETE REFERENCE

### 2.1 Spring Core Annotations

#### `@SpringBootApplication`
**What:** Meta-annotation combining `@Configuration` + `@EnableAutoConfiguration` + `@ComponentScan`.
**Why:** Entry point for every Spring Boot application.
**Used in:** All 6 microservices — `EmployeeServiceApplication`, `PayrollServiceApplication`, `NotificationApplication`, `ApiGatewayApplication`, `EurekaServerApplication`, `ConfigServerApplication`
```java
@SpringBootApplication
@EnableDiscoveryClient
@EnableFeignClients
public class EmployeeServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(EmployeeServiceApplication.class, args);
    }
}
```
**Interview Q&A:**
- **Q: What does @SpringBootApplication do internally?**
  A: It combines three annotations: `@Configuration` (marks class as source of bean definitions), `@EnableAutoConfiguration` (Spring Boot auto-configures based on classpath), `@ComponentScan` (scans for @Component, @Service, @Repository, @Controller in the package and sub-packages).

---

#### `@Configuration`
**What:** Marks a class as a source of bean definitions (replaces XML config).
**Why:** Java-based configuration — type-safe, refactorable, testable.
**Used in:** 19 files — `GatewayConfig`, `BatchConfiguration`, `AsyncConfig`, `AuditConfig`, `DataSourceConfig`, `SecurityConfig`, `RedisConfig`, `KafkaConfig`, `WebSocketConfig`, `OpenApiConfig`, `CacheConfig`, `RateLimitConfig`, etc.
```java
@Configuration
public class KafkaConfig {
    @Bean
    public NewTopic employeeTopic() {
        return TopicBuilder.name("employee-events").partitions(3).replicas(1).build();
    }
}
```
**Interview Q&A:**
- **Q: Difference between @Configuration and @Component?**
  A: `@Configuration` uses CGLIB proxying — calling a @Bean method from another @Bean method returns the SAME singleton instance. `@Component` creates a new instance each time (lite mode). Use @Configuration for inter-bean dependencies.

---

#### `@Bean`
**What:** Declares a method's return value as a Spring-managed bean.
**Why:** Explicit bean creation when you need custom initialization, third-party library beans, or conditional logic.
**Used in:** 38 beans across 17 files.
```java
@Bean
public ThreadPoolTaskExecutor asyncExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(5);
    executor.setMaxPoolSize(10);
    executor.setQueueCapacity(25);
    executor.setThreadNamePrefix("async-");
    executor.initialize();
    return executor;
}
```
**Interview Q&A:**
- **Q: What's the default scope of a @Bean?**
  A: Singleton — one instance per Spring container. Other scopes: prototype, request, session, application.

- **Q: Can @Bean methods be in @Component classes?**
  A: Yes, but they run in "lite mode" — no CGLIB proxying, so inter-bean references create new instances.

---

#### `@Component`
**What:** Generic stereotype annotation — marks a class for auto-detection by component scanning.
**Why:** Spring creates and manages the instance (IoC/DI).
**Used in:** 29 files — `LoggingFilter`, `LegacyPayrollSystemAdapter`, Aspects, `DataInitializer`, Filters, Health Indicators.
```java
@Component
@Slf4j
public class LoggingFilter implements GlobalFilter, Ordered {
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        log.info("Request: {} {}", exchange.getRequest().getMethod(), exchange.getRequest().getURI());
        return chain.filter(exchange);
    }
}
```

---

#### `@Service`
**What:** Specialization of `@Component` for service layer classes.
**Why:** Semantic clarity — indicates business logic. No functional difference from @Component, but enables AOP pointcuts targeting service layer.
**Used in:** 18 files — `EmployeeService`, `PayrollService`, `NotificationServiceImpl`, `OutboxService`, `MetricsService`, `KafkaConsumerService`, `KafkaProducerService`, etc.
```java
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class EmployeeService {
    private final EmployeeRepository employeeRepository;
    private final EmployeeMapper employeeMapper;
    // ...
}
```

---

#### `@Repository`
**What:** Specialization of `@Component` for data access classes.
**Why:** Enables automatic exception translation — converts JDBC/JPA exceptions to Spring's `DataAccessException` hierarchy.
**Used in:** 11 files — `EmployeeRepository`, `OutboxEventRepository`, `AuditLogRepository`, `RoleRepository`, `NotificationRepository`, `PayrollRepository`, etc.
```java
@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long>, JpaSpecificationExecutor<Employee> {
    Optional<Employee> findByEmail(String email);
    List<Employee> findByDepartment(String department);
    Page<Employee> findByStatus(EmployeeStatus status, Pageable pageable);
}
```

**Interview Q&A:**
- **Q: What's the purpose of @Repository's exception translation?**
  A: It wraps technology-specific exceptions (like Hibernate's `ConstraintViolationException`) into Spring's `DataAccessException` hierarchy, making your service layer independent of the persistence technology.

---

#### `@Controller` vs `@RestController`
**What:** `@Controller` = MVC controller returning views. `@RestController` = `@Controller` + `@ResponseBody` (every method returns data, not a view).
**Why:** REST APIs always return JSON/XML data, never views.
**Used in:**
- `@Controller` → 1 file: `NotificationGraphQLController` (GraphQL uses its own annotations, not @ResponseBody)
- `@RestController` → 8 files: `AuthController`, `EmployeeController`, `MetricsController`, `SagaController`, `SearchController`, `NotificationController`, `FileController`, `PayrollController`
```java
@RestController
@RequestMapping("/api/v1/employees")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Employee Management", description = "CRUD operations for employees")
public class EmployeeController {
    private final EmployeeService employeeService;
    // ...
}
```

---

#### `@RestControllerAdvice`
**What:** Global exception handler for all REST controllers. Combines `@ControllerAdvice` + `@ResponseBody`.
**Why:** Centralized error handling — single place to handle all exceptions across controllers.
**Used in:** 3 files — `GlobalExceptionHandler` in employee, notification, payroll microservices.
```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleNotFound(ResourceNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Resource Not Found");
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }
}
```

**Interview Q&A:**
- **Q: What is RFC 7807 ProblemDetail?**
  A: It's a standard format for HTTP API error responses (Spring 6+). Includes: `type`, `title`, `status`, `detail`, `instance`, and custom properties. Our project uses it in all 3 microservices.

---

#### `@Autowired`
**What:** Injects dependencies automatically by type.
**Why:** Dependency Injection — core of Spring's IoC container.
**Used in:** 30 occurrences across 13 files.
```java
@Autowired
private EmployeeRepository employeeRepository;
```
**Best Practice:** Prefer constructor injection with `@RequiredArgsConstructor` (Lombok) — immutable, testable, no reflection.

**Interview Q&A:**
- **Q: Constructor vs Field vs Setter injection?**
  A: Constructor injection (recommended) — ensures required dependencies, supports immutability, no reflection needed. Field injection (@Autowired on fields) — convenient but harder to test. Setter injection — optional dependencies.

---

#### `@Qualifier`
**What:** Disambiguates when multiple beans of the same type exist.
**Used in:** `DataSourceConfig` — choosing between master/replica datasources.
```java
@Bean
@Qualifier("masterDataSource")
public DataSource masterDataSource() { ... }
```

#### `@Primary`
**What:** Marks a bean as the default when multiple candidates exist.
**Used in:** `DataSourceConfig` — master datasource is primary.

#### `@Value`
**What:** Injects values from properties/YAML files or environment variables.
**Used in:** 12 occurrences in 8 files.
```java
@Value("${jwt.secret}")
private String jwtSecret;

@Value("${jwt.expiration:86400000}")
private long jwtExpiration;
```

**Interview Q&A:**
- **Q: @Value vs @ConfigurationProperties?**
  A: `@Value` injects individual values. `@ConfigurationProperties` binds a prefix to a POJO — type-safe, validated, better for groups of related properties.

---

#### `@Profile`
**What:** Activates a bean only when a specific Spring profile is active.
**Why:** Different implementations for different environments (dev/test/prod).
**Used in:** 4 files — `CacheConfig`, notification strategies.
```java
@Service
@Profile("email")
public class EmailNotificationStrategy implements NotificationStrategy {
    @Override
    public NotificationResult send(Notification notification) {
        // Email sending logic
    }
}
```

**Interview Q&A:**
- **Q: How do you activate profiles?**
  A: `spring.profiles.active=dev` in application.properties, `SPRING_PROFILES_ACTIVE` env var, JVM arg `-Dspring.profiles.active=dev`, or programmatically.

---

#### `@ConditionalOnProperty`
**What:** Creates a bean only if a specific property has a certain value.
**Why:** Feature toggles — enable/disable features without code changes.
**Used in:** `InAppNotificationStrategy`
```java
@Service
@ConditionalOnProperty(name = "notification.channel.in-app.enabled", havingValue = "true", matchIfMissing = true)
public class InAppNotificationStrategy implements NotificationStrategy { ... }
```

#### `@ConditionalOnBean`
**What:** Creates a bean only if another bean exists in the context.
**Used in:** `KafkaHealthIndicator` — only registers if KafkaTemplate exists.

---

#### `@PostConstruct`
**What:** Method runs once after dependency injection is complete.
**Used in:** `JwtTokenProvider` — initializes the signing key.
```java
@PostConstruct
protected void init() {
    secretKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
}
```

#### `@Order`
**What:** Defines bean/filter execution order (lower = earlier).
**Used in:** `CorrelationIdFilter` (order 1), `RateLimitConfig` (order configuration).

#### `@Deprecated`
**What:** Marks code as obsolete — compiler generates warnings.
**Used in:** `EmployeeManualMapper` — deprecated in favor of MapStruct.

---

### 2.2 Spring Web / MVC Annotations

#### `@RequestMapping`
**What:** Maps HTTP requests to handler methods. Base path for a controller.
**Used in:** All 8 REST controllers.
```java
@RequestMapping("/api/v1/employees")  // All methods in this controller start with this path
```

#### `@GetMapping` / `@PostMapping` / `@PutMapping` / `@PatchMapping` / `@DeleteMapping`
**What:** Shortcut annotations for specific HTTP methods.
**Used in:** 30 GET + 12 POST + 2 PUT + 2 PATCH + 5 DELETE across all controllers.
```java
@GetMapping("/{id}")
public ResponseEntity<EmployeeDTO> getById(@PathVariable Long id) { ... }

@PostMapping
public ResponseEntity<EmployeeDTO> create(@Valid @RequestBody EmployeeCreateDTO dto) { ... }

@PutMapping("/{id}")
public ResponseEntity<EmployeeDTO> update(@PathVariable Long id, @Valid @RequestBody EmployeeUpdateDTO dto) { ... }

@PatchMapping("/{id}/read")
public ResponseEntity<NotificationResponse> markAsRead(@PathVariable Long id) { ... }

@DeleteMapping("/{id}")
public ResponseEntity<Void> delete(@PathVariable Long id) { ... }
```

#### `@RequestParam`
**What:** Extracts query parameters from the URL.
**Used in:** 25 occurrences — search, filtering, pagination.
```java
@GetMapping("/search")
public Page<Employee> search(
    @RequestParam(required = false) String name,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "10") int size
) { ... }
```

#### `@PathVariable`
**What:** Extracts values from URI path segments.
**Used in:** 14 occurrences.
```java
@GetMapping("/{id}")
public ResponseEntity<EmployeeDTO> getById(@PathVariable Long id) { ... }
```

#### `@RequestBody`
**What:** Binds HTTP request body (JSON) to a Java object.
**Used in:** 8 occurrences in POST/PUT methods.

#### `@Valid`
**What:** Triggers Bean Validation on the annotated parameter.
**Used in:** 4 occurrences — triggers @NotBlank, @Email, @Positive etc. on DTOs.

#### `@ExceptionHandler`
**What:** Handles specific exceptions in @ControllerAdvice classes.
**Used in:** 15 handlers across 3 GlobalExceptionHandler classes.
```java
@ExceptionHandler(MethodArgumentNotValidException.class)
public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
    ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
    problem.setTitle("Validation Failed");
    Map<String, String> errors = new HashMap<>();
    ex.getBindingResult().getFieldErrors()
        .forEach(e -> errors.put(e.getField(), e.getDefaultMessage()));
    problem.setProperty("errors", errors);
    return problem;
}
```

**Interview Q&A:**
- **Q: How does Spring resolve which ExceptionHandler to use?**
  A: Spring looks for the most specific handler first (exact exception class), then moves up the hierarchy. @ControllerAdvice handlers are checked after controller-local handlers.

---

### 2.3 Spring Cloud Annotations

#### `@EnableDiscoveryClient`
**What:** Registers the service with a service registry (Eureka).
**Why:** Service discovery — services find each other by name, not hardcoded URLs.
**Used in:** `ApiGatewayApplication`, `EmployeeServiceApplication`, `PayrollServiceApplication`

#### `@EnableEurekaServer`
**What:** Makes a Spring Boot app function as a Eureka service registry.
**Used in:** `EurekaServerApplication`
```java
@SpringBootApplication
@EnableEurekaServer
public class EurekaServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(EurekaServerApplication.class, args);
    }
}
```

#### `@EnableConfigServer`
**What:** Activates Spring Cloud Config Server — serves configuration from Git/filesystem.
**Used in:** `ConfigServerApplication`

#### `@EnableFeignClients`
**What:** Enables Feign declarative HTTP client scanning.
**Used in:** `EmployeeServiceApplication`, `PayrollServiceApplication`

#### `@FeignClient`
**What:** Declares a REST client as an interface — Spring generates the HTTP call implementation.
**Why:** Call other microservices like calling a local method — no RestTemplate/WebClient boilerplate.
**Used in:** `PayrollServiceClient`, `EmployeeClient`
```java
@FeignClient(name = "payroll-service", fallback = PayrollServiceFallback.class)
public interface PayrollServiceClient {
    @GetMapping("/api/v1/payroll/employee/{employeeId}")
    PayrollDTO getPayrollByEmployeeId(@PathVariable("employeeId") Long employeeId);

    @PostMapping("/api/v1/payroll")
    PayrollDTO createPayroll(@RequestBody PayrollRequest request);
}
```

**Interview Q&A:**
- **Q: How does Feign integrate with Eureka?**
  A: The `name` in @FeignClient matches the service name in Eureka. Spring Cloud LoadBalancer resolves it to an actual host:port. If the service has multiple instances, it load-balances automatically.

- **Q: What is a Feign fallback?**
  A: A class implementing the Feign interface that provides default responses when the target service is down (used with Circuit Breaker).

---

### 2.4 Spring Security Annotations

#### `@EnableWebSecurity`
**What:** Activates Spring Security's web security configuration.
**Used in:** `SecurityConfig` in employee & payroll microservices.

#### `@EnableMethodSecurity`
**What:** Enables method-level security annotations (@PreAuthorize, @PostAuthorize).
**Used in:** `SecurityConfig` in employee microservice.

**Interview Q&A:**
- **Q: How does JWT auth work in this project?**
  A: 1) User sends credentials to /api/auth/login → 2) Server validates and returns JWT token → 3) Client sends JWT in Authorization header for subsequent requests → 4) JwtAuthenticationFilter extracts and validates the token → 5) SecurityContextHolder is populated with authentication details.

- **Q: What is RBAC?**
  A: Role-Based Access Control. Users have roles (ADMIN, HR, USER), and endpoints require specific roles. In our project: `@PreAuthorize("hasRole('ADMIN')")` restricts access.

---

### 2.5 Spring Data / JPA Annotations (24 unique)

#### `@Entity`
**What:** Marks a class as a JPA entity — mapped to a database table.
**Used in:** 9 entities — `Employee`, `Role`, `User`, `OutboxEvent`, `SagaInstance`, `Notification`, `Payroll`, `PaymentTransaction`, `SalaryComponent`
```java
@Entity
@Table(name = "employees")
@EntityListeners(AuditingEntityListener.class)
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Employee {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    @NotBlank
    private String firstName;

    @Column(nullable = false, unique = true)
    @Email
    private String email;

    @Enumerated(EnumType.STRING)
    private EmployeeStatus status;

    @Version
    private Long version;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
```

#### `@Table`
**What:** Specifies the database table name and constraints.
```java
@Table(name = "users", uniqueConstraints = {
    @UniqueConstraint(columnNames = "username"),
    @UniqueConstraint(columnNames = "email")
})
```

#### `@Id` + `@GeneratedValue`
**What:** `@Id` marks the primary key. `@GeneratedValue` specifies how the PK is generated.
**Strategies:** `IDENTITY` (auto-increment), `SEQUENCE` (DB sequence), `TABLE`, `AUTO`.
**Used in:** All 9 entities + 2 MongoDB documents.

#### `@Column`
**What:** Customizes column mapping — name, nullable, unique, length, precision.
**Used in:** 75 occurrences across 9 entities.
```java
@Column(nullable = false, length = 100)
private String firstName;

@Column(precision = 15, scale = 2)
private BigDecimal salary;
```

#### `@Enumerated`
**What:** Maps Java enum to DB column. `EnumType.STRING` stores enum name, `EnumType.ORDINAL` stores position.
**Used in:** 10 occurrences — `EmployeeStatus`, `EventStatus`, `SagaStatus`, `ChannelType`, `Priority`, `NotificationStatus`, `PaymentStatus`.
```java
@Enumerated(EnumType.STRING)
@Column(nullable = false)
private ChannelType channelType;
```
**Interview Q&A:**
- **Q: Why use EnumType.STRING over ORDINAL?**
  A: STRING is safer — adding/reordering enum constants won't corrupt existing data. ORDINAL stores integer positions which break if you insert a new constant.

#### `@Version`
**What:** Enables optimistic locking — prevents concurrent modifications.
**Used in:** 5 entities — `Employee`, `OutboxEvent`, `SagaInstance`, `Notification`, `Payroll`.
```java
@Version
private Long version;  // JPA auto-increments on update; throws OptimisticLockException on conflict
```

**Interview Q&A:**
- **Q: What is Optimistic vs Pessimistic Locking?**
  A: Optimistic (our project uses): assumes conflicts are rare, checks version at commit time. Pessimistic: locks the row immediately with SELECT FOR UPDATE. Optimistic = better performance, Pessimistic = guaranteed consistency.

#### `@Lock`
**What:** Specifies the lock mode for a query.
**Used in:** `OutboxEventRepository`
```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT o FROM OutboxEvent o WHERE o.status = 'PENDING' ORDER BY o.createdAt")
List<OutboxEvent> findPendingEventsForProcessing();
```

#### `@Query`
**What:** Custom JPQL or native SQL queries on repository methods.
**Used in:** 11 occurrences across 6 repositories.
```java
@Query("SELECT n FROM Notification n WHERE n.recipientId = :recipientId AND n.status = :status")
Page<Notification> findByRecipientAndStatus(@Param("recipientId") String recipientId,
                                             @Param("status") NotificationStatus status,
                                             Pageable pageable);
```

#### `@Modifying`
**What:** Indicates a query modifies data (UPDATE/DELETE). Required with @Query for write operations.
**Used in:** `NotificationRepository`
```java
@Modifying
@Query("UPDATE Notification n SET n.status = 'READ', n.readAt = CURRENT_TIMESTAMP WHERE n.id = :id")
int markAsRead(@Param("id") Long id);
```

#### `@Transactional`
**What:** Wraps a method in a database transaction. Rollbacks on RuntimeException.
**Used in:** 31 occurrences in 10 files.
```java
@Transactional
public EmployeeDTO createEmployee(EmployeeCreateDTO dto) {
    Employee employee = employeeMapper.toEntity(dto);
    Employee saved = employeeRepository.save(employee);
    kafkaProducerService.sendEmployeeEvent("CREATED", saved);
    return employeeMapper.toDTO(saved);
}

@Transactional(readOnly = true)  // Optimization: no dirty checking, can use replica
public EmployeeDTO getEmployee(Long id) { ... }
```

**Interview Q&A:**
- **Q: What does @Transactional(readOnly = true) do?**
  A: Hints to JPA to skip dirty checking (performance boost), allows routing to read replicas, and prevents accidental writes.

- **Q: What's @Transactional propagation?**
  A: REQUIRED (default) = join existing or create new. REQUIRES_NEW = always new. NESTED = savepoint. MANDATORY = must exist. SUPPORTS = optional.

#### `@TransactionalEventListener`
**What:** Executes after the transaction commits (or rollbacks). Safer than @EventListener for transactional contexts.
**Used in:** `NotificationEventListener`
```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
@Async
public void handleNotificationCreated(NotificationCreatedEvent event) {
    // Process after transaction commits successfully
}
```

#### `@PrePersist` / `@PreUpdate`
**What:** JPA lifecycle callbacks — execute before insert/update.
**Used in:** `Payroll` entity.
```java
@PrePersist
public void prePersist() {
    if (this.payPeriodStart != null && this.payPeriodEnd != null) {
        this.createdAt = LocalDateTime.now();
    }
}
```

#### `@EnableJpaAuditing`
**What:** Activates Spring Data JPA auditing — auto-populates @CreatedDate, @CreatedBy, @LastModifiedDate, @LastModifiedBy.
**Used in:** `AuditConfig`, `PayrollServiceApplication`.

#### `@EntityListeners(AuditingEntityListener.class)`
**What:** Registers the auditing listener on an entity.
**Used in:** 6 entities — `Employee`, `User`, `Notification`, `PaymentTransaction`, `Payroll`.

#### `@CreatedDate` / `@LastModifiedDate` / `@CreatedBy` / `@LastModifiedBy`
**What:** Spring Data auditing annotations — auto-set timestamps and user info.
**Used in:** 6 entities (dates), 2 entities (user info).

#### Mapping Annotations: `@ManyToMany`, `@JoinTable`, `@JoinColumn`, `@ElementCollection`, `@CollectionTable`, `@MapKeyColumn`
**Used in:** `User` (ManyToMany with Role), `SagaInstance` (ElementCollection for step data).
```java
@ManyToMany(fetch = FetchType.EAGER)
@JoinTable(name = "user_roles",
    joinColumns = @JoinColumn(name = "user_id"),
    inverseJoinColumns = @JoinColumn(name = "role_id"))
private Set<Role> roles = new HashSet<>();
```

#### `@Index`
**What:** Creates database indexes for query performance.
**Used in:** 12 occurrences across `Notification`, `PaymentTransaction`, `Payroll`, `SalaryComponent`.
```java
@Table(name = "notifications", indexes = {
    @Index(name = "idx_recipient", columnList = "recipientId"),
    @Index(name = "idx_status", columnList = "status"),
    @Index(name = "idx_channel", columnList = "channelType"),
    @Index(name = "idx_created", columnList = "createdDate")
})
```

---

### 2.6 Bean Validation Annotations

| Annotation | Purpose | Example | Used In |
|---|---|---|---|
| `@NotBlank` | String not null/empty/whitespace | `@NotBlank String name` | 29 occurrences in 10 files |
| `@NotNull` | Field must not be null | `@NotNull ChannelType type` | 18 occurrences in 9 files |
| `@Email` | Valid email format | `@Email String email` | 4 files |
| `@Size` | String/collection length bounds | `@Size(min=3, max=20)` | 3 files |
| `@DecimalMin` | Minimum decimal value | `@DecimalMin("0.00")` | 5 files |
| `@Positive` | Must be > 0 | `@Positive BigDecimal salary` | 2 files |
| `@DateTimeFormat` | Date parsing format | `@DateTimeFormat(iso = ISO.DATE)` | 1 file |

**Interview Q&A:**
- **Q: Where does validation happen?**
  A: When @Valid is placed on a @RequestBody parameter, Spring's `MethodArgumentNotValidException` is thrown before the controller method executes. Our `GlobalExceptionHandler` catches it and returns structured errors.

---

### 2.7 Lombok Annotations

#### `@Data`
**What:** Generates `@Getter` + `@Setter` + `@ToString` + `@EqualsAndHashCode` + `@RequiredArgsConstructor`.
**Used in:** 32 files — all DTOs, entities, documents, events.

#### `@Builder`
**What:** Builder pattern — fluent API for object construction.
**Used in:** 28 files.
```java
Employee employee = Employee.builder()
    .firstName("John")
    .lastName("Doe")
    .email("john@example.com")
    .department("Engineering")
    .build();
```

#### `@NoArgsConstructor` / `@AllArgsConstructor`
**What:** Generates no-arg and all-arg constructors. JPA requires no-arg constructor.
**Used in:** 32 files each.

#### `@RequiredArgsConstructor`
**What:** Generates constructor for `final` fields — enables constructor injection without @Autowired.
**Used in:** 26 files — all services, controllers, aspects.
```java
@Service
@RequiredArgsConstructor  // Generates: public EmployeeService(EmployeeRepository repo, ...) { ... }
public class EmployeeService {
    private final EmployeeRepository employeeRepository;  // injected via constructor
    private final EmployeeMapper employeeMapper;           // injected via constructor
}
```

#### `@Slf4j`
**What:** Creates a `private static final Logger log` field using SLF4J.
**Used in:** 57 files — nearly every class.
```java
@Slf4j
public class EmployeeService {
    public void process() {
        log.info("Processing employee...");
        log.debug("Debug details: {}", details);
        log.error("Error occurred", exception);
    }
}
```

**Interview Q&A:**
- **Q: What logging framework does this project use?**
  A: SLF4J (facade) + Logback (implementation). @Slf4j generates the logger. We also use MDC (Mapped Diagnostic Context) for correlation IDs across microservices.

---

### 2.8 Resilience4j Annotations

#### `@CircuitBreaker`
**What:** Breaks the circuit when failure rate exceeds threshold — prevents cascading failures.
**Used in:** 7 occurrences in `EmployeeService`, `EmployeeClient`.
```java
@CircuitBreaker(name = "payrollService", fallbackMethod = "getPayrollFallback")
@Retry(name = "payrollService")
public PayrollDTO getPayrollForEmployee(Long employeeId) {
    return payrollServiceClient.getPayrollByEmployeeId(employeeId);
}

private PayrollDTO getPayrollFallback(Long employeeId, Exception ex) {
    log.warn("Circuit breaker triggered for employee {}: {}", employeeId, ex.getMessage());
    return PayrollDTO.builder().employeeId(employeeId).status("UNAVAILABLE").build();
}
```

**Interview Q&A:**
- **Q: Explain Circuit Breaker states?**
  A: CLOSED (normal) → failure rate exceeds threshold → OPEN (all calls fail-fast) → wait duration expires → HALF_OPEN (limited calls test recovery) → if successful → CLOSED again.

- **Q: What's the difference between Circuit Breaker and Retry?**
  A: Retry re-attempts failed calls immediately. Circuit Breaker stops ALL calls when failure rate is high. They complement each other: Retry handles transient failures, Circuit Breaker prevents overwhelming a failing service.

#### `@Retry`
**What:** Automatically retries failed operations with configurable max attempts and wait duration.
**Used in:** 5 occurrences. Configured in application.yml.

#### `@RateLimiter`
**What:** Limits how many calls can be made in a refresh period.
**Used in:** 6 occurrences in `EmployeeService`.

#### `@Bulkhead`
**What:** Limits concurrent calls — prevents one slow service from consuming all threads.
**Used in:** 2 occurrences in `EmployeeService`.

---

### 2.9 Caching Annotations

#### `@EnableCaching`
**What:** Activates Spring's caching infrastructure (backed by Redis in this project).
**Used in:** 5 files.

#### `@Cacheable`
**What:** Caches method results — subsequent calls with same key return cached value.
**Used in:** 9 occurrences in `EmployeeService`, `NotificationServiceImpl`, `PayrollService`.
```java
@Cacheable(value = "employees", key = "#id")
public EmployeeDTO getEmployee(Long id) {
    return employeeMapper.toDTO(employeeRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Employee not found")));
}
```

#### `@CacheEvict`
**What:** Removes entries from cache after data changes.
**Used in:** 11 occurrences.
```java
@CacheEvict(value = "employees", key = "#id")
public EmployeeDTO updateEmployee(Long id, EmployeeUpdateDTO dto) { ... }

@CacheEvict(value = "employees", allEntries = true)
public void deleteEmployee(Long id) { ... }
```

**Interview Q&A:**
- **Q: What is Cache-Aside pattern?**
  A: Application checks cache first → if miss, query DB → store result in cache → return. @Cacheable implements this automatically.

- **Q: Why Redis for caching?**
  A: Redis is distributed (shared across microservice instances), supports TTL, pub/sub, and data structures. In-memory caches (like Caffeine) only work within a single JVM.

---

### 2.10 Kafka Annotations

#### `@KafkaListener`
**What:** Marks a method as a Kafka consumer — processes messages from a topic.
**Used in:** 3 occurrences in `KafkaConsumerService` (employee + payroll).
```java
@KafkaListener(topics = "${kafka.topic.employee-events}", groupId = "${spring.kafka.consumer.group-id}")
public void consumeEmployeeEvent(
    @Payload String message,
    @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
    @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
    @Header(KafkaHeaders.OFFSET) long offset
) {
    log.info("Received message from topic={}, partition={}, offset={}", topic, partition, offset);
    // Process message
}
```

#### `@Header` / `@Payload`
**What:** Extract Kafka message headers and payload separately.

---

### 2.11 MongoDB / Elasticsearch Annotations

#### `@Document`
**What:** Marks a class as a MongoDB or Elasticsearch document (equivalent of @Entity for NoSQL).
**Used in:** `AuditLog` (MongoDB), `EmployeeSearchDocument` (Elasticsearch).
```java
@Document(indexName = "employees")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class EmployeeSearchDocument {
    @Id
    private String id;
    
    @Field(type = FieldType.Text, analyzer = "standard")
    private String firstName;
    
    @Field(type = FieldType.Keyword)
    private String department;
}
```

---

### 2.12 Spring AOP Annotations

#### `@Aspect`
**What:** Declares a class as an aspect — cross-cutting concern handler.
**Used in:** 3 aspects — `AuditableAspect`, `LoggingAspect`, `PerformanceAspect`.

#### `@Around` / `@Before` / `@AfterThrowing`
**What:** Advice types — when the aspect code executes relative to the target method.
```java
@Aspect
@Component
@Slf4j
public class PerformanceAspect {
    @Around("@annotation(com.example.employee.annotation.Auditable)")
    public Object measurePerformance(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        Object result = joinPoint.proceed();
        long duration = System.currentTimeMillis() - start;
        log.info("Method {} executed in {}ms", joinPoint.getSignature().getName(), duration);
        return result;
    }
}
```

#### `@Pointcut`
**What:** Defines reusable pointcut expressions.
**Used in:** 7 pointcuts in `LoggingAspect`, `PerformanceAspect`.
```java
@Pointcut("within(com.example.employee.service..*)")
public void serviceLayer() {}

@Pointcut("within(com.example.employee.controller..*)")
public void controllerLayer() {}
```

**Interview Q&A:**
- **Q: What is AOP (Aspect-Oriented Programming)?**
  A: AOP modularizes cross-cutting concerns (logging, security, transactions, auditing) that cut across multiple classes. Instead of repeating code in every class, you define it once in an aspect.

- **Q: Name the 5 AOP advice types?**
  A: @Before (before method), @After (after method), @AfterReturning (after successful return), @AfterThrowing (after exception), @Around (wraps the entire method — most powerful).

---

### 2.13 Async & Scheduling Annotations

#### `@EnableAsync`
**What:** Enables async method execution with thread pools.
**Used in:** 5 files.

#### `@Async`
**What:** Method runs in a separate thread from the caller.
**Used in:** 7 occurrences — `AsyncEmployeeService`, `AuditLogService`, `NotificationEventListener`.
```java
@Async("asyncExecutor")
public CompletableFuture<List<EmployeeDTO>> searchEmployeesAsync(String query) {
    // Runs in thread pool, caller doesn't block
    return CompletableFuture.completedFuture(results);
}
```

#### `@EnableScheduling`
**What:** Enables Spring's scheduled task execution.

#### `@Scheduled`
**What:** Executes a method at fixed intervals or cron expressions.
**Used in:** 8 occurrences in `BatchJobScheduler`, `OutboxEventPublisher`, `NotificationScheduler`.
```java
@Scheduled(fixedRate = 5000)  // Every 5 seconds
public void processOutboxEvents() { ... }

@Scheduled(cron = "0 0 1 * * ?")  // Daily at 1 AM
public void cleanupOldNotifications() { ... }
```

**Interview Q&A:**
- **Q: @Async vs CompletableFuture?**
  A: @Async is Spring-specific and delegates to a thread pool. CompletableFuture is Java's native async API. @Async methods can return CompletableFuture. In our project, the async executor has core=5, max=10, queue=25 threads.

---

### 2.14 WebSocket Annotation

#### `@EnableWebSocketMessageBroker`
**What:** Enables WebSocket message handling with STOMP protocol.
**Used in:** `WebSocketConfig` in employee microservice.

---

### 2.15 GraphQL Annotations

#### `@QueryMapping`
**What:** Maps a method to a GraphQL query operation.
**Used in:** 4 queries in `NotificationGraphQLController`.
```java
@QueryMapping
public List<NotificationResponse> notifications(@Argument String recipientId) {
    return notificationService.getByRecipient(recipientId);
}
```

#### `@MutationMapping`
**What:** Maps a method to a GraphQL mutation operation.
**Used in:** 4 mutations.
```java
@MutationMapping
public NotificationResponse createNotification(@Argument NotificationRequest request) {
    return notificationService.create(request);
}
```

#### `@Argument`
**What:** Binds a GraphQL argument to a method parameter.
**Used in:** 10 occurrences.

**Interview Q&A:**
- **Q: GraphQL vs REST?**
  A: REST: multiple endpoints, fixed responses, over/under-fetching. GraphQL: single endpoint, client specifies exact fields needed, no over-fetching. Our project uses BOTH — REST for CRUD, GraphQL for flexible queries.

---

### 2.16 OpenAPI / Swagger Annotations

#### `@Operation`
**What:** Describes an API operation — summary, description, responses.
**Used in:** 47 occurrences across 8 controllers.
```java
@Operation(summary = "Get employee by ID", description = "Retrieves an employee's full details")
@ApiResponses({
    @ApiResponse(responseCode = "200", description = "Employee found"),
    @ApiResponse(responseCode = "404", description = "Employee not found")
})
@GetMapping("/{id}")
public ResponseEntity<EmployeeDTO> getById(@PathVariable Long id) { ... }
```

#### `@Tag`
**What:** Groups API operations under a named tag in Swagger UI.
**Used in:** 8 controllers.

#### `@Parameter`
**What:** Describes a parameter in the API documentation.
**Used in:** 12 occurrences in `EmployeeController`.

---

### 2.17 MapStruct Annotations

#### `@Mapper`
**What:** Marks an interface as a MapStruct mapper — generates implementation at compile time.
**Used in:** `EmployeeMapper`.
```java
@Mapper(componentModel = "spring")
public interface EmployeeMapper {
    @Mapping(source = "firstName", target = "firstName")
    @Mapping(source = "lastName", target = "lastName")
    @Mapping(target = "id", ignore = true)
    Employee toEntity(EmployeeCreateDTO dto);

    EmployeeDTO toDTO(Employee employee);
    List<EmployeeDTO> toDTOList(List<Employee> employees);
}
```

#### `@Mapping`
**What:** Customizes field mapping — rename, ignore, convert, use expression.
**Used in:** 13 mappings.

**Interview Q&A:**
- **Q: MapStruct vs ModelMapper vs manual mapping?**
  A: MapStruct generates code at compile time — zero runtime overhead, type-safe, produces readable code. ModelMapper uses reflection (slower). Manual mapping is error-prone. MapStruct is the MNC industry standard.

---

### 2.18 Custom Annotations

#### `@Auditable`
**What:** Custom annotation that triggers AOP-based auditing.
**Defined in:** `employee-microservice/src/main/java/com/example/employee/annotation/Auditable.java`
```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Auditable {
    String action() default "";
}
```
**Used in:** `EmployeeController` — `@Auditable(action = "CREATE_EMPLOYEE")` on critical endpoints.

**Interview Q&A:**
- **Q: How do you create a custom annotation?**
  A: 1) Define annotation with @Target and @Retention. 2) Create an @Aspect with @Around/@Before targeting the annotation. 3) Extract annotation values using reflection in the aspect.

---

### 2.19 Test Annotations (Complete Reference)

| Annotation | Purpose | Used In |
|---|---|---|
| `@Test` | Marks a test method | All 13 test classes |
| `@BeforeEach` | Runs before each test | 10 test classes |
| `@DisplayName` | Human-readable test name | 10 test classes |
| `@Nested` | Groups related tests as inner class | NotificationServiceImplTest |
| `@ExtendWith(MockitoExtension.class)` | Enables Mockito annotations | 3 unit test classes |
| `@SpringBootTest` | Full Spring context integration test | 2 integration tests |
| `@WebMvcTest` | Slice test — only MVC layer | 3 controller tests |
| `@DataJpaTest` | Slice test — only JPA layer | 3 repository tests |
| `@GraphQlTest` | Slice test — only GraphQL layer | 1 GraphQL test |
| `@AutoConfigureMockMvc` | Auto-configures MockMvc | 2 integration tests |
| `@AutoConfigureTestDatabase` | Controls test database behavior | 1 Testcontainers test |
| `@ActiveProfiles("test")` | Activates test profile | 5 test classes |
| `@TestMethodOrder` | Orders test execution | 1 integration test |
| `@Mock` | Creates Mockito mock object | 7 test classes |
| `@MockBean` | Creates mock in Spring context | 4 test classes |
| `@InjectMocks` | Injects mocks into the class under test | 3 test classes |
| `@Testcontainers` | Enables Testcontainers JUnit extension | 1 integration test |
| `@Container` | Manages container lifecycle | 1 integration test |
| `@DynamicPropertySource` | Injects container properties into Spring context | 1 integration test |

**Interview Q&A:**
- **Q: @Mock vs @MockBean?**
  A: `@Mock` (Mockito) = plain mock, no Spring context. `@MockBean` (Spring) = replaces a bean in the Spring ApplicationContext with a mock. Use @Mock for unit tests, @MockBean for slice/integration tests.

- **Q: What is @DataJpaTest?**
  A: Slice test that only loads JPA-related beans (repositories, EntityManager). Uses embedded DB by default. Much faster than @SpringBootTest.

- **Q: What are Testcontainers?**
  A: Library that spins up real Docker containers (PostgreSQL, Redis, Kafka) during tests. Our project uses it for integration tests with a real PostgreSQL database.

---

## 3. SPRING BOOT CONFIGURATION CONCEPTS

### 3.1 Application Properties vs YAML
**Properties format:** `employee-microservice/src/main/resources/application.properties`
**YAML format:** `payroll-microservice/src/main/resources/application.yml`, `notification-microservice/src/main/resources/application.yml`

### 3.2 Profile-Specific Configuration
```
application.properties          → default config (all profiles)
application-dev.properties      → dev overrides (H2, debug logging)
application-test.properties     → test overrides (embedded DB)
application-prod.properties     → production overrides (real DBs, less logging)
```
**Activation:** `spring.profiles.active=dev` or `SPRING_PROFILES_ACTIVE=prod`

### 3.3 Key Configuration Categories in This Project
| Category | Properties |
|---|---|
| **Server** | `server.port`, `server.servlet.context-path` |
| **Database** | `spring.datasource.url`, `spring.jpa.hibernate.ddl-auto` |
| **JPA** | `spring.jpa.show-sql`, `spring.jpa.properties.hibernate.format_sql` |
| **Flyway** | `spring.flyway.enabled`, `spring.flyway.locations` |
| **Redis** | `spring.data.redis.host`, `spring.data.redis.port` |
| **Kafka** | `spring.kafka.bootstrap-servers`, `spring.kafka.consumer.group-id` |
| **Eureka** | `eureka.client.service-url.defaultZone`, `eureka.instance.prefer-ip-address` |
| **Actuator** | `management.endpoints.web.exposure.include`, `management.endpoint.health.show-details` |
| **Resilience4j** | `resilience4j.circuitbreaker.instances.*.slidingWindowSize` |
| **Security** | `jwt.secret`, `jwt.expiration` |
| **GraphQL** | `spring.graphql.graphiql.enabled`, `spring.graphql.schema.locations` |
| **Logging** | `logging.level.root`, `logging.pattern.console` |

---

## 4. SPRING BOOT ACTUATOR ENDPOINTS

| Endpoint | Purpose | Used For |
|---|---|---|
| `/actuator/health` | Application health status | K8s liveness/readiness probes, monitoring |
| `/actuator/metrics` | Application metrics (JVM, HTTP, custom) | Prometheus scraping |
| `/actuator/prometheus` | Prometheus-format metrics | Grafana dashboards |
| `/actuator/info` | Application info (version, git) | Service identification |
| `/actuator/env` | Environment properties | Debugging configuration |
| `/actuator/loggers` | View/change log levels at runtime | Production debugging |
| `/actuator/beans` | All Spring beans | Debugging bean wiring |
| `/actuator/mappings` | All request mappings | API discovery |

**Interview Q&A:**
- **Q: How do you secure Actuator endpoints in production?**
  A: Expose only `/health` and `/prometheus` publicly. Secure others behind authentication. In our project: `management.endpoints.web.exposure.include=health,metrics,prometheus,info`.

---

## 5. DEPENDENCY INJECTION DEEP DIVE

### 5.1 Types of Injection in This Project
```java
// 1. Constructor Injection (RECOMMENDED — used in 26+ files)
@Service
@RequiredArgsConstructor
public class EmployeeService {
    private final EmployeeRepository repository;  // Injected
}

// 2. Field Injection (used where unavoidable — 30 occurrences)
@Autowired
private EmployeeRepository repository;

// 3. Method/Setter Injection (rare — used in configs)
@Autowired
public void setEncoder(PasswordEncoder encoder) { ... }
```

### 5.2 Bean Scopes
| Scope | Description | Used In Project |
|---|---|---|
| **singleton** | One instance per container (DEFAULT) | All @Service, @Repository, @Component |
| **prototype** | New instance each time | Not used |
| **request** | One per HTTP request | Not used directly (Spring Security context is per-request) |
| **session** | One per HTTP session | Not used (stateless JWT auth) |

**Interview Q&A:**
- **Q: Why is singleton the default scope?**
  A: Performance — avoids creating objects repeatedly. Thread safety is the developer's responsibility (use immutable fields + local variables). Our services are stateless, so singleton is safe.

---
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
# PART 3: INFRASTRUCTURE, CLOUD, DEVOPS, FRONTEND & SQL

---

## 16. DOCKER & CONTAINERIZATION

### 16.1 Dockerfile Structure (Used in All 6 Microservices)
```dockerfile
# Multi-stage build — smaller final image
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B          # Cache dependencies
COPY src ./src
RUN mvn clean package -DskipTests -B      # Build JAR

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**Interview Q&A:**
- **Q: Why multi-stage Docker builds?**
  A: Stage 1 (build) has Maven + JDK — large (~800MB). Stage 2 (runtime) has only JRE — small (~200MB). Final image doesn't contain source code or build tools. Smaller images = faster deployments, less attack surface.

- **Q: Docker image layers and caching?**
  A: Each Dockerfile instruction creates a layer. Docker caches layers — if a layer hasn't changed, Docker reuses the cached version. That's why we COPY pom.xml first (dependencies change rarely) → cache hit. Source code changes frequently → only the last layers rebuild.

- **Q: Alpine vs Ubuntu base images?**
  A: Alpine = ~5MB, minimal, BusyBox-based. Ubuntu = ~70MB. Alpine is smaller but may have compatibility issues with some native libraries. We use Alpine for minimal footprint.

---

### 16.2 Docker Compose (20+ Services)
```yaml
# docker-compose.yml — Full local development stack
services:
  # === Application Services ===
  employee-service:
    build: ./employee-microservice
    ports: ["8081:8081"]
    depends_on: [postgres-master, redis, kafka, eureka-server]
    environment:
      SPRING_PROFILES_ACTIVE: dev
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres-master:5432/employeedb

  payroll-service:
    build: ./payroll-microservice
    ports: ["8083:8083"]
    depends_on: [postgres-master, redis, kafka, eureka-server]

  notification-service:
    build: ./notification-microservice
    ports: ["8084:8084"]
    depends_on: [postgres-master, redis, kafka, eureka-server]

  api-gateway:
    build: ./api-gateway-service
    ports: ["8080:8080"]
    depends_on: [eureka-server]

  eureka-server:
    build: ./eureka-discovery-server
    ports: ["8761:8761"]

  config-server:
    build: ./config-server
    ports: ["8888:8888"]

  # === Data Layer ===
  postgres-master:
    image: postgres:15-alpine
    ports: ["5432:5432"]
    volumes: [postgres-data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s

  postgres-replica:
    image: postgres:15-alpine
    ports: ["5433:5432"]
    depends_on: [postgres-master]

  mongodb:
    image: mongo:7
    ports: ["27017:27017"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  elasticsearch:
    image: elasticsearch:8.11.0
    ports: ["9200:9200"]
    environment:
      discovery.type: single-node
      xpack.security.enabled: "false"

  # === Messaging ===
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    ports: ["2181:2181"]

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    ports: ["9092:9092"]
    depends_on: [zookeeper]

  # === Monitoring ===
  prometheus:
    image: prom/prometheus
    ports: ["9090:9090"]
    volumes: [./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml]

  grafana:
    image: grafana/grafana
    ports: ["3000:3000"]

  zipkin:
    image: openzipkin/zipkin
    ports: ["9411:9411"]

  jaeger:
    image: jaegertracing/all-in-one
    ports: ["16686:16686"]

  logstash:
    image: logstash:8.11.0

  kibana:
    image: kibana:8.11.0
    ports: ["5601:5601"]
```

**Interview Q&A:**
- **Q: Docker Compose vs Kubernetes?**
  A: Docker Compose = single machine, development/testing. Kubernetes = multi-machine cluster, production. Compose is simpler (docker-compose up), K8s has auto-scaling, self-healing, rolling updates.

- **Q: What is depends_on vs healthcheck?**
  A: `depends_on` only waits for container to start, not for the app to be ready. `healthcheck` with `condition: service_healthy` waits until the health check passes.

---

## 17. KUBERNETES & CONTAINER ORCHESTRATION

### 17.1 K8s Manifests (16 files)
```
k8s/
├── base/
│   ├── namespace.yaml
│   ├── employee-deployment.yaml
│   ├── employee-service.yaml
│   ├── payroll-deployment.yaml
│   ├── payroll-service.yaml
│   ├── gateway-deployment.yaml
│   ├── gateway-service.yaml
│   ├── eureka-deployment.yaml
│   ├── eureka-service.yaml
│   ├── postgres-statefulset.yaml
│   ├── postgres-service.yaml
│   ├── redis-deployment.yaml
│   ├── redis-service.yaml
│   ├── kafka-statefulset.yaml
│   └── configmap.yaml
├── overlays/
│   ├── dev/
│   └── prod/
└── kustomization.yaml
```

### 17.2 Key K8s Concepts Used

#### Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: employee-service
  namespace: microservices
spec:
  replicas: 3
  selector:
    matchLabels:
      app: employee-service
  template:
    metadata:
      labels:
        app: employee-service
    spec:
      containers:
        - name: employee-service
          image: employee-service:latest
          ports:
            - containerPort: 8081
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "500m"
              memory: "1Gi"
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8081
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8081
            initialDelaySeconds: 60
            periodSeconds: 15
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "prod"
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
```

#### StatefulSet (for databases)
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  template:
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

**Interview Q&A:**
- **Q: Deployment vs StatefulSet?**
  A: Deployment = stateless apps (any pod can handle any request). StatefulSet = stateful apps (databases) — stable network identity, ordered deployment, persistent volumes.

- **Q: What are resource requests vs limits?**
  A: Requests = guaranteed minimum resources (used for scheduling). Limits = maximum resources (OOMKilled if exceeded). Requests ≤ Limits.

- **Q: What is a readiness vs liveness probe?**
  A: Readiness = "can this pod serve traffic?" (fails → removed from Service). Liveness = "is this pod alive?" (fails → pod restarted). Our project uses Spring Actuator health endpoints.

- **Q: What is Kustomize?**
  A: Template-free customization of K8s manifests. Base manifests + overlays for different environments (dev, staging, prod). No Helm template syntax needed.

---

### 17.3 Helm Chart
```
helm/
├── Chart.yaml
├── values.yaml
├── values-dev.yaml
├── values-prod.yaml
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── configmap.yaml
    ├── secret.yaml
    ├── hpa.yaml
    └── ingress.yaml
```

**Interview Q&A:**
- **Q: Helm vs Kustomize?**
  A: Helm = templating engine with package management (charts, releases, rollbacks). Kustomize = patch-based overlays (no templates). Helm for complex apps with many config variants; Kustomize for simpler overlay-based customization. Our project has BOTH.

- **Q: What is HPA (Horizontal Pod Autoscaler)?**
  A: Automatically scales pod replicas based on CPU/memory utilization or custom metrics. Example: scale from 2 to 10 pods when CPU > 70%.

---

## 18. AWS CLOUD INFRASTRUCTURE (TERRAFORM)

### 18.1 Terraform Modules (10 files)
```
terraform/
├── main.tf          → Provider config + module calls
├── variables.tf     → Input variables
├── outputs.tf       → Output values
├── terraform.tfvars → Variable values
├── modules/
│   ├── vpc/         → VPC + Subnets + NAT Gateway + Internet Gateway
│   ├── eks/         → EKS Cluster + Node Groups + IAM
│   ├── rds/         → PostgreSQL RDS + Multi-AZ + Encryption
│   ├── elasticache/ → Redis ElastiCache cluster
│   ├── msk/         → Managed Kafka (MSK) cluster
│   ├── ecr/         → Container Registry for Docker images
│   ├── s3/          → S3 Buckets for file storage
│   └── cloudwatch/  → CloudWatch Logs + Alarms + Dashboards
```

### 18.2 Key Terraform Concepts Used

```hcl
# VPC Module
module "vpc" {
  source     = "./modules/vpc"
  cidr_block = "10.0.0.0/16"
  azs        = ["us-east-1a", "us-east-1b", "us-east-1c"]
  
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  single_nat_gateway = false  # One per AZ for HA
}

# EKS Module
module "eks" {
  source          = "./modules/eks"
  cluster_name    = "microservices-cluster"
  cluster_version = "1.28"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  
  node_groups = {
    general = {
      instance_types = ["t3.medium"]
      min_size       = 2
      max_size       = 10
      desired_size   = 3
    }
  }
}

# RDS Module
module "rds" {
  source               = "./modules/rds"
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "db.t3.medium"
  allocated_storage    = 50
  multi_az             = true
  storage_encrypted    = true
  backup_retention     = 7
}
```

**Interview Q&A:**
- **Q: What is Terraform state?**
  A: Terraform tracks the real-world resources it manages in a state file (terraform.tfstate). This maps resources in your config to actual infrastructure. Best practice: store state in S3 with DynamoDB locking.

- **Q: Terraform plan vs apply?**
  A: `plan` = dry run, shows what would change. `apply` = actually create/modify/destroy resources. Always `plan` before `apply` in production.

- **Q: What are Terraform modules?**
  A: Reusable packages of Terraform configuration. Our project has 8 modules — each manages one AWS service. Modules promote reuse, DRY principle, and organization.

- **Q: What is Terraform's lifecycle?**
  A: `init` (download providers/modules) → `plan` (preview changes) → `apply` (execute changes) → `destroy` (tear down).

---

## 19. CI/CD (GITHUB ACTIONS)

### 19.1 Pipeline Structure (3 Pipelines)
```
.github/workflows/
├── employee-service-ci.yml     → Java build + test + Docker + deploy
├── notification-service-ci.yml → Same for notification
└── frontend-ci.yml             → Node build + test + Docker + deploy
```

### 19.2 Java Microservice Pipeline
```yaml
name: Employee Service CI/CD
on:
  push:
    branches: [main, develop]
    paths: ['employee-microservice/**']
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: testdb
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: 'maven'
      
      - name: Build & Test
        run: mvn clean verify -f employee-microservice/pom.xml
      
      - name: Code Coverage
        run: mvn jacoco:report -f employee-microservice/pom.xml
      
      - name: SonarQube Analysis
        run: mvn sonar:sonar -Dsonar.projectKey=employee-service
      
      - name: Build Docker Image
        run: docker build -t employee-service:${{ github.sha }} ./employee-microservice
      
      - name: Push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker push $ECR_REGISTRY/employee-service:${{ github.sha }}
      
      - name: Deploy to EKS
        run: |
          kubectl set image deployment/employee-service employee-service=$ECR_REGISTRY/employee-service:${{ github.sha }}
```

**Interview Q&A:**
- **Q: What is CI vs CD?**
  A: CI (Continuous Integration) = automatically build and test on every push. CD (Continuous Delivery) = automatically deploy to staging. CD (Continuous Deployment) = automatically deploy to production.

- **Q: What is a service container in GitHub Actions?**
  A: A Docker container that runs alongside your job — used for databases, caches, etc. Our pipeline runs PostgreSQL as a service container for integration tests.

---

## 20. FRONTEND — REACT 18 + TYPESCRIPT COMPLETE REFERENCE

### 20.1 Tech Stack
| Technology | Version | Purpose |
|---|---|---|
| React | 18.2 | UI library (component-based) |
| TypeScript | 5.3 | Type safety |
| Vite | 5.0 | Build tool (faster than Webpack) |
| TailwindCSS | 3.x | Utility-first CSS |
| Redux Toolkit | 2.x | Global state management |
| React Query (TanStack) | 5.x | Server state management |
| React Router | 6.x | SPA routing |
| Axios | 1.x | HTTP client |
| MSW (Mock Service Worker) | 2.x | API mocking for tests |
| Storybook | 7.x | Component development & documentation |
| Playwright | 1.x | E2E testing |
| Jest | 29.x | Unit testing |
| React Hook Form | 7.x | Form handling with validation |
| Zod | 3.x | Schema validation |

### 20.2 Project Structure
```
frontend-react/
├── src/
│   ├── api/              → Axios HTTP clients
│   ├── components/       → Reusable UI components
│   │   ├── common/       → Button, Modal, Table, Pagination
│   │   ├── employees/    → Employee-specific components
│   │   └── layout/       → Header, Sidebar, Footer
│   ├── hooks/            → 15 custom hooks
│   ├── pages/            → Route-level components
│   ├── store/            → Redux slices + store config
│   ├── types/            → TypeScript interfaces
│   ├── utils/            → Helpers, formatters, validators
│   ├── mocks/            → MSW handlers
│   ├── App.tsx           → Root component
│   └── main.tsx          → Entry point
├── e2e/                  → Playwright tests
├── .storybook/           → Storybook config
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### 20.3 Key React Patterns Used

#### Custom Hooks (15+)
```typescript
// useEmployees — data fetching with React Query
export function useEmployees(params: EmployeeQueryParams) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: () => employeeApi.getAll(params),
    staleTime: 5 * 60 * 1000,     // Cache for 5 minutes
    placeholderData: keepPreviousData,
  });
}

// useDebounce — delay search input
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// useLocalStorage — persistent state
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
}
```

#### Redux Toolkit
```typescript
// store/employeeSlice.ts
const employeeSlice = createSlice({
  name: 'employees',
  initialState: { selectedId: null, filters: {} },
  reducers: {
    setSelectedEmployee: (state, action) => { state.selectedId = action.payload; },
    setFilters: (state, action) => { state.filters = action.payload; },
    clearFilters: (state) => { state.filters = {}; },
  },
});
```

#### Axios Interceptors
```typescript
// api/axiosConfig.ts
const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**Interview Q&A:**
- **Q: React Query vs Redux for API data?**
  A: React Query = server state (cache, refetch, pagination, optimistic updates). Redux = client state (UI state, user preferences). Don't store API data in Redux — let React Query handle it.

- **Q: What is Vite vs Webpack?**
  A: Vite uses native ES modules for dev (instant start, HMR). Webpack bundles everything (slower start). Vite uses esbuild for pre-bundling (10-100x faster than Webpack).

- **Q: What is MSW (Mock Service Worker)?**
  A: Intercepts HTTP requests at the network level using Service Workers. Tests run against mock APIs without changing application code. Our project uses MSW for unit tests and Storybook.

---

## 21. ADVANCED SQL (4 Files)

### 21.1 Window Functions
```sql
-- Rank employees by salary within each department
SELECT
    first_name, last_name, department, salary,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) as rank,
    DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) as dense_rank,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) as row_num,
    LAG(salary) OVER (PARTITION BY department ORDER BY salary DESC) as prev_salary,
    LEAD(salary) OVER (PARTITION BY department ORDER BY salary DESC) as next_salary,
    SUM(salary) OVER (PARTITION BY department) as dept_total,
    AVG(salary) OVER (PARTITION BY department) as dept_avg
FROM employees;
```

**Interview Q&A:**
- **Q: RANK vs DENSE_RANK vs ROW_NUMBER?**
  A: ROW_NUMBER = unique sequential (1,2,3,4). RANK = ties get same rank, skip (1,2,2,4). DENSE_RANK = ties get same rank, no skip (1,2,2,3).

### 21.2 Common Table Expressions (CTEs)
```sql
-- Recursive CTE: Org hierarchy
WITH RECURSIVE org_tree AS (
    -- Anchor: top-level managers
    SELECT id, first_name, manager_id, 1 as level
    FROM employees WHERE manager_id IS NULL
    
    UNION ALL
    
    -- Recursive: their reports
    SELECT e.id, e.first_name, e.manager_id, t.level + 1
    FROM employees e
    JOIN org_tree t ON e.manager_id = t.id
)
SELECT * FROM org_tree ORDER BY level, first_name;
```

### 21.3 Table Partitioning
```sql
-- Range partition by date
CREATE TABLE payment_transactions (
    id BIGSERIAL,
    amount DECIMAL(15,2),
    transaction_date DATE,
    status VARCHAR(20)
) PARTITION BY RANGE (transaction_date);

CREATE TABLE transactions_2024_q1 PARTITION OF payment_transactions
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE transactions_2024_q2 PARTITION OF payment_transactions
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
```

### 21.4 Triggers & Row-Level Security
```sql
-- Audit trigger
CREATE OR REPLACE FUNCTION audit_employee_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO employee_audit_log (employee_id, action, old_data, new_data, changed_at)
    VALUES (COALESCE(NEW.id, OLD.id), TG_OP, row_to_json(OLD), row_to_json(NEW), NOW());
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employee_audit
AFTER INSERT OR UPDATE OR DELETE ON employees
FOR EACH ROW EXECUTE FUNCTION audit_employee_changes();

-- Row-Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_access ON employees
    USING (department = current_setting('app.current_department'));
```

**Interview Q&A:**
- **Q: What is Row-Level Security?**
  A: RLS restricts which rows a user can access based on policies. Even direct SQL queries are filtered. PostgreSQL enforces this at the database level.

- **Q: When to use table partitioning?**
  A: When tables grow very large (millions of rows). Partition by date (time-series data), by tenant (multi-tenant), by status. Benefits: faster queries (scan only relevant partitions), easier data management (drop old partitions).

---

## 22. TESTING STRATEGY — COMPLETE REFERENCE

### 22.1 Testing Pyramid
```
        ╱╲
       ╱  ╲        E2E Tests (Playwright)        — Few, slow, high confidence
      ╱    ╲       
     ╱──────╲      Integration Tests              — Some, medium speed
    ╱        ╲     (Testcontainers, @SpringBootTest)
   ╱──────────╲    
  ╱            ╲   Slice Tests                    — Fast, focused
 ╱              ╲  (@WebMvcTest, @DataJpaTest, @GraphQlTest)
╱────────────────╲ 
╲                ╱ Unit Tests                     — Many, fastest
 ╲              ╱  (JUnit 5, Mockito)
  ╲────────────╱   
```

### 22.2 Unit Test Example
```java
@ExtendWith(MockitoExtension.class)
class EmployeeServiceTest {
    @Mock private EmployeeRepository employeeRepository;
    @Mock private EmployeeMapper employeeMapper;
    @InjectMocks private EmployeeService employeeService;

    @Test
    @DisplayName("Should create employee successfully")
    void shouldCreateEmployee() {
        // Given
        EmployeeCreateDTO dto = new EmployeeCreateDTO("John", "Doe", "john@example.com", "Engineering");
        Employee entity = Employee.builder().id(1L).firstName("John").build();
        EmployeeDTO expected = new EmployeeDTO(1L, "John", "Doe", "john@example.com", "Engineering");

        when(employeeMapper.toEntity(dto)).thenReturn(entity);
        when(employeeRepository.save(entity)).thenReturn(entity);
        when(employeeMapper.toDTO(entity)).thenReturn(expected);

        // When
        EmployeeDTO result = employeeService.createEmployee(dto);

        // Then
        assertThat(result.firstName()).isEqualTo("John");
        verify(employeeRepository).save(entity);
        verify(kafkaProducerService).sendEmployeeEvent("CREATED", entity);
    }
}
```

### 22.3 Slice Tests
```java
// Controller Slice Test
@WebMvcTest(EmployeeController.class)
class EmployeeControllerTest {
    @Autowired private MockMvc mockMvc;
    @MockBean private EmployeeService employeeService;

    @Test
    void shouldReturnEmployee() throws Exception {
        when(employeeService.getEmployee(1L)).thenReturn(dto);

        mockMvc.perform(get("/api/v1/employees/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.firstName").value("John"));
    }
}

// Repository Slice Test
@DataJpaTest
@ActiveProfiles("test")
class EmployeeRepositoryTest {
    @Autowired private EmployeeRepository repository;

    @Test
    void shouldFindByDepartment() {
        repository.save(Employee.builder().firstName("John").department("Engineering").build());
        List<Employee> result = repository.findByDepartment("Engineering");
        assertThat(result).hasSize(1);
    }
}

// GraphQL Slice Test
@GraphQlTest(NotificationGraphQLController.class)
class NotificationGraphQLControllerTest {
    @Autowired private GraphQlTester graphQlTester;
    @MockBean private NotificationService notificationService;

    @Test
    void shouldQueryNotification() {
        when(notificationService.getById(1L)).thenReturn(response);
        graphQlTester.document("{ notification(id: 1) { id title } }")
            .execute()
            .path("notification.title").entity(String.class).isEqualTo("Welcome");
    }
}
```

### 22.4 Testcontainers Integration Test
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EmployeeTestcontainersIT {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private MockMvc mockMvc;

    @Test
    void shouldCreateAndRetrieveEmployee() throws Exception {
        String json = """
            {"firstName":"John","lastName":"Doe","email":"john@test.com","department":"Eng"}
            """;

        mockMvc.perform(post("/api/v1/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists());
    }
}
```

**Interview Q&A:**
- **Q: @WebMvcTest vs @SpringBootTest?**
  A: @WebMvcTest loads ONLY controller + security layer — fast. @SpringBootTest loads the ENTIRE Spring context — slow but tests everything. Use @WebMvcTest for controller logic, @SpringBootTest for integration tests.

- **Q: What are Testcontainers?**
  A: JUnit extension that manages Docker containers. Real PostgreSQL, Redis, Kafka in tests. No H2 compatibility issues. Our project uses it for integration tests with real PostgreSQL.

---

## 23. OPENAPI / SWAGGER DOCUMENTATION

**Configuration:**
```java
@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Employee Microservice API")
                .version("1.0.0")
                .description("REST API for employee management"))
            .addSecurityItem(new SecurityRequirement().addList("Bearer"))
            .components(new Components()
                .addSecuritySchemes("Bearer", new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")));
    }
}
```

**Access:** `http://localhost:8081/swagger-ui.html`

---

## 24. API VERSIONING

**Strategy Used:** URL path versioning (`/api/v1/employees`)
```java
@RequestMapping("/api/v1/employees")   // Version in URL
public class EmployeeController { ... }
```

**Interview Q&A:**
- **Q: What are the API versioning strategies?**
  A: 1) URL path (`/api/v1/`) — simplest, most common (our project). 2) Header (`Accept: application/vnd.company.v1+json`). 3) Query param (`?version=1`). 4) Content negotiation. URL path is the MNC standard.

---
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
