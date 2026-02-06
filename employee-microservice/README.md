# Employee Microservice

A production-ready employee management microservice built with Spring Boot 3.2, featuring security, caching, monitoring, and event-driven architecture.

## 🏗️ Architecture

This service is part of a microservices ecosystem:
- **Eureka Discovery**: Service registration and discovery
- **API Gateway**: Single entry point for all requests
- **Employee Service**: Core employee management (this service)

## 🚀 Features

- ✅ RESTful CRUD operations for employee management
- ✅ JWT-based authentication and authorization
- ✅ Redis caching for improved performance
- ✅ Kafka event streaming for async operations
- ✅ Spring Security with role-based access control
- ✅ Comprehensive API documentation (Swagger/OpenAPI)
- ✅ Health checks and monitoring (Actuator + Micrometer)
- ✅ Audit logging for all operations
- ✅ Database migration with Flyway
- ✅ Multiple environment profiles (dev, test, prod)

## 📋 Prerequisites

- Java 17 or higher
- Maven 3.8+
- Docker & Docker Compose (optional)
- PostgreSQL 14+ (or use H2 for development)
- Redis 7+ (optional, for caching)
- Kafka (optional, for event streaming)

## 🛠️ Tech Stack

- **Framework**: Spring Boot 3.2.0
- **Database**: PostgreSQL (prod), H2 (dev)
- **Cache**: Redis
- **Messaging**: Apache Kafka
- **Security**: Spring Security + JWT
- **Documentation**: Springdoc OpenAPI 3
- **Monitoring**: Spring Actuator + Micrometer
- **Build**: Maven

## 🏃 Quick Start

### Local Development (H2 Database)

```bash
# Clone the repository
git clone <your-repo-url>
cd employee-microservice

# Run with dev profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

The service will start on `http://localhost:8080`

### With Docker

```bash
# Build the image
docker build -t employee-microservice:1.0.0 .

# Run the container
docker run -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=dev \
  employee-microservice:1.0.0
```

### With Full Microservices Stack

See the main [microservices-architecture](../microservices-architecture) repo for running all services together with docker-compose.

## 🔧 Configuration

### Application Profiles

- **dev**: Uses H2 in-memory database, perfect for local development
- **test**: Used for integration testing
- **prod**: PostgreSQL database, Redis cache, Kafka messaging

### Environment Variables

```bash
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/employeedb
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=password

# Redis
SPRING_DATA_REDIS_HOST=localhost
SPRING_DATA_REDIS_PORT=6379

# Kafka
SPRING_KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Security
JWT_SECRET=your-secret-key
JWT_EXPIRATION=86400000

# Eureka
EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://localhost:8761/eureka
```

## 📚 API Documentation

Once running, access Swagger UI at:
```
http://localhost:8080/swagger-ui.html
```

OpenAPI JSON specification:
```
http://localhost:8080/v3/api-docs
```

## 🔐 Authentication

### 1. Register a new user
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123",
    "email": "admin@example.com"
  }'
```

### 2. Login and get JWT token
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123"
  }'
```

### 3. Use token in requests
```bash
curl -X GET http://localhost:8080/api/employees \
  -H "Authorization: Bearer <your-jwt-token>"
```

## 🧪 Testing

```bash
# Run all tests
mvn test

# Run with coverage
mvn test jacoco:report

# Integration tests only
mvn test -Dtest=**/*IntegrationTest
```

## 📊 Monitoring & Health

### Health Check
```bash
curl http://localhost:8080/actuator/health
```

### Metrics
```bash
curl http://localhost:8080/actuator/metrics
```

### Available Actuator Endpoints
- `/actuator/health` - Health status
- `/actuator/metrics` - Application metrics
- `/actuator/info` - Application information
- `/actuator/prometheus` - Prometheus metrics

## 🔨 Build & Deploy

### Build JAR
```bash
mvn clean package
```

### Build Docker Image
```bash
docker build -t employee-microservice:1.0.0 .
```

### Run in Production
```bash
docker run -d \
  -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/employeedb \
  -e SPRING_DATASOURCE_USERNAME=postgres \
  -e SPRING_DATASOURCE_PASSWORD=securepassword \
  -e EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://eureka:8761/eureka \
  --name employee-service \
  employee-microservice:1.0.0
```

## 📁 Project Structure

```
employee-microservice/
├── src/
│   ├── main/
│   │   ├── java/com/example/employee/
│   │   │   ├── config/          # Configuration classes
│   │   │   ├── controller/      # REST controllers
│   │   │   ├── dto/             # Data Transfer Objects
│   │   │   ├── event/           # Kafka event publishers
│   │   │   ├── exception/       # Exception handlers
│   │   │   ├── health/          # Custom health indicators
│   │   │   ├── mapper/          # Entity-DTO mappers
│   │   │   ├── metrics/         # Custom metrics
│   │   │   ├── model/           # JPA entities
│   │   │   ├── repository/      # Data repositories
│   │   │   ├── security/        # Security configs
│   │   │   └── service/         # Business logic
│   │   └── resources/
│   │       ├── application.properties
│   │       ├── application-dev.properties
│   │       ├── application-test.properties
│   │       ├── application-prod.properties
│   │       └── db/migration/    # Flyway scripts
│   └── test/                    # Unit & integration tests
├── Dockerfile
├── pom.xml
└── README.md
```

## 🚦 API Endpoints

### Public Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Protected Endpoints (Require Authentication)
- `GET /api/employees` - List all employees (paginated)
- `GET /api/employees/{id}` - Get employee by ID
- `POST /api/employees` - Create new employee
- `PUT /api/employees/{id}` - Update employee
- `DELETE /api/employees/{id}` - Delete employee
- `GET /api/employees/search` - Search employees

## 🐛 Troubleshooting

### Port already in use
```bash
# Find process using port 8080
lsof -i :8080

# Kill the process
kill -9 <PID>
```

### Database connection issues
- Ensure PostgreSQL is running
- Verify credentials in application properties
- Check network connectivity

### Redis connection issues
- Verify Redis is running: `redis-cli ping`
- Check Redis host and port configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

**Your Name**
- GitHub: [@yourusername]
- LinkedIn: [Your LinkedIn]

## 🔗 Related Services

- [API Gateway Service](../api-gateway-service)
- [Eureka Discovery Server](../eureka-discovery-server)
- [Microservices Architecture](../microservices-architecture)
