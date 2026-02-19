// ═══════════════════════════════════════════════════════════════
//  COMPREHENSIVE INTERVIEW Q&A KNOWLEDGE BASE
//  Full questions, answers, and code examples
// ═══════════════════════════════════════════════════════════════

const INTERVIEW_KB = {
  categories: [
    // ─── 1. JAVA & SPRING BOOT CORE ──────────────────
    {
      title: 'Java & Spring Boot Core',
      icon: '☕',
      topics: [
        {
          heading: 'Spring Boot Fundamentals',
          qas: [
            {
              q: 'What is Spring Boot and how does it differ from Spring Framework?',
              a: 'Spring Boot is an opinionated framework built on top of Spring that provides auto-configuration, embedded servers, and starter dependencies. Unlike plain Spring, it eliminates XML config, provides production-ready features (health checks, metrics), and enables rapid development with convention over configuration.',
            },
            {
              q: 'Explain Spring Boot Auto-Configuration. How does it work internally?',
              a: 'Auto-configuration uses @EnableAutoConfiguration (included in @SpringBootApplication). It scans META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports for config classes. Each class uses @Conditional annotations (@ConditionalOnClass, @ConditionalOnMissingBean, etc.) to apply only when conditions are met.',
              code: `// Custom auto-configuration example
@AutoConfiguration
@ConditionalOnClass(DataSource.class)
@EnableConfigurationProperties(MyDbProperties.class)
public class MyDatabaseAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public DataSource dataSource(MyDbProperties props) {
        return DataSourceBuilder.create()
            .url(props.getUrl())
            .username(props.getUsername())
            .build();
    }
}`
            },
            {
              q: 'What are Spring Profiles and how are they used in microservices?',
              a: 'Profiles activate different configurations per environment (dev, test, prod). In our project, Config Server serves profile-specific YAML (employee-service-dev.yml, employee-service-prod.yml). Beans can be @Profile-specific.',
              code: `// Activating a profile
// application.yml
spring:
  profiles:
    active: dev

// Profile-specific bean
@Configuration
@Profile("prod")
public class ProdSecurityConfig {
    @Bean
    public SecurityFilterChain prodChain(HttpSecurity http) {
        return http.csrf().enable()
            .headers().hsts().and()
            .build();
    }
}

@Configuration
@Profile("dev")
public class DevSecurityConfig {
    @Bean
    public SecurityFilterChain devChain(HttpSecurity http) {
        return http.csrf().disable().build();
    }
}`
            },
            {
              q: 'Explain the Spring Bean lifecycle.',
              a: 'Instantiation → Populate Properties → BeanNameAware → BeanFactoryAware → ApplicationContextAware → @PostConstruct → InitializingBean.afterPropertiesSet() → Custom init-method → Bean Ready → @PreDestroy → DisposableBean.destroy() → Custom destroy-method. Spring manages this entire cycle within the IoC container.',
              code: `@Component
public class EmployeeService implements InitializingBean, DisposableBean {

    @PostConstruct
    public void postConstruct() {
        log.info("1. @PostConstruct - bean constructed");
    }

    @Override
    public void afterPropertiesSet() {
        log.info("2. InitializingBean - properties set");
    }

    @PreDestroy
    public void preDestroy() {
        log.info("3. @PreDestroy - about to destroy");
    }

    @Override
    public void destroy() {
        log.info("4. DisposableBean - destroying");
    }
}`
            },
            {
              q: 'What are the different Bean Scopes in Spring?',
              a: 'singleton (default, one instance per container), prototype (new instance each time), request (per HTTP request), session (per HTTP session), application (per ServletContext), websocket (per WebSocket session). In microservices, singleton is most common; prototype for stateful beans.',
            },
            {
              q: 'How does Dependency Injection work? Constructor vs Field vs Setter injection?',
              a: 'Constructor injection is preferred (immutable, testable, required deps). Field injection (@Autowired on field) is convenient but hard to test. Setter injection for optional deps. Spring resolves by type, then @Qualifier for disambiguation.',
              code: `// Preferred: Constructor injection (implicit @Autowired for single constructor)
@Service
public class EmployeeService {
    private final EmployeeRepository repository;
    private final KafkaTemplate<String, Object> kafka;
    private final RedisTemplate<String, String> redis;

    // Spring auto-injects all three
    public EmployeeService(EmployeeRepository repository,
                          KafkaTemplate<String, Object> kafka,
                          RedisTemplate<String, String> redis) {
        this.repository = repository;
        this.kafka = kafka;
        this.redis = redis;
    }
}`
            },
          ]
        },
        {
          heading: 'Java 17+ Features',
          qas: [
            {
              q: 'What new features in Java 17 did you use in this project?',
              a: 'Records for DTOs (immutable data carriers), sealed classes for restricted hierarchies, pattern matching for instanceof, text blocks for multi-line strings, switch expressions, and enhanced NullPointerExceptions.',
              code: `// Records - immutable DTOs
public record EmployeeDTO(
    Long id,
    String firstName,
    String lastName,
    String email,
    String department,
    BigDecimal salary
) {}

// Sealed classes
public sealed interface NotificationChannel
    permits EmailChannel, SmsChannel, PushChannel, InAppChannel {
    void send(Notification notification);
}

// Pattern matching for instanceof
public String formatEmployee(Object obj) {
    if (obj instanceof Employee emp) {
        return emp.getFirstName() + " " + emp.getLastName();
    }
    return "Unknown";
}

// Switch expressions
String status = switch (saga.getStatus()) {
    case STARTED -> "In Progress";
    case COMPLETED -> "Done";
    case COMPENSATING -> "Rolling Back";
    case FAILED -> "Failed";
};`
            },
            {
              q: 'Explain Java Streams API with examples from your project.',
              a: 'Streams provide functional-style operations on collections. We use them extensively for data transformation, filtering, and aggregation.',
              code: `// Complex stream operations from the project
// 1. Group employees by department with salary stats
Map<String, DoubleSummaryStatistics> deptStats =
    employees.stream()
        .collect(Collectors.groupingBy(
            Employee::getDepartment,
            Collectors.summarizingDouble(
                e -> e.getSalary().doubleValue())));

// 2. Find top 5 highest-paid employees per department
Map<String, List<Employee>> topEarners =
    employees.stream()
        .collect(Collectors.groupingBy(Employee::getDepartment,
            Collectors.collectingAndThen(
                Collectors.toList(),
                list -> list.stream()
                    .sorted(Comparator.comparing(
                        Employee::getSalary).reversed())
                    .limit(5)
                    .collect(Collectors.toList()))));

// 3. Parallel stream for bulk processing
employees.parallelStream()
    .filter(e -> e.getStatus() == Status.ACTIVE)
    .map(employeeMapper::toDTO)
    .forEach(dto -> kafkaTemplate.send("employee-events", dto));`
            },
            {
              q: 'What is the difference between Optional, Stream, and CompletableFuture?',
              a: 'Optional: wraps 0 or 1 value (null safety). Stream: lazy pipeline over 0..N values. CompletableFuture: async computation of 1 value. All three are monadic - support map/flatMap chaining.',
              code: `// Optional - safe null handling
Employee emp = repository.findById(id)
    .orElseThrow(() -> new ResourceNotFoundException("Employee", id));

String dept = Optional.ofNullable(employee.getDepartment())
    .map(Department::getName)
    .orElse("Unassigned");

// CompletableFuture - async operations
CompletableFuture<PayrollInfo> payroll = CompletableFuture
    .supplyAsync(() -> payrollClient.getPayroll(empId))
    .thenApply(p -> enrichWithTaxInfo(p))
    .exceptionally(ex -> PayrollInfo.defaultPayroll());

CompletableFuture<NotificationPrefs> notif = CompletableFuture
    .supplyAsync(() -> notifClient.getPrefs(empId));

// Combine multiple async calls
CompletableFuture.allOf(payroll, notif)
    .thenRun(() -> buildResponse(payroll.join(), notif.join()));`
            },
          ]
        },
      ]
    },
    // ─── 2. MICROSERVICES ARCHITECTURE ──────────────────
    {
      title: 'Microservices Architecture',
      icon: '🏗️',
      topics: [
        {
          heading: 'Core Concepts',
          qas: [
            {
              q: 'What are the 12-Factor App principles and how does your project follow them?',
              a: '1) Codebase (Git mono-repo), 2) Dependencies (Maven/npm), 3) Config (Config Server externalizes), 4) Backing services (PostgreSQL, Redis, Kafka as attached resources), 5) Build/release/run (Docker multi-stage), 6) Processes (stateless services), 7) Port binding (embedded Tomcat), 8) Concurrency (horizontal scaling via K8s replicas), 9) Disposability (graceful shutdown), 10) Dev/prod parity (Docker Compose mirrors prod), 11) Logs (stdout → ELK), 12) Admin processes (Flyway migrations).',
            },
            {
              q: 'How do you decompose a monolith into microservices?',
              a: 'Use Domain-Driven Design (DDD): identify bounded contexts (Employee, Payroll, Notification). Each context becomes a service. Start with the Strangler Fig pattern — gradually extract services while keeping the monolith running. Our project has clear boundaries: Employee owns employee data, Payroll owns salary calculations, Notification owns delivery channels.',
            },
            {
              q: 'Explain service-to-service communication patterns.',
              a: 'Synchronous: REST via OpenFeign (Employee calls Payroll for salary data). Gateway routes external requests. Asynchronous: Kafka events (Employee publishes EmployeeCreated, Payroll and Notification consume independently). Choose sync for queries needing immediate response, async for commands/events that can be eventually consistent.',
              code: `// Synchronous - OpenFeign client
@FeignClient(name = "payroll-service", fallbackFactory = PayrollFallbackFactory.class)
public interface PayrollClient {
    @GetMapping("/api/payroll/employee/{empId}")
    PayrollResponse getPayrollByEmployee(@PathVariable Long empId);
}

// Asynchronous - Kafka producer
@Service
public class EmployeeEventPublisher {
    private final KafkaTemplate<String, EmployeeEvent> kafka;

    public void publishEmployeeCreated(Employee emp) {
        EmployeeEvent event = new EmployeeEvent(
            EventType.EMPLOYEE_CREATED, emp.getId(),
            emp.getFirstName(), emp.getEmail());
        kafka.send("employee-events", emp.getId().toString(), event);
    }
}

// Kafka consumer in Payroll service
@KafkaListener(topics = "employee-events", groupId = "payroll-group")
public void handleEmployeeEvent(EmployeeEvent event) {
    switch (event.getType()) {
        case EMPLOYEE_CREATED -> payrollService.initializePayroll(event);
        case EMPLOYEE_UPDATED -> payrollService.updatePayroll(event);
        case EMPLOYEE_DELETED -> payrollService.deactivatePayroll(event);
    }
}`
            },
            {
              q: 'What is API Gateway pattern and why use it?',
              a: 'Single entry point for all clients. Benefits: request routing, load balancing, authentication, rate limiting, circuit breaking, CORS, response caching, request/response transformation. Our Spring Cloud Gateway is non-blocking (WebFlux), uses predicates for routing and filters for cross-cutting concerns.',
              code: `# API Gateway route configuration (api-gateway.yml)
spring:
  cloud:
    gateway:
      routes:
        - id: employee-service
          uri: lb://employee-service
          predicates:
            - Path=/api/employees/**
          filters:
            - name: CircuitBreaker
              args:
                name: employeeCircuit
                fallbackUri: forward:/fallback/employees
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 10
                redis-rate-limiter.burstCapacity: 20
            - name: Retry
              args:
                retries: 3
                statuses: BAD_GATEWAY`
            },
            {
              q: 'Explain Service Discovery with Eureka.',
              a: 'Each service registers with Eureka on startup (POST /eureka/apps/{appName}). Services discover peers by querying Eureka (GET /eureka/apps). Client-side load balancing (Spring Cloud LoadBalancer) picks instances. Eureka self-preservation mode prevents mass deregistration during network partitions.',
              code: `// Eureka client configuration
@SpringBootApplication
@EnableDiscoveryClient
public class EmployeeApplication { }

// application.yml
eureka:
  client:
    service-url:
      defaultZone: http://eureka-server:8761/eureka/
    register-with-eureka: true
    fetch-registry: true
  instance:
    prefer-ip-address: true
    lease-renewal-interval-in-seconds: 10
    lease-expiration-duration-in-seconds: 30`
            },
          ]
        },
        {
          heading: 'Distributed Systems Patterns',
          qas: [
            {
              q: 'Explain the Saga Pattern. Orchestration vs Choreography?',
              a: 'Saga manages distributed transactions without 2PC. Orchestration: central coordinator (SagaOrchestrator) drives workflow — our EmployeeOnboardingSaga coordinates create employee → setup payroll → send notification with compensating actions. Choreography: each service publishes events, next service reacts — no central coordinator. Orchestration is better for complex workflows; Choreography for simple, decoupled flows.',
              code: `// Saga Orchestrator from our project
@Service
public class SagaOrchestrator {
    public SagaInstance startSaga(String sagaType, Map<String, Object> data) {
        SagaInstance saga = SagaInstance.builder()
            .sagaId(UUID.randomUUID().toString())
            .type(sagaType)
            .status(SagaStatus.STARTED)
            .data(objectMapper.writeValueAsString(data))
            .currentStep(0)
            .build();

        saga = sagaRepository.save(saga);
        executeNextStep(saga);
        return saga;
    }

    private void executeNextStep(SagaInstance saga) {
        List<SagaStep> steps = sagaDefinitions.get(saga.getType());
        if (saga.getCurrentStep() >= steps.size()) {
            completeSaga(saga);
            return;
        }
        SagaStep step = steps.get(saga.getCurrentStep());
        try {
            step.execute(saga);
            saga.setCurrentStep(saga.getCurrentStep() + 1);
            sagaRepository.save(saga);
            executeNextStep(saga);
        } catch (Exception e) {
            compensate(saga); // Rollback all completed steps
        }
    }
}`
            },
            {
              q: 'What is the Outbox Pattern and why is it needed?',
              a: 'Solves the dual-write problem: when you need to update DB AND publish an event, either could fail independently. Outbox: write business data + event to outbox table in same DB transaction (atomic). A separate publisher polls outbox and sends to Kafka. Guarantees at-least-once delivery with idempotent consumers.',
              code: `// Writing to outbox in same transaction
@Transactional
public Employee createEmployee(EmployeeRequest req) {
    Employee emp = employeeMapper.toEntity(req);
    emp = employeeRepository.save(emp);

    // Write event to outbox in SAME transaction
    OutboxEvent event = OutboxEvent.builder()
        .aggregateId(emp.getId().toString())
        .aggregateType("Employee")
        .eventType("EMPLOYEE_CREATED")
        .payload(objectMapper.writeValueAsString(emp))
        .status(OutboxStatus.PENDING)
        .build();
    outboxRepository.save(event);

    return emp;
}

// Outbox publisher (separate process)
@Scheduled(fixedDelay = 1000)
@Transactional
public void publishPendingEvents() {
    List<OutboxEvent> events = outboxRepository
        .findByStatusOrderByCreatedAtAsc(OutboxStatus.PENDING);
    for (OutboxEvent event : events) {
        kafkaTemplate.send("employee-events", event.getPayload());
        event.setStatus(OutboxStatus.PUBLISHED);
        outboxRepository.save(event);
    }
}`
            },
            {
              q: 'Explain Event Sourcing and its trade-offs.',
              a: 'Instead of storing current state, store all state changes as immutable events. Current state = replay all events. Benefits: complete audit trail, temporal queries, event replay for debugging, supports CQRS. Trade-offs: query complexity (need projections), storage growth, eventual consistency, event schema evolution complexity.',
              code: `// Event Store
@Entity
public class EventStore {
    @Id @GeneratedValue
    private Long id;
    private String aggregateId;
    private String aggregateType;
    private String eventType;
    private int version;

    @Column(columnDefinition = "jsonb")
    private String eventData;
    private LocalDateTime createdAt;
}

// Rebuilding state from events
public Employee rebuildEmployee(String aggregateId) {
    List<EventStore> events = eventStoreRepository
        .findByAggregateIdOrderByVersionAsc(aggregateId);

    Employee emp = new Employee();
    for (EventStore event : events) {
        switch (event.getEventType()) {
            case "CREATED" -> emp.applyCreated(event.getData());
            case "UPDATED" -> emp.applyUpdated(event.getData());
            case "PROMOTED" -> emp.applyPromoted(event.getData());
            case "DEACTIVATED" -> emp.applyDeactivated(event.getData());
        }
    }
    return emp;
}`
            },
            {
              q: 'What is CQRS and when should you use it?',
              a: 'Command Query Responsibility Segregation separates read and write models. In our project: writes go to PostgreSQL (normalized, consistent), reads from Elasticsearch (denormalized, fast search). Use when: read/write patterns differ significantly, need independent scaling, need optimized read models. Do NOT use for simple CRUD.',
              code: `// Write side - PostgreSQL
@Transactional
public Employee createEmployee(CreateEmployeeCommand cmd) {
    Employee emp = new Employee(cmd);
    emp = postgresRepository.save(emp);

    // Publish event for read side sync
    publishEvent(new EmployeeCreatedEvent(emp));
    return emp;
}

// Read side - Elasticsearch
@Service
public class EmployeeReadService {
    private final ElasticsearchOperations esOps;

    public Page<EmployeeSearchResult> search(String query, Pageable pageable) {
        NativeQuery searchQuery = NativeQuery.builder()
            .withQuery(q -> q.multiMatch(m -> m
                .query(query)
                .fields("firstName", "lastName", "email", "department")
                .fuzziness("AUTO")))
            .withPageable(pageable)
            .build();
        return esOps.search(searchQuery, EmployeeDocument.class);
    }
}

// Sync handler - keeps read model updated
@KafkaListener(topics = "employee-events")
public void syncToElasticsearch(EmployeeEvent event) {
    EmployeeDocument doc = mapToDocument(event);
    esOps.save(doc); // Upsert to Elasticsearch
}`
            },
          ]
        },
      ]
    },
    // ─── 3. DESIGN PATTERNS ──────────────────
    {
      title: 'Design Patterns (GoF & Enterprise)',
      icon: '🧩',
      topics: [
        {
          heading: 'Creational Patterns',
          qas: [
            {
              q: 'Explain Builder Pattern and where you used it.',
              a: 'Builder separates construction of complex objects from representation. We use Lombok @Builder on entities and DTOs. Also manual builders for SagaInstance, OutboxEvent. Useful when constructors have many parameters or when object creation involves multiple steps.',
              code: `// Lombok @Builder
@Entity @Builder @Data @NoArgsConstructor @AllArgsConstructor
public class Employee {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String department;
    private BigDecimal salary;
}

// Usage
Employee emp = Employee.builder()
    .firstName("John")
    .lastName("Doe")
    .email("john@company.com")
    .department("Engineering")
    .salary(new BigDecimal("85000"))
    .build();

// Manual builder for complex config
public class RetryConfig {
    public static class Builder {
        private int maxAttempts = 3;
        private Duration waitDuration = Duration.ofSeconds(1);
        private double multiplier = 2.0;

        public Builder maxAttempts(int n) { this.maxAttempts = n; return this; }
        public Builder waitDuration(Duration d) { this.waitDuration = d; return this; }
        public RetryConfig build() { return new RetryConfig(this); }
    }
}`
            },
            {
              q: 'What is Factory Pattern? Difference between Factory Method and Abstract Factory?',
              a: 'Factory Method: single method creates one product (NotificationStrategyFactory creates strategies). Abstract Factory: family of related products (could create DB connection + repository + transaction manager together). Our project uses Factory Method pattern in notification service.',
              code: `// Factory Method in Notification Service
@Component
public class NotificationStrategyFactory {
    private final Map<NotificationChannel, NotificationStrategy> strategies;

    public NotificationStrategyFactory(List<NotificationStrategy> strategyList) {
        strategies = strategyList.stream()
            .collect(Collectors.toMap(
                NotificationStrategy::getChannel,
                Function.identity()));
    }

    public NotificationStrategy getStrategy(NotificationChannel channel) {
        NotificationStrategy strategy = strategies.get(channel);
        if (strategy == null) {
            throw new UnsupportedChannelException(channel);
        }
        return strategy;
    }
}

// Each strategy implements the interface
@Component
public class EmailNotificationStrategy implements NotificationStrategy {
    public NotificationChannel getChannel() { return NotificationChannel.EMAIL; }
    public void send(Notification notif) { /* email logic */ }
}

@Component
public class SmsNotificationStrategy implements NotificationStrategy {
    public NotificationChannel getChannel() { return NotificationChannel.SMS; }
    public void send(Notification notif) { /* SMS logic */ }
}`
            },
            {
              q: 'Explain Singleton Pattern. Why is it default in Spring?',
              a: 'Singleton ensures one instance per container. Spring beans are singleton by default because: services are stateless (no instance-specific data), reduces memory footprint, enables caching, and constructor injection is deterministic. Thread safety is achieved because services should not have mutable shared state.',
            },
          ]
        },
        {
          heading: 'Structural & Behavioral Patterns',
          qas: [
            {
              q: 'Explain Strategy Pattern with your notification service example.',
              a: 'Strategy defines a family of algorithms (Email, SMS, Push, InApp), encapsulates each, and makes them interchangeable. The client (NotificationService) delegates to the selected strategy at runtime. Open/Closed Principle: add new channels without modifying existing code.',
              code: `// Strategy interface
public interface NotificationStrategy {
    NotificationChannel getChannel();
    NotificationResult send(Notification notification);
    boolean supports(NotificationChannel channel);
}

// Context - uses strategy
@Service
public class NotificationService {
    private final NotificationStrategyFactory factory;

    public NotificationResult sendNotification(NotificationRequest req) {
        NotificationStrategy strategy = factory.getStrategy(req.getChannel());
        Notification notif = createNotification(req);
        return strategy.send(notif);
    }
}`
            },
            {
              q: 'What is Template Method Pattern? Where did you use it?',
              a: 'Defines algorithm skeleton in base class; subclasses override specific steps. In our project: AbstractBulkProcessor defines process flow (validate → preProcess → execute → postProcess), BulkEmployeeImporter and BulkPayrollProcessor override specific steps.',
              code: `// Template Method
public abstract class AbstractBulkProcessor<T> {
    // Template method - defines the algorithm
    public final ProcessResult process(List<T> items) {
        validate(items);
        List<T> prepared = preProcess(items);
        List<ProcessedItem<T>> results = execute(prepared);
        postProcess(results);
        return buildResult(results);
    }

    protected abstract void validate(List<T> items);
    protected abstract List<T> preProcess(List<T> items);
    protected abstract List<ProcessedItem<T>> execute(List<T> items);
    protected void postProcess(List<ProcessedItem<T>> r) { /* optional hook */ }
}

// Concrete implementation
public class BulkEmployeeImporter extends AbstractBulkProcessor<EmployeeCSV> {
    protected void validate(List<EmployeeCSV> items) {
        items.forEach(this::validateEmail);
    }
    protected List<EmployeeCSV> preProcess(List<EmployeeCSV> items) {
        return items.stream().map(this::normalize).collect(toList());
    }
    protected List<ProcessedItem<EmployeeCSV>> execute(List<EmployeeCSV> items) {
        return items.stream().map(this::importEmployee).collect(toList());
    }
}`
            },
            {
              q: 'Explain Observer Pattern and how Kafka implements it.',
              a: 'Observer: when subject state changes, all registered observers are notified. Kafka implements this at scale: producers (subjects) publish to topics, consumers (observers) subscribe. Decoupled: producers dont know consumers. In our project: Employee service publishes events, Payroll and Notification services independently consume them.',
            },
            {
              q: 'What is the Anti-Corruption Layer (ACL) pattern?',
              a: 'DDD pattern that prevents external system models from polluting your domain. In our project: LegacyPayrollAdapter translates between clean Employee domain model and legacy payroll system DTOs. The adapter acts as a boundary, keeping the domain model pure.',
              code: `// Anti-Corruption Layer
@Component
public class LegacyPayrollAdapter {
    private final LegacyPayrollClient legacyClient;

    // Translates from our clean domain to legacy format
    public void syncToLegacy(Employee emp) {
        LegacyEmployeeRecord legacy = new LegacyEmployeeRecord();
        legacy.setEmpNo(emp.getId().toString());
        legacy.setFullName(emp.getFirstName() + " " + emp.getLastName());
        legacy.setDeptCode(mapDepartment(emp.getDepartment()));
        legacy.setSalaryGrade(calculateGrade(emp.getSalary()));
        legacyClient.upsert(legacy);
    }

    // Translates from legacy format to our domain
    public PayrollInfo fetchFromLegacy(Long employeeId) {
        LegacyPayrollRecord record = legacyClient.fetch(employeeId.toString());
        return PayrollInfo.builder()
            .baseSalary(parseSalary(record.getPayGrade()))
            .taxRate(parseTax(record.getTaxCode()))
            .build();
    }
}`
            },
            {
              q: 'What is the Decorator Pattern? How does Spring use it?',
              a: 'Decorator adds behavior to objects dynamically without modifying them. Spring uses it extensively: HandlerInterceptor decorates controllers, Filter decorates servlet processing, @Transactional adds transaction behavior via proxy, @Cacheable adds caching via proxy. AOP is essentially a decorator implementation.',
            },
          ]
        },
      ]
    },
    // ─── 4. RESILIENCE & FAULT TOLERANCE ──────────────────
    {
      title: 'Resilience & Fault Tolerance',
      icon: '🛡️',
      topics: [
        {
          heading: 'Circuit Breaker & Resilience4j',
          qas: [
            {
              q: 'Explain Circuit Breaker pattern in detail with states.',
              a: 'Circuit Breaker prevents cascade failures. CLOSED (normal): requests pass through, failures tracked. When failure rate exceeds threshold → OPEN: all requests immediately return fallback, no downstream calls. After wait duration → HALF_OPEN: limited test requests allowed; if successful → CLOSED, if failed → OPEN again.',
              code: `// Resilience4j Circuit Breaker config
resilience4j:
  circuitbreaker:
    instances:
      payrollService:
        sliding-window-type: COUNT_BASED
        sliding-window-size: 10
        failure-rate-threshold: 50
        wait-duration-in-open-state: 10s
        permitted-number-of-calls-in-half-open-state: 3
        register-health-indicator: true

// Usage in code
@CircuitBreaker(name = "payrollService", fallbackMethod = "payrollFallback")
public PayrollResponse getPayroll(Long empId) {
    return payrollClient.getPayrollByEmployee(empId);
}

public PayrollResponse payrollFallback(Long empId, Exception ex) {
    log.warn("Circuit breaker fallback for employee {}: {}", empId, ex.getMessage());
    return PayrollResponse.builder()
        .employeeId(empId)
        .status("UNAVAILABLE")
        .message("Payroll service temporarily unavailable")
        .build();
}`
            },
            {
              q: 'What is Retry with Exponential Backoff?',
              a: 'Automatically retry failed operations with increasing delays (1s, 2s, 4s, 8s...). Prevents thundering herd on recovery. Only retry transient failures (network timeout, 503) and idempotent operations. Set max retries to prevent infinite loops.',
              code: `// Resilience4j Retry config
resilience4j:
  retry:
    instances:
      payrollRetry:
        max-attempts: 3
        wait-duration: 1s
        enable-exponential-backoff: true
        exponential-backoff-multiplier: 2
        retry-exceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException

@Retry(name = "payrollRetry")
@CircuitBreaker(name = "payrollService", fallbackMethod = "fallback")
public PayrollResponse getPayroll(Long empId) {
    return payrollClient.getPayrollByEmployee(empId);
}`
            },
            {
              q: 'Explain Bulkhead Pattern.',
              a: 'Named after ship compartments. Isolates resources per downstream call so one slow service cannot consume all threads. Semaphore bulkhead: limits concurrent calls (fast, no queuing). ThreadPool bulkhead: dedicated thread pool with queue (supports waiting).',
              code: `// Bulkhead configuration
resilience4j:
  bulkhead:
    instances:
      payrollBulkhead:
        max-concurrent-calls: 10
        max-wait-duration: 500ms

@Bulkhead(name = "payrollBulkhead", type = Bulkhead.Type.SEMAPHORE)
@CircuitBreaker(name = "payrollService")
public PayrollResponse getPayroll(Long empId) {
    return payrollClient.getPayrollByEmployee(empId);
}`
            },
            {
              q: 'What is Rate Limiting and which algorithms exist?',
              a: 'Rate limiting controls request throughput. Algorithms: Token Bucket (our approach - tokens added at fixed rate, consumed per request), Sliding Window (count requests in time window), Fixed Window, Leaky Bucket. Redis-backed for distributed rate limiting across instances.',
              code: `// Gateway Rate Limiter (Redis-backed)
@Bean
public KeyResolver userKeyResolver() {
    return exchange -> Mono.just(
        exchange.getRequest().getRemoteAddress()
            .getAddress().getHostAddress());
}

// Bucket4j in Notification Service
@Bean
public Bucket createBucket() {
    return Bucket.builder()
        .addLimit(Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1))))
        .addLimit(Bandwidth.classic(10, Refill.greedy(10, Duration.ofSeconds(1))))
        .build();
}

public boolean tryConsume() {
    return bucket.tryConsume(1);
}`
            },
          ]
        },
      ]
    },
    // ─── 5. DATABASE & DATA MANAGEMENT ──────────────────
    {
      title: 'Database & Data Management',
      icon: '💾',
      topics: [
        {
          heading: 'PostgreSQL & JPA/Hibernate',
          qas: [
            {
              q: 'Explain JPA entity relationships and fetch strategies.',
              a: 'OneToMany (Employee has many addresses), ManyToOne (Address belongs to Employee), ManyToMany (Employee has many skills). FetchType.LAZY (default for collections, loads on access) vs EAGER (loads immediately). LAZY is preferred to avoid N+1 queries. Use @EntityGraph or JOIN FETCH for specific queries.',
              code: `@Entity
public class Employee {
    @Id @GeneratedValue
    private Long id;

    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL,
               orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Address> addresses = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "employee_skills",
        joinColumns = @JoinColumn(name = "employee_id"),
        inverseJoinColumns = @JoinColumn(name = "skill_id"))
    private Set<Skill> skills = new HashSet<>();

    @Version  // Optimistic locking
    private Long version;
}

// Solving N+1 with EntityGraph
@EntityGraph(attributePaths = {"addresses", "skills"})
@Query("SELECT e FROM Employee e WHERE e.department = :dept")
List<Employee> findByDepartmentWithDetails(@Param("dept") String dept);`
            },
            {
              q: 'What is the N+1 query problem and how to solve it?',
              a: 'N+1: fetching N entities triggers N additional queries for lazy collections. Example: load 100 employees, each triggers a query for addresses = 101 queries total. Solutions: JOIN FETCH in JPQL, @EntityGraph, @BatchSize (Hibernate), or DTOs with specific projections.',
              code: `// Problem: N+1 queries
List<Employee> emps = employeeRepository.findAll(); // 1 query
for (Employee emp : emps) {
    emp.getAddresses().size(); // N additional queries!
}

// Solution 1: JOIN FETCH
@Query("SELECT e FROM Employee e JOIN FETCH e.addresses WHERE e.status = :status")
List<Employee> findActiveWithAddresses(@Param("status") Status status);

// Solution 2: @BatchSize
@BatchSize(size = 25)
@OneToMany(mappedBy = "employee", fetch = FetchType.LAZY)
private List<Address> addresses;

// Solution 3: DTO Projection (best for read-only)
@Query("SELECT new com.emp.dto.EmployeeSummary(e.id, e.firstName, e.email, COUNT(a)) " +
       "FROM Employee e LEFT JOIN e.addresses a GROUP BY e.id, e.firstName, e.email")
List<EmployeeSummary> getEmployeeSummaries();`
            },
            {
              q: 'Explain database indexing strategies.',
              a: 'B-tree (default, good for range queries and equality), Hash (exact match only), GIN (full-text search, arrays, JSONB), GiST (geometric, range types). Create indexes on frequently queried columns, JOIN columns, and WHERE clause columns. Avoid over-indexing (slows writes).',
              code: `-- Flyway migration for indexes
-- V5__add_performance_indexes.sql

-- Composite index for common query patterns
CREATE INDEX idx_employee_dept_status ON employees(department, status);

-- Partial index (only active employees)
CREATE INDEX idx_active_employees ON employees(email)
    WHERE status = 'ACTIVE';

-- GIN index for JSONB metadata search
CREATE INDEX idx_employee_metadata ON employees
    USING GIN (metadata jsonb_path_ops);

-- Expression index
CREATE INDEX idx_employee_lower_email ON employees(LOWER(email));`
            },
            {
              q: 'What is Flyway and how do you manage database migrations?',
              a: 'Flyway applies version-controlled SQL migrations automatically on startup. Files named V1__description.sql, V2__description.sql. Applied sequentially, checksums verified. Never modify applied migrations - create new ones. Our project has 10 migrations across services.',
              code: `-- V1__create_employees_table.sql
CREATE TABLE employees (
    id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100),
    salary DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version BIGINT DEFAULT 0
);

-- V2__create_outbox_table.sql
CREATE TABLE outbox_events (
    id BIGSERIAL PRIMARY KEY,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
            },
          ]
        },
        {
          heading: 'Redis, Elasticsearch & Kafka',
          qas: [
            {
              q: 'How do you use Redis in your project?',
              a: 'Distributed caching (employee data, API responses), distributed locks (prevent concurrent modification), rate limiting backing store, session storage. Cache-aside pattern: check cache first, on miss query DB and populate cache. TTL-based expiration.',
              code: `// Redis caching with Spring
@Cacheable(value = "employees", key = "#id", unless = "#result == null")
public Employee getEmployee(Long id) {
    return employeeRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Employee", id));
}

@CacheEvict(value = "employees", key = "#id")
public Employee updateEmployee(Long id, EmployeeRequest req) {
    // update logic
}

// Distributed Lock
@Component
public class DistributedLockService {
    private final StringRedisTemplate redis;

    public boolean acquireLock(String key, Duration ttl) {
        return Boolean.TRUE.equals(
            redis.opsForValue().setIfAbsent(
                "lock:" + key, UUID.randomUUID().toString(), ttl));
    }

    public void releaseLock(String key) {
        redis.delete("lock:" + key);
    }
}`
            },
            {
              q: 'How does Elasticsearch work for full-text search?',
              a: 'Elasticsearch stores documents as inverted indexes. When text is indexed, it is analyzed (tokenized, lowercased, stemmed). Queries are analyzed the same way and matched against the index. Supports fuzzy matching, multi-field search, aggregations, and relevance scoring.',
              code: `// Elasticsearch document mapping
@Document(indexName = "employees")
public class EmployeeDocument {
    @Id
    private String id;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String firstName;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String lastName;

    @Field(type = FieldType.Keyword) // exact match
    private String department;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String email;
}

// Search with fuzzy matching
public SearchHits<EmployeeDocument> search(String query) {
    NativeQuery nq = NativeQuery.builder()
        .withQuery(q -> q.bool(b -> b
            .should(s -> s.match(m -> m
                .field("firstName").query(query).fuzziness("AUTO")))
            .should(s -> s.match(m -> m
                .field("lastName").query(query).fuzziness("AUTO")))
            .should(s -> s.match(m -> m
                .field("email").query(query)))
        ))
        .build();
    return esOps.search(nq, EmployeeDocument.class);
}`
            },
            {
              q: 'Explain Kafka architecture: Topics, Partitions, Consumer Groups.',
              a: 'Topic: named stream of records (like a table). Partition: ordered, immutable sequence within a topic (enables parallelism). Each partition is consumed by exactly one consumer in a group. Consumer Group: set of consumers that cooperate. Offset: position in partition. Replication factor: copies for fault tolerance.',
              code: `// Kafka Configuration
@Configuration
public class KafkaConfig {
    @Bean
    public NewTopic employeeTopic() {
        return TopicBuilder.name("employee-events")
            .partitions(3)
            .replicas(1)
            .config(TopicConfig.RETENTION_MS_CONFIG, "604800000") // 7 days
            .build();
    }

    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        config.put(ProducerConfig.ACKS_CONFIG, "all"); // Wait for all replicas
        config.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        return new DefaultKafkaProducerFactory<>(config);
    }
}

// Dead Letter Queue handling
@KafkaListener(topics = "employee-events")
@RetryableTopic(attempts = "3", backoff = @Backoff(delay = 1000, multiplier = 2))
public void consume(EmployeeEvent event) {
    processEvent(event);
}

@DltHandler
public void handleDlt(EmployeeEvent event) {
    log.error("DLT: Failed to process event after retries: {}", event);
    // Store for manual review
}`
            },
          ]
        },
      ]
    },
    // ─── 6. SECURITY ──────────────────
    {
      title: 'Security & Authentication',
      icon: '🔐',
      topics: [
        {
          heading: 'JWT & Spring Security',
          qas: [
            {
              q: 'Explain JWT authentication flow in your project.',
              a: 'Client sends credentials → AuthController validates against DB (BCrypt) → generates JWT (access token 15min + refresh token 7d) → returns tokens. Subsequent requests include Authorization: Bearer <token>. JwtAuthenticationFilter intercepts, validates signature/expiry, extracts claims, sets SecurityContext.',
              code: `// JWT Token Generation
@Component
public class JwtTokenProvider {
    @Value("\${jwt.secret}") private String secret;
    @Value("\${jwt.expiration}") private long expiration;

    public String generateToken(UserDetails user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("roles", user.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority).collect(toList()));

        return Jwts.builder()
            .setClaims(claims)
            .setSubject(user.getUsername())
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + expiration))
            .signWith(Keys.hmacShaKeyFor(secret.getBytes()), SignatureAlgorithm.HS256)
            .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                .setSigningKey(Keys.hmacShaKeyFor(secret.getBytes()))
                .build().parseClaimsJws(token);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }
}

// JWT Filter
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    protected void doFilterInternal(HttpServletRequest req,
            HttpServletResponse res, FilterChain chain) {
        String token = extractToken(req);
        if (token != null && jwtProvider.validateToken(token)) {
            String username = jwtProvider.getUsername(token);
            UserDetails user = userService.loadUserByUsername(username);
            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        chain.doFilter(req, res);
    }
}`
            },
            {
              q: 'How do you handle authorization with roles and permissions?',
              a: 'Role-based access control (RBAC): ADMIN, MANAGER, EMPLOYEE roles. @PreAuthorize annotations on controllers check roles. Method-level security for fine-grained control. Spring Security filter chain processes authentication before authorization.',
              code: `// Security Configuration
@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers(HttpMethod.DELETE, "/api/employees/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/employees/**").hasAnyRole("ADMIN", "MANAGER")
                .anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}

// Controller-level authorization
@RestController
@RequestMapping("/api/employees")
public class EmployeeController {
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmployee(@PathVariable Long id) { }

    @PreAuthorize("hasAnyRole('ADMIN','MANAGER') or #id == authentication.principal.employeeId")
    @GetMapping("/{id}/salary")
    public ResponseEntity<SalaryInfo> getSalary(@PathVariable Long id) { }
}`
            },
            {
              q: 'How do you secure inter-service communication?',
              a: 'Internal services trust the gateway (deployed in private network). JWT is propagated via OpenFeign RequestInterceptor. Config Server credentials encrypted. Kubernetes Secrets for sensitive config. CORS restricted to known origins. mTLS for production inter-service calls.',
              code: `// Feign interceptor propagates JWT
@Component
public class FeignAuthInterceptor implements RequestInterceptor {
    @Override
    public void apply(RequestTemplate template) {
        ServletRequestAttributes attrs = (ServletRequestAttributes)
            RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            String token = attrs.getRequest().getHeader("Authorization");
            if (token != null) {
                template.header("Authorization", token);
            }
        }
    }
}`
            },
          ]
        },
      ]
    },
    // ─── 7. DEVOPS & INFRASTRUCTURE ──────────────────
    {
      title: 'DevOps, Docker & Kubernetes',
      icon: '🐳',
      topics: [
        {
          heading: 'Docker & Containerization',
          qas: [
            {
              q: 'Explain multi-stage Docker builds and why they matter.',
              a: 'Multi-stage builds separate build environment from runtime. Stage 1: build with Maven/JDK (large). Stage 2: copy only the JAR to slim JRE image. Result: smaller images (200MB vs 800MB), no build tools in production, faster deployments, reduced attack surface.',
              code: `# Multi-stage Dockerfile for Spring Boot
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
# Download deps first (Docker layer caching)
RUN mvn dependency:go-offline -B
RUN mvn package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=3s \\
  CMD wget -qO- http://localhost:8081/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]`
            },
            {
              q: 'Explain Docker Compose and how you use it for local development.',
              a: 'Docker Compose defines multi-container applications in YAML. Our docker-compose.yml orchestrates 15+ services: 6 Spring Boot services, PostgreSQL, Redis, Kafka, Zookeeper, MongoDB, Elasticsearch, Prometheus, Grafana, Zipkin. Services communicate via Docker networks. Healthchecks ensure startup order.',
            },
            {
              q: 'How do you optimize Docker image size?',
              a: 'Multi-stage builds, Alpine-based images, .dockerignore to exclude build artifacts, minimize layers (combine RUN commands), use specific tags (not :latest), layer caching (COPY pom.xml before src), distroless images for production.',
            },
          ]
        },
        {
          heading: 'Kubernetes & Helm',
          qas: [
            {
              q: 'Explain Kubernetes architecture and key components.',
              a: 'Control plane: API Server (entry point), etcd (state store), Scheduler (pod placement), Controller Manager (desired state). Worker nodes: kubelet (manages pods), kube-proxy (networking), container runtime. Key objects: Pod (smallest unit), Deployment (declarative updates), Service (stable networking), Ingress (external access).',
              code: `# Kubernetes Deployment for Employee Service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: employee-service
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
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8081
          initialDelaySeconds: 30
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8081
          initialDelaySeconds: 60
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: "kubernetes"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
---
apiVersion: v1
kind: Service
metadata:
  name: employee-service
spec:
  selector:
    app: employee-service
  ports:
  - port: 8081
    targetPort: 8081`
            },
            {
              q: 'What is Helm and why use it?',
              a: 'Helm is a K8s package manager. Charts are templated K8s manifests with values.yaml for customization. Benefits: reusable templates, environment-specific values (dev/prod), versioned releases, rollback capability, dependency management.',
            },
            {
              q: 'How do you handle K8s ConfigMaps and Secrets?',
              a: 'ConfigMaps for non-sensitive config (application properties, feature flags). Secrets for sensitive data (DB passwords, JWT keys, API tokens). Both mounted as env vars or volumes. Secrets are base64-encoded (use Sealed Secrets or external-secrets for encryption).',
            },
          ]
        },
        {
          heading: 'CI/CD & Terraform',
          qas: [
            {
              q: 'Describe your CI/CD pipeline.',
              a: 'GitHub Actions: 1) Push triggers pipeline, 2) Build (Maven/npm), 3) Unit tests + integration tests, 4) SonarQube code quality analysis, 5) Docker build (multi-stage), 6) Push to ECR, 7) Deploy to K8s (kubectl apply or helm upgrade). 8 pipelines total, one per service.',
              code: `# .github/workflows/employee-service.yml
name: Employee Service CI/CD
on:
  push:
    paths: ['employee-microservice/**']
jobs:
  build-test-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-java@v4
      with:
        java-version: '17'
        distribution: 'temurin'
    - name: Build & Test
      run: cd employee-microservice && mvn verify
    - name: SonarQube Analysis
      run: mvn sonar:sonar -Dsonar.token=\${{ secrets.SONAR_TOKEN }}
    - name: Build Docker Image
      run: docker build -t employee-service:latest employee-microservice/
    - name: Push to ECR
      run: |
        aws ecr get-login-password | docker login --username AWS --password-stdin \$ECR_URI
        docker tag employee-service:latest \$ECR_URI/employee-service:latest
        docker push \$ECR_URI/employee-service:latest
    - name: Deploy to K8s
      run: kubectl apply -k k8s/overlays/production/`
            },
            {
              q: 'What is Terraform and how do you use Infrastructure as Code?',
              a: 'Terraform provisions cloud infrastructure declaratively. Define desired state in HCL, Terraform plans and applies changes. Our setup: VPC, EKS cluster, RDS PostgreSQL, ElastiCache Redis, MSK Kafka, S3, ECR. State stored in S3 backend. Workspaces for dev/staging/prod.',
              code: `# terraform/main.tf
provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  name    = "\${var.project}-vpc"
  cidr    = "10.0.0.0/16"
  azs     = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
  enable_nat_gateway = true
}

module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  cluster_name    = "\${var.project}-cluster"
  cluster_version = "1.28"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets
  eks_managed_node_groups = {
    main = {
      instance_types = ["t3.medium"]
      min_size = 2
      max_size = 5
      desired_size = 3
    }
  }
}

resource "aws_db_instance" "postgres" {
  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.t3.micro"
  db_name        = "employeedb"
  username       = var.db_username
  password       = var.db_password
  vpc_security_group_ids = [aws_security_group.db.id]
}`
            },
          ]
        },
      ]
    },
    // ─── 8. FRONTEND (REACT & ANGULAR) ──────────────────
    {
      title: 'Frontend - React & Angular',
      icon: '⚛️',
      topics: [
        {
          heading: 'React Deep Dive',
          qas: [
            {
              q: 'Explain React hooks: useState, useEffect, useCallback, useMemo, useRef.',
              a: 'useState: state management in functional components. useEffect: side effects (API calls, subscriptions) with cleanup. useCallback: memoize functions (prevents child re-renders). useMemo: memoize computed values (expensive calculations). useRef: persist mutable values across renders without triggering re-render.',
              code: `// Custom hook combining multiple hooks
function useEmployees(department) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetchEmployees = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const res = await fetch(
        \\\`/api/employees?dept=\\\${department}\\\`,
        { signal: abortRef.current.signal });
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err);
    } finally {
      setLoading(false);
    }
  }, [department]);

  useEffect(() => {
    fetchEmployees();
    return () => abortRef.current?.abort(); // Cleanup
  }, [fetchEmployees]);

  const sortedEmployees = useMemo(() =>
    [...employees].sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [employees]
  );

  return { employees: sortedEmployees, loading, error, refetch: fetchEmployees };
}`
            },
            {
              q: 'Explain Redux Toolkit and when to use it vs other state managers.',
              a: 'Redux Toolkit: global app state (user auth, preferences). Uses createSlice (reducers + actions), createAsyncThunk (async ops), RTK Query (API caching). TanStack Query: server state (API data caching, refetching, pagination). Zustand: lightweight local state. Use Redux for complex client state, TanStack for server state.',
              code: `// Redux Toolkit slice
const employeeSlice = createSlice({
  name: 'employees',
  initialState: { list: [], status: 'idle', error: null },
  reducers: {
    setFilter: (state, action) => { state.filter = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

// TanStack Query - server state
function EmployeeList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', department],
    queryFn: () => api.getEmployees(department),
    staleTime: 5 * 60 * 1000, // 5 min cache
    retry: 3,
  });

  const mutation = useMutation({
    mutationFn: api.createEmployee,
    onSuccess: () => queryClient.invalidateQueries(['employees']),
  });
}`
            },
            {
              q: 'Explain React performance optimization techniques.',
              a: 'React.memo (prevent unnecessary re-renders), useMemo/useCallback (memoization), React.lazy + Suspense (code splitting), react-window (virtualized lists for 100k+ rows), useTransition (non-blocking UI updates), React Profiler for bottleneck identification.',
              code: `// Virtualized list with react-window
import { FixedSizeList } from 'react-window';

const VirtualEmployeeList = ({ employees }) => (
  <FixedSizeList
    height={600}
    itemCount={employees.length}
    itemSize={60}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <EmployeeRow data={employees[index]} />
      </div>
    )}
  </FixedSizeList>
);

// Code splitting with lazy loading
const AnalyticsDashboard = React.lazy(() =>
  import('./components/AnalyticsDashboard'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/analytics" element={<AnalyticsDashboard />} />
      </Routes>
    </Suspense>
  );
}`
            },
          ]
        },
        {
          heading: 'Angular Concepts',
          qas: [
            {
              q: 'Explain Angular standalone components and signals.',
              a: 'Standalone components (Angular 17+): no NgModule required, declare dependencies directly in @Component. Signals: reactive primitives for fine-grained change detection. signal() for state, computed() for derived values, effect() for side effects. Replaces zone.js-based change detection.',
              code: `// Standalone component with signals
@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule],
  template: \\\`
    <mat-table [dataSource]="employees()">
      <ng-container matColumnDef="name">
        <mat-header-cell *matHeaderCellDef>Name</mat-header-cell>
        <mat-cell *matCellDef="let emp">{{emp.firstName}} {{emp.lastName}}</mat-cell>
      </ng-container>
    </mat-table>
    <p>Total: {{employeeCount()}}</p>
  \\\`
})
export class EmployeeListComponent {
  private empService = inject(EmployeeService);
  employees = signal<Employee[]>([]);
  employeeCount = computed(() => this.employees().length);

  constructor() {
    effect(() => console.log('Employees changed:', this.employees().length));
    this.empService.getAll().subscribe(data => this.employees.set(data));
  }
}`
            },
            {
              q: 'What is the difference between React and Angular?',
              a: 'React: library (view only), JSX, virtual DOM, one-way data flow, requires choosing state management/routing. Angular: full framework, TypeScript-first, real DOM with change detection, two-way binding, built-in DI/routing/forms/HTTP. React is more flexible, Angular more opinionated. Both work well for enterprise apps.',
            },
          ]
        },
      ]
    },
    // ─── 9. OBSERVABILITY & MONITORING ──────────────────
    {
      title: 'Observability & Monitoring',
      icon: '📊',
      topics: [
        {
          heading: 'Metrics, Logs & Traces',
          qas: [
            {
              q: 'Explain the three pillars of observability.',
              a: 'Metrics: numeric measurements over time (Micrometer → Prometheus → Grafana). Request rate, error rate, latency percentiles (p50, p95, p99), JVM memory, thread count. Logs: timestamped events (Logback → Logstash → Elasticsearch → Kibana). Structured JSON logs with correlation IDs. Traces: request path across services (Micrometer Tracing/Brave → Zipkin). Trace = collection of spans across services.',
            },
            {
              q: 'How do you implement distributed tracing?',
              a: 'Micrometer Tracing with Brave: each request gets a trace ID at the gateway. As the request flows through services, each creates a span with the same trace ID. Headers (traceparent/X-B3-TraceId) propagate context. Zipkin collects and visualizes the full request waterfall.',
              code: `// application.yml - tracing config
management:
  tracing:
    sampling:
      probability: 1.0  # 100% in dev, lower in prod
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans

// Custom span
@Service
public class EmployeeService {
    private final Tracer tracer;

    public Employee processEmployee(EmployeeRequest req) {
        Span span = tracer.nextSpan().name("process-employee").start();
        try (Tracer.SpanInScope ws = tracer.withSpan(span)) {
            span.tag("employee.department", req.getDepartment());
            // business logic
            return result;
        } finally {
            span.end();
        }
    }
}`
            },
            {
              q: 'Explain custom Prometheus metrics.',
              a: 'Counter (monotonically increasing, e.g., total requests), Gauge (value that goes up/down, e.g., active connections), Histogram (distribution, e.g., request duration), Summary (similar to histogram, calculates percentiles client-side).',
              code: `// Custom metrics with Micrometer
@Component
public class EmployeeMetrics {
    private final Counter createCounter;
    private final Timer processTimer;
    private final AtomicInteger activeEmployees;

    public EmployeeMetrics(MeterRegistry registry) {
        createCounter = Counter.builder("employees.created.total")
            .description("Total employees created")
            .tag("service", "employee")
            .register(registry);

        processTimer = Timer.builder("employees.process.duration")
            .description("Employee processing time")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);

        activeEmployees = registry.gauge("employees.active",
            new AtomicInteger(0));
    }

    public void recordCreate() { createCounter.increment(); }
    public void recordProcessTime(Runnable task) { processTimer.record(task); }
}`
            },
          ]
        },
      ]
    },
    // ─── 10. TESTING ──────────────────
    {
      title: 'Testing Strategies',
      icon: '🧪',
      topics: [
        {
          heading: 'Unit, Integration & E2E Testing',
          qas: [
            {
              q: 'Describe your testing pyramid and strategy.',
              a: 'Unit tests (JUnit 5 + Mockito): test individual classes in isolation. Integration tests (@SpringBootTest + Testcontainers): test with real DB/Kafka. Contract tests: verify API contracts between services. E2E tests (Playwright): full browser-based testing. Quality gates: >80% coverage, all tests pass before merge.',
              code: `// Unit test with Mockito
@ExtendWith(MockitoExtension.class)
class EmployeeServiceTest {
    @Mock private EmployeeRepository repository;
    @Mock private KafkaTemplate<String, Object> kafka;
    @InjectMocks private EmployeeService service;

    @Test
    void createEmployee_shouldSaveAndPublishEvent() {
        EmployeeRequest req = new EmployeeRequest("John", "Doe", "john@test.com");
        Employee saved = Employee.builder().id(1L).firstName("John").build();
        when(repository.save(any())).thenReturn(saved);

        Employee result = service.createEmployee(req);

        assertThat(result.getId()).isEqualTo(1L);
        verify(repository).save(any(Employee.class));
        verify(kafka).send(eq("employee-events"), any());
    }

    @Test
    void getEmployee_notFound_shouldThrow() {
        when(repository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
            () -> service.getEmployee(99L));
    }
}

// Integration test with Testcontainers
@SpringBootTest
@Testcontainers
class EmployeeIntegrationTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.5.0"));

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @Test
    void fullEmployeeLifecycle() {
        // Create, Read, Update, Delete with real DB
    }
}`
            },
            {
              q: 'What is Testcontainers and why use it?',
              a: 'Testcontainers provides lightweight, disposable Docker containers for integration tests. Real PostgreSQL, Kafka, Redis, Elasticsearch instead of mocks or H2. Tests run against actual infrastructure. Containers start before tests, stop after. Ensures dev-prod parity.',
            },
            {
              q: 'How do you test React components?',
              a: 'Jest + React Testing Library for unit/component tests. Test user behavior, not implementation. Playwright for E2E tests. MSW (Mock Service Worker) for API mocking.',
              code: `// React Testing Library
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

test('displays employees after loading', async () => {
  render(<EmployeeList />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});

test('creates employee on form submit', async () => {
  const user = userEvent.setup();
  render(<CreateEmployeeForm />);

  await user.type(screen.getByLabelText('First Name'), 'Jane');
  await user.type(screen.getByLabelText('Email'), 'jane@test.com');
  await user.click(screen.getByRole('button', { name: /create/i }));

  await waitFor(() => {
    expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
  });
});

// Playwright E2E test
test('employee CRUD flow', async ({ page }) => {
  await page.goto('/employees');
  await page.click('text=Add Employee');
  await page.fill('[name="firstName"]', 'Test');
  await page.fill('[name="email"]', 'test@e2e.com');
  await page.click('button:has-text("Save")');
  await expect(page.locator('text=Test')).toBeVisible();
});`
            },
          ]
        },
      ]
    },
    // ─── 11. SYSTEM DESIGN ──────────────────
    {
      title: 'System Design & Architecture',
      icon: '🏛️',
      topics: [
        {
          heading: 'System Design Questions',
          qas: [
            {
              q: 'How would you design a notification system at scale?',
              a: 'Like our NotificationService: API receives notification request → validates → picks strategy (Email/SMS/Push/InApp) → publishes to Kafka topic partitioned by channel → consumer groups per channel process independently → retry with DLQ for failures → track delivery status. Scale: partition Kafka by channel, add consumers per partition, use Redis for rate limiting, batch processing for bulk notifications.',
            },
            {
              q: 'How would you handle 10 million employee records?',
              a: 'Database: read replicas, connection pooling (HikariCP), query optimization (indexes, EXPLAIN ANALYZE). API: pagination (cursor-based for large datasets), response compression. Caching: Redis for hot data. Search: Elasticsearch for full-text search. Processing: Kafka for async bulk operations. Frontend: virtual scrolling (react-window).',
            },
            {
              q: 'Design a real-time dashboard for monitoring.',
              a: 'Like our setup: services expose /actuator/prometheus endpoints → Prometheus scrapes every 15s → stores time-series data → Grafana queries Prometheus for visualization. WebSocket for real-time updates to browser. Custom metrics (Counter, Gauge, Histogram) for business KPIs. Alerts via Alertmanager for threshold breaches.',
            },
            {
              q: 'How do you handle graceful shutdown in microservices?',
              a: 'De-register from Eureka (stop receiving new requests) → drain in-flight requests → close Kafka consumers (commit offsets) → flush outbox events → close DB connection pool → terminate JVM. Spring Boot shutdown hooks handle this. K8s sends SIGTERM, waits terminationGracePeriodSeconds, then SIGKILL.',
              code: `// Graceful shutdown config
@Configuration
public class GracefulShutdownConfig {
    @Bean
    public GracefulShutdown gracefulShutdown() {
        return new GracefulShutdown();
    }
}

// application.yml
server:
  shutdown: graceful
spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s

# Kubernetes
spec:
  terminationGracePeriodSeconds: 60
  containers:
    - lifecycle:
        preStop:
          exec:
            command: ["sh", "-c", "sleep 10"]  # Allow deregistration`
            },
          ]
        },
      ]
    },
    // ─── 12. BEHAVIORAL & SOFT SKILLS ──────────────────
    {
      title: 'Behavioral & Project Experience',
      icon: '💬',
      topics: [
        {
          heading: 'Project Discussion',
          qas: [
            {
              q: 'Walk me through your most challenging technical decision.',
              a: 'Choosing between Choreography and Orchestration for the Saga pattern. Choreography seemed simpler but became hard to trace and debug. Switched to Orchestration with SagaOrchestrator for visibility and control. Trade-off: central coordinator is a single point, but we added persistence (SagaInstance table) and health monitoring.',
            },
            {
              q: 'How do you handle technical debt?',
              a: 'Track it explicitly: ADRs (Architecture Decision Records) document decisions and known trade-offs. SonarQube tracks code smells, duplication, coverage. Allocate 20% sprint capacity for tech debt. Prioritize by impact: security issues first, then performance, then maintainability.',
            },
            {
              q: 'Describe a production incident you handled.',
              a: 'Scenario: Employee service OOM in production. Detection: Grafana alert on JVM heap > 90%. Diagnosis: Zipkin traces showed slow queries, Kibana logs showed N+1 queries loading all employees with addresses. Fix: Added @BatchSize annotation, implemented pagination, added Redis cache for hot data. Prevention: Set up memory alerts, load testing in CI.',
            },
            {
              q: 'How do you ensure code quality in a team?',
              a: 'PR reviews (min 2 reviewers), SonarQube quality gates (>80% coverage, zero critical issues), consistent coding standards (Checkstyle, ESLint), ADR documentation for architecture decisions, pair programming for complex features, automated testing in CI pipeline.',
            },
          ]
        },
      ]
    },
  ]
};
