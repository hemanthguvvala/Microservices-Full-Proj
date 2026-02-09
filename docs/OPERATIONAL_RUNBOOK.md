# Operations Runbook - Employee Management Platform

## Table of Contents
1. [Service Overview](#service-overview)
2. [Starting Services](#starting-services)
3. [Monitoring & Observability](#monitoring--observability)
4. [Common Issues & Resolution](#common-issues--resolution)
5. [Health Checks](#health-checks)
6. [Incident Response](#incident-response)
7. [Backup & Recovery](#backup--recovery)
8. [Scaling Procedures](#scaling-procedures)

---

## Service Overview

### Architecture Components
| Service | Port | Purpose | Health Check |
|---------|------|---------|--------------|
| API Gateway | 8080 | Single entry point, routing | `/actuator/health` |
| Eureka Server | 8761 | Service discovery | `/actuator/health` |
| Config Server | 8888 | Centralized config | `/actuator/health` |
| Employee Service | 8081 | Employee management | `/actuator/health` |
| Payroll Service | 8083 | Payroll processing | `/actuator/health` |
| PostgreSQL | 5432 | Primary database | - |
| MongoDB | 27017 | Audit logs | - |
| Elasticsearch | 9200 | Search & logs | `/_cluster/health` |
| Redis | 6379 | Caching | `PING` command |
| Kafka | 9092 | Event streaming | - |
| Prometheus | 9090 | Metrics collection | `/api/v1/query` |
| Grafana | 3000 | Monitoring dashboards | `/api/health` |
| Kibana | 5601 | Log visualization | `/api/status` |
| Zipkin | 9411 | Distributed tracing | `/health` |

---

## Starting Services

### Prerequisites
```bash
# Verify installations
java --version      # Should be Java 17+
docker --version
docker-compose --version
mvn --version
```

### Startup Sequence (Order Matters!)

#### 1. Start Infrastructure Services
```bash
cd /home/hemanth/Documents/LearnFullProductProj

# Start databases and messaging
docker-compose up -d postgres mongodb elasticsearch redis kafka zookeeper

# Wait for services to be healthy (30-60 seconds)
docker-compose ps
```

#### 2. Start Monitoring Stack
```bash
cd monitoring
docker-compose -f docker-compose-monitoring.yml up -d

# Verify monitoring services
curl http://localhost:9090/-/healthy  # Prometheus
curl http://localhost:3000/api/health # Grafana
curl http://localhost:5601/api/status # Kibana
```

#### 3. Start Config Server (FIRST microservice!)
```bash
cd config-server
mvn clean package -DskipTests
java -jar target/*.jar

# Wait until logs show: "Started ConfigServerApplication"
# Verify: curl http://localhost:8888/actuator/health
```

#### 4. Start Eureka Discovery Server
```bash
cd eureka-discovery-server
mvn clean package -DskipTests
java -jar target/*.jar

# Wait 30 seconds, then verify
# Browser: http://localhost:8761
```

#### 5. Start Business Services (Can run in parallel)
```bash
# Terminal 1: Employee Service
cd employee-microservice
mvn clean package -DskipTests
java -jar target/*.jar

# Terminal 2: Payroll Service
cd payroll-microservice
mvn clean package -DskipTests
java -jar target/*.jar
```

#### 6. Start API Gateway (LAST!)
```bash
cd api-gateway-service
mvn clean package -DskipTests
java -jar target/*.jar

# Verify: curl http://localhost:8080/actuator/health
```

### Quick Start (All at once - for dev only)
```bash
./start-all-services.sh
```

---

## Monitoring & Observability

### Grafana Dashboards
**URL**: http://localhost:3000  
**Default credentials**: admin / admin

**Key Dashboards**:
- **Employee Service Overview**: Request rates, response times, errors
- **JVM Metrics**: Memory, GC, threads
- **Database Metrics**: Connection pool, query performance
- **Kafka Metrics**: Producer/consumer lag, throughput
- **Circuit Breaker Status**: Open/closed/half-open states

### Kibana (Log Analysis)
**URL**: http://localhost:5601

**Useful Queries**:
```
# All errors
level:ERROR

# Slow queries (>1s)
duration:>1000 AND message:*query*

# Specific service logs
serviceName:"employee-service" AND level:ERROR

# Saga failures
message:*saga* AND status:FAILED
```

### Zipkin (Distributed Tracing)
**URL**: http://localhost:9411

**Use Cases**:
- Trace requests across services
- Identify slow dependencies
- Debug cascading failures

### Prometheus Queries
**URL**: http://localhost:9090

**Common Queries**:
```promql
# Request rate per service
rate(http_server_requests_seconds_count[1m])

# P95 latency
histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m]))

# Error rate
rate(http_server_requests_seconds_count{status=~"5.."}[1m])

# JVM memory usage
jvm_memory_used_bytes{area="heap"} / jvm_memory_max_bytes{area="heap"} * 100

# Outbox backlog
outbox_events_pending
```

---

## Common Issues & Resolution

### Issue 1: Service Won't Start - "Connection Refused"

**Symptoms**: Service fails to start with connection errors

**Diagnosis**:
```bash
# Check if Config Server is running
curl http://localhost:8888/actuator/health

# Check if Eureka is running
curl http://localhost:8761/actuator/health

# Check application logs
tail -f logs/application.log
```

**Resolution**:
1. Ensure Config Server is started FIRST
2. Wait 10 seconds, then start other services
3. Check `application.properties` for correct URLs

**Root Cause**: Services depend on Config Server and Eureka at startup

---

### Issue 2: High Error Rate (5xx errors)

**Symptoms**: Grafana shows >5% error rate

**Diagnosis**:
```bash
# Check logs for errors
kubectl logs -f employee-service-pod --tail=100 | grep ERROR

# Check database connectivity
docker exec -it postgres psql -U postgres -c "SELECT 1;"

# Check circuit breaker status
curl http://localhost:8081/actuator/circuitbreakers | jq
```

**Resolution**:
1. If database is down: Restart database container
2. If circuit breaker is OPEN: Wait for automatic recovery or reset manually
3. If memory leak: Restart service with `java -Xmx1g -jar app.jar`

**Escalation**: If errors persist >10 minutes, page on-call engineer

---

### Issue 3: Outbox Events Piling Up

**Symptoms**: Grafana alert "High Outbox Backlog" (>100 events)

**Diagnosis**:
```bash
# Check pending events
psql -U postgres -d employee_db -c "SELECT status, COUNT(*) FROM outbox_events GROUP BY status;"

# Check Kafka connectivity
docker exec -it kafka kafka-broker-api-versions --bootstrap-server localhost:9092
```

**Resolution**:
```sql
-- Check for stuck events
SELECT * FROM outbox_events 
WHERE status = 'PENDING' 
AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Manually mark failed events (if Kafka was down but now up)
UPDATE outbox_events 
SET status = 'PENDING', retry_count = 0 
WHERE status = 'FAILED' AND error_message LIKE '%Kafka%';
```

**Prevention**: Ensure Kafka has sufficient disk space and is not down

---

### Issue 4: Saga Stuck in COMPENSATING State

**Symptoms**: Saga remains in COMPENSATING for >5 minutes

**Diagnosis**:
```sql
SELECT * FROM saga_instances 
WHERE status = 'COMPENSATING' 
AND updated_at < NOW() - INTERVAL '5 minutes';
```

**Resolution**:
```bash
# Check logs for which compensation step failed
grep "saga_id=<SAGA_ID>" logs/application.log | grep compensation

# Manual intervention may be required
# Example: Manually delete orphaned employee record
DELETE FROM employees WHERE id = '<employee_id>';

# Update saga status
UPDATE saga_instances SET status = 'COMPENSATED' WHERE saga_id = '<SAGA_ID>';
```

**Escalation**: Contact domain expert to determine safe compensation

---

### Issue 5: High Memory Usage / OOM Kills

**Symptoms**: Service restarts frequently, OOMKilled in k8s

**Diagnosis**:
```bash
# Check heap dump
jmap -heap <PID>

# Generate heap dump for analysis
jmap -dump:format=b,file=/tmp/heap.hprof <PID>

# Check metrics
curl http://localhost:8081/actuator/metrics/jvm.memory.used
```

**Resolution**:
```bash
# Increase heap size
java -Xms1g -Xmx2g -jar app.jar

# Enable GC logging for analysis
java -Xlog:gc* -jar app.jar

# Or in K8s deployment.yaml
resources:
  limits:
    memory: "2Gi"
  requests:
    memory: "1Gi"
```

**Prevention**: Set appropriate resource limits, monitor memory trends

---

### Issue 6: Database Connection Pool Exhausted

**Symptoms**: Logs show "Connection is not available"

**Diagnosis**:
```bash
# Check active connections
curl http://localhost:8081/actuator/metrics/hikaricp.connections.active

# Check pool configuration
grep hikari application.properties
```

**Resolution**:
```yaml
# In application.properties
spring.datasource.hikari.maximum-pool-size=20  # Increase
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.idle-timeout=600000
spring.datasource.hikari.max-lifetime=1800000
```

**Root Cause**: Connection leaks or insufficient pool size

---

## Health Checks

### Automated Health Check Script
```bash
#!/bin/bash
# health-check.sh

services=(
  "http://localhost:8888/actuator/health|Config Server"
  "http://localhost:8761/actuator/health|Eureka Server"
  "http://localhost:8081/actuator/health|Employee Service"
  "http://localhost:8083/actuator/health|Payroll Service"
  "http://localhost:8080/actuator/health|API Gateway"
)

for service in "${services[@]}"; do
  IFS='|' read -r url name <<< "$service"
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$status" -eq 200 ]; then
    echo "✅ $name: Healthy"
  else
    echo "❌ $name: Unhealthy (HTTP $status)"
  fi
done
```

### Database Health Checks
```bash
# PostgreSQL
docker exec postgres pg_isready -U postgres

# MongoDB
docker exec mongodb mongosh --eval "db.adminCommand('ping')"

# Redis
docker exec redis redis-cli ping

# Elasticsearch
curl -s http://localhost:9200/_cluster/health | jq '.status'
```

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| **P0 - Critical** | Complete outage | 15 minutes | All services down |
| **P1 - High** | Major feature broken | 1 hour | Payroll processing failing |
| **P2 - Medium** | Degraded performance | 4 hours | High latency |
| **P3 - Low** | Minor issue | Next business day | UI glitch |

### Incident Response Procedure

1. **Acknowledge**: Acknowledge alert in PagerDuty/Slack
2. **Assess**: Determine severity and impact
3. **Notify**: Update status page, notify stakeholders
4. **Mitigate**: Apply immediate fix (rollback, restart, etc.)
5. **Investigate**: Find root cause using logs/metrics
6. **Resolve**: Apply permanent fix
7. **Postmortem**: Write incident report within 48 hours

### Emergency Contacts
- **On-call Engineer**: +1-XXX-XXX-XXXX
- **Database Admin**: +1-XXX-XXX-XXXX
- **Platform Team**: platform-team@company.com

---

## Backup & Recovery

### Database Backups

#### PostgreSQL Backup
```bash
# Full backup
docker exec postgres pg_dump -U postgres employee_db > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i postgres psql -U postgres employee_db < backup_20260207.sql

# Automated daily backup (cron)
0 2 * * * /opt/scripts/postgres-backup.sh
```

#### MongoDB Backup
```bash
# Backup
docker exec mongodb mongodump --out=/backup/$(date +%Y%m%d)

# Restore
docker exec mongodb mongorestore /backup/20260207
```

### Configuration Backup
```bash
# Backup config repository
cd config-repository
git bundle create config-backup-$(date +%Y%m%d).bundle --all
```

---

## Scaling Procedures

### Horizontal Scaling (Kubernetes)
```bash
# Scale Employee Service to 5 replicas
kubectl scale deployment employee-service --replicas=5

# Auto-scaling based on CPU
kubectl autoscale deployment employee-service \
  --min=3 --max=10 --cpu-percent=70
```

### Database Scaling

#### Read Replicas (Already configured)
```yaml
# Configured in DataSourceConfig.java
- Master: All writes
- Replica: All reads (@Transactional(readOnly=true))
```

#### Vertical Scaling (Increase resources)
```yaml
# In docker-compose.yml
postgres:
  deploy:
    resources:
      limits:
        cpus: '4'
        memory: 8G
```

---

## Useful Commands Cheat Sheet

```bash
# View all service logs
docker-compose logs -f --tail=100

# Restart single service
docker-compose restart employee-service

# Check resource usage
docker stats

# Clean up dangling images
docker system prune -a

# Kafka: View consumer lag
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --group employee-group --describe

# Elasticsearch: Check indices
curl http://localhost:9200/_cat/indices?v

# Redis: Monitor commands
docker exec redis redis-cli monitor
```

---

## Appendix: Service Dependencies

```
Config Server (MUST START FIRST)
  ↓
Eureka Server (MUST START SECOND)
  ↓
Employee Service, Payroll Service (CAN START IN PARALLEL)
  ↓
API Gateway (START LAST)
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-07  
**Maintained By**: Platform Engineering Team
