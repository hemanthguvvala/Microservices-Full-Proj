# ─── Employee Platform Makefile ────────────────────────────────────────────────
# Interview insight: Makefile = standardized developer commands
# Every MNC project has a Makefile or equivalent (Taskfile, Just, etc.)
# Usage: make <target>

.PHONY: help build test clean docker-up docker-down infra-up infra-down \
        run-eureka run-config run-employee run-payroll run-notification run-gateway run-frontend \
        k8s-apply k8s-delete helm-install helm-uninstall lint

# ── Default Target ────────────────────────────────────────────────────────────
help: ## Show this help message
	@echo "Employee Platform — Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Build & Test ──────────────────────────────────────────────────────────────
build: ## Build all Java microservices
	cd employee-microservice && mvn clean package -DskipTests
	cd payroll-microservice && mvn clean package -DskipTests
	cd notification-microservice && mvn clean package -DskipTests
	cd api-gateway-service && mvn clean package -DskipTests
	cd eureka-discovery-server && mvn clean package -DskipTests
	cd config-server && mvn clean package -DskipTests

test: ## Run tests for all Java microservices
	cd employee-microservice && mvn test
	cd payroll-microservice && mvn test
	cd notification-microservice && mvn test

test-employee: ## Run employee service tests only
	cd employee-microservice && mvn test

test-payroll: ## Run payroll service tests only
	cd payroll-microservice && mvn test

test-notification: ## Run notification service tests only
	cd notification-microservice && mvn test

clean: ## Clean all build artifacts
	cd employee-microservice && mvn clean
	cd payroll-microservice && mvn clean
	cd notification-microservice && mvn clean
	cd api-gateway-service && mvn clean
	cd eureka-discovery-server && mvn clean
	cd config-server && mvn clean

lint: ## Run code quality checks (Checkstyle + SpotBugs)
	cd employee-microservice && mvn checkstyle:check spotbugs:check || true
	cd payroll-microservice && mvn checkstyle:check spotbugs:check || true

# ── Docker Compose ────────────────────────────────────────────────────────────
docker-up: ## Start full stack with Docker Compose (20+ containers)
	docker-compose up -d

docker-down: ## Stop all Docker containers
	docker-compose down

docker-rebuild: ## Rebuild and restart all containers
	docker-compose up -d --build

docker-logs: ## Tail logs from all containers
	docker-compose logs -f

docker-ps: ## Show running containers
	docker-compose ps

infra-up: ## Start infrastructure only (DB, Redis, Kafka, Monitoring)
	docker-compose up -d postgres mongodb elasticsearch redis zookeeper kafka prometheus grafana zipkin

infra-down: ## Stop infrastructure containers
	docker-compose down

monitoring-up: ## Start monitoring stack (Prometheus + Grafana + Zipkin + ELK)
	docker-compose up -d prometheus grafana zipkin logstash kibana

# ── Local Development (run services individually) ─────────────────────────────
run-eureka: ## Start Eureka Discovery Server (port 8761)
	cd eureka-discovery-server && mvn spring-boot:run

run-config: ## Start Config Server (port 8888)
	cd config-server && mvn spring-boot:run

run-employee: ## Start Employee Service (port 8081)
	cd employee-microservice && mvn spring-boot:run

run-payroll: ## Start Payroll Service (port 8083)
	cd payroll-microservice && mvn spring-boot:run

run-notification: ## Start Notification Service (port 8084)
	cd notification-microservice && mvn spring-boot:run

run-gateway: ## Start API Gateway (port 8080)
	cd api-gateway-service && mvn spring-boot:run

run-frontend: ## Start React frontend (port 3000)
	cd frontend-react && npm run dev

# ── Kubernetes ────────────────────────────────────────────────────────────────
k8s-apply: ## Apply Kubernetes manifests (Kustomize)
	kubectl apply -k k8s/

k8s-delete: ## Delete all Kubernetes resources
	kubectl delete -k k8s/

k8s-status: ## Show Kubernetes pod status
	kubectl get pods -n employee-platform

k8s-logs: ## Show logs from all pods
	kubectl logs -n employee-platform -l managed-by=kustomize --all-containers --tail=50

# ── Helm ──────────────────────────────────────────────────────────────────────
helm-install: ## Install Helm chart (dev)
	helm install employee-platform helm/employee-platform/

helm-install-prod: ## Install Helm chart (production)
	helm install employee-platform helm/employee-platform/ -f helm/employee-platform/values-prod.yaml

helm-upgrade: ## Upgrade Helm release
	helm upgrade employee-platform helm/employee-platform/

helm-uninstall: ## Uninstall Helm release
	helm uninstall employee-platform

helm-template: ## Render Helm templates locally (dry run)
	helm template employee-platform helm/employee-platform/

# ── Terraform ─────────────────────────────────────────────────────────────────
tf-init: ## Initialize Terraform
	cd terraform && terraform init

tf-plan-dev: ## Plan Terraform changes (dev)
	cd terraform && terraform plan -var-file=env/dev.tfvars

tf-plan-prod: ## Plan Terraform changes (production)
	cd terraform && terraform plan -var-file=env/prod.tfvars

tf-apply-dev: ## Apply Terraform (dev) — CAUTION: creates AWS resources
	cd terraform && terraform apply -var-file=env/dev.tfvars

# ── Utilities ─────────────────────────────────────────────────────────────────
health-check: ## Check health of all local services
	@echo "Eureka:       $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8761/actuator/health)"
	@echo "Config:       $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8888/actuator/health)"
	@echo "Employee:     $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8081/actuator/health)"
	@echo "Payroll:      $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8083/actuator/health)"
	@echo "Notification: $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8084/actuator/health)"
	@echo "Gateway:      $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/actuator/health)"
	@echo "Frontend:     $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000)"

count-lines: ## Count lines of code in the project
	@echo "Java:"
	@find . -name '*.java' -not -path './*/target/*' | xargs wc -l | tail -1
	@echo "TypeScript/React:"
	@find ./frontend-react/src -name '*.tsx' -o -name '*.ts' | xargs wc -l | tail -1
	@echo "YAML (K8s/Helm/Terraform/Docker):"
	@find . \( -name '*.yaml' -o -name '*.yml' -o -name '*.tf' \) -not -path './*/target/*' -not -path './*/node_modules/*' | xargs wc -l | tail -1
