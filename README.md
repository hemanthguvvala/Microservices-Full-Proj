# Microservices Full Project

A comprehensive microservices architecture demonstrating enterprise-grade patterns with Spring Boot, Spring Cloud, and supporting infrastructure.

## 🏗️ Architecture Overview

This project consists of four core microservices built with Spring Boot 3.4.2 and Java 17:

```
┌─────────────────┐
│   API Gateway   │ (Port 8080)
│   (Load Bal.)   │
└────────┬────────┘
         │
    ┌────┴──────┐
    │           │
┌───▼────┐  ┌──▼──────┐
│Employee│  │ Payroll │
│Service │  │ Service │
└───┬────┘  └──┬──────┘
    │          │
    └────┬─────┘
         │
    ┌────▼────────┐
    │   Eureka    │ (Port 8761)
    │  Discovery  │
    └─────────────┘
```

### Services

| Service | Port | Description | Database |
|---------|------|-------------|----------|
| **Eureka Discovery Server** | 8761 | Service registry and discovery | N/A |
| **API Gateway** | 8080 | Routes requests, rate limiting, load balancing | Redis |
| **Employee Service** | Dynamic | Employee management with JWT auth | H2/PostgreSQL |
| **Payroll Service** | 8083 | Payroll processing and management | PostgreSQL |

## 🚀 Tech Stack

### Core Technologies
- **Java 17**
- **Spring Boot 3.4.2**
- **Spring Cloud 2023.0.0**
- **Maven**

### Infrastructure
- **Eureka** - Service discovery
- **Spring Cloud Gateway** - API gateway with routing and filtering
- **Kafka** - Event streaming and messaging
- **Redis** - Caching and rate limiting
- **PostgreSQL** - Primary database for production
- **H2** - In-memory database for development
- **Flyway** - Database migration

### Security & Monitoring
- **Spring Security** - JWT authentication
- **Spring Actuator** - Health checks and metrics
- **Prometheus** - Metrics collection
- **Swagger/OpenAPI** - API documentation

## 📋 Prerequisites

Before running this project, ensure you have:

- **Java 17+** installed
- **Maven 3.6+** installed
- **Docker & Docker Compose** (optional, for containerized setup)
- **PostgreSQL** (for Payroll service)
- **Redis** (for API Gateway and caching)
- **Apache Kafka** (for event streaming)

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone git@github.com:hemanthguvvala/Microservices-Full-Proj.git
cd Microservices-Full-Proj
```

### 2. Install Dependencies

```bash
# Build all services
mvn clean install -DskipTests
```

### 3. Start Infrastructure Services

#### Option A: Using Docker Compose (Recommended)

```bash
docker-compose up -d
```

#### Option B: Manual Setup

**Start PostgreSQL:**
```bash
# Create databases
createdb employeedb
createdb payrolldb

# Create users (adjust credentials as needed)
psql -c "CREATE USER employee_user WITH PASSWORD 'employee123';"
psql -c "CREATE USER payroll_user WITH PASSWORD 'payroll123';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE employeedb TO employee_user;"
psql -c "GRANT ALL PRIVILEGES ON DATABASE payrolldb TO payroll_user;"
```

**Start Redis:**
```bash
redis-server
# or
sudo systemctl start redis-server
```

**Start Kafka:**
```bash
# Start Zookeeper
bin/zookeeper-server-start.sh config/zookeeper.properties

# Start Kafka (in a new terminal)
bin/kafka-server-start.sh config/server.properties
```

### 4. Start Microservices

**Start services in this order:**

```bash
# 1. Start Eureka Discovery Server (wait until fully started)
cd eureka-discovery-server
mvn spring-boot:run

# 2. Start API Gateway (in a new terminal)
cd api-gateway-service
mvn spring-boot:run

# 3. Start Employee Service (in a new terminal)
cd employee-microservice
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# 4. Start Payroll Service (in a new terminal)
cd payroll-microservice
mvn spring-boot:run
```

## 🔍 Service Endpoints

### Eureka Discovery Server
- **Dashboard**: http://localhost:8761

### API Gateway
- **Base URL**: http://localhost:8080
- **Health Check**: http://localhost:8080/actuator/health
- **Gateway Routes**: http://localhost:8080/actuator/gateway/routes

### Employee Service (via Gateway)
- **Base URL**: http://localhost:8080/employee-service
- **Swagger UI**: http://localhost:8080/employee-service/swagger-ui.html
- **API Docs**: http://localhost:8080/employee-service/api-docs
- **Health**: http://localhost:8080/employee-service/actuator/health

### Payroll Service (via Gateway)
- **Base URL**: http://localhost:8080/payroll-service
- **Swagger UI**: http://localhost:8080/payroll-service/swagger-ui.html
- **API Docs**: http://localhost:8080/payroll-service/api-docs
- **Health**: http://localhost:8080/payroll-service/actuator/health

## 📝 API Examples

### Employee Service

**Register User:**
```bash
curl -X POST http://localhost:8080/employee-service/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john.doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:8080/employee-service/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john.doe",
    "password": "password123"
  }'
```

**Get All Employees:**
```bash
curl -X GET http://localhost:8080/employee-service/api/employees \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Payroll Service

**Create Payroll:**
```bash
curl -X POST http://localhost:8080/payroll-service/api/payroll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "employeeId": 1,
    "baseSalary": 5000.00,
    "bonuses": 500.00,
    "deductions": 200.00
  }'
```

## 🐳 Docker Support

Each service includes a Dockerfile for containerization:

**Build Docker Images:**
```bash
# Eureka Server
cd eureka-discovery-server && docker build -t eureka-server:1.0 .

# API Gateway
cd api-gateway-service && docker build -t api-gateway:1.0 .

# Employee Service
cd employee-microservice && docker build -t employee-service:1.0 .

# Payroll Service
cd payroll-microservice && docker build -t payroll-service:1.0 .
```

## 🧪 Testing

**Run all tests:**
```bash
mvn test
```

**Run tests for specific service:**
```bash
cd employee-microservice
mvn test
```

## 📊 Monitoring & Health

All services expose Actuator endpoints:

- **Health**: `/actuator/health`
- **Metrics**: `/actuator/metrics`
- **Prometheus**: `/actuator/prometheus`
- **Info**: `/actuator/info`

## 🔐 Security

- **JWT Authentication** on Employee Service
- **Role-based access control** (ADMIN, USER roles)
- **API Gateway** rate limiting with Redis
- **Secure credentials** - Update default passwords in production!

## 🌍 Environment Profiles

### Employee Service
- `dev` - H2 in-memory database
- `test` - Testing configuration
- `prod` - PostgreSQL database

### Payroll Service
- `dev` - Development settings
- `prod` - Production settings

## 📁 Project Structure

```
.
├── eureka-discovery-server/    # Service registry
├── api-gateway-service/        # API Gateway
├── employee-microservice/      # Employee management
├── payroll-microservice/       # Payroll processing
├── docker-compose.yml          # Docker orchestration
└── README.md                   # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is for educational and demonstration purposes.

## 👨‍💻 Author

**Hemanth Guvvala**
- GitHub: [@hemanthguvvala](https://github.com/hemanthguvvala)

## 🙏 Acknowledgments

- Spring Boot & Spring Cloud teams
- Open source community

---

**Note**: Update database credentials and JWT secrets before deploying to production!
