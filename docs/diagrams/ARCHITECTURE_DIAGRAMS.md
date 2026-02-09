# System Architecture Diagram - Employee Management Platform

## High-Level Architecture

```mermaid
graph TB
    Client[Web/Mobile Client]
    
    subgraph "Edge Layer"
        Gateway[API Gateway :8080]
        LB[Load Balancer]
    end
    
    subgraph "Service Discovery"
        Eureka[Eureka Server :8761]
    end
    
    subgraph "Configuration Management"
        Config[Config Server :8888]
        ConfigRepo[(Config Repository)]
    end
    
    subgraph "Core Services"
        Employee[Employee Service :8081]
        Payroll[Payroll Service :8083]
    end
    
    subgraph "Data Layer"
        PostgreSQL[(PostgreSQL)]
        PostgresReplica[(PostgreSQL Replica)]
        MongoDB[(MongoDB)]
        ES[(Elasticsearch)]
        Redis[(Redis Cache)]
    end
    
    subgraph "Messaging Layer"
        Kafka[Apache Kafka]
        Zookeeper[Zookeeper]
    end
    
    subgraph "Monitoring"
        Prometheus[Prometheus]
        Grafana[Grafana]
        Zipkin[Zipkin]
        ELK[ELK Stack]
    end
    
    Client -->|HTTPS| LB
    LB --> Gateway
    Gateway --> Employee
    Gateway --> Payroll
    
    Employee --> Eureka
    Payroll --> Eureka
    Gateway --> Eureka
    
    Employee --> Config
    Payroll --> Config
    Config --> ConfigRepo
    
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
