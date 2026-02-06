# Payroll Microservice - Quick Start Guide

## 📁 Project Structure

```
payroll-microservice/
├── src/
│   ├── main/
│   │   ├── java/com/example/payroll/
│   │   │   ├── client/              # Feign clients
│   │   │   ├── config/              # Configuration classes
│   │   │   ├── controller/          # REST controllers
│   │   │   ├── dto/                 # Data Transfer Objects
│   │   │   ├── event/               # Kafka event models
│   │   │   ├── exception/           # Custom exceptions & handlers
│   │   │   ├── health/              # Health indicators
│   │   │   ├── mapper/              # Entity-DTO mappers
│   │   │   ├── model/               # JPA entities
│   │   │   ├── repository/          # Spring Data repositories
│   │   │   ├── service/             # Business logic
│   │   │   └── PayrollServiceApplication.java
│   │   └── resources/
│   │       ├── db/migration/        # Flyway migrations
│   │       ├── application.yml
│   │       └── application-prod.yml
│   └── test/
│       ├── java/                    # Unit & integration tests
│       └── resources/
│           └── application-test.yml
├── .github/workflows/               # CI/CD pipelines
├── pom.xml
├── Dockerfile
├── .gitignore
└── README.md
```

## 🚀 Quick Start

### 1. Start Required Services

```bash
# Start PostgreSQL
docker run -d --name postgres \
  -e POSTGRES_DB=payrolldb \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 postgres:14

# Start Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Start Kafka (with Zookeeper)
docker run -d --name zookeeper -p 2181:2181 zookeeper:3.7
docker run -d --name kafka \
  -p 9092:9092 \
  -e KAFKA_ZOOKEEPER_CONNECT=localhost:2181 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  confluentinc/cp-kafka:latest

# Start Eureka Server (if not already running)
# Navigate to eureka-discovery-server and run: mvn spring-boot:run
```

### 2. Build and Run

```bash
# Build the project
mvn clean install

# Run the application
mvn spring-boot:run

# Or with specific profile
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

### 3. Access the Application

- **Application**: http://localhost:8083
- **Swagger UI**: http://localhost:8083/swagger-ui.html
- **API Docs**: http://localhost:8083/api-docs
- **Health Check**: http://localhost:8083/actuator/health
- **Metrics**: http://localhost:8083/actuator/prometheus
- **H2 Console** (dev only): http://localhost:8083/h2-console

## 📊 Database Schema

### Main Tables:

1. **payrolls** - Stores payroll records
   - Employee payroll details
   - Salary components (basic, allowances, bonuses, deductions, tax)
   - Payment status and dates
   - Net salary calculation

2. **salary_components** - Individual salary components
   - Detailed breakdown of salary elements
   - Taxable/non-taxable flags
   - Component types (EARNING, DEDUCTION, ALLOWANCE, BONUS, TAX)

3. **payment_transactions** - Payment transaction history
   - Transaction tracking
   - Payment gateway integration
   - Retry mechanism
   - Error handling

## 🔌 API Endpoints

### Payroll Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payrolls` | Create new payroll |
| GET | `/api/payrolls/{id}` | Get payroll by ID |
| GET | `/api/payrolls` | Get all payrolls |
| GET | `/api/payrolls/page` | Get paginated payrolls |
| GET | `/api/payrolls/employee/{employeeId}` | Get employee payrolls |
| GET | `/api/payrolls/status/{status}` | Get payrolls by status |
| GET | `/api/payrolls/date-range` | Get payrolls by date range |
| PUT | `/api/payrolls/{id}` | Update payroll |
| POST | `/api/payrolls/{id}/approve` | Approve payroll |
| POST | `/api/payrolls/{id}/process-payment` | Process payment |
| DELETE | `/api/payrolls/{id}` | Delete payroll |

## 🎯 Key Features

### 1. **Payroll Processing Workflow**
- Create → Pending → Approved → Processing → Paid
- Automatic net salary calculation
- Tax and deduction handling

