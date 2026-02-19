# Employee Platform — Full-Stack Microservices Project

> **MNC-grade microservices platform** built for production-readiness interviews.
> Spans 35+ enterprise technologies across 6 Java microservices, React frontend, and full DevOps infrastructure.

---

## Architecture Overview

```
┌──────────────┐      ┌───────────────┐      ┌─────────────────┐
│   React SPA  │─────▶│  API Gateway  │─────▶│  Eureka Server  │
│   (Vite+TS)  │:3000 │  (Spring GW)  │:8080 │  (Discovery)    │:8761
└──────────────┘      └───────┬───────┘      └─────────────────┘
                              │                       ▲
               ┌──────────────┼──────────────┐        │
               ▼              ▼              ▼        │
        ┌─────────────┐ ┌──────────┐ ┌──────────────┐ │
        │  Employee   │ │ Payroll  │ │ Notification │ │
        │  Service    │ │ Service  │ │  Service     │ │
        │  :8081      │ │ :8083    │ │  :8084       │ │
        └──────┬──────┘ └────┬─────┘ └──────┬───────┘ │
               │             │              │         │
        ┌──────▼──────┐ ┌────▼─────┐ ┌──────▼───────┐ │
        │ PostgreSQL  │ │PostgreSQL│ │ PostgreSQL   │ │
        │ + Redis     │ │+ Redis   │ │ + Redis      │ │
        │ + MongoDB   │ │          │ │ + Kafka      │ │
        │ + Elastic   │ │          │ │              │ │
        └─────────────┘ └──────────┘ └──────────────┘ │
                                                      │
        ┌─────────────────────────────────────────────┘
        │  Config Server :8888 (centralized config)
        └─────────────────────────────────────────────
```

## Services

| Service | Port | Tech Stack |
|---------|------|-----------|
| **Employee Microservice** | 8081 | Spring Boot, JPA, Redis, MongoDB, Elasticsearch, Kafka, WebSocket, JWT Auth |
| **Payroll Microservice** | 8083 | Spring Boot, JPA, Flyway, Redis, Spring Security, Actuator |
| **Notification Microservice** | 8084 | Spring Boot, Kafka Consumer/Producer, Mail, GraphQL, Rate Limiting, Cache |
| **API Gateway** | 8080 | Spring Cloud Gateway, Circuit Breaker, Rate Limiting, CORS |
| **Eureka Discovery Server** | 8761 | Netflix Eureka, Service Registry, Heartbeat Monitoring |
| **Config Server** | 8888 | Spring Cloud Config, Centralized Config, Profile-based |
| **Frontend** | 3000 | React 18, TypeScript, Vite, Axios, React Router |

## Technologies (35+)

### Backend
Spring Boot 3.2, Spring Cloud 2023, Spring Security (JWT), Spring Data JPA, Spring Data Redis, Spring Data MongoDB, Spring Data Elasticsearch, Spring Kafka, Spring WebSocket, Spring HATEOAS, Spring GraphQL, Spring AOP, Flyway, MapStruct, Lombok, Bucket4j, OpenAPI/Swagger

### Infrastructure
Docker & Docker Compose (20+ services), Kubernetes (19 manifests), Helm Charts, Terraform (AWS: EKS + RDS + ElastiCache + MSK + ECR + S3 + CloudWatch), Kustomize

### Observability
Prometheus, Grafana, Zipkin, ELK Stack (Elasticsearch + Logstash + Kibana), Micrometer, Spring Actuator

### CI/CD
GitHub Actions (6 pipelines: employee, payroll, notification, gateway, eureka, config-server, frontend)

### Databases
PostgreSQL 15 (3 DBs), MongoDB, Redis, Elasticsearch, H2 (test)

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
├── .github/workflows/          # 7 CI/CD pipelines
├── api-gateway-service/        # Spring Cloud Gateway
├── config-server/              # Spring Cloud Config Server
├── config-repository/          # Externalized config files
├── employee-microservice/      # Core employee CRUD + search
├── eureka-discovery-server/    # Netflix Eureka
├── frontend-react/             # React 18 + TypeScript + Vite
├── notification-microservice/  # Kafka-driven notifications
├── payroll-microservice/       # Payroll processing
├── helm/                       # Helm charts (7 templates)
├── k8s/                        # Kubernetes manifests (19 files)
├── terraform/                  # AWS infrastructure (10 files)
├── infrastructure/             # Docker configs, init scripts
├── monitoring/                 # Prometheus, Grafana, ELK configs
├── docs/                       # Architecture documentation
├── docker-compose.yml          # Full-stack orchestration
├── Makefile                    # Developer workflow commands
└── start-all-services.sh       # Local startup script
```

---

## DevOps & Infrastructure

### Docker Compose Services
PostgreSQL, MongoDB, Elasticsearch, Redis, Kafka + Zookeeper, all 6 microservices, frontend, Prometheus, Grafana, Zipkin, Logstash, Kibana

### Kubernetes (Kustomize)
Namespace, ConfigMaps, Secrets, Ingress, 7 service deployments, PostgreSQL, Redis, Kafka, MongoDB+Elasticsearch, Prometheus+Grafana

### Terraform (AWS)
VPC (3-AZ), EKS, RDS PostgreSQL (read replica in prod), ElastiCache Redis, MSK Kafka, ECR (7 repos), S3, CloudWatch alarms, IAM/IRSA

### Monitoring Stack
- **Prometheus** → scrapes `/actuator/prometheus` from all services
- **Grafana** → dashboards for JVM, HTTP, Kafka, Redis metrics
- **Zipkin** → distributed tracing across service calls
- **ELK** → centralized logging via Logstash + Kibana

---

## Interview Topics Covered

| Category | Technologies |
|----------|-------------|
| Microservices Patterns | Service Discovery, API Gateway, Config Server, Circuit Breaker, CQRS, Event Sourcing |
| Data Management | JPA, Flyway Migrations, Redis Caching, MongoDB Documents, Elasticsearch Full-Text Search |
| Messaging | Kafka Producer/Consumer, Event-Driven Architecture, Async Processing |
| Security | JWT Authentication, Spring Security, CORS, Rate Limiting (Bucket4j) |
| API Design | REST, GraphQL, HATEOAS, WebSocket, OpenAPI/Swagger |
| DevOps | Docker, K8s, Helm, Terraform, GitHub Actions CI/CD, Kustomize |
| Observability | Prometheus, Grafana, Zipkin Tracing, ELK Stack, Spring Actuator |
| Testing | JUnit 5, Mockito, Testcontainers, JaCoCo, Integration Tests |

---

## License

This project is for educational and interview preparation purposes.
