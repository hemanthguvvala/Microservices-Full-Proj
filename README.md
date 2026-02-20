# Employee Platform — Full-Stack Microservices System

> **© 2026 Hemanth Guvvala. All Rights Reserved.**
> This code is proprietary. AI training use, model ingestion, and commercial use without a paid license are strictly prohibited.
> See [LICENSE](LICENSE) for full terms. Licensing inquiries: hemanthguvvala@gmail.com

> **MNC-grade microservices platform** built for production-readiness interviews.
> **7 Java microservices** · **98 technologies** · **49 design patterns** · React + Angular frontends · full DevOps + cloud infrastructure.
> Covers every senior-engineer interview topic: gRPC, CDC, Event Sourcing, CQRS, Saga, Outbox, WebSocket, GitOps, Chaos Engineering, SLO/Error Budget, Zero-Trust Security.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│   React 18 (Vite + TS + Tailwind) :3000     Angular 17 (Signals) :4201     │
│   NotificationFeed + useWebSocket hook      RxJS + Angular Material         │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │ HTTPS / WSS
┌───────────────────────────────▼─────────────────────────────────────────────┐
│          API GATEWAY  (Spring Cloud Gateway :8080)                          │
│  Route predicates · Redis Rate Limiting (JWT/IP/API-Key KeyResolver)        │
│  Circuit Breaker · JWT validation · CORS · Distributed Tracing              │
└──────┬──────────┬──────────┬──────────────────────────────────────────────-─┘
       │          │          │
┌──────▼───┐ ┌────▼─────┐ ┌──▼────────────┐   ┌──────────────────────────┐
│ Employee │ │ Payroll  │ │ Notification  │   │  Analytics Service       │
│ :8081    │ │ :8083    │ │ :8084         │   │  HTTP :8085  gRPC :9090  │
│          │ │          │ │               │   │  All 4 gRPC stream modes │
│ CQRS     │ │ OpenFeign│ │ Strategy+GoF  │   │  Protobuf · Kafka cons.  │
│ EventSrc │ │ Retry+CB │ │ GraphQL+REST  │   │  Flyway · PostgreSQL     │
│ Saga·Outbox│ │ Batch  │ │ HATEOAS·WS    │   └───────────▲──────────────┘
│ gRPC cli │ │          │ │               │               │ gRPC (HTTP/2)
└──────┬───┘ └────┬─────┘ └──────┬────────┘               │
       │          │              │           ┌─────────────┘
┌──────▼──────────▼──────────────▼───────────▼─────────────────────────────┐
│                        DATA & MESSAGING LAYER                             │
│                                                                           │
│  PostgreSQL 15 (master + replica)     MongoDB 7 (audit logs)             │
│  Elasticsearch 8.11 (CQRS read)       Redis 7 (cache · locks · rate lim) │
│  Apache Kafka (event streaming)       Debezium CDC (WAL → Kafka)         │
│  Flyway (schema migrations)           pgoutput replication slot           │
└───────────────────────────────────────────────────────────────────────────┘
       │
┌──────▼───────────────────────────────────────────────────────────────────┐
│                        OBSERVABILITY LAYER                               │
│  Prometheus + Grafana  │  OpenTelemetry (OTLP)  │  ELK Stack             │
│  SLO / Error Budget    │  MDC TaskDecorator     │  Spring Actuator       │
└──────────────────────────────────────────────────────────────────────────┘
       │
