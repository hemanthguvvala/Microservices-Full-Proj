# System Architecture Diagrams — Employee Platform (v2)

> **7 microservices · 98 technologies · 49 design patterns**
> Updated: February 2026 — includes analytics-service (gRPC), Debezium CDC, OpenTelemetry (OTLP), Event Sourcing Snapshots, MDC TaskDecorator, Redis KeyResolver rate limiting, WebSocket React hook.

---

## 1. Full System Architecture

```mermaid
graph TB
    subgraph Clients["👥 Clients"]
        React["⚛️ React 18\n:3000\nuseWebSocket hook\nNotificationFeed"]
        Angular["🅰️ Angular 17\n:4201\nSignals + RxJS"]
    end

    subgraph Gateway["🚪 API Gateway :8080"]
        GW["Spring Cloud Gateway (WebFlux)\nRedis Rate Limiting (JWT/IP/API-Key KeyResolver)\nCircuit Breaker · JWT validation · CORS"]
    end

    subgraph Discovery["🔍 Infrastructure"]
        Eureka["Eureka :8761\ngRPC port metadata"]
        Config["Config Server :8888\nnative + git backend"]
        BFF["BFF Service :4000\nPromise.allSettled aggregation"]
    end

    subgraph Services["⚡ Business Services"]
        EMP["👤 Employee Service :8081\nCQRS · Event Sourcing + Snapshots\nSaga (Orchestrated) · Outbox\nMDC TaskDecorator · gRPC client\nDistributed Locking · Multi-Tenancy"]
        PAY["💰 Payroll Service :8083\nOpenFeign · Circuit Breaker\nRetry + Backoff · Batch\nRead/Write Splitting · OTel"]
        NOT["🔔 Notification Service :8084\nStrategy + Factory + Template + Observer\nGraphQL · HATEOAS · Bucket4j · OTel"]
        ANA["📊 Analytics Service :8085/9090\ngRPC Server (all 4 streaming modes)\nProtobuf · Kafka consumer · OTel"]
    end

    subgraph Data["💾 Data Layer"]
        PG["🐘 PostgreSQL 15\nmaster + replica\n3 databases"]
        Mongo["🍃 MongoDB 7\naudit logs"]
        ES["🔎 Elasticsearch 8.11\nCQRS read model"]
        Redis["⚡ Redis 7\ncache · locks · rate limiting"]
        Kafka["📨 Kafka\nevent streaming"]
    end

    subgraph CDC["🔄 CDC Layer"]
        Deb["Debezium Connector\nWAL / pgoutput\nOutbox Event Router"]
    end

    subgraph Observability["📊 Observability"]
        Prom["Prometheus\n+ SLO alerts"]
        Graf["Grafana\ndashboards"]
        OTel["OpenTelemetry Collector\nOTLP exporter"]
        ELK["ELK Stack\n:5601"]
    end

    React & Angular --> GW
    BFF --> EMP & PAY & NOT
    GW --> EMP & PAY & NOT & BFF
    EMP -->|gRPC HTTP/2 Protobuf| ANA
    EMP & PAY & NOT & ANA -.->|register| Eureka
    EMP & PAY & NOT & ANA -.->|fetch config| Config
    EMP --> PG & Mongo & ES & Redis
    EMP -->|publish| Kafka
    PAY --> PG & Redis
    PAY -->|consume| Kafka
    NOT -->|consume| Kafka
    ANA -->|consume| Kafka
    ANA --> PG
    PG -->|WAL stream| Deb
    Deb -->|cdc.public.*| Kafka
    EMP & PAY & NOT & ANA -.->|metrics| Prom
    Prom --> Graf
    EMP & PAY & NOT & ANA -.->|traces OTLP| OTel
    EMP & PAY & NOT -.->|logs| ELK

    classDef frontend fill:#1a3a4a,stroke:#39d2c0,color:#39d2c0
    classDef gateway fill:#2a1a3a,stroke:#bc8cff,color:#bc8cff
    classDef service fill:#1a2a1a,stroke:#3fb950,color:#3fb950
    classDef data fill:#2a1a0a,stroke:#f0883e,color:#f0883e
    classDef obs fill:#2a0a1a,stroke:#f778ba,color:#f778ba
    classDef infra fill:#1a1a2a,stroke:#58a6ff,color:#58a6ff

    class React,Angular frontend
    class GW gateway
    class EMP,PAY,NOT,ANA service
    class PG,Mongo,ES,Redis,Kafka data
    class Prom,Graf,OTel,ELK obs
    class Eureka,Config,BFF,Deb infra
```

