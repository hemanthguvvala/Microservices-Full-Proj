# API Gateway Service

Spring Cloud Gateway serving as the single entry point for all microservices in the ecosystem. Handles routing, rate limiting, circuit breaking, and security.

## 🏗️ Architecture Role

The API Gateway acts as a reverse proxy, routing requests to appropriate microservices:
- Discovers services via **Eureka Server**
- Provides unified API endpoint for clients
- Handles cross-cutting concerns (auth, rate limiting, logging)
- Implements circuit breaker patterns

## 🚀 Features

- ✅ Dynamic service routing via Eureka discovery
- ✅ Rate limiting with Redis
- ✅ Request/Response filtering
- ✅ Circuit breaker with Resilience4j
- ✅ Load balancing across service instances
- ✅ CORS configuration
- ✅ Request logging and tracing
- ✅ Health checks and monitoring

## 📋 Prerequisites

- Java 17 or higher
- Maven 3.8+
- Docker (optional)
- Eureka Server running (for service discovery)
- Redis (optional, for rate limiting)

## 🛠️ Tech Stack

- **Framework**: Spring Cloud Gateway 4.1.0
- **Service Discovery**: Netflix Eureka Client
- **Rate Limiting**: Redis
- **Monitoring**: Spring Actuator
- **Build**: Maven

## 🏃 Quick Start

### Standalone Mode

```bash
# Clone the repository
git clone <your-repo-url>
cd api-gateway-service

# Run the gateway
mvn spring-boot:run
```

The gateway will start on `http://localhost:8080`

### With Docker

```bash
# Build the image
docker build -t api-gateway:1.0.0 .

# Run the container (ensure Eureka is accessible)
docker run -p 8080:8080 \
  -e EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://eureka-server:8761/eureka \
  api-gateway:1.0.0
```

### With Microservices Stack

See the [microservices-architecture](../microservices-architecture) repo for running with docker-compose.

## 🔧 Configuration

### Key Settings

**application.properties**:
```properties
server.port=8080
spring.application.name=api-gateway

# Eureka Configuration
eureka.client.service-url.defaultZone=http://localhost:8761/eureka
eureka.instance.prefer-ip-address=true

# Gateway Routes
spring.cloud.gateway.discovery.locator.enabled=true
spring.cloud.gateway.discovery.locator.lower-case-service-id=true
```

### Environment Variables

```bash
# Eureka Server
EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://localhost:8761/eureka

# Redis (for rate limiting)
SPRING_DATA_REDIS_HOST=localhost
SPRING_DATA_REDIS_PORT=6379

# Gateway Port
SERVER_PORT=8080
```

## 🛣️ Routes

The gateway automatically routes to services registered in Eureka:

### Pattern: `/service-name/**`

```bash
# Route to Employee Service
http://localhost:8080/employee-service/api/employees

# Route to any registered service
http://localhost:8080/{service-name}/{endpoint}
```

### Manual Route Configuration

Routes can also be configured manually in `application.properties`:

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: employee-service
          uri: lb://EMPLOYEE-SERVICE
          predicates:
            - Path=/api/employees/**
          filters:
            - StripPrefix=0
```

## 🔐 Security & Filters

### Pre-defined Filters

- **Request Logging**: Logs all incoming requests
- **Rate Limiting**: Limits requests per user/IP
- **CORS**: Handles cross-origin requests
- **Circuit Breaker**: Fallback for failed services

### Custom Filters

Located in `com.example.gateway.filter` package:
- `LoggingFilter`: Request/response logging
- `AuthenticationFilter`: JWT validation (if implemented)

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:8080/actuator/health
```

### Gateway Routes
```bash
curl http://localhost:8080/actuator/gateway/routes
```

### Metrics
```bash
curl http://localhost:8080/actuator/metrics
```

## 🧪 Testing

### Test Gateway Routing

```bash
# Test gateway is running
curl http://localhost:8080/actuator/health

# Test routing to employee service
curl http://localhost:8080/employee-service/api/employees \
  -H "Authorization: Bearer <jwt-token>"
```

## 🔨 Build & Deploy

### Build JAR
```bash
mvn clean package
```

### Build Docker Image
```bash
docker build -t api-gateway:1.0.0 .
```

### Deploy in Production
```bash
docker run -d \
  -p 8080:8080 \
  -e EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://eureka:8761/eureka \
  -e SPRING_DATA_REDIS_HOST=redis \
  --name api-gateway \
  api-gateway:1.0.0
```

## 📁 Project Structure

```
api-gateway-service/
├── src/
│   ├── main/
│   │   ├── java/com/example/gateway/
│   │   │   ├── ApiGatewayApplication.java
│   │   │   ├── config/           # Gateway configuration
│   │   │   └── filter/           # Custom filters
│   │   └── resources/
│   │       └── application.properties
│   └── test/
├── Dockerfile
├── pom.xml
└── README.md
```

## 🚦 Common Use Cases

### 1. Routing to Multiple Services
```
Client → Gateway → [Employee Service, Order Service, Payment Service]
```

### 2. Load Balancing
```
Client → Gateway → [Employee Instance 1, Employee Instance 2, Employee Instance 3]
```

### 3. Circuit Breaking
```
Client → Gateway → Service (If down → Fallback Response)
```

## 🐛 Troubleshooting

### Gateway can't find services
- Ensure Eureka Server is running
- Check service registration in Eureka dashboard: `http://localhost:8761`
- Verify `eureka.client.service-url.defaultZone` configuration

### Route not working
```bash
# Check registered routes
curl http://localhost:8080/actuator/gateway/routes

# Check Eureka for registered services
curl http://localhost:8761/eureka/apps
```

### Connection refused errors
- Verify target service is running
- Check service health: `curl http://service-host:port/actuator/health`

## 🔗 Related Services

- [Eureka Discovery Server](../eureka-discovery-server) - Service registry
- [Employee Microservice](../employee-microservice) - Example backend service
- [Microservices Architecture](../microservices-architecture) - Full setup guide

## 📚 Resources

- [Spring Cloud Gateway Docs](https://spring.io/projects/spring-cloud-gateway)
- [Eureka Documentation](https://github.com/Netflix/eureka/wiki)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)

## 👤 Author

**Your Name**
- GitHub: [@yourusername]
- LinkedIn: [Your LinkedIn]

## 📄 License

MIT License
