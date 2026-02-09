#!/bin/bash

###############################################################################
# Stop All Services Script
# Usage: ./stop-all-services.sh
###############################################################################

PROJECT_ROOT="/home/hemanth/Documents/LearnFullProductProj"
LOG_DIR="$PROJECT_ROOT/logs"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Stopping all services...${NC}"

# Stop Spring Boot services
if [ -f "$LOG_DIR/api-gateway.pid" ]; then
    echo -e "${YELLOW}Stopping API Gateway...${NC}"
    kill $(cat "$LOG_DIR/api-gateway.pid") 2>/dev/null || true
    rm "$LOG_DIR/api-gateway.pid"
fi

if [ -f "$LOG_DIR/employee-service.pid" ]; then
    echo -e "${YELLOW}Stopping Employee Service...${NC}"
    kill $(cat "$LOG_DIR/employee-service.pid") 2>/dev/null || true
    rm "$LOG_DIR/employee-service.pid"
fi

if [ -f "$LOG_DIR/payroll-service.pid" ]; then
    echo -e "${YELLOW}Stopping Payroll Service...${NC}"
    kill $(cat "$LOG_DIR/payroll-service.pid") 2>/dev/null || true
    rm "$LOG_DIR/payroll-service.pid"
fi

if [ -f "$LOG_DIR/eureka-server.pid" ]; then
    echo -e "${YELLOW}Stopping Eureka Server...${NC}"
    kill $(cat "$LOG_DIR/eureka-server.pid") 2>/dev/null || true
    rm "$LOG_DIR/eureka-server.pid"
fi

if [ -f "$LOG_DIR/config-server.pid" ]; then
    echo -e "${YELLOW}Stopping Config Server...${NC}"
    kill $(cat "$LOG_DIR/config-server.pid") 2>/dev/null || true
    rm "$LOG_DIR/config-server.pid"
fi

# Stop Docker services
echo -e "${YELLOW}Stopping Infrastructure Services...${NC}"
cd "$PROJECT_ROOT"
docker-compose down

echo -e "${YELLOW}Stopping Monitoring Services...${NC}"
cd "$PROJECT_ROOT/monitoring"
docker-compose -f docker-compose-monitoring.yml down

echo -e "${GREEN}All services stopped successfully!${NC}"
