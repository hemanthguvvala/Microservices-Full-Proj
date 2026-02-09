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