┌──────▼───────────────────────────────────────────────────────────────────┐
│            INFRASTRUCTURE LAYER                                          │
│  Eureka :8761 (service registry)    Config Server :8888 (central config) │
│  BFF Service (dashboard aggregation)  Keycloak (OIDC/PKCE)               │
└──────────────────────────────────────────────────────────────────────────┘
```

## Services

| Service | Port | Key Patterns & Tech |
|---------|------|---------------------|
| **Employee Microservice** | 8081 | CQRS · Event Sourcing (+ Snapshots) · Saga (Orchestrated) · Outbox · gRPC client · MDC TaskDecorator · Distributed Locking · Feature Flags · WebSocket · Multi-Tenancy |
| **Analytics Service** | 8085 / 9090 | **NEW** — gRPC server (all 4 streaming modes) · Protobuf · Kafka consumer · Flyway · PostgreSQL · OTel |
| **Payroll Microservice** | 8083 | OpenFeign · Circuit Breaker · Retry with Backoff · Batch Processing · Read/Write Splitting · OTel (OTLP) |
| **Notification Microservice** | 8084 | Strategy + Factory + Template Method + Observer · GraphQL · HATEOAS · Bucket4j · Rate Limiting · OTel |
| **API Gateway** | 8080 | Spring Cloud Gateway (WebFlux) · Redis Rate Limiting (JWT/IP/API-Key KeyResolver) · Circuit Breaker · CORS |
| **Eureka Discovery Server** | 8761 | Netflix Eureka · Self-preservation · Peer replication · gRPC port metadata |
| **Config Server** | 8888 | Spring Cloud Config · Git + native backend · @RefreshScope · Encryption |
| **BFF Service** | 4000 | Node.js · Promise.allSettled aggregation · Circuit Breaker (opossum) · Partial success |
| **React Frontend** | 3000 | React 18 · TypeScript · Vite · TailwindCSS · Redux Toolkit · useWebSocket hook · NotificationFeed |
| **Angular Frontend** | 4201 | Angular 17 · Signals · RxJS · Material UI |

## Technologies (98 total · 49 design patterns · 7 services)

### Backend Core
Java 17 · Spring Boot 3.2 · Spring Cloud 2023 · Spring Security (JWT + PKCE) · Spring Data JPA · Spring WebFlux · Spring Batch · Spring HATEOAS · Spring GraphQL · Spring AOP · Flyway · MapStruct · Lombok · Bucket4j · OpenAPI/Swagger

### gRPC & Serialization *(new)*
gRPC (grpc-server/client-spring-boot-starter 3.1) · Protocol Buffers 3.25 · protobuf-maven-plugin · Netty (HTTP/2 transport) · All 4 gRPC streaming modes (unary, server-stream, client-stream, bidi-stream)

### Messaging & CDC *(new)*
Apache Kafka · Spring Kafka (manual ACK) · Spring WebSocket + STOMP · Debezium CDC (PostgreSQL WAL · pgoutput plugin · Outbox Event Router transform)

### Data Layer
PostgreSQL 15 (master + read replica) · MongoDB 7 · Elasticsearch 8.11 · Redis 7 · H2 (test) · Event Store (append-only) · Event Snapshots *(new)*

### Observability *(updated)*
Prometheus · Grafana · OpenTelemetry (micrometer-tracing-bridge-otel + OTLP exporter) · ELK Stack · MDC TaskDecorator · SLO / Error Budget alerting

### Infrastructure & Cloud
Docker Compose (21+ services) · Kubernetes (20+ manifests) · Helm Charts · Kustomize · ArgoCD (GitOps) · KEDA (Kafka-lag autoscaling) · Chaos Mesh · **Multi-Cloud Terraform:**
- **AWS** — EKS · RDS · ElastiCache · MSK · ECR · S3 · SQS/SNS · Secrets Manager · CloudWatch · VPC Endpoints (8)
- **Azure** — AKS · PostgreSQL Flexible · Redis Cache · Event Hubs (Kafka) · ACR · Blob Storage · Key Vault · App Insights · Log Analytics
- **GCP** — GKE · Cloud SQL · Memorystore · Pub/Sub · Artifact Registry · Cloud Storage · Secret Manager · Cloud Monitoring

### Security
Keycloak (OIDC + PKCE) · JWT Bearer · External Secrets Operator · Zero-Trust (IRSA / Workload Identity / Managed Identity)

### Frontend
React 18 · TypeScript 5.3 · Vite · TailwindCSS · Redux Toolkit · React Query · MSW · Storybook · Playwright · useWebSocket hook · NotificationFeed · Angular 17 (Signals)

### Testing & Quality
JUnit 5 · Mockito · Testcontainers · JaCoCo · Pact (consumer-driven contracts) · SonarQube · k6 (load tests)

### CI/CD
GitHub Actions (14 pipelines) · Jenkins (Jenkinsfile — declarative, 11 stages) · SonarQube · Nexus artifact publishing · Multi-cloud deploy (ECR/ACR/Artifact Registry → EKS/AKS/GKE) · Terraform multi-cloud plan/apply · OIDC federation (all 3 clouds) · JAR + WAR packaging

---

## Quick Start

### Prerequisites
- Java 17+ (JDK)
- Node.js 18+ & npm
- Docker & Docker Compose
- Maven 3.9+

### Option 1: Docker Compose (Full Stack)

```bash
# Start everything (20+ containers)
docker-compose up -d

# Or use the Makefile
make docker-up

# Access:
#   Frontend:    http://localhost:3000
#   Gateway:     http://localhost:8080
#   Eureka:      http://localhost:8761
#   Grafana:     http://localhost:3001
#   Prometheus:  http://localhost:9090
#   Zipkin:      http://localhost:9411
#   Kibana:      http://localhost:5601
```

### Option 2: Local Development

```bash
# Start infrastructure only
make infra-up

# Start services (in separate terminals)
make run-eureka
make run-config
make run-employee
make run-payroll
make run-notification
make run-gateway
make run-frontend
```

### Option 3: Kubernetes

```bash
# Apply with Kustomize
kubectl apply -k k8s/

