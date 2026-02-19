// Architecture Data — Employee Platform Microservices
// This file contains all the metadata for the interactive architecture explorer

const ARCH_DATA = {
  project: {
    name: 'Employee Platform — Microservices Architecture',
    version: '1.0.0',
    springBoot: '3.2.0',
    springCloud: '2023.0.0',
    java: 17,
    totalServices: 6,
    totalClasses: 173,
    totalPatterns: 42,
    totalTechnologies: 89
  },

  services: {
    eureka: {
      id: 'eureka',
      name: 'Eureka Discovery Server',
      type: 'INFRASTRUCTURE',
      port: 8761,
      icon: '🔍',
      color: '#bc8cff',
      description: 'Netflix Eureka — Service Discovery & Registry. All microservices register here and discover each other dynamically.',
      basePackage: 'com.example.eureka',
      classes: ['EurekaServerApplication.java'],
      technologies: ['Spring Cloud Netflix Eureka Server', 'Spring Boot Actuator'],
      patterns: ['Service Registry', 'Service Discovery', 'Self-Registration'],
      apis: [
        { method: 'GET', path: '/eureka/apps', desc: 'List all registered services' },
        { method: 'GET', path: '/eureka/apps/{appId}', desc: 'Get instances of a service' },
      ],
      dockerFile: 'eureka-discovery-server/Dockerfile',
      k8sManifest: 'k8s/services/eureka-server.yaml',
      helmTemplate: 'helm/employee-platform/templates/eureka-server.yaml',
      interviewNotes: [
        'Eureka uses client-side discovery — clients query the registry directly',
        'Heartbeat mechanism — services send heartbeats every 30s (default)',
        'Self-preservation mode — prevents mass de-registration during network partitions',
        'Peer-to-peer replication for high availability in production',
      ],
    },

    config: {
      id: 'config',
      name: 'Config Server',
      type: 'INFRASTRUCTURE',
      port: 8888,
      icon: '⚙️',
      color: '#bc8cff',
      description: 'Spring Cloud Config Server — Centralized configuration management for all microservices. Supports native filesystem and Git backends.',
      basePackage: 'com.example.config',
      classes: ['ConfigServerApplication.java'],
      technologies: ['Spring Cloud Config Server (native + git)', 'Spring Cloud Eureka Client', 'Spring Boot Actuator', 'Spring Security'],
      patterns: ['Externalized Configuration', 'Config-First Bootstrap', 'Environment-Specific Profiles'],
      configFiles: ['application.yml (shared)', 'employee-service.yml', 'payroll-service.yml', 'notification-service.yml', 'api-gateway.yml'],
      apis: [
        { method: 'GET', path: '/{app}/{profile}', desc: 'Get config for app & profile' },
        { method: 'POST', path: '/actuator/refresh', desc: 'Trigger config refresh' },
      ],
      dockerFile: 'config-server/Dockerfile',
      k8sManifest: 'k8s/services/config-server.yaml',
      helmTemplate: 'helm/employee-platform/templates/config-server.yaml',
      interviewNotes: [
        'Config Server externalizes configuration — 12-factor app principle',
        'Supports @RefreshScope for runtime config updates without restart',
        'Encryption/decryption of sensitive properties (passwords, keys)',
        'Config-first bootstrap: services fetch config before starting',
      ],
    },

    gateway: {
      id: 'gateway',
      name: 'API Gateway',
      type: 'INFRASTRUCTURE',
      port: 8080,
      icon: '🚪',
      color: '#bc8cff',
      description: 'Spring Cloud Gateway — Single entry point for all clients. Routes requests, applies rate limiting, circuit breaking, and cross-cutting concerns.',
      basePackage: 'com.example.gateway',
      classes: ['ApiGatewayApplication.java', 'config/GatewayConfig.java', 'controller/FallbackController.java', 'filter/LoggingFilter.java'],
      technologies: [
        'Spring Cloud Gateway (Reactive WebFlux)', 'Spring Cloud Eureka Client', 'Spring Cloud Config Client',
        'Resilience4j Circuit Breaker (Reactor)', 'Spring Data Redis Reactive (rate limiting)',
        'Micrometer Tracing (Brave) + Zipkin', 'Micrometer Prometheus', 'Logstash Logback Encoder',
      ],
      patterns: ['API Gateway / Edge Server', 'Service Discovery (via Eureka)', 'Circuit Breaker', 'Rate Limiting (Redis-backed)', 'Distributed Tracing', 'Load Balancing'],
      routes: [
        { id: 'employee-service', uri: 'lb://employee-service', path: '/employee-service/**' },
        { id: 'payroll-service', uri: 'lb://payroll-service', path: '/payroll-service/**' },
        { id: 'notification-service', uri: 'lb://notification-service', path: '/notification-service/**' },
        { id: 'employee-api', uri: 'lb://employee-service', path: '/api/v1/employees/**, /api/auth/**, /api/sagas/**' },
        { id: 'payroll-api', uri: 'lb://payroll-service', path: '/api/payrolls/**' },
        { id: 'notification-api', uri: 'lb://notification-service', path: '/api/v1/notifications/**, /graphql/**' },
      ],
      dockerFile: 'api-gateway-service/Dockerfile',
      k8sManifest: 'k8s/services/api-gateway.yaml',
      helmTemplate: 'helm/employee-platform/templates/api-gateway.yaml',
      interviewNotes: [
        'Gateway is non-blocking (Spring WebFlux/Project Reactor) — handles 10x more concurrent connections vs servlet',
        'RequestRateLimiter uses Redis to track request counts across gateway instances',
        'Circuit Breaker fallback returns graceful degraded responses',
        'Pre/Post filters add correlation IDs, logging, security headers',
        'CORS configured for React (3000) and Angular (4200/4201) frontends',
      ],
    },

    employee: {
      id: 'employee',
      name: 'Employee Service',
      type: 'BUSINESS',
      port: 8081,
      icon: '👤',
      color: '#3fb950',
      description: 'Core domain service — Employee CRUD, search, onboarding saga, event sourcing, CQRS with Elasticsearch read model, outbox pattern for reliable messaging.',
      basePackage: 'com.example.employee',
      classGroups: {
        'Controllers': ['controller/EmployeeController.java', 'controller/AuthController.java', 'controller/MetricsController.java', 'controller/SagaController.java', 'controller/SearchController.java'],
        'Services': ['service/EmployeeService.java', 'service/AsyncEmployeeService.java', 'service/AuditLogService.java', 'service/EmployeeSearchService.java', 'service/KafkaConsumerService.java', 'service/KafkaProducerService.java'],
        'Repositories': ['repository/EmployeeRepository.java', 'repository/RoleRepository.java', 'repository/UserRepository.java', 'repository/elasticsearch/EmployeeSearchRepository.java', 'repository/mongo/AuditLogRepository.java'],
        'Models & DTOs': ['model/Employee.java', 'model/User.java', 'model/Role.java', 'dto/EmployeeDTO.java', 'dto/EmployeeCreateDTO.java', 'dto/EmployeeUpdateDTO.java', 'dto/CursorPage.java', 'dto/JwtResponse.java', 'dto/LoginRequest.java', 'dto/RegisterRequest.java'],
        'Saga Pattern': ['saga/EmployeeOnboardingSaga.java', 'saga/SagaOrchestrator.java', 'saga/SagaInstance.java', 'saga/SagaInstanceRepository.java', 'saga/SagaManagementService.java', 'saga/dto/EmployeeOnboardingData.java'],
        'Outbox Pattern': ['outbox/OutboxEvent.java', 'outbox/OutboxEventPublisher.java', 'outbox/OutboxEventRepository.java', 'outbox/OutboxPublisher.java', 'outbox/OutboxRepository.java', 'outbox/OutboxService.java'],
        'Event Sourcing': ['eventsourcing/EventSourcingService.java', 'eventsourcing/EventStore.java', 'eventsourcing/EventStoreRepository.java'],
        'Security (JWT)': ['security/CustomUserDetailsService.java', 'security/JwtAuthenticationFilter.java', 'security/JwtTokenProvider.java'],
        'Config': ['config/AsyncConfig.java', 'config/AuditConfig.java', 'config/DataSourceConfig.java', 'config/GracefulShutdownConfig.java', 'config/KafkaConfig.java', 'config/LoadBalancerConfig.java', 'config/OpenApiConfig.java', 'config/RedisConfig.java', 'config/ReplicationRoutingDataSource.java', 'config/SecurityConfig.java'],
        'AOP Aspects': ['aspect/AuditableAspect.java', 'aspect/LoggingAspect.java', 'aspect/PerformanceAspect.java', 'annotation/Auditable.java'],
        'Kafka': ['kafka/AsyncRequestReplyHandler.java', 'kafka/KafkaDLQHandler.java'],
        'Batch Processing': ['batch/BatchConfiguration.java', 'batch/BatchJobScheduler.java'],
        'Anti-Corruption Layer': ['anticorruption/LegacyPayrollIntegrationService.java', 'anticorruption/LegacyPayrollSystemAdapter.java', 'anticorruption/LegacyPayrollSystemDTO.java'],
        'Cross-Cutting': ['filter/CorrelationIdFilter.java', 'featureflag/FeatureFlag.java', 'featureflag/FeatureFlagAspect.java', 'idempotency/IdempotencyKey.java', 'idempotency/IdempotencyInterceptor.java', 'idempotency/IdempotencyConfig.java', 'lock/DistributedLock.java', 'lock/DistributedLockAspect.java', 'multitenancy/TenantContext.java', 'multitenancy/TenantFilter.java'],
        'WebSocket & Webhooks': ['websocket/WebSocketConfig.java', 'websocket/WebSocketNotificationService.java', 'websocket/NotificationMessage.java', 'webhook/WebhookService.java', 'webhook/WebhookRegistration.java'],
        'Health & Metrics': ['health/DatabaseHealthIndicator.java', 'health/KafkaHealthIndicator.java', 'health/RedisHealthIndicator.java', 'metrics/MetricsService.java'],
        'Exceptions': ['exception/GlobalExceptionHandler.java', 'exception/ResourceNotFoundException.java', 'exception/DuplicateResourceException.java', 'exception/ErrorResponse.java'],
        'OpenFeign Clients': ['client/PayrollServiceClient.java', 'client/PayrollServiceFallback.java', 'client/PayrollCreateRequest.java', 'client/PayrollResponse.java'],
        'Mappers': ['mapper/EmployeeMapper.java (MapStruct)', 'mapper/EmployeeManualMapper.java'],
        'Documents': ['document/AuditLog.java (MongoDB)', 'document/EmployeeSearchDocument.java (Elasticsearch)'],
      },
      databases: [
        { name: 'PostgreSQL', db: 'employeedb', port: 5432, purpose: 'Primary data store (JPA/Hibernate)' },
        { name: 'MongoDB', db: 'employee_audit_db', port: 27017, purpose: 'Audit log storage' },
        { name: 'Elasticsearch', index: 'employees', port: 9200, purpose: 'Full-text search (CQRS read model)' },
        { name: 'Redis', port: 6379, purpose: 'Cache, distributed locks, idempotency keys' },
      ],
      messaging: { broker: 'Kafka', topics: ['employee-events'], consumerGroup: 'employee-service-group' },
      technologies: [
        'Spring Boot 3.2.0', 'Spring Data JPA', 'Spring Data Redis', 'Spring Data MongoDB',
        'Spring Data Elasticsearch', 'Spring Kafka', 'Spring Batch', 'Spring WebSocket',
        'Spring Security + JWT (jjwt 0.12.3)', 'Spring AOP', 'Spring Cloud Eureka Client',
        'Spring Cloud Config Client', 'Spring Cloud OpenFeign', 'Spring Cloud LoadBalancer',
        'Resilience4j (Circuit Breaker, Retry, Rate Limiter, Bulkhead)', 'Flyway 5 migrations',
        'MapStruct 1.5.5', 'Lombok', 'Springdoc OpenAPI 2.3.0', 'Micrometer Prometheus',
        'Micrometer Tracing (Brave) + Zipkin', 'Logstash Logback Encoder 7.4',
        'Testcontainers 1.19.3', 'JaCoCo',
      ],
      patterns: [
        'Saga Pattern (Orchestrated)', 'Outbox Pattern', 'Event Sourcing', 'CQRS',
        'Circuit Breaker', 'Anti-Corruption Layer', 'Distributed Locking',
        'Idempotency Key', 'Correlation ID Tracing', 'Multi-Tenancy',
        'Feature Flags', 'Webhook Pattern', 'Cursor-based Pagination',
        'Batch Processing', 'Read/Write Splitting', 'Graceful Shutdown',
        'Repository Pattern', 'DTO Pattern (MapStruct)',
      ],
      flywayMigrations: ['V1__Initial_schema.sql', 'V2__Create_outbox_table.sql', 'V3__Add_soft_delete_and_tenant_columns.sql', 'V4__Create_event_store_table.sql', 'V5__Create_webhook_registrations_table.sql'],
      tests: ['EmployeeControllerTest', 'EmployeeServiceTest', 'EmployeeRepositoryTest', 'EmployeeMapperTest', 'EmployeeIntegrationTest', 'EmployeeTestcontainersIT'],
      dockerFile: 'employee-microservice/Dockerfile',
      k8sManifest: 'k8s/services/employee-service.yaml',
      helmTemplate: 'helm/employee-platform/templates/employee-service.yaml',
      interviewNotes: [
        'CQRS separates reads (Elasticsearch) from writes (PostgreSQL) — enables independent scaling',
        'Saga Pattern: Orchestrated saga for employee onboarding — creates employee, sets up payroll, sends notification. Supports compensation (rollback) on failure',
        'Outbox Pattern: Events written to outbox table in same transaction as business data, then published to Kafka by OutboxPublisher — guarantees exactly-once delivery',
        'Event Sourcing: All state changes stored as immutable events in EventStore — enables full audit trail and temporal queries',
        'Anti-Corruption Layer: Isolates legacy payroll integration behind clean interface — prevents domain model pollution',
        'Distributed Lock (Redis): Prevents concurrent modification in multi-instance deployments',
        'MapStruct for compile-time type-safe DTO mapping — zero reflection overhead at runtime',
      ],
    },

    payroll: {
      id: 'payroll',
      name: 'Payroll Service',
      type: 'BUSINESS',
      port: 8083,
      icon: '💰',
      color: '#3fb950',
      description: 'Payroll Management — Salary computation, payment transactions, salary components. Consumes employee events from Kafka.',
      basePackage: 'com.example.payroll',
      classGroups: {
        'Controllers': ['controller/PayrollController.java'],
        'Services': ['service/PayrollService.java', 'service/KafkaConsumerService.java', 'service/KafkaProducerService.java'],
        'Repositories': ['repository/PayrollRepository.java', 'repository/PaymentTransactionRepository.java', 'repository/SalaryComponentRepository.java'],
        'Models & DTOs': ['model/Payroll.java', 'model/PaymentTransaction.java', 'model/SalaryComponent.java', 'dto/PayrollRequest.java', 'dto/PayrollResponse.java', 'dto/PayrollUpdateRequest.java', 'dto/EmployeeDTO.java', 'dto/SalaryComponentRequest.java', 'dto/SalaryComponentResponse.java'],
        'Config': ['config/AsyncConfig.java', 'config/KafkaConfig.java', 'config/OpenApiConfig.java', 'config/RedisConfig.java', 'config/SecurityConfig.java'],
        'OpenFeign Client': ['client/EmployeeClient.java'],
        'Exception Handling': ['exception/GlobalExceptionHandler.java', 'exception/ResourceNotFoundException.java', 'exception/DuplicateResourceException.java', 'exception/PayrollProcessingException.java', 'exception/ErrorResponse.java'],
        'Health Checks': ['health/DatabaseHealthIndicator.java', 'health/KafkaHealthIndicator.java', 'health/RedisHealthIndicator.java'],
        'Distributed Lock': ['lock/DistributedLock.java', 'lock/DistributedLockAspect.java'],
        'Mappers': ['mapper/PayrollMapper.java', 'mapper/SalaryComponentMapper.java'],
        'Events': ['event/PayrollEvent.java'],
      },
      databases: [
        { name: 'PostgreSQL', db: 'payrolldb', port: 5432, purpose: 'Primary data store' },
        { name: 'Redis', port: 6379, purpose: 'Cache, distributed locks' },
      ],
      messaging: { broker: 'Kafka', consumerGroup: 'payroll-service-group' },
      technologies: [
        'Spring Boot 3.2.0', 'Spring Data JPA', 'Spring Data Redis', 'Spring Kafka',
        'Spring Security + JWT', 'Spring Cloud Eureka Client', 'Spring Cloud Config Client',
        'Spring Cloud OpenFeign', 'Resilience4j (Circuit Breaker, Retry, Rate Limiter, Bulkhead)',
        'Flyway 3 migrations', 'Lombok', 'Springdoc OpenAPI 2.3.0', 'Micrometer Prometheus',
        'Micrometer Tracing (Brave) + Zipkin', 'Logstash Logback Encoder 7.4', 'JaCoCo',
      ],
      patterns: ['Circuit Breaker', 'Retry with Exponential Backoff', 'Rate Limiting', 'Distributed Locking', 'Repository Pattern', 'DTO Pattern', 'Inter-service Communication (OpenFeign)'],
      flywayMigrations: ['V1__Create_payroll_tables.sql', 'V2__Insert_sample_data.sql', 'V3__Add_soft_delete_columns.sql'],
      tests: ['PayrollControllerTest', 'PayrollServiceTest', 'PayrollRepositoryTest'],
      dockerFile: 'payroll-microservice/Dockerfile',
      k8sManifest: 'k8s/services/payroll-service.yaml',
      helmTemplate: 'helm/employee-platform/templates/payroll-service.yaml',
      interviewNotes: [
        'OpenFeign client calls Employee Service with Circuit Breaker — prevents cascade failure',
        'Retry with exponential backoff for transient failures',
        'Distributed lock prevents duplicate payroll processing',
        'Database-per-service pattern — payrolldb is separate from employeedb',
      ],
    },

    notification: {
      id: 'notification',
      name: 'Notification Service',
      type: 'BUSINESS',
      port: 8084,
      icon: '🔔',
      color: '#3fb950',
      description: 'Multi-channel notification service — Email, SMS, Push, In-App. Features GraphQL API, HATEOAS REST, Strategy/Template/Factory patterns, rate limiting.',
      basePackage: 'com.example.notification',
      classGroups: {
        'Controllers': ['controller/NotificationController.java (REST + HATEOAS)', 'controller/FileController.java'],
        'GraphQL': ['graphql/NotificationGraphQLController.java'],
        'Services': ['service/NotificationService.java (interface)', 'service/NotificationServiceImpl.java'],
        'Repositories': ['repository/NotificationRepository.java', 'repository/NotificationSpecification.java'],
        'Models & DTOs': ['model/Notification.java', 'model/NotificationChannel.java (enum)', 'dto/NotificationRequest.java', 'dto/NotificationResponse.java', 'dto/NotificationFilter.java'],
        'Strategy Pattern': ['strategy/NotificationStrategy.java (interface)', 'strategy/NotificationStrategyFactory.java', 'strategy/EmailNotificationStrategy.java', 'strategy/SmsNotificationStrategy.java', 'strategy/PushNotificationStrategy.java', 'strategy/InAppNotificationStrategy.java'],
        'Template Method': ['template/AbstractNotificationProcessor.java', 'template/BulkNotificationProcessor.java', 'template/UrgentNotificationProcessor.java'],
        'Event System': ['event/NotificationCreatedEvent.java', 'event/NotificationEventListener.java'],
        'Kafka': ['kafka/KafkaConsumerService.java', 'kafka/KafkaProducerService.java'],
        'Config': ['config/AsyncConfig.java', 'config/CacheConfig.java', 'config/KafkaConfig.java', 'config/RateLimitConfig.java'],
        'Scheduler': ['scheduler/NotificationScheduler.java'],
        'Mappers': ['mapper/NotificationMapper.java (MapStruct)'],
        'Exceptions': ['exception/GlobalExceptionHandler.java', 'exception/NotificationNotFoundException.java', 'exception/RateLimitExceededException.java'],
      },
      graphql: {
        queries: ['notification(id)', 'notificationsByRecipient', 'searchNotifications', 'unreadCount'],
        mutations: ['createNotification', 'markAsRead', 'markAllAsRead', 'deleteNotification'],
        types: ['Notification', 'NotificationPage'],
        enums: ['ChannelType(EMAIL, SMS, PUSH, IN_APP)', 'NotificationStatus(PENDING, PROCESSING, SENT, DELIVERED, READ, FAILED, CANCELLED)', 'Priority(LOW, NORMAL, HIGH, URGENT)'],
      },
      databases: [
        { name: 'H2/PostgreSQL', db: 'notificationdb', purpose: 'Primary data store (H2 dev, Postgres prod)' },
        { name: 'Redis', port: 6379, purpose: 'Cache' },
      ],
      messaging: { broker: 'Kafka', consumerGroup: 'notification-group' },
      technologies: [
        'Spring Boot 3.2.0', 'Spring Data JPA', 'Spring Boot GraphQL', 'Spring HATEOAS',
        'Spring Data Redis', 'Spring Kafka', 'Spring Boot Mail', 'Spring AOP',
        'Spring Cloud Eureka Client', 'Spring Cloud Config Client',
        'Flyway 2 migrations', 'MapStruct 1.5.5', 'Lombok',
        'Bucket4j (token-bucket rate limiting)', 'Springdoc OpenAPI 2.3.0',
        'Micrometer Prometheus', 'Micrometer Tracing (Brave) + Zipkin',
        'Logstash Logback Encoder 7.4', 'Testcontainers 1.19.3',
      ],
      patterns: [
        'Strategy Pattern (notification channels)', 'Factory Pattern',
        'Template Method Pattern (processors)', 'Observer Pattern (Spring Events)',
        'Specification Pattern (JPA dynamic queries)', 'HATEOAS (REST Level 3)',
        'Repository Pattern', 'DTO Pattern',
      ],
      tests: ['NotificationControllerTest', 'NotificationGraphQLControllerTest', 'NotificationSpecificationTest', 'NotificationServiceImplTest'],
      dockerFile: 'notification-microservice/Dockerfile',
      k8sManifest: 'k8s/services/notification-service.yaml',
      helmTemplate: 'helm/employee-platform/templates/notification-service.yaml',
      interviewNotes: [
        'Strategy Pattern: Different algorithms for each notification channel (Email/SMS/Push/InApp), selected at runtime by Factory',
        'Template Method: AbstractNotificationProcessor defines skeleton — Bulk vs Urgent processors override specific steps',
        'GraphQL vs REST: Both exposed — GraphQL for flexible queries (clients choose fields), REST + HATEOAS for standard CRUD',
        'HATEOAS: REST Level 3 maturity — responses include _links for discoverable API navigation',
        'Specification Pattern: Type-safe dynamic query construction — no SQL string concatenation',
        'Bucket4j rate limiting: Token-bucket algorithm — configurable per-client rate limits',
      ],
    },
  },

  frontends: {
    react: {
      id: 'react',
      name: 'React Frontend',
      icon: '⚛️',
      color: '#39d2c0',
      port: '3000 / 5173 (dev)',
      framework: 'React 18.2 + TypeScript',
      buildTool: 'Vite',
      description: 'Production-grade React SPA with Redux Toolkit, TanStack Query, Zustand state management, Tailwind CSS, i18n, Storybook, Playwright e2e testing.',
      technologies: [
        'React 18.2', 'TypeScript', 'Vite', 'Redux Toolkit', 'TanStack React Query v5',
        'Zustand', 'React Router DOM', 'React Hook Form + Zod', 'Axios',
        'Tailwind CSS + PostCSS', 'i18next', 'Storybook', 'Playwright',
        'MSW (Mock Service Worker)', 'Sentry', 'Web Vitals', 'react-window (Virtualized Lists)',
        'react-intersection-observer (Infinite Scroll)', 'papaparse, jspdf, xlsx (Export)',
        'STOMP WebSocket',
      ],
      features: [
        'Dark/Light Theme Toggle', 'i18n (Internationalization)', 'Error Boundary',
        'Infinite Scroll', 'Virtual List', 'Lazy Loading (Code Splitting)',
        'File Upload (drag & drop)', 'CSV/PDF/Excel Export', 'Web Vitals Analytics',
        'Sentry Error Tracking', 'Design System (Storybook)', 'Feature Flags',
        'WebSocket Real-time Updates', 'Saga Monitor UI',
      ],
      structure: {
        'components/': 'Layout, ErrorBoundary, FileUpload, InfiniteScroll, LazyLoad, ThemeToggle, design-system/*',
        'pages/': 'Dashboard, EmployeeList, EmployeeDetail, EmployeeCreate, Login, SagaMonitor, SearchPage',
        'services/': 'api.ts, employeeService.ts, sagaService.ts',
        'store/': 'Redux store + employeeSlice',
        'hooks/': 'useEmployees, useProduction, useSagas',
        'contexts/': 'AuthContext, NotificationContext, ThemeContext',
        'config/': 'i18n, queryClient, sentry',
        'lib/': 'apiClient, designTokens, featureFlags, logger',
        'mocks/': 'MSW browser & server handlers',
        'schemas/': 'Zod validation schemas',
        'utils/': 'accessibility, analytics, export, performance',
      },
    },
    angular: {
      id: 'angular',
      name: 'Angular Frontend',
      icon: '🅰️',
      color: '#39d2c0',
      port: '4200 / 4201 (Docker)',
      framework: 'Angular 17.3 + TypeScript 5.3',
      buildTool: 'Angular CLI',
      description: 'Modern Angular 17 SPA with Material Design, standalone components, signals, lazy loading, reactive forms, Chart.js dashboards.',
      technologies: [
        'Angular 17.3', 'TypeScript 5.3', 'Angular Material 17.3', 'Angular CDK',
        'Chart.js + ng2-charts', 'RxJS', 'Jasmine + Karma',
      ],
      features: [
        'Standalone Components (no NgModule)', 'Angular Signals', 'Lazy Loading Routes',
        'Reactive Forms + Validation', 'Angular Material UI Components',
        'Chart.js Dashboard', 'HTTP Interceptors (Auth, Error)', 'Route Guards',
      ],
      structure: {
        'core/guards/': 'auth.guard.ts',
        'core/interceptors/': 'auth.interceptor.ts, error.interceptor.ts',
        'core/models/': 'TypeScript interfaces',
        'core/services/': 'api, employee, metrics, notification, payroll, saga',
        'features/auth/': 'login, register components + auth service',
        'features/dashboard/': 'Chart.js dashboard component',
        'features/employees/': 'list, detail, create, edit components',
        'features/notifications/': 'list, detail components',
        'features/payroll/': 'list, detail, create components',
        'shared/': 'header, footer, sidebar, loading-spinner, dialogs, pipes',
      },
    },
  },

  infrastructure: {
    docker: {
      services: [
        { name: 'postgresql', image: 'postgres:15-alpine', port: '5432', dbs: 'employeedb, payrolldb, notificationdb' },
        { name: 'redis', image: 'redis:7-alpine', port: '6379', purpose: 'Cache, Rate Limiting, Locks' },
        { name: 'zookeeper', image: 'cp-zookeeper:7.5.0', port: '2181', purpose: 'Kafka coordination' },
        { name: 'kafka', image: 'cp-kafka:7.5.0', port: '9092', purpose: 'Event streaming' },
        { name: 'mongodb', image: 'mongo:7.0', port: '27017', purpose: 'Audit logs' },
        { name: 'elasticsearch', image: 'elasticsearch:8.11.0', port: '9200', purpose: 'Full-text search' },
        { name: 'prometheus', image: 'prom/prometheus:v2.48.0', port: '9090', purpose: 'Metrics collection' },
        { name: 'grafana', image: 'grafana/grafana:10.2.0', port: '3001', purpose: 'Metrics visualization' },
        { name: 'zipkin', image: 'openzipkin/zipkin', port: '9411', purpose: 'Distributed tracing' },
        { name: 'logstash', image: 'logstash:8.11.0', port: '5000', purpose: 'Log aggregation' },
        { name: 'kibana', image: 'kibana:8.11.0', port: '5601', purpose: 'Log visualization' },
        { name: 'eureka-server', image: 'build: ./eureka-discovery-server', port: '8761', purpose: 'Service discovery' },
        { name: 'config-server', image: 'build: ./config-server', port: '8888', purpose: 'Config management' },
        { name: 'employee-service', image: 'build: ./employee-microservice', port: '8081', purpose: 'Employee domain' },
        { name: 'payroll-service', image: 'build: ./payroll-microservice', port: '8083', purpose: 'Payroll domain' },
        { name: 'notification-service', image: 'build: ./notification-microservice', port: '8084', purpose: 'Notifications' },
        { name: 'api-gateway', image: 'build: ./api-gateway-service', port: '8080', purpose: 'API routing' },
        { name: 'frontend', image: 'build: ./frontend-react', port: '3000', purpose: 'React UI' },
        { name: 'frontend-angular', image: 'build: ./frontend-angular', port: '4201', purpose: 'Angular UI' },
      ],
    },
    kubernetes: {
      base: ['namespace.yaml', 'configmap.yaml', 'secrets.yaml', 'ingress.yaml'],
      infrastructure: ['postgresql.yaml', 'redis.yaml', 'kafka.yaml', 'mongodb-elasticsearch.yaml'],
      services: ['eureka-server.yaml', 'config-server.yaml', 'employee-service.yaml', 'payroll-service.yaml', 'notification-service.yaml', 'api-gateway.yaml', 'frontend.yaml', 'frontend-angular.yaml'],
      monitoring: ['prometheus-grafana.yaml'],
      overlays: ['dev/kustomization.yaml', 'prod/kustomization.yaml'],
    },
    helm: {
      chart: 'employee-platform',
      values: ['values.yaml', 'values-prod.yaml'],
      templates: ['api-gateway.yaml', 'config-server.yaml', 'employee-service.yaml', 'eureka-server.yaml', 'frontend.yaml', 'frontend-angular.yaml', 'ingress.yaml', 'notification-service.yaml', 'payroll-service.yaml'],
    },
    terraform: {
      provider: 'AWS',
      files: ['main.tf', 'variables.tf', 'vpc.tf', 'eks.tf', 'rds.tf', 'elasticache-msk.tf', 's3-cloudwatch.tf', 'ecr-outputs.tf'],
      environments: ['env/dev.tfvars', 'env/prod.tfvars'],
      resources: ['VPC', 'EKS Cluster', 'RDS (PostgreSQL)', 'ElastiCache (Redis)', 'MSK (Kafka)', 'S3', 'CloudWatch', 'ECR'],
    },
    cicd: {
      pipelines: ['employee-service CI', 'payroll-service CI', 'notification-service CI', 'api-gateway CI', 'eureka-server CI', 'config-server CI', 'frontend-react CI', 'frontend-angular CI'],
      stages: ['Build → Test → SonarQube → Docker Build → Push to ECR → Deploy to K8s'],
    },
  },

  patterns: [
    { name: 'Microservices Architecture', category: 'Architectural', where: 'Entire project', description: 'Application decomposed into 6 independently deployable services, each with its own database, build, and deployment pipeline.', interview: 'Key principle: Single Responsibility at service level. Each service owns its data and business logic. Communication via REST (sync) and Kafka (async).' },
    { name: 'API Gateway', category: 'Architectural', where: 'api-gateway-service', description: 'Single entry point for all client requests. Handles routing, rate limiting, circuit breaking, CORS, and cross-cutting concerns.', interview: 'Spring Cloud Gateway is non-blocking (WebFlux). Uses predicates for routing, filters for cross-cutting concerns. Rate limiting backed by Redis for distributed deployments.' },
    { name: 'Service Discovery', category: 'Architectural', where: 'eureka-discovery-server', description: 'Netflix Eureka enables dynamic service discovery. Services register on startup and discover peers at runtime.', interview: 'Client-side discovery: service instances query registry directly. Self-preservation prevents cascading failures during network partitions.' },
    { name: 'Externalized Configuration', category: 'Architectural', where: 'config-server', description: 'Spring Cloud Config Server centralizes configuration. Services fetch config at startup and can refresh at runtime.', interview: '12-Factor App principle. @RefreshScope enables runtime updates. Encryption for sensitive properties. Profile-based config (dev/test/prod).' },
    { name: 'Database per Service', category: 'Architectural', where: 'employee, payroll, notification', description: 'Each service has its own database (employeedb, payrolldb, notificationdb). No shared tables, enforcing loose coupling.', interview: 'Prevents tight coupling at database level. Trade-off: no cross-service JOINs, need eventual consistency. Use event-driven sync.' },
    { name: 'CQRS', category: 'Data', where: 'employee-microservice', description: 'Command Query Responsibility Segregation — Writes go to PostgreSQL, reads from Elasticsearch. Independent scaling of read/write workloads.', interview: 'Commands mutate state in PostgreSQL. Elasticsearch updated asynchronously via events. Enables optimized read models (denormalized, searchable). Eventually consistent.' },
    { name: 'Event Sourcing', category: 'Data', where: 'employee-microservice', description: 'All state changes stored as immutable events in EventStore. Current state derived by replaying events.', interview: 'Benefits: Complete audit trail, temporal queries ("what was state at time T?"), event replay for debugging. Trade-off: query complexity, storage growth.' },
    { name: 'Saga Pattern (Orchestrated)', category: 'Distributed Transactions', where: 'employee-microservice', description: 'EmployeeOnboardingSaga coordinates multi-step process: create employee → setup payroll → send notification. Compensating transactions on failure.', interview: 'Orchestrated saga: central coordinator (SagaOrchestrator) drives the workflow. Each step has a compensating action for rollback. Saga state persisted in SagaInstance table. Alternative: Choreography-based saga.' },
    { name: 'Outbox Pattern', category: 'Distributed Transactions', where: 'employee-microservice', description: 'Events written to outbox table in same database transaction as business data. Separate publisher polls outbox and sends to Kafka.', interview: 'Solves dual-write problem: ensures atomicity between database write and event publish. OutboxPublisher uses polling. Alternative: CDC (Change Data Capture) with Debezium.' },
    { name: 'Circuit Breaker', category: 'Resilience', where: 'employee, payroll, gateway', description: 'Resilience4j Circuit Breaker prevents cascade failures. States: CLOSED → OPEN → HALF_OPEN. Fallback responses during outages.', interview: 'Threshold-based: opens after N failures in time window. Half-open: allows test requests. Configured with sliding window, wait duration, failure rate threshold.' },
    { name: 'Retry with Exponential Backoff', category: 'Resilience', where: 'payroll-microservice', description: 'Automatic retry with increasing delays (1s, 2s, 4s...) for transient failures.', interview: 'Prevents thundering herd on recovery. Max retries + max delay prevent infinite loops. Only retry idempotent operations or transient errors.' },
    { name: 'Rate Limiting', category: 'Resilience', where: 'gateway, notification', description: 'Gateway: Redis-backed RequestRateLimiter. Notification: Bucket4j token-bucket algorithm.', interview: 'Token bucket: tokens added at fixed rate, consumed per request. When empty, reject. Redis backing enables distributed rate limiting across instances.' },
    { name: 'Bulkhead Pattern', category: 'Resilience', where: 'employee, payroll', description: 'Isolates thread pools per downstream service call. Prevents one slow service from consuming all threads.', interview: 'Named after ship bulkheads that contain flooding. Resilience4j Bulkhead limits concurrent calls. Semaphore-based (fast) or ThreadPool-based (queuing).' },
    { name: 'Strategy Pattern', category: 'Gang of Four', where: 'notification-microservice', description: '4 notification strategies (Email, SMS, Push, InApp). Strategy selected at runtime by NotificationStrategyFactory based on channel type.', interview: 'Open/Closed Principle: add new channels without modifying existing code. Factory creates strategy instances. Each strategy implements NotificationStrategy interface.' },
    { name: 'Factory Pattern', category: 'Gang of Four', where: 'notification-microservice', description: 'NotificationStrategyFactory creates the appropriate strategy based on NotificationChannel enum.', interview: 'Factory Pattern encapsulates object creation logic. Combined with Strategy Pattern for runtime algorithm selection.' },
    { name: 'Template Method Pattern', category: 'Gang of Four', where: 'notification-microservice', description: 'AbstractNotificationProcessor defines skeleton algorithm. BulkNotificationProcessor and UrgentNotificationProcessor override specific steps.', interview: 'Defines algorithm structure in base class, lets subclasses override specific steps without changing overall structure. Hollywood Principle: "Don\'t call us, we\'ll call you."' },
    { name: 'Observer Pattern', category: 'Gang of Four', where: 'notification-microservice', description: 'Spring ApplicationEvents — NotificationCreatedEvent published, NotificationEventListener observes.', interview: 'Spring Events is a built-in Observer implementation. @EventListener or implements ApplicationListener. Async with @Async for non-blocking.' },
    { name: 'Specification Pattern', category: 'Data', where: 'notification-microservice', description: 'JPA Specifications for type-safe dynamic queries. Composable predicates (AND/OR/NOT).', interview: 'Replaces complex JPQL/SQL string concatenation with type-safe Java code. Predicate composition with and(), or(). Ideal for search/filter APIs.' },
    { name: 'HATEOAS', category: 'API Design', where: 'notification-microservice', description: 'REST Level 3 — API responses include _links for resource navigation and available actions.', interview: 'Hypermedia As The Engine Of Application State. Clients don\'t hardcode URLs — they follow links from responses. Spring HATEOAS EntityModel/CollectionModel.' },
    { name: 'Anti-Corruption Layer', category: 'DDD', where: 'employee-microservice', description: 'LegacyPayrollSystemAdapter translates between clean domain model and legacy payroll system DTOs.', interview: 'DDD pattern: prevents legacy system\'s model from polluting your domain. Adapter translates between models. Isolates integration complexity.' },
    { name: 'Distributed Locking', category: 'Concurrency', where: 'employee, payroll', description: 'Redis-based distributed locks prevent concurrent modification across multiple service instances.', interview: 'Uses SET NX EX (SET if Not eXists with EXpiration). Custom @DistributedLock annotation + AOP aspect. Prevents double processing in horizontal scaling.' },
    { name: 'Idempotency Key', category: 'Concurrency', where: 'employee-microservice', description: 'Idempotency keys stored in Redis ensure duplicate requests produce the same result.', interview: 'Critical for payment/financial operations. Client sends unique key, server checks Redis before processing. Prevents duplicate creates on network retries.' },
    { name: 'Correlation ID Tracing', category: 'Observability', where: 'employee-microservice', description: 'CorrelationIdFilter generates/propagates unique IDs across service calls for distributed tracing.', interview: 'Enables tracing a single request across all microservices. Filter intercepts requests, generates UUID if missing, propagates via headers. Logged in MDC (Mapped Diagnostic Context).' },
    { name: 'Multi-Tenancy', category: 'SaaS', where: 'employee-microservice', description: 'TenantFilter extracts tenant from request, TenantContext stores in ThreadLocal. Enables data isolation per tenant.', interview: 'Shared database with discriminator column approach. ThreadLocal holds tenant ID, JPA filters add WHERE clause. Alternatives: separate schemas or separate databases per tenant.' },
    { name: 'Feature Flags', category: 'DevOps', where: 'employee-microservice, frontend-react', description: 'Backend: @FeatureFlag annotation + AOP. Frontend: featureFlags utility. Toggle features without deployment.', interview: 'Enables trunk-based development, canary releases, A/B testing. Runtime toggles stored in config/database. AOP approach: annotate methods to conditionally enable.' },
    { name: 'Read/Write Splitting', category: 'Data', where: 'employee-microservice', description: 'ReplicationRoutingDataSource routes writes to primary, reads to replica PostgreSQL instances.', interview: 'Scales read-heavy workloads. Spring AbstractRoutingDataSource with TransactionSynchronizationManager to detect read-only transactions. Routes @Transactional(readOnly=true) to replica.' },
    { name: 'Cursor-based Pagination', category: 'API Design', where: 'employee-microservice', description: 'CursorPage model uses opaque cursor tokens instead of page numbers for stable pagination.', interview: 'Offset pagination breaks when data changes between pages. Cursor-based (keyset pagination) uses last item\'s ID/timestamp. Consistent results, better performance for large datasets.' },
    { name: 'Batch Processing', category: 'Data', where: 'employee-microservice', description: 'Spring Batch for large-scale data processing jobs. BatchJobScheduler triggers periodic batch jobs.', interview: 'Spring Batch provides chunk-oriented processing: read N items, process, write. Built-in retry, skip, restart. Job repository tracks execution state.' },
    { name: 'Dead Letter Queue', category: 'Messaging', where: 'employee-microservice', description: 'KafkaDLQHandler routes failed messages to DLQ topic after exhausting retries.', interview: 'Messages that fail processing repeatedly are moved to DLQ for manual inspection. Prevents poison messages from blocking the consumer. Can reprocess DLQ messages after fixing bugs.' },
    { name: 'Webhook Pattern', category: 'Integration', where: 'employee-microservice', description: 'WebhookService sends HTTP POST callbacks to registered URLs when events occur. WebhookRegistration stores subscriber endpoints.', interview: 'Push-based integration: external systems register webhook URLs. On events, service sends POST with payload. Retry on temporary failures. Signature verification for security.' },
    { name: 'Graceful Shutdown', category: 'Operations', where: 'employee-microservice', description: 'GracefulShutdownConfig ensures in-flight requests complete before stopping. Deregisters from Eureka first.', interview: 'Spring Boot shutdown hooks. De-register from Eureka → stop accepting new requests → drain existing requests → close connections → shutdown. Critical for zero-downtime deployments.' },
    { name: 'GraphQL API', category: 'API Design', where: 'notification-microservice', description: 'Spring Boot GraphQL with schema-first approach. Clients request exactly the fields they need.', interview: 'GraphQL vs REST: GraphQL solves over-fetching/under-fetching. Single endpoint, typed schema. Used alongside REST in same service for flexibility.' },
    { name: 'Repository Pattern', category: 'DDD', where: 'All services', description: 'Spring Data JPA repositories abstract data access. Domain objects decoupled from persistence.', interview: 'Mediates between domain model and data mapping. Spring Data auto-generates implementations from interface method names. Custom queries with @Query.' },
    { name: 'DTO Pattern', category: 'Architecture', where: 'All services', description: 'MapStruct-based compile-time DTO mapping. Separates API contracts from domain entities.', interview: 'DTOs prevent exposing internal entity structure. MapStruct generates mapping code at compile time — zero runtime reflection. Type-safe, faster than ModelMapper/Dozer.' },
    { name: 'GitOps', category: 'DevOps', where: 'k8s/argocd/', description: 'ArgoCD continuously syncs Git → Kubernetes state. If cluster drifts from Git, ArgoCD auto-heals. All deployments via pull requests to the infra Git repo.', interview: 'GitOps: Git is the single source of truth for infrastructure state. ArgoCD polls Git every 3 minutes. Drift detection + self-healing. Audit trail: every deployment is a Git commit. Enables instant rollback by reverting a PR.' },
    { name: 'Backend for Frontend (BFF)', category: 'Architectural', where: 'bff-service/', description: 'Dedicated aggregation layer for React SPA. Combines employee + payroll + notification data in one call. Eliminates N chatty frontend→microservice calls.', interview: 'BFF pattern: each frontend gets a dedicated API that returns exactly what it needs — no over/under-fetching. BFF owns the shaping, caching, and aggregation concern. Uses circuit breakers (opossum) per upstream service. Enables partial success: return available data if one upstream is down.' },
    { name: 'Blue-Green Deployment', category: 'DevOps', where: 'k8s/bff/blue-green-strategy.yaml', description: 'Two identical environments (Blue = current, Green = new). Traffic switch is a single kubectl patch on Service selector. Zero downtime, instant rollback.', interview: 'vs Rolling: Rolling updates pods one-by-one (briefly runs mixed versions). Blue-Green: switch is all-at-once in milliseconds. vs Canary: Canary shifts traffic gradually (10%→50%→100%). Blue-Green is binary. Keep BLUE running for 30min post-switch for instant rollback.' },
    { name: 'Consumer-Driven Contract Testing', category: 'Testing', where: 'pact-tests/', description: 'Pact framework: payroll-service defines what it expects from employee-service API. Contract file published to Pact Broker. Employee-service runs provider verification tests.', interview: 'Solves the mock staleness problem: regular mocks can lie (say field X exists when it does not). Pact ensures both sides honour the contract. Enables "can I deploy?" check — verify consumer contract satisfied before any deployment.' },
    { name: 'Chaos Engineering', category: 'Resilience', where: 'k8s/chaos/', description: 'Chaos Mesh experiments: PodChaos kills pods, NetworkChaos injects latency/packet loss, StressChaos creates CPU/memory pressure, HTTPChaos injects 503s.', interview: 'Chaos Engineering principle: inject failures in controlled way to find weaknesses before they find you. Chaos Mesh is K8s-native CRD-based. PodChaos tests restart resilience. NetworkChaos (200ms latency) triggers circuit breakers. CPU stress validates KEDA autoscaling. Schedule chaos drills in staging on a cron.' },
    { name: 'SLO / Error Budget', category: 'Observability', where: 'monitoring/prometheus/alerts/', description: 'Recording rules compute 30-day success rates. Multi-window burn rate alerts: 14x burn rate → 2h to exhaustion (page). Error budget consumed = 1 - 30d_success_rate.', interview: 'SLO = Service Level Objective. Error budget = 100% - SLO%. If SLO=99.9%, budget=0.1%=43.2min/month. Burn rate alert: if consuming budget 14x faster than normal → exhausted in 2h → page immediately. This is the Google SRE burn rate alerting model.' },
    { name: 'External Secrets / Zero-Trust', category: 'Security', where: 'k8s/security/', description: 'External Secrets Operator syncs from AWS Secrets Manager/Vault to K8s. No plaintext secrets in Git or K8s manifests. Secrets rotated on configurable schedule.', interview: 'Zero-trust: never hardcode secrets. External Secrets Operator uses IRSA (IAM Roles for Service Accounts) on EKS — pods get AWS credentials via K8s service account annotation. Rotation: refreshInterval=1h means secrets auto-rotate without pod restart.' },
  ],

  techStack: [
    { category: 'Languages & Runtime', items: [
      { name: 'Java 17', color: '#f85149', desc: 'Backend services — records, sealed classes, pattern matching' },
      { name: 'TypeScript 5.3', color: '#58a6ff', desc: 'Frontend (React + Angular)' },
      { name: 'SQL', color: '#d29922', desc: 'PostgreSQL queries, Flyway migrations' },
      { name: 'GraphQL', color: '#f778ba', desc: 'Notification service API' },
    ]},
    { category: 'Frameworks', items: [
      { name: 'Spring Boot 3.2.0', color: '#3fb950', desc: 'Core microservice framework' },
      { name: 'Spring Cloud 2023.0.0', color: '#3fb950', desc: 'Eureka, Config, Gateway, OpenFeign' },
      { name: 'Spring Security', color: '#3fb950', desc: 'JWT authentication & authorization' },
      { name: 'Spring Data JPA', color: '#3fb950', desc: 'ORM / database abstraction' },
      { name: 'Spring WebFlux', color: '#3fb950', desc: 'Reactive non-blocking gateway' },
      { name: 'Spring Batch', color: '#3fb950', desc: 'Batch processing jobs' },
      { name: 'Spring HATEOAS', color: '#3fb950', desc: 'REST Level 3 hypermedia' },
      { name: 'React 18.2', color: '#39d2c0', desc: 'SPA frontend with hooks' },
      { name: 'Angular 17.3', color: '#39d2c0', desc: 'SPA frontend with signals' },
      { name: 'Resilience4j', color: '#bc8cff', desc: 'Circuit breaker, retry, bulkhead, rate limiter' },
    ]},
    { category: 'Databases', items: [
      { name: 'PostgreSQL 15', color: '#58a6ff', desc: 'Primary RDBMS (3 databases)' },
      { name: 'MongoDB 7.0', color: '#3fb950', desc: 'Document store for audit logs' },
      { name: 'Elasticsearch 8.11', color: '#d29922', desc: 'Full-text search (CQRS read model)' },
      { name: 'Redis 7', color: '#f85149', desc: 'Cache, distributed locks, rate limiting' },
      { name: 'H2', color: '#8b949e', desc: 'In-memory database for dev/test' },
    ]},
    { category: 'Messaging & Streaming', items: [
      { name: 'Apache Kafka', color: '#f0883e', desc: 'Event streaming between services' },
      { name: 'Apache ZooKeeper', color: '#f0883e', desc: 'Kafka cluster coordination' },
      { name: 'Spring WebSocket + STOMP', color: '#3fb950', desc: 'Real-time push notifications' },
    ]},
    { category: 'Observability', items: [
      { name: 'Prometheus', color: '#f0883e', desc: 'Metrics collection & alerting' },
      { name: 'Grafana', color: '#f0883e', desc: 'Metrics dashboards & visualization' },
      { name: 'Zipkin', color: '#39d2c0', desc: 'Distributed tracing' },
      { name: 'Micrometer', color: '#3fb950', desc: 'Metrics facade (Prometheus + Zipkin)' },
      { name: 'ELK Stack (Logstash + Kibana)', color: '#d29922', desc: 'Centralized logging' },
    ]},
    { category: 'DevOps & Infrastructure', items: [
      { name: 'Docker + Docker Compose', color: '#58a6ff', desc: '19 containerized services' },
      { name: 'Kubernetes', color: '#58a6ff', desc: 'Container orchestration (19+ manifests)' },
      { name: 'Helm Charts', color: '#58a6ff', desc: 'Templated K8s deployments' },
      { name: 'Terraform', color: '#bc8cff', desc: 'AWS infrastructure as code' },
      { name: 'GitHub Actions', color: '#8b949e', desc: 'CI/CD pipelines (8 workflows)' },
      { name: 'Nginx', color: '#3fb950', desc: 'Reverse proxy for frontends' },
    ]},
    { category: 'Build & Quality', items: [
      { name: 'Maven 3.8.7', color: '#f0883e', desc: 'Java build tool' },
      { name: 'Vite', color: '#bc8cff', desc: 'React build tool' },
      { name: 'Angular CLI', color: '#f85149', desc: 'Angular build tool' },
      { name: 'JaCoCo', color: '#3fb950', desc: 'Code coverage' },
      { name: 'Flyway', color: '#f85149', desc: 'Database migration (10 migrations)' },
      { name: 'MapStruct 1.5.5', color: '#d29922', desc: 'Compile-time DTO mapping' },
      { name: 'Lombok', color: '#d29922', desc: 'Boilerplate reduction' },
    ]},
    { category: 'Testing', items: [
      { name: 'JUnit 5', color: '#3fb950', desc: 'Java unit testing' },
      { name: 'Mockito', color: '#3fb950', desc: 'Java mocking framework' },
      { name: 'Testcontainers 1.19', color: '#58a6ff', desc: 'Docker-based integration tests' },
      { name: 'Playwright', color: '#39d2c0', desc: 'E2E browser testing (React)' },
      { name: 'MSW', color: '#f0883e', desc: 'Mock Service Worker for API mocking' },
      { name: 'Storybook', color: '#f778ba', desc: 'Component-driven UI development' },
      { name: 'Jasmine + Karma', color: '#d29922', desc: 'Angular unit testing' },
    ]},
    { category: 'Frontend Libraries', items: [
      { name: 'Redux Toolkit', color: '#bc8cff', desc: 'Predictable state management' },
      { name: 'TanStack Query v5', color: '#f0883e', desc: 'Server state management & caching' },
      { name: 'Zustand', color: '#d29922', desc: 'Lightweight state management' },
      { name: 'Tailwind CSS', color: '#39d2c0', desc: 'Utility-first CSS framework' },
      { name: 'Angular Material', color: '#58a6ff', desc: 'Material Design components' },
      { name: 'Chart.js + ng2-charts', color: '#f0883e', desc: 'Dashboard charts (Angular)' },
      { name: 'React Hook Form + Zod', color: '#3fb950', desc: 'Form handling & validation' },
      { name: 'i18next', color: '#d29922', desc: 'Internationalization' },
    ]},
    { category: 'Security', items: [
      { name: 'JWT (jjwt 0.12.3)', color: '#f85149', desc: 'Token-based authentication' },
      { name: 'Spring Security', color: '#3fb950', desc: 'Authentication & authorization framework' },
      { name: 'BCrypt', color: '#8b949e', desc: 'Password hashing' },
      { name: 'CORS', color: '#8b949e', desc: 'Cross-origin resource sharing' },
      { name: 'Keycloak 24', color: '#f85149', desc: 'OAuth2/OIDC Identity Provider — PKCE for SPAs, M2M client_credentials, SSO' },
      { name: 'External Secrets Operator', color: '#bc8cff', desc: 'Syncs secrets from AWS Secrets Manager / HashiCorp Vault to K8s' },
      { name: 'Trivy', color: '#58a6ff', desc: 'Container CVE scanning, IaC misconfiguration, secret scanning, SBOM' },
    ]},
    { category: 'Platform Engineering', items: [
      { name: 'KEDA 2.x', color: '#f0883e', desc: 'Event-driven autoscaling — Kafka consumer lag triggers HPA scale-out' },
      { name: 'ArgoCD', color: '#39d2c0', desc: 'GitOps continuous deployment — automated sync + self-heal from Git' },
      { name: 'Chaos Mesh', color: '#f85149', desc: 'Chaos engineering — PodChaos, NetworkChaos, StressChaos, HTTPChaos' },
      { name: 'Confluent Schema Registry', color: '#f0883e', desc: 'Avro/Protobuf schema governance — BACKWARD compatibility enforcement' },
      { name: 'OpenTelemetry Collector', color: '#58a6ff', desc: 'Unified observability pipeline — traces + metrics + logs with tail sampling' },
      { name: 'Pact Broker', color: '#3fb950', desc: 'Consumer-driven contract testing — prevents breaking API changes across services' },
    ]},
    { category: 'Load Testing', items: [
      { name: 'k6', color: '#bc8cff', desc: 'JavaScript load testing — SLO thresholds, ramp-up scenarios, spike testing' },
    ]},
  ],

  interviewTopics: [
    {
      title: 'Microservices Architecture',
      icon: '🏗️',
      qas: [
        { q: 'Why microservices over monolith?', a: 'Independent deployment, technology diversity, team autonomy, fault isolation, independent scaling. This project demonstrates 6 services each with own DB, tech stack, and CI/CD pipeline.' },
        { q: 'How do services communicate?', a: 'Synchronous: REST + OpenFeign (Employee → Payroll). Asynchronous: Kafka events (Employee publishes → Payroll/Notification consume). Gateway routes external traffic.' },
        { q: 'How do you handle distributed transactions?', a: 'Saga Pattern (Orchestrated): EmployeeOnboardingSaga coordinates multi-step process with compensating transactions. No distributed ACID — instead use eventual consistency.' },
        { q: 'Database per service — how handle joins?', a: 'API Composition: aggregate data at Gateway or client. Event-driven sync: services publish events, consumers build local projections. CQRS read models in Elasticsearch.' },
      ]
    },
    {
      title: 'Design Patterns',
      icon: '🧩',
      qas: [
        { q: 'Explain CQRS in your project?', a: 'Employee Service: Writes go to PostgreSQL via JPA, reads from Elasticsearch. Events sync the read model. Benefits: independent scaling, optimized query performance, different data models for read/write.' },
        { q: 'What is the Outbox Pattern?', a: 'Solves the dual-write problem. Instead of writing to DB + Kafka separately (risk of partial failure), we write business data + event to outbox table in ONE transaction. Separate publisher polls outbox and sends to Kafka. Guarantees at-least-once delivery.' },
        { q: 'Strategy vs Template Method?', a: 'Strategy (Notification): interchangeable algorithms at runtime — Email/SMS/Push/InApp strategies. Template Method: defines algorithm skeleton in base class, subclasses override steps — BulkProcessor vs UrgentProcessor.' },
        { q: 'Anti-Corruption Layer purpose?', a: 'DDD pattern in Employee service. LegacyPayrollAdapter translates between clean domain model and legacy system DTOs. Prevents external models from polluting domain. Isolates integration complexity.' },
      ]
    },
    {
      title: 'Resilience & Fault Tolerance',
      icon: '🛡️',
      qas: [
        { q: 'How do you handle service failures?', a: 'Circuit Breaker (Resilience4j): CLOSED→OPEN after failure threshold, returns fallback response. HALF_OPEN tests recovery. Retry with exponential backoff for transient failures. Bulkhead isolates thread pools. Rate limiter prevents overload.' },
        { q: 'What happens if Kafka is down?', a: 'Outbox Pattern: events stay in database outbox table until Kafka recovers. Publisher retries. DLQ: messages that fail processing go to Dead Letter Queue for manual review. Health indicators report Kafka status.' },
        { q: 'Graceful shutdown strategy?', a: 'De-register from Eureka → stop accepting new requests → drain in-flight requests → close DB connections → shutdown. Configured in GracefulShutdownConfig with Spring Boot shutdown hooks.' },
      ]
    },
    {
      title: 'Data Management',
      icon: '💾',
      qas: [
        { q: 'Why multiple databases?', a: 'Polyglot persistence: PostgreSQL for relational data (employees, payroll), MongoDB for flexible audit logs, Elasticsearch for full-text search, Redis for cache/locks. Each optimized for its use case.' },
        { q: 'How do you ensure data consistency?', a: 'Saga Pattern for cross-service consistency. Outbox Pattern for reliable event publishing. Idempotency keys prevent duplicate processing. Distributed locks prevent concurrent modification.' },
        { q: 'Explain your caching strategy?', a: 'Multi-level: Redis for distributed cache (shared across instances), Spring @Cacheable for method-level caching. Cache invalidation on writes. TTL-based expiration. Cache-aside pattern.' },
        { q: 'Database migration strategy?', a: 'Flyway: version-controlled SQL migrations (V1__, V2__, ...). 10 total migrations across services. Applied automatically on startup. Supports rollback. Part of CI/CD pipeline.' },
      ]
    },
    {
      title: 'Observability',
      icon: '📊',
      qas: [
        { q: 'Three pillars of observability?', a: 'Metrics: Micrometer → Prometheus → Grafana dashboards. Logs: Logstash Logback → Elasticsearch → Kibana. Traces: Micrometer Tracing (Brave) → Zipkin. Correlation IDs link all three.' },
        { q: 'How do you monitor in production?', a: 'Prometheus scrapes /actuator/prometheus endpoints from all 6 services. Grafana dashboard visualizes JVM metrics, request rates, error rates, p99 latency. Custom health indicators for DB/Kafka/Redis.' },
        { q: 'Distributed tracing flow?', a: 'Request enters Gateway → gets trace ID → propagated to Employee → Payroll → Notification via headers. Each service reports spans to Zipkin. Can see full request waterfall across all services.' },
      ]
    },
    {
      title: 'DevOps & Infrastructure',
      icon: '🐳',
      qas: [
        { q: 'Describe your deployment pipeline?', a: 'GitHub Actions: Build (Maven/npm) → Test (JUnit/Playwright) → SonarQube analysis → Docker Build (multi-stage) → Push to ECR → Deploy to K8s (kubectl/helm). 8 pipelines, one per service.' },
        { q: 'Docker vs Kubernetes?', a: 'Docker: containerize each service with multi-stage builds (build → runtime). Docker Compose for local dev. Kubernetes for production: ReplicaSets, Services, Ingress, ConfigMaps, Secrets. Helm for templated deployments.' },
        { q: 'Infrastructure as Code?', a: 'Terraform provisions AWS infrastructure: VPC, EKS cluster, RDS (PostgreSQL), ElastiCache (Redis), MSK (Kafka), S3, CloudWatch, ECR. Environment-specific tfvars (dev/prod). State managed in S3 backend.' },
      ]
    },
    {
      title: 'Frontend Architecture',
      icon: '🖥️',
      qas: [
        { q: 'Why both React and Angular?', a: 'Demonstrates proficiency in both dominant frameworks. React: Redux Toolkit + TanStack Query + Zustand (three state management approaches). Angular: standalone components, signals, Material Design. Both connect to same Gateway API.' },
        { q: 'State management strategy?', a: 'React: Redux Toolkit for global app state, TanStack Query for server state (caching, sync, refetch), Zustand for lightweight component state. Each solves different problem — no single solution fits all.' },
        { q: 'Performance optimizations?', a: 'React: React.lazy + Suspense for code splitting, react-window for virtual lists (100k+ rows), react-intersection-observer for infinite scroll, Web Vitals monitoring, Sentry for error tracking. Angular: lazy-loaded routes, OnPush change detection.' },
      ]
    },
    {
      title: 'Security',
      icon: '🔐',
      qas: [
        { q: 'Authentication flow?', a: 'JWT-based: Client sends credentials → AuthController validates → generates JWT (access + refresh tokens). JwtAuthenticationFilter intercepts requests, validates token, sets SecurityContext. BCrypt for password hashing.' },
        { q: 'How do you secure inter-service calls?', a: 'Services trust Gateway (internal network). JWT propagated in Authorization header via OpenFeign interceptor. Config Server credentials encrypted. K8s Secrets for sensitive config. CORS restricted to known origins.' },
      ]
    },
  ],

  portMap: {
    8761: { name: 'Eureka Discovery', type: 'infra' },
    8888: { name: 'Config Server', type: 'infra' },
    8080: { name: 'API Gateway', type: 'infra' },
    8081: { name: 'Employee Service', type: 'business' },
    8083: { name: 'Payroll Service', type: 'business' },
    8084: { name: 'Notification Service', type: 'business' },
    3000: { name: 'React Frontend', type: 'frontend' },
    5173: { name: 'React Dev (Vite)', type: 'frontend' },
    4200: { name: 'Angular Dev', type: 'frontend' },
    4201: { name: 'Angular Docker', type: 'frontend' },
    5432: { name: 'PostgreSQL', type: 'data' },
    6379: { name: 'Redis', type: 'data' },
    9092: { name: 'Kafka', type: 'data' },
    2181: { name: 'Zookeeper', type: 'data' },
    27017: { name: 'MongoDB', type: 'data' },
    9200: { name: 'Elasticsearch', type: 'data' },
    9090: { name: 'Prometheus', type: 'monitoring' },
    3001: { name: 'Grafana', type: 'monitoring' },
    9411: { name: 'Zipkin', type: 'monitoring' },
    5000: { name: 'Logstash', type: 'monitoring' },
    5601: { name: 'Kibana', type: 'monitoring' },
  },

  mermaidDiagrams: {
    systemArchitecture: `graph TB
    subgraph Clients["👥 Clients"]
        Browser["🌐 Browser"]
        Mobile["📱 Mobile"]
    end

    subgraph Frontend["🖥️ Frontend Layer"]
        React["⚛️ React 18<br/>:3000"]
        Angular["🅰️ Angular 17<br/>:4200"]
    end

    subgraph Gateway["🚪 API Gateway Layer"]
        GW["Spring Cloud Gateway<br/>:8080<br/>Rate Limiting · Circuit Breaker · CORS"]
    end

    subgraph Discovery["🔍 Service Discovery"]
        Eureka["Netflix Eureka<br/>:8761"]
        Config["Config Server<br/>:8888"]
    end

    subgraph Services["⚡ Business Services"]
        EMP["👤 Employee Service<br/>:8081<br/>CQRS · Saga · Event Sourcing"]
        PAY["💰 Payroll Service<br/>:8083<br/>OpenFeign · Circuit Breaker"]
        NOT["🔔 Notification Service<br/>:8084<br/>Strategy · GraphQL · HATEOAS"]
    end

    subgraph Data["💾 Data Layer"]
        PG["🐘 PostgreSQL<br/>:5432"]
        Mongo["🍃 MongoDB<br/>:27017"]
        ES["🔎 Elasticsearch<br/>:9200"]
        Redis["⚡ Redis<br/>:6379"]
        Kafka["📨 Kafka<br/>:9092"]
    end

    subgraph Monitoring["📊 Observability"]
        Prom["Prometheus<br/>:9090"]
        Graf["Grafana<br/>:3001"]
        Zip["Zipkin<br/>:9411"]
        ELK["ELK Stack<br/>:5601"]
    end

    Browser --> React & Angular
    Mobile --> GW
    React & Angular --> GW
    GW --> EMP & PAY & NOT
    EMP & PAY & NOT -.->|register| Eureka
    EMP & PAY & NOT -.->|fetch config| Config
    GW -.->|discover| Eureka
    EMP --> PG & Mongo & ES & Redis
    EMP -->|publish| Kafka
    PAY --> PG & Redis
    PAY -->|consume| Kafka
    NOT --> PG & Redis
    NOT -->|consume| Kafka
    EMP -->|OpenFeign| PAY
    EMP & PAY & NOT -.->|metrics| Prom
    Prom --> Graf
    EMP & PAY & NOT -.->|traces| Zip
    EMP & PAY & NOT -.->|logs| ELK

    classDef frontend fill:#1a3a4a,stroke:#39d2c0,color:#39d2c0
    classDef gateway fill:#2a1a3a,stroke:#bc8cff,color:#bc8cff
    classDef service fill:#1a2a1a,stroke:#3fb950,color:#3fb950
    classDef data fill:#2a1a0a,stroke:#f0883e,color:#f0883e
    classDef monitoring fill:#2a0a1a,stroke:#f778ba,color:#f778ba

    class React,Angular frontend
    class GW gateway
    class EMP,PAY,NOT service
    class PG,Mongo,ES,Redis,Kafka data
    class Prom,Graf,Zip,ELK monitoring`,

    employeeOnboarding: `sequenceDiagram
    participant C as 👤 Client
    participant GW as 🚪 Gateway
    participant ES as 👤 Employee Service
    participant SO as 🔄 Saga Orchestrator
    participant PS as 💰 Payroll Service
    participant NS as 🔔 Notification Service
    participant K as 📨 Kafka
    participant DB as 🐘 PostgreSQL
    participant OB as 📦 Outbox

    C->>GW: POST /api/v1/employees
    GW->>ES: Route to Employee Service
    
    rect rgb(20, 40, 20)
        Note over ES,OB: Transaction Boundary
        ES->>DB: INSERT employee
        ES->>OB: INSERT outbox event
    end
    
    ES->>SO: Start Onboarding Saga
    
    rect rgb(20, 20, 40)
        Note over SO: Saga Step 1: Create Payroll
        SO->>PS: POST /api/payrolls (OpenFeign)
        PS->>DB: INSERT payroll record
        PS-->>SO: 201 Created
    end
    
    rect rgb(40, 20, 20)
        Note over SO: Saga Step 2: Send Notification
        SO->>K: Publish employee-created event
        K->>NS: Consume event
        NS->>NS: Strategy: Select channel
        NS->>DB: Save notification
    end
    
    SO-->>ES: Saga Complete
    ES-->>GW: 201 Created
    GW-->>C: Employee + Payroll + Notification`,

    cqrsFlow: `graph LR
    subgraph Write["✏️ Write Side"]
        API["REST API"]
        CMD["Command Handler"]
        JPA["JPA / Hibernate"]
        PG["🐘 PostgreSQL"]
        OB["📦 Outbox"]
    end
    
    subgraph Sync["🔄 Sync"]
        K["📨 Kafka"]
        IDX["Indexer"]
    end
    
    subgraph Read["📖 Read Side"]
        SEARCH["Search API"]
        ES["🔎 Elasticsearch"]
    end
    
    API -->|POST/PUT/DELETE| CMD
    CMD --> JPA
    JPA --> PG
    CMD --> OB
    OB -->|publish| K
    K --> IDX
    IDX -->|index| ES
    SEARCH -->|GET /search| ES
    
    classDef write fill:#1a2a1a,stroke:#3fb950,color:#3fb950
    classDef sync fill:#2a1a0a,stroke:#f0883e,color:#f0883e  
    classDef read fill:#1a1a3a,stroke:#58a6ff,color:#58a6ff
    
    class API,CMD,JPA,PG,OB write
    class K,IDX sync
    class SEARCH,ES read`,

    strategyPattern: `classDiagram
    class NotificationStrategy {
        <<interface>>
        +send(notification) void
        +supports(channel) boolean
    }
    
    class EmailNotificationStrategy {
        -JavaMailSender mailSender
        +send(notification) void
        +supports(channel) boolean
    }
    
    class SmsNotificationStrategy {
        +send(notification) void
        +supports(channel) boolean
    }
    
    class PushNotificationStrategy {
        +send(notification) void
        +supports(channel) boolean
    }
    
    class InAppNotificationStrategy {
        +send(notification) void
        +supports(channel) boolean
    }
    
    class NotificationStrategyFactory {
        -List~NotificationStrategy~ strategies
        +getStrategy(channel) NotificationStrategy
    }
    
    class NotificationServiceImpl {
        -NotificationStrategyFactory factory
        -NotificationRepository repo
        +send(request) NotificationResponse
    }
    
    NotificationStrategy <|.. EmailNotificationStrategy
    NotificationStrategy <|.. SmsNotificationStrategy
    NotificationStrategy <|.. PushNotificationStrategy
    NotificationStrategy <|.. InAppNotificationStrategy
    NotificationStrategyFactory --> NotificationStrategy
    NotificationServiceImpl --> NotificationStrategyFactory`,

    templatePattern: `classDiagram
    class AbstractNotificationProcessor {
        <<abstract>>
        +process(notifications)* void
        #validate(notification) boolean
        #preProcess(notification)* void
        #doSend(notification)* void
        #postProcess(notification)* void
        #onError(notification, error)* void
    }
    
    class BulkNotificationProcessor {
        -int batchSize
        +process(notifications) void
        #preProcess(notification) void
        #doSend(notification) void
        #postProcess(notification) void
        #onError(notification, error) void
    }
    
    class UrgentNotificationProcessor {
        -int maxRetries
        +process(notifications) void
        #preProcess(notification) void
        #doSend(notification) void
        #postProcess(notification) void
        #onError(notification, error) void
    }
    
    AbstractNotificationProcessor <|-- BulkNotificationProcessor
    AbstractNotificationProcessor <|-- UrgentNotificationProcessor`,

    infraDeploy: `graph TB
    subgraph Dev["🔧 Development"]
        Code["💻 Code Push"]
        GHA["⚙️ GitHub Actions"]
    end
    
    subgraph Build["🏗️ Build Stage"]
        MVN["Maven Build"]
        NPM["npm Build"]
        TEST["Tests + Coverage"]
        SONAR["SonarQube"]
        DOCKER["Docker Build"]
    end
    
    subgraph Registry["📦 Registry"]
        ECR["AWS ECR"]
    end
    
    subgraph Deploy["🚀 Deploy"]
        HELM["Helm Chart"]
        K8S["Kubernetes / EKS"]
    end
    
    subgraph Infra["☁️ AWS Infrastructure"]
        VPC["VPC"]
        EKS["EKS Cluster"]
        RDS["RDS PostgreSQL"]
        ECACHE["ElastiCache Redis"]
        MSK["MSK Kafka"]
        S3["S3 Buckets"]
        CW["CloudWatch"]
    end
    
    Code --> GHA
    GHA --> MVN & NPM
    MVN & NPM --> TEST
    TEST --> SONAR
    SONAR --> DOCKER
    DOCKER --> ECR
    ECR --> HELM
    HELM --> K8S
    K8S -.-> EKS
    EKS -.-> VPC
    K8S -.-> RDS & ECACHE & MSK & S3 & CW
    
    classDef dev fill:#1a2a3a,stroke:#58a6ff,color:#58a6ff
    classDef build fill:#2a2a1a,stroke:#d29922,color:#d29922
    classDef reg fill:#2a1a3a,stroke:#bc8cff,color:#bc8cff
    classDef deploy fill:#1a2a1a,stroke:#3fb950,color:#3fb950
    classDef infra fill:#2a1a0a,stroke:#f0883e,color:#f0883e
    
    class Code,GHA dev
    class MVN,NPM,TEST,SONAR,DOCKER build
    class ECR reg
    class HELM,K8S deploy
    class VPC,EKS,RDS,ECACHE,MSK,S3,CW infra`,

    gitopsFlow: `graph LR
    subgraph Dev["👨‍💻 Developer"]
        Code["Code Change"] -->|git push| PR["Pull Request"]
        PR -->|CI passes| Merge["Merge to main"]
    end

    subgraph GitRepo["📁 Git Repository"]
        Merge --> AppCode["Application Code"]
        Merge --> K8sManifests["K8s Manifests\\n(k8s/services/*.yaml)"]
    end

    subgraph ArgoCD["🔄 ArgoCD GitOps Engine"]
        Poll["Poll every 3min"] -->|diff| Drift{"Drift\\nDetected?"}
        Drift -->|Yes| Sync["Auto-Sync + Self-Heal"]
        Drift -->|No| Idle["✓ In Sync"]
    end

    subgraph K8sCluster["☸️ Kubernetes Cluster"]
        Sync --> Deploy["Deploy Pods"]
        Deploy --> KEDA["KEDA ScaledObject\\n(Kafka lag → HPA)"]
        KEDA -->|scale out| Pods["Service Pods\\n(1 → 10)"]
    end

    K8sManifests -.->|watched by| Poll
    AppCode -.->|build→push| Registry["Container Registry"]
    Registry -.->|image tag in manifest| K8sManifests

    classDef green fill:#1a2a1a,stroke:#3fb950,color:#3fb950
    classDef blue fill:#1a1a2a,stroke:#58a6ff,color:#58a6ff
    classDef purple fill:#2a1a3a,stroke:#bc8cff,color:#bc8cff
    class Code,PR,Merge green
    class ArgoCD,Poll,Drift,Sync,Idle blue
    class Deploy,KEDA,Pods purple`,

    oauth2Flow: `sequenceDiagram
    participant User as 👤 User
    participant React as ⚛️ React SPA
    participant Keycloak as 🔐 Keycloak
    participant GW as 🚪 API Gateway
    participant EMP as 👤 Employee Service

    Note over React,Keycloak: PKCE Authorization Code Flow (no client secret in browser)

    User->>React: Click Login
    React->>React: Generate code_verifier + code_challenge
    React->>Keycloak: GET /auth?client_id=react&response_type=code&code_challenge=...
    Keycloak->>User: Show Login Page
    User->>Keycloak: Submit credentials
    Keycloak->>React: Redirect with code=abc123
    React->>Keycloak: POST /token {code, code_verifier}
    Keycloak->>React: {access_token (JWT), refresh_token}
    
    Note over React,EMP: Authenticated API calls
    React->>GW: GET /api/v1/employees  Authorization: Bearer <JWT>
    GW->>GW: Validate JWT signature (Keycloak public key)
    GW->>EMP: Forward request + X-User-Id, X-User-Roles
    EMP->>GW: 200 OK {employees}
    GW->>React: 200 OK {employees}

    Note over React,Keycloak: Token refresh (before expiry)
    React->>Keycloak: POST /token {grant_type=refresh_token, refresh_token}
    Keycloak->>React: New access_token (refresh token rotation)`,

    bffAggregation: `sequenceDiagram
    participant SPA as ⚛️ React SPA
    participant BFF as 🎯 BFF Service
    participant EMP as 👤 Employee Svc
    participant PAY as 💰 Payroll Svc  
    participant NOT as 🔔 Notification Svc

    Note over SPA,BFF: Single request replaces 3 separate calls

    SPA->>BFF: GET /api/bff/v1/dashboard/42
    
    Note over BFF: Promise.allSettled — all 3 in parallel
    par Parallel upstream calls
        BFF->>EMP: GET /api/v1/employees/42
        BFF->>PAY: GET /api/v1/payroll/summary/42
        BFF->>NOT: GET /api/v1/notifications/unread-count/42
    end
    EMP->>BFF: {id, name, department, salary}
    PAY->>BFF: {currentSalary, ytdEarnings, pendingApprovals}
    NOT->>BFF: {count: 3, hasUrgent: false}

    Note over BFF: Shape response for dashboard — only needed fields
    BFF->>SPA: {profile, payrollSummary, notifications, _meta}

    Note over BFF,NOT: Partial success — if notification fails, return what we have
    BFF--xNOT: 503 Service Unavailable
    BFF->>SPA: {profile, payrollSummary, notifications: {unreadCount:0}, _meta:{partial:true}}`,
  },
};