---

## 2. Employee Onboarding — End-to-End Request Flow

```mermaid
sequenceDiagram
    participant C as 👤 Client
    participant GW as 🚪 API Gateway
    participant ES as 👤 Employee Service
    participant SO as 🔄 Saga Orchestrator
    participant GRPC as 📊 Analytics (gRPC)
    participant PS as 💰 Payroll Service
    participant NS as 🔔 Notification Service
    participant K as 📨 Kafka
    participant DB as 🐘 PostgreSQL
    participant OB as 📦 Outbox
    participant WS as 🔌 WebSocket

    C->>GW: POST /api/v1/employees  (Bearer JWT)
    GW->>GW: validate JWT · Redis rate limit (userKeyResolver)
    GW->>ES: route request

    rect rgb(20, 40, 20)
        Note over ES,OB: Atomic Transaction
        ES->>DB: INSERT employee
        ES->>OB: INSERT outbox_event (same txn)
    end

    ES->>SO: startOnboardingSaga(employeeId)
    SO->>PS: POST /api/payrolls (OpenFeign + Circuit Breaker)
    PS-->>SO: 201 Created
    SO->>K: publish EMPLOYEE_CREATED

    ES->>GRPC: RecordEmployeeEvent (Unary gRPC, Protobuf)
    GRPC-->>ES: EmployeeEventResponse (or fallback: log + continue)

    K->>NS: EmployeeEventKafkaConsumer (manual ACK)
    NS->>NS: NotificationStrategyFactory → select channel
    NS->>WS: SimpMessagingTemplate.convertAndSend
    WS-->>C: real-time push (useWebSocket hook)

    ES-->>GW: 201 Created
    GW-->>C: Employee + location header
```

---

## 3. gRPC Communication — All 4 Streaming Modes

```mermaid
sequenceDiagram
    participant ES as 👤 employee-service
    participant GC as AnalyticsGrpcClient
    participant AS as 📊 analytics-service (gRPC :9090)
    participant DB as 🐘 PostgreSQL

    Note over ES,AS: Mode 1 — Unary RPC
    ES->>GC: recordEvent(employeeId, EMPLOYEE_CREATED)
    GC->>AS: RecordEmployeeEvent (Protobuf binary, HTTP/2)
    AS->>DB: INSERT analytics_events (append-only)
    AS-->>GC: EmployeeEventResponse {success, eventId}

    Note over ES,AS: Mode 2 — Server Streaming
    ES->>AS: StreamEmployeeEvents(tenantId, EMPLOYEE_CREATED)
    loop for each matching event
        AS-->>ES: EmployeeEvent (streamed)
    end
    AS-->>ES: onCompleted()

    Note over ES,AS: Mode 3 — Client Streaming
    ES->>AS: open stream
    loop batch of events
        ES->>AS: EmployeeEventBatch
    end
    ES->>AS: onCompleted()
    AS-->>ES: BatchSummaryResponse

    Note over ES,AS: Mode 4 — Bidirectional Streaming
    ES->>AS: StreamBatchEvents (open bidi stream)
    loop concurrent streams
        ES->>AS: EmployeeEvent
        AS-->>ES: BatchEventAck {eventId, processed}
    end
    AS-->>ES: onCompleted()
```

---

## 4. Change Data Capture (CDC) with Debezium

```mermaid
sequenceDiagram
    participant App as 👤 Employee Service
    participant PG as 🐘 PostgreSQL (WAL)
    participant Rep as replication slot (pgoutput)
    participant DC as Debezium Connector
    participant K as 📨 Kafka
    participant AN as 📊 Analytics Service
    participant ES as 🔎 Elasticsearch

    Note over App,PG: Normal application write
    App->>PG: INSERT employees (txn commit)
    PG->>Rep: write WAL entry (LSN position)

    Note over Rep,DC: CDC reads WAL — no polling, sub-second latency
    Rep->>DC: WAL event: op=c, table=employees
    DC->>K: cdc.public.employees topic\n{before: null, after: {id,name,...}}

    Note over K,AN: analytics-service consumes CDC
    K->>AN: EmployeeEventKafkaConsumer (@KafkaListener, manual ACK)
    AN->>AN: recordEvent(EMPLOYEE_CREATED)
    AN-->>K: ack()

    Note over K,ES: CQRS read model updated via CDC
    K->>ES: index employee document (outbox event router topic)

    Note over DC: On restart: resume from committed LSN offset stored in Kafka
```

