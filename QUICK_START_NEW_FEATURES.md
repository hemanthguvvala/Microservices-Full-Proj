# Quick Start Guide - New Features

## Prerequisites

Ensure you have these running:
- PostgreSQL (5432)
- MongoDB (27017)
- Elasticsearch (9200)
- Redis (6379)
- Kafka (9092)
- Eureka Server (8761)

## Quick Start with Docker

```bash
# Start all services
cd employee-microservice
docker-compose up -d

# Verify services
docker-compose ps
```

## Start Microservices

### 1. Start Config Server
```bash
cd config-server
mvn clean install
mvn spring-boot:run
```

Access: http://localhost:8888/actuator/health

### 2. Start Eureka Server
```bash
cd eureka-discovery-server
mvn spring-boot:run
```

Access: http://localhost:8761

### 3. Start Employee Service
```bash
cd employee-microservice
mvn clean install
mvn spring-boot:run
```

Access: http://localhost:8081

## Test New Features

### 1. MongoDB Audit Logs

```bash
# Create an employee
curl -X POST http://localhost:8081/api/employees \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "department": "IT",
    "position": "Developer",
    "salary": 75000
  }'

# View audit logs
curl http://localhost:8081/api/search/audit/Employee/1
```

### 2. Elasticsearch Search

```bash
# Search by name
curl http://localhost:8081/api/search/employees/name?query=john

# Search by department
curl http://localhost:8081/api/search/employees/department/IT

# Search by skill
curl http://localhost:8081/api/search/employees/skill/java

# Search by salary range
curl "http://localhost:8081/api/search/employees/salary?minSalary=50000&maxSalary=100000"
```

### 3. WebSocket Real-Time Updates

Open `websocket-demo.html` in your browser:
```bash
# From employee-microservice directory
open websocket-demo.html  # Mac
xdg-open websocket-demo.html  # Linux
start websocket-demo.html  # Windows
```

1. Click "Connect"
2. Perform CRUD operations on employees
3. Watch real-time updates appear!

### 4. Spring Batch Jobs

```bash
# Check batch job status
curl http://localhost:8081/actuator/metrics

# Jobs run automatically:
# - Daily at midnight: Sync to Elasticsearch
# - Every hour: Data cleanup
# - Every 10 minutes: Audit sync
```

### 5. Config Server

```bash
# Get employee service config
curl http://config-admin:config-secret@localhost:8888/employee-service/default

# Get environment-specific config
curl http://config-admin:config-secret@localhost:8888/employee-service/dev
```

### 6. Load Balancer & Read Replicas

The routing happens automatically based on transaction type:
- Write operations → Master DB (port 5432)
- Read operations → Replica DB (port 5433)

## API Documentation

### Swagger UI
http://localhost:8081/swagger-ui.html

### New Endpoints

#### Search & Analytics
```
GET  /api/search/employees/name?query={name}
GET  /api/search/employees/department/{department}
GET  /api/search/employees/position/{position}
GET  /api/search/employees/skill/{skill}
GET  /api/search/employees/salary?minSalary={min}&maxSalary={max}
```

#### Audit Logs
```
GET  /api/search/audit/{entityType}/{entityId}
GET  /api/search/audit/user/{username}
GET  /api/search/audit/daterange?start={start}&end={end}
GET  /api/search/audit/count?entityType={type}&operation={op}
```

## Monitoring Endpoints

```bash
# Health check
curl http://localhost:8081/actuator/health

# Metrics
curl http://localhost:8081/actuator/metrics

# Prometheus metrics
curl http://localhost:8081/actuator/prometheus

# MongoDB health
curl http://localhost:8081/actuator/health/mongo

# Elasticsearch health
curl http://localhost:8081/actuator/health/elasticsearch
```

## Sample Data

```bash
# Create multiple employees
for i in {1..10}; do
  curl -X POST http://localhost:8081/api/employees \
    -H "Content-Type: application/json" \
    -d "{
      \"firstName\": \"Employee\",
      \"lastName\": \"$i\",
      \"email\": \"employee$i@example.com\",
      \"department\": \"IT\",
      \"position\": \"Developer\",
      \"salary\": $((50000 + i * 5000))
    }"
done

# Search for them
curl "http://localhost:8081/api/search/employees/name?query=Employee"
```

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
docker ps | grep mongodb

# Check logs
docker logs mongodb

# Connect to MongoDB
docker exec -it mongodb mongosh -u admin -p admin
```

### Elasticsearch Connection Issues
```bash
# Check if Elasticsearch is running
curl http://localhost:9200

# Check cluster health
curl http://localhost:9200/_cluster/health

# List indices
curl http://localhost:9200/_cat/indices
```

### Config Server Issues
```bash
# Check if config server is up
curl http://localhost:8888/actuator/health

# Verify configuration files exist
ls -la config-repository/
```

## Next Steps

1. **Test all features**: Follow the guide above
2. **Review code**: Understand the implementation
3. **Practice explaining**: Prepare for interview questions
4. **Add Kubernetes**: Deploy with K8s (next step)
5. **Cloud deployment**: AWS/Azure/GCP (advanced step)

## Architecture Diagram

```
┌─────────────────┐
│   API Gateway   │
│    (Port 8080)  │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    │         │          │          │
┌───▼────┐ ┌──▼───────┐ ┌▼─────────┐ ┌──▼────────┐
│Employee│ │ Payroll  │ │  Config  │ │  Eureka   │
│Service │ │ Service  │ │  Server  │ │  Server   │
│  8081  │ │   8083   │ │   8888   │ │   8761    │
└───┬────┘ └──┬───────┘ └──────────┘ └───────────┘
    │         │
    │  ┌──────┴────┬──────────┬────────────┬──────────┐
    │  │           │          │            │          │
┌───▼──▼──┐ ┌─────▼────┐ ┌───▼──────┐ ┌──▼────┐ ┌──▼──────────┐
│PostgreSQL│ │  MongoDB │ │Elastic   │ │ Redis │ │    Kafka    │
│Master+   │ │  Audit   │ │Search    │ │ Cache │ │   Events    │
│Replica   │ │  Logs    │ │          │ │       │ │             │
└──────────┘ └──────────┘ └──────────┘ └───────┘ └─────────────┘
```

## Resources

- [NEW_FEATURES_SUMMARY.md](../NEW_FEATURES_SUMMARY.md) - Complete feature documentation
- [DB_SCALING_GUIDE.md](DB_SCALING_GUIDE.md) - Database scaling patterns
- [Config Server README](../config-server/README.md) - Configuration management

---

**Status**: ✅ Production-Ready | 🚀 Interview-Ready | 📚 Well-Documented
