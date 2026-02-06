.PHONY: help build test run docker-build docker-run clean

help:
	@echo "Available commands:"
	@echo "  make build        - Build the project"
	@echo "  make test         - Run tests"
	@echo "  make run          - Run application locally"
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-run   - Run Docker container"
	@echo "  make clean        - Clean build artifacts"

build:
	mvn clean package -DskipTests

test:
	mvn test

run:
	mvn spring-boot:run -Dspring-boot.run.profiles=dev

docker-build:
	docker build -t employee-microservice:1.0.0 .

docker-run:
	docker run -p 8080:8080 -e SPRING_PROFILES_ACTIVE=dev employee-microservice:1.0.0

clean:
	mvn clean