---

## 5. Event Sourcing with Snapshots

```mermaid
graph LR
    subgraph Append["✏️ Write: appendEvent()"]
        E1["Event N written\nto event_store\n(append-only)"]
        E2["checkAndTakeSnapshot()\ncalled after write"]
        E3{"count > 100\n(SNAPSHOT_THRESHOLD)?"}
        E4["takeSnapshot()\nserialize state → JSON\nINSERT event_snapshots"]
        E5["continue normally"]
    end

    subgraph Replay["📖 Read: replayAggregate()"]
        R1["findLatestSnapshot()\naggregateId + type"]
        R2{"snapshot\nexists?"}
        R3["load full event history\nfrom event_store (O(n))"]
        R4["start from snapshot\nversion V\nload events V+1..HEAD\n(O(delta))"]
        R5["apply each event\nto domain object\nrebuilding state"]
    end

    E1 --> E2 --> E3
    E3 -->|Yes| E4 --> E5
    E3 -->|No| E5
    R1 --> R2
    R2 -->|No snapshot| R3 --> R5
    R2 -->|Snapshot found| R4 --> R5

    classDef write fill:#1a2a1a,stroke:#3fb950,color:#3fb950
    classDef read fill:#1a1a2a,stroke:#58a6ff,color:#58a6ff
    class E1,E2,E3,E4,E5 write
    class R1,R2,R3,R4,R5 read
```

---

## 6. CQRS + Outbox + CDC Data Flow

```mermaid
graph LR
    subgraph Write["✏️ Write Side"]
        API["REST API\nPOST /employees"]
        CMD["Command Handler\n@Transactional"]
        JPA["JPA / Hibernate\nPostgreSQL master"]
        OB["📦 Outbox Table\n(same transaction)"]
        EVT["Event Store\n(append-only events)"]
    end

    subgraph CDC["🔄 CDC (Debezium)"]
        WAL["PostgreSQL WAL\npgoutput plugin"]
        DEB["Debezium Connector\nOutbox Event Router"]
    end

    subgraph Sync["📨 Kafka"]
        K["employee-events\ncdc.public.*"]
    end

    subgraph Read["📖 Read Side"]
        ESvc["Search API\nGET /employees/search"]
        IDX["Elasticsearch Indexer\n(Kafka consumer)"]
        ES["🔎 Elasticsearch\nfull-text search"]
        Cache["⚡ Redis Cache\npoint reads"]
    end

    API --> CMD --> JPA
    CMD --> OB
    CMD --> EVT
    OB -->|polling or CDC| K
    JPA --> WAL --> DEB --> K
    K --> IDX --> ES
    ESvc --> ES
    ESvc --> Cache

    classDef write fill:#1a2a1a,stroke:#3fb950,color:#3fb950
    classDef cdc fill:#2a2a1a,stroke:#d29922,color:#d29922
    classDef msg fill:#2a1a0a,stroke:#f0883e,color:#f0883e
    classDef read fill:#1a1a2a,stroke:#58a6ff,color:#58a6ff

    class API,CMD,JPA,OB,EVT write
    class WAL,DEB cdc
    class K msg
    class ESvc,IDX,ES,Cache read
```

---

## 7. API Gateway — Redis Rate Limiting (3 KeyResolver Strategies)

```mermaid
graph TB
    subgraph Incoming["📥 Incoming Request"]
        REQ["HTTP Request\n(Bearer JWT | X-API-Key | anonymous)"]
    end

    subgraph KeyResolver["🔑 GatewayRateLimiterConfig (PRIMARY)"]
        KR1["userKeyResolver @Primary\nextract sub from JWT Bearer\nfallback → IP address"]
        KR2["apiKeyResolver\nX-API-Key header"]
        KR3["ipKeyResolver\nX-Forwarded-For"]
    end

    subgraph RateLimiters["⚡ Redis Token Bucket"]
        RL1["defaultRedisRateLimiter\n10 req/s · burst 20\n(standard endpoints)"]
        RL2["analyticsRateLimiter\n2 req/s · burst 5\n(/analytics/** — gRPC is expensive)"]
        RL3["healthRateLimiter\n1000 req/s · burst 2000\n(actuator health — never block)"]
    end

    subgraph Redis["⚡ Redis Cluster\n(distributed — all gateway instances share state)"]
        TB["Token Bucket\nper key per instance"]
    end

    REQ --> KR1
    KR1 --> RL1 & RL2 & RL3
    RL1 & RL2 & RL3 --> TB
    TB -->|token available| PASS["✅ Route to service"]
    TB -->|bucket empty| REJECT["❌ 429 Too Many Requests"]
```