### 2. **Integration Capabilities**
- **Employee Service**: Feign client with circuit breaker
- **Kafka Events**: Publishes payroll lifecycle events
- **Redis Caching**: Improves read performance
- **Service Discovery**: Eureka client integration

### 3. **Resilience Patterns**
- Circuit Breaker (Resilience4j)
- Retry mechanism
- Rate limiting
- Timeout handling

### 4. **Monitoring & Observability**
- Actuator health checks
- Prometheus metrics
- Distributed tracing (Zipkin)
- Custom health indicators (Redis, Kafka, Database)

### 5. **Data Management**
- Flyway database migrations
- JPA auditing
- Optimistic locking
- Soft delete support

## 🧪 Testing

```bash
# Run unit tests
mvn test

# Run with coverage
mvn test jacoco:report

# View coverage report
open target/site/jacoco/index.html

# Run specific test class
mvn test -Dtest=PayrollServiceTest

# Run integration tests
mvn verify
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/payrolldb
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres

# Redis
SPRING_REDIS_HOST=localhost
SPRING_REDIS_PORT=6379

# Kafka
SPRING_KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Eureka
EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE=http://localhost:8761/eureka/

# Server Port
SERVER_PORT=8083
```

## 📝 Sample API Requests

### Create Payroll

```bash
curl -X POST http://localhost:8083/api/payrolls \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": 1,
    "basicSalary": 5000.00,
    "allowances": 500.00,
    "bonuses": 1000.00,
    "deductions": 200.00,
    "tax": 900.00,
    "payPeriodStart": "2024-01-01",
    "payPeriodEnd": "2024-01-31",
    "paymentMethod": "BANK_TRANSFER",
    "currency": "USD"
  }'
```

### Get Payroll by ID

```bash
curl http://localhost:8083/api/payrolls/1
```

### Approve Payroll

```bash
curl -X POST http://localhost:8083/api/payrolls/1/approve
```

### Get Employee Payrolls

```bash
curl http://localhost:8083/api/payrolls/employee/1
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Change port in application.yml or use environment variable
   SERVER_PORT=8084 mvn spring-boot:run
   ```

2. **Database connection failed**
   ```bash
   # Check PostgreSQL is running
   docker ps | grep postgres
   # Restart if needed
   docker restart postgres
   ```

3. **Redis connection failed**
   ```bash
   # Check Redis is running
   docker ps | grep redis
   # Test connection
   redis-cli ping
   ```

4. **Kafka not available**
   ```bash
   # Check Kafka is running
   docker ps | grep kafka
   # View Kafka logs
   docker logs kafka
   ```

## 🔐 Security Notes

**Development Mode** (default):
- All endpoints are open
- H2 console enabled
- Detailed error messages

**Production Mode**:
- Update `SecurityConfig` to require authentication
- Disable H2 console
- Use environment-specific secrets
- Enable HTTPS
- Configure proper CORS policies

## 📦 Docker Deployment

```bash
# Build image
docker build -t payroll-service:1.0.0 .

# Run container
docker run -d \
  -p 8083:8083 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://host.docker.internal:5432/payrolldb \
  --name payroll-service \
  payroll-service:1.0.0
```

## 🤝 Integration with Other Services

### Employee Service
- Validates employee existence before creating payroll
- Fetches employee details for payroll processing
- Circuit breaker protects against service unavailability

### API Gateway
- Route: `/payroll-service/**` → `http://localhost:8083/**`
- Load balancing via Eureka

### Event System (Kafka)
- **Publishes**: `payroll-events` topic
- **Consumes**: `employee-events` topic
- Event types: CREATED, UPDATED, APPROVED, PAYMENT_INITIATED, PAID

## 📚 Further Reading

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Spring Cloud Netflix](https://spring.io/projects/spring-cloud-netflix)
- [Resilience4j Guide](https://resilience4j.readme.io/)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Redis Documentation](https://redis.io/documentation)

---

**Created**: February 2026  
**Version**: 1.0.0  
**Spring Boot**: 3.2.0  
**Java**: 17
