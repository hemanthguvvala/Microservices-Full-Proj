# Payroll Microservice

A Spring Boot microservice for managing payroll operations including salary calculations, payment processing, and payroll history.

## Features

- **Payroll Management**: Create, update, and manage employee payrolls
- **Salary Components**: Handle various salary components (allowances, bonuses, deductions, taxes)
- **Payment Processing**: Process payroll payments with transaction tracking
- **Employee Integration**: Integrates with Employee Service via Feign Client
- **Event-Driven**: Kafka integration for event publishing and consumption
- **Caching**: Redis caching for improved performance
- **Service Discovery**: Eureka client for service registration
- **API Documentation**: Swagger/OpenAPI documentation
- **Monitoring**: Actuator endpoints with Prometheus metrics
- **Distributed Tracing**: Zipkin integration
- **Resilience**: Circuit breaker, retry, and rate limiting with Resilience4j

## Technology Stack

- Java 17
- Spring Boot 3.2.0
- Spring Cloud 2023.0.0
- Spring Data JPA
- PostgreSQL / H2 (dev)
- Redis
- Apache Kafka
- Eureka Client
- OpenFeign
- Flyway
- Lombok
- JUnit 5, Mockito, AssertJ

## Prerequisites

- JDK 17 or higher
- Maven 3.6+
- PostgreSQL 12+ (for production)
- Redis Server
- Apache Kafka
- Eureka Discovery Server

## Getting Started

### 1. Clone the repository

```bash
cd payroll-microservice
```

### 2. Configure application properties

Update `src/main/resources/application.yml` with your configurations:
- Database connection
- Redis connection
- Kafka bootstrap servers
- Eureka server URL

### 3. Build the project

```bash
mvn clean install
```

### 4. Run the application

```bash
mvn spring-boot:run
```

The application will start on port 8083.

## API Documentation

Once the application is running, access:
- Swagger UI: http://localhost:8083/swagger-ui.html
- API Docs: http://localhost:8083/api-docs

## Health Checks

- Health Endpoint: http://localhost:8083/actuator/health
- Prometheus Metrics: http://localhost:8083/actuator/prometheus

## API Endpoints

### Payroll Operations

- `POST /api/payrolls` - Create new payroll
- `GET /api/payrolls/{id}` - Get payroll by ID
- `GET /api/payrolls` - Get all payrolls
- `GET /api/payrolls/employee/{employeeId}` - Get payrolls by employee
- `GET /api/payrolls/status/{status}` - Get payrolls by status
- `PUT /api/payrolls/{id}` - Update payroll
- `POST /api/payrolls/{id}/approve` - Approve payroll
- `POST /api/payrolls/{id}/process-payment` - Process payment
- `DELETE /api/payrolls/{id}` - Delete payroll

## Database Schema

### Tables:
- `payrolls` - Main payroll records
- `salary_components` - Individual salary components
- `payment_transactions` - Payment transaction history

## Event Publishing

The service publishes the following events to Kafka:
- `payroll-created` - When a new payroll is created
- `payroll-updated` - When payroll is updated
- `payroll-approved` - When payroll is approved
- `payroll-payment-initiated` - When payment processing starts
- `payroll-paid` - When payment is completed

## Testing

Run tests with:
```bash
mvn test
```

Generate coverage report:
```bash
mvn jacoco:report
```

## Docker Support

Build Docker image:
```bash
docker build -t payroll-service:1.0.0 .
```

Run with Docker Compose:
```bash
docker-compose up
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