---

## 8. WebSocket Real-Time Notifications

```mermaid
sequenceDiagram
    participant UI as ⚛️ React (useWebSocket hook)
    participant WS as Spring WebSocket :8081
    participant NS as 🔔 Notification Service
    participant K as 📨 Kafka

    Note over UI,WS: Connection (with auto-reconnect)
    UI->>WS: WS Upgrade (HTTP → WebSocket)
    WS-->>UI: 101 Switching Protocols
    UI->>UI: startHeartbeat() ping every 30s
    UI->>WS: {type: "ping"}
    WS-->>UI: {type: "pong"}

    Note over K,NS: Notification triggered by Kafka event
    K->>NS: EMPLOYEE_CREATED event (manual ACK consumer)
    NS->>NS: NotificationStrategyFactory → select channel
    NS->>WS: SimpMessagingTemplate.convertAndSend("/topic/notifications")
    WS-->>UI: {type: "EMPLOYEE_CREATED", employeeId, dept, timestamp}
    UI->>UI: NotificationFeed.tsx renders card\nsound toggle · filter tabs · expandable detail

    Note over UI: Auto-reconnect on disconnect
    UI->>UI: onclose → exponential backoff (1s, 2s, 4s, 8s...)
    UI->>WS: reconnect attempt
    WS-->>UI: 101 Switching Protocols
```

---

## 9. MDC Context Propagation Across Async Threads

```mermaid
sequenceDiagram
    participant HTTP as HTTP Thread
    participant DEC as MdcTaskDecorator
    participant POOL as ThreadPoolTaskExecutor
    participant ASYNC as @Async Worker Thread

    Note over HTTP: Incoming request — MDC contains correlationId, tenantId, userId
    HTTP->>HTTP: MDC.put("correlationId", "abc-123")
    HTTP->>HTTP: MDC.put("tenantId", "tenant-A")
    HTTP->>POOL: submit @Async task (Runnable)

    Note over DEC: TaskDecorator wraps the Runnable BEFORE submission
    POOL->>DEC: decorate(runnable)
    DEC->>DEC: capture = MDC.getCopyOfContextMap()
    DEC->>DEC: capture RequestAttributes (for @RequestScope)
    DEC-->>POOL: wrapped Runnable

    Note over ASYNC: Worker thread — different thread, empty MDC by default
    POOL->>ASYNC: execute wrapped Runnable
    ASYNC->>ASYNC: MDC.setContextMap(captured) ← restores correlationId etc.
    ASYNC->>ASYNC: execute business logic (logs contain correlationId ✅)
    ASYNC->>ASYNC: finally: MDC.clear() ← prevent thread pool MDC leaks
```

---

## 10. Kubernetes Deployment (with gRPC Ingress)

```mermaid
graph TB
    subgraph Internet
        Users["End Users"]
    end

    subgraph K8sCluster["☸️ Kubernetes Cluster (EKS)"]
        subgraph Ingress["Ingress Layer"]
            HTTPIng["Nginx HTTP Ingress\n(REST + WebSocket)"]
            GRPCIng["Nginx gRPC Ingress\nbackend-protocol: GRPC\nHTTP/2 passthrough\nanalytics-grpc.employee-platform.local"]
        end

        subgraph Services["Services Namespace"]
            GW["API Gateway x2"]
            EMP["Employee Service x3"]
            PAY["Payroll Service x2"]
            NOT["Notification Service x2"]
            ANA["Analytics Service x2\ngRPC :9090 + HTTP :8085"]
            EUR["Eureka x2"]
            CFG["Config Server x2"]
        end

        subgraph Data["Data StatefulSets"]
            PGM["PostgreSQL Master"]
            PGR["PostgreSQL Replica"]
            RDS["Redis"]
            KFK["Kafka x3"]
        end

        subgraph Autoscaling["KEDA Autoscaling"]
            KedaObj["ScaledObject\nKafka lag trigger\n1 → 10 pods"]
        end
    end

    subgraph GitOps["GitOps (ArgoCD)"]
        Argo["ArgoCD\npoll Git every 3min\nauto-sync + self-heal"]
    end

    Users --> HTTPIng --> GW --> EMP & PAY & NOT
    Users --> GRPCIng --> ANA
    EMP -->|gRPC| ANA
    KedaObj -.->|scale| EMP & ANA
    Argo -.->|deploy| Services
```

