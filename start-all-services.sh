#!/bin/bash

###############################################################################
# Start All Services Script
# Usage: ./start-all-services.sh
###############################################################################

set -e  # Exit on error

PROJECT_ROOT="/home/hemanth/Documents/LearnFullProductProj"
LOG_DIR="$PROJECT_ROOT/logs"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create logs directory
mkdir -p "$LOG_DIR"

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Starting Employee Management Platform${NC}"
echo -e "${GREEN}================================================${NC}"

# Function to check if service is healthy
check_health() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}Waiting for $service_name to be healthy...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $service_name is healthy${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}✗ $service_name failed to start within timeout${NC}"
    return 1
}

# 1. Start Infrastructure Services
echo -e "\n${YELLOW}[1/6] Starting Infrastructure Services (Docker)...${NC}"
cd "$PROJECT_ROOT"

docker-compose up -d postgres postgres-replica mongodb elasticsearch redis kafka zookeeper

echo -e "${YELLOW}Waiting for infrastructure services to be ready (60 seconds)...${NC}"
sleep 60

# Verify infrastructure
echo -e "${YELLOW}Verifying infrastructure services...${NC}"
docker exec postgres pg_isready -U postgres && echo -e "${GREEN}✓ PostgreSQL ready${NC}" || echo -e "${RED}✗ PostgreSQL not ready${NC}"
docker exec mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null && echo -e "${GREEN}✓ MongoDB ready${NC}" || echo -e "${RED}✗ MongoDB not ready${NC}"
curl -s http://localhost:9200 > /dev/null && echo -e "${GREEN}✓ Elasticsearch ready${NC}" || echo -e "${RED}✗ Elasticsearch not ready${NC}"
docker exec redis redis-cli ping > /dev/null && echo -e "${GREEN}✓ Redis ready${NC}" || echo -e "${RED}✗ Redis not ready${NC}"

# 2. Start Monitoring Stack
echo -e "\n${YELLOW}[2/6] Starting Monitoring Stack...${NC}"
cd "$PROJECT_ROOT/monitoring"
docker-compose -f docker-compose-monitoring.yml up -d

# 3. Start Config Server
echo -e "\n${YELLOW}[3/6] Starting Config Server...${NC}"
cd "$PROJECT_ROOT/config-server"
mvn clean package -DskipTests > "$LOG_DIR/config-server-build.log" 2>&1

nohup java -jar target/*.jar \
    --spring.profiles.active=native \
    > "$LOG_DIR/config-server.log" 2>&1 &

echo $! > "$LOG_DIR/config-server.pid"
check_health "http://localhost:8888/actuator/health" "Config Server"

# 4. Start Eureka Server
echo -e "\n${YELLOW}[4/6] Starting Eureka Discovery Server...${NC}"
cd "$PROJECT_ROOT/eureka-discovery-server"
mvn clean package -DskipTests > "$LOG_DIR/eureka-build.log" 2>&1

nohup java -jar target/*.jar \
    > "$LOG_DIR/eureka-server.log" 2>&1 &

echo $! > "$LOG_DIR/eureka-server.pid"
check_health "http://localhost:8761/actuator/health" "Eureka Server"

# Allow Eureka to fully initialize
echo -e "${YELLOW}Waiting for Eureka to initialize (30 seconds)...${NC}"
sleep 30

# 5. Start Business Services
echo -e "\n${YELLOW}[5/6] Starting Business Services...${NC}"

# Employee Service
echo -e "${YELLOW}Starting Employee Service...${NC}"
cd "$PROJECT_ROOT/employee-microservice"
mvn clean package -DskipTests > "$LOG_DIR/employee-build.log" 2>&1

nohup java -jar target/*.jar \
    --spring.profiles.active=dev \
    > "$LOG_DIR/employee-service.log" 2>&1 &

echo $! > "$LOG_DIR/employee-service.pid"

# Payroll Service
echo -e "${YELLOW}Starting Payroll Service...${NC}"
cd "$PROJECT_ROOT/payroll-microservice"
mvn clean package -DskipTests > "$LOG_DIR/payroll-build.log" 2>&1

nohup java -jar target/*.jar \
    --spring.profiles.active=dev \
    > "$LOG_DIR/payroll-service.log" 2>&1 &

echo $! > "$LOG_DIR/payroll-service.pid"

# Check health
check_health "http://localhost:8081/actuator/health" "Employee Service"
check_health "http://localhost:8083/actuator/health" "Payroll Service"

# 6. Start API Gateway
echo -e "\n${YELLOW}[6/6] Starting API Gateway...${NC}"
cd "$PROJECT_ROOT/api-gateway-service"
mvn clean package -DskipTests > "$LOG_DIR/gateway-build.log" 2>&1

nohup java -jar target/*.jar \
    > "$LOG_DIR/api-gateway.log" 2>&1 &

echo $! > "$LOG_DIR/api-gateway.pid"
check_health "http://localhost:8080/actuator/health" "API Gateway"

# Final Summary
echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}  All Services Started Successfully!${NC}"
echo -e "${GREEN}================================================${NC}"

echo -e "\n${GREEN}Service Endpoints:${NC}"
echo -e "  API Gateway:       ${YELLOW}http://localhost:8080${NC}"
echo -e "  Eureka Dashboard:  ${YELLOW}http://localhost:8761${NC}"
echo -e "  Config Server:     ${YELLOW}http://localhost:8888${NC}"
echo -e "  Employee Service:  ${YELLOW}http://localhost:8081${NC}"
echo -e "  Payroll Service:   ${YELLOW}http://localhost:8083${NC}"

echo -e "\n${GREEN}Monitoring Tools:${NC}"
echo -e "  Prometheus:        ${YELLOW}http://localhost:9090${NC}"
echo -e "  Grafana:           ${YELLOW}http://localhost:3000${NC} (admin/admin)"
echo -e "  Kibana:            ${YELLOW}http://localhost:5601${NC}"
echo -e "  Zipkin:            ${YELLOW}http://localhost:9411${NC}"

echo -e "\n${GREEN}Databases:${NC}"
echo -e "  PostgreSQL:        ${YELLOW}localhost:5432${NC} (postgres/postgres)"
echo -e "  MongoDB:           ${YELLOW}localhost:27017${NC}"
echo -e "  Elasticsearch:     ${YELLOW}http://localhost:9200${NC}"
echo -e "  Redis:             ${YELLOW}localhost:6379${NC}"

echo -e "\n${YELLOW}Logs available in: $LOG_DIR${NC}"
echo -e "${YELLOW}To stop all services, run: ./stop-all-services.sh${NC}"

echo -e "\n${GREEN}Quick Test:${NC}"
echo -e "  ${YELLOW}curl http://localhost:8080/actuator/health${NC}"