# Or with Helm
helm install employee-platform helm/employee-platform/
# Production:
helm install employee-platform helm/employee-platform/ -f helm/employee-platform/values-prod.yaml
```

---

## Project Structure

```
├── .github/workflows/          # 14 CI/CD pipelines (incl. multi-cloud deploy)
├── Jenkinsfile                 # Jenkins declarative pipeline (11 stages, JAR/WAR)
├── analytics-service/          # NEW — gRPC analytics (HTTP:8085, gRPC:9090)
├── api-gateway-service/        # Spring Cloud Gateway + Redis KeyResolver
├── config-server/              # Spring Cloud Config Server
├── config-repository/          # Externalized config files
├── employee-microservice/      # CQRS · Event Sourcing · Saga · Outbox · gRPC client
├── eureka-discovery-server/    # Netflix Eureka
├── frontend-react/             # React 18 + useWebSocket + NotificationFeed
├── frontend-angular/           # Angular 17 + Signals
├── bff-service/                # Node.js BFF aggregation layer
├── notification-microservice/  # GoF patterns · GraphQL · HATEOAS
├── payroll-microservice/       # OpenFeign · Circuit Breaker · Batch
├── helm/                       # Helm charts
├── k8s/                        # Kubernetes manifests (20+ files)
├── infrastructure/debezium/    # NEW — Debezium CDC connector config
├── terraform/                  # Multi-cloud IaC (AWS + Azure + GCP, 30+ files)
├── monitoring/                 # Prometheus · Grafana · SLO alerts
├── pact-tests/                 # Consumer-driven contract tests
├── load-tests/                 # k6 load test scripts
├── docs/                       # Architecture docs · ADRs · Diagrams
├── docker-compose.yml          # Full-stack orchestration (21+ services)
├── Makefile                    # Developer workflow commands
└── start-all-services.sh       # Local startup script
```

---

## DevOps & Infrastructure

### Docker Compose Services
PostgreSQL, MongoDB, Elasticsearch, Redis, Kafka + Zookeeper, all 6 microservices, frontend, Prometheus, Grafana, Zipkin, Logstash, Kibana

### Kubernetes (Kustomize)
Namespace, ConfigMaps, Secrets, Ingress, 7 service deployments, PostgreSQL, Redis, Kafka, MongoDB+Elasticsearch, Prometheus+Grafana

### Terraform — Multi-Cloud IaC

| Cloud | Resources | Files |
|-------|-----------|-------|
| **AWS** | VPC (3-AZ) · EKS · RDS (read replica) · ElastiCache · MSK · ECR (7 repos) · S3 · SQS (FIFO+DLQ) · SNS · VPC Endpoints (8) · CloudWatch | 8 |
| **Azure** | VNet · AKS (Workload Identity) · PostgreSQL Flexible (HA+PgBouncer) · Redis Cache · Event Hubs (Kafka) · ACR (geo-rep) · Blob Storage · Key Vault · App Insights · Log Analytics alerts | 8 |
| **GCP** | VPC · GKE (Binary Auth) · Cloud SQL (HA) · Memorystore · Pub/Sub (schema+DLT) · Artifact Registry (Docker+Maven) · Cloud Storage · Cloud Monitoring alerts | 8 |

### Monitoring Stack
- **Prometheus** → scrapes `/actuator/prometheus` from all services
- **Grafana** → dashboards for JVM, HTTP, Kafka, Redis metrics
- **Zipkin** → distributed tracing across service calls
- **ELK** → centralized logging via Logstash + Kibana

---

## Interview Topics Covered

| Category | What's in the code |
|----------|--------------------|
| **Microservices Patterns** | Service Discovery (Eureka), API Gateway, Config Server, Circuit Breaker, CQRS, Event Sourcing + **Snapshots**, Saga (Orchestrated), Outbox, BFF |
| **gRPC** | All 4 streaming modes · Protobuf schema-first · Deadline propagation · KeyResolver discovery · gRPC K8s Ingress |
| **CDC** | Debezium PostgreSQL connector · WAL / pgoutput · Kafka topic routing · Outbox Event Router transform |
| **Data Layer** | JPA · Flyway · Redis (cache + locks + rate limiting) · MongoDB · Elasticsearch · Read/Write Splitting · Event Store |
| **Messaging** | Kafka producer/consumer · Manual ACK · DLQ · WebSocket (STOMP) · useWebSocket React hook |
| **Security** | JWT + RBAC · Keycloak OIDC/PKCE · Redis Rate Limiting (3 KeyResolver strategies) · External Secrets · Zero-Trust |
| **Observability** | Prometheus · Grafana · OpenTelemetry (OTLP wired) · ELK · MDC TaskDecorator · SLO / Error Budget |
| **API Design** | REST · GraphQL · HATEOAS · WebSocket · gRPC · OpenAPI |
| **Cloud & DevOps** | Docker (multi-stage, JAR+WAR targets) · Jenkins (Jenkinsfile) · K8s · Helm · Kustomize · ArgoCD (GitOps) · KEDA · Chaos Mesh · Terraform (AWS + Azure + GCP) · Multi-cloud strategy pattern · OIDC federation |
| **Testing** | JUnit 5 · Mockito · Testcontainers · Pact (contract) · Playwright (E2E) · k6 (load) · SonarQube |
| **Distributed Systems** | Distributed Locking · Idempotency Keys · Multi-Tenancy · Feature Flags · Blue-Green Deploy · Canary |

---

## License

This project is for educational and interview preparation purposes.