---

## 11. Observability — OpenTelemetry Pipeline

```mermaid
graph LR
    subgraph Services["Microservices (OTel SDK wired)"]
        EMP["Employee Service\nmicrometer-tracing-bridge-otel\nopentelemetry-exporter-otlp"]
        PAY["Payroll Service\n(same OTel deps)"]
        NOT["Notification Service\n(same OTel deps)"]
        ANA["Analytics Service\n(grpc spring boot\n+ OTel auto-instrument)"]
    end

    subgraph Collector["OpenTelemetry Collector :4317/4318"]
        RECV["OTLP Receiver\n(grpc 4317 + http 4318)"]
        PROC["Batch Processor\n+ Attribute Processor"]
        EXP["Exporters"]
    end

    subgraph Backends
        PROM["Prometheus\n(metrics)"]
        GRAF["Grafana\n(dashboards + SLO alerts)"]
        JAEGER["Jaeger / Zipkin\n(traces)"]
        ELK["ELK Stack\n(logs + MDC correlationId)"]
    end

    EMP & PAY & NOT & ANA -->|OTLP/HTTP traces+metrics| RECV
    RECV --> PROC --> EXP
    EXP --> PROM --> GRAF
    EXP --> JAEGER
    EXP --> ELK

    classDef svc fill:#1a2a1a,stroke:#3fb950,color:#3fb950
    classDef col fill:#2a1a3a,stroke:#bc8cff,color:#bc8cff
    classDef back fill:#2a1a0a,stroke:#f0883e,color:#f0883e
    class EMP,PAY,NOT,ANA svc
    class RECV,PROC,EXP col
    class PROM,GRAF,JAEGER,ELK back
```

---

## 12. Component Architecture — Employee Service (Detailed)

```mermaid
graph TB
    subgraph Input["📥 Input"]
        REST["REST Controllers\n/api/v1/employees"]
        WSIn["WebSocket Handler\n/ws/notifications"]
        KIn["Kafka Consumer\n@KafkaListener manual ACK"]
    end

    subgraph Core["⚙️ Business Core"]
        SVC["EmployeeService\n@Transactional"]
        SAGA["SagaOrchestrator\n3-step: create→payroll→notify"]
        CSQR["CQRS Command Handler"]
        ES["EventSourcingService\nappendEvent() + replayAggregate()\n+ checkAndTakeSnapshot()"]
        OB["OutboxPublisher\n@Scheduled polling"]
    end

    subgraph Patterns["🏗️ Cross-Cutting"]
        MDC["MdcTaskDecorator\ncorrelationId across @Async"]
        CB["Circuit Breaker (Resilience4j)\nsliding window: 10"]
        DL["@DistributedLock AOP\nRedis SET NX EX"]
        FF["@FeatureFlag AOP\nruntime toggles"]
        MT["TenantContext\nThreadLocal isolation"]
    end

    subgraph Output["📤 Outgoing"]
        GRPC["AnalyticsGrpcClient\n@GrpcClient blocking stub\ndeadline: 2s"]
        FEIGN["PayrollFeignClient\nOpenFeign + CB"]
        KOut["Kafka Producer\nOutbox events"]
        ESOut["Elasticsearch\nCQRS read model"]
        MDB["MongoDB\naudit logs"]
        CACHE["Redis Cache\n@Cacheable"]
    end

    subgraph Store["💾 Storage"]
        PG["PostgreSQL\nevent_store · snapshots · outbox"]
        SNAP["EventSnapshot\nauto at threshold=100"]
    end

    REST & WSIn & KIn --> SVC
    SVC --> SAGA & CSQR & ES & OB
    SVC --> MDC & CB & DL & FF & MT
    SAGA --> FEIGN
    ES --> SNAP
    OB --> KOut
    SVC --> GRPC & ESOut & MDB & CACHE
    ES & OB --> PG
    SNAP --> PG
```

---

*This document is auto-updated. All diagrams reflect actual code in the repository.*
    
    Employee -->|Write| PostgreSQL
    Employee -->|Read| PostgresReplica
    Employee -->|Audit| MongoDB
    Employee -->|Search| ES
    Employee -->|Cache| Redis
    
    Payroll --> PostgreSQL
    Payroll --> Redis
    
    Employee -->|Events| Kafka
    Payroll -->|Events| Kafka
    Kafka --> Zookeeper
    
    Employee -->|Metrics| Prometheus
    Payroll -->|Metrics| Prometheus
    Gateway -->|Metrics| Prometheus
    Prometheus --> Grafana
    
    Employee -->|Traces| Zipkin
    Payroll -->|Traces| Zipkin
    
    Employee -->|Logs| ELK
    Payroll -->|Logs| ELK
```

## Request Flow Sequence

### Employee Creation Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as API Gateway
    participant Auth as JWT Filter
    participant Employee as Employee Service
    participant DB as PostgreSQL
    participant Outbox as Outbox Table
    participant Publisher as Outbox Publisher
    participant Kafka
    participant ES as Elasticsearch
    participant Mongo as MongoDB Audit
    participant WS as WebSocket
    
    Client->>Gateway: POST /api/employees
    Gateway->>Auth: Validate JWT
    Auth-->>Gateway: Token Valid
    
    Gateway->>Employee: Route Request
    
    rect rgb(200, 220, 255)
        Note over Employee,Outbox: Transaction Boundary
        Employee->>DB: INSERT employee
        DB-->>Employee: Employee Created
        Employee->>Outbox: INSERT event (same txn)
        Outbox-->>Employee: Event Saved
    end
    
    Employee-->>Gateway: 201 Created
    Gateway-->>Client: Response
    
    Note over Publisher: Background Process (every 5s)
    Publisher->>Outbox: SELECT pending events
    Outbox-->>Publisher: Events
    Publisher->>Kafka: Publish EMPLOYEE_CREATED
    Kafka-->>Publisher: ACK
    Publisher->>Outbox: UPDATE status=PROCESSED
    
    Kafka->>ES: Consume & Index
    Kafka->>Mongo: Consume & Audit Log
    Kafka->>WS: Consume & Broadcast
    WS-->>Client: Real-time Update
```

### Saga Pattern: Employee Onboarding

```mermaid
sequenceDiagram
    participant Client
    participant Orchestrator as Saga Orchestrator
    participant Employee as Employee Service
    participant Payroll as Payroll Service
    participant Email as Email Service
    participant Auth as Auth Service
    participant DB as Saga DB
    
    Client->>Orchestrator: Start Onboarding
    Orchestrator->>DB: Create Saga Instance
    
    rect rgb(200, 255, 200)
        Note over Orchestrator: Forward Flow
        Orchestrator->>Employee: 1. Create Employee
        Employee-->>Orchestrator: Success
        Orchestrator->>DB: Mark Step 1 Complete
        
        Orchestrator->>Payroll: 2. Create Payroll
        Payroll-->>Orchestrator: Success
        Orchestrator->>DB: Mark Step 2 Complete
        
        Orchestrator->>Email: 3. Send Welcome Email
        Email-->>Orchestrator: FAILURE ❌
    end
    
    rect rgb(255, 200, 200)
        Note over Orchestrator: Compensation Flow
        Orchestrator->>DB: Mark Saga as COMPENSATING
        
        Orchestrator->>Payroll: Compensate: Delete Payroll
        Payroll-->>Orchestrator: Deleted
        
        Orchestrator->>Employee: Compensate: Delete Employee
        Employee-->>Orchestrator: Deleted
        
        Orchestrator->>DB: Mark Saga as COMPENSATED
    end
    
    Orchestrator-->>Client: Onboarding Failed (Compensated)
```

### Database Read/Write Routing

```mermaid
sequenceDiagram
    participant Service
    participant Router as Routing DataSource
    participant Master as PostgreSQL Master
    participant Replica as PostgreSQL Replica
    
    Note over Service: Write Operation
    Service->>Router: save(employee) <br/> @Transactional
    Router->>Router: Check Transaction Type
    Router->>Master: Route to Master
    Master-->>Router: Success
    Router-->>Service: Employee Saved
    
    Note over Service: Read Operation
    Service->>Router: findById(id) <br/> @Transactional(readOnly=true)
    Router->>Router: Check Transaction Type
    Router->>Replica: Route to Replica
    Replica-->>Router: Employee Data
    Router-->>Service: Employee Found
```

## Component Architecture - Employee Service

```mermaid
graph TB
    subgraph "Employee Service"
        Controller[REST Controllers]
        Service[Business Services]
        
        subgraph "Patterns"
            Saga[Saga Orchestrator]
            Outbox[Outbox Service]
            ACL[Anti-Corruption Layer]
        end
        
        subgraph "Data Access"
            JPA[JPA Repository]
            Mongo[MongoDB Repository]
            ES[ES Repository]
        end
        
        subgraph "Integration"
            Kafka[Kafka Producer/Consumer]
            Feign[Feign Clients]
            WS[WebSocket Handler]
        end
        
        subgraph "Infrastructure"
            Config[Config Client]
            Eureka[Eureka Client]
            Circuit[Circuit Breaker]
            Cache[Cache Manager]
        end
    end
    
    Controller --> Service
    Service --> Saga
    Service --> Outbox
    Service --> ACL
    Service --> JPA
    Service --> Mongo
    Service --> ES
    Service --> Kafka
    Service --> Feign
    Service --> WS
    Service --> Circuit
    Service --> Cache
    
    Config -.->|Configuration| Service
    Eureka -.->|Registration| Service
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Kubernetes Cluster"
        subgraph "Ingress"
            Ingress[Nginx Ingress Controller]
        end
        
        subgraph "Services Namespace"
            Gateway[API Gateway Pod x3]
            Employee[Employee Service Pod x3]
            Payroll[Payroll Service Pod x3]
            Config[Config Server Pod x2]
            Eureka[Eureka Server Pod x2]
        end
        
        subgraph "Data Namespace"
            PG[PostgreSQL StatefulSet]
            PGReplica[PG Replica StatefulSet]
            Mongo[MongoDB StatefulSet]
            ES[Elasticsearch StatefulSet]
            Redis[Redis StatefulSet]
        end
        
        subgraph "Messaging Namespace"
            Kafka[Kafka StatefulSet x3]
            ZK[Zookeeper StatefulSet x3]
        end
        
        subgraph "Monitoring Namespace"
            Prom[Prometheus]
            Graf[Grafana]
            Zip[Zipkin]
        end
    end
    
    subgraph "External"
        Users[End Users]
        DevOps[DevOps Team]
    end
    
    Users -->|HTTPS| Ingress
    Ingress --> Gateway
    Gateway --> Employee
    Gateway --> Payroll
    
    DevOps -->|Monitoring| Graf
    DevOps -->|Tracing| Zip
```

## Data Flow Architecture

```mermaid
graph LR
    subgraph "Write Path"
        W1[Client Write] -->|1| W2[Employee Service]
        W2 -->|2| W3[PostgreSQL Master]
        W2 -->|3| W4[Outbox Table]
        W4 -->|4| W5[Kafka]
        W5 -->|5| W6[Elasticsearch]
        W5 -->|6| W7[MongoDB Audit]
    end
    
    subgraph "Read Path"
        R1[Client Read] -->|1| R2[Check Cache]
        R2 -->|Cache Miss| R3[PostgreSQL Replica]
        R2 -->|Cache Hit| R4[Return]
        R3 -->|2| R5[Update Cache]
        R5 -->|3| R4
    end
    
    subgraph "Search Path"
        S1[Client Search] -->|1| S2[Employee Service]
        S2 -->|2| S3[Elasticsearch]
        S3 -->|3| S4[Return Results]
    end
```

This comprehensive architecture demonstrates:
- **Microservices**: Independent, scalable services
- **Event-Driven**: Kafka for async communication
- **Polyglot Persistence**: Right database for each use case
- **Resilience**: Circuit breakers, retries, fallbacks
- **Observability**: Prometheus, Grafana, Zipkin, ELK
- **Scalability**: Load balancing, read replicas, caching
- **Patterns**: Saga, Outbox, ACL, Strangler Fig
