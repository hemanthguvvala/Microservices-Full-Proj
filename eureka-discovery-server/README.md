# Eureka Discovery Server

Netflix Eureka Server for service discovery and registration in a microservices architecture. All microservices register with Eureka, enabling dynamic service location without hardcoded URLs.

## 🏗️ Architecture Role

The Eureka Server is the **service registry** where all microservices register themselves:
- Services register on startup
- Services send heartbeats to maintain registration
- Clients query Eureka to discover service locations
- Provides resilience through service replication

## 🚀 Features

- ✅ Service registration and discovery
- ✅ Health monitoring with heartbeats
- ✅ Self-preservation mode for network partitions
- ✅ Dashboard UI for service visualization
- ✅ RESTful API for service queries
- ✅ Peer-to-peer replication (for HA)
- ✅ Spring Actuator for monitoring

## 📋 Prerequisites

- Java 17 or higher
- Maven 3.8+
- Docker (optional)

## 🛠️ Tech Stack

- **Framework**: Spring Boot 3.2.0
- **Service Discovery**: Netflix Eureka Server
- **Monitoring**: Spring Actuator
- **Build**: Maven

## 🏃 Quick Start

### Standalone Mode

```bash
# Clone the repository
git clone <your-repo-url>
cd eureka-discovery-server

# Run Eureka Server
mvn spring-boot:run
```

The Eureka dashboard will be available at `http://localhost:8761`

### With Docker

```bash
# Build the image
docker build -t eureka-server:1.0.0 .

# Run the container
docker run -p 8761:8761 eureka-server:1.0.0
```

### With Microservices Stack

See the [microservices-architecture](../microservices-architecture) repo for complete setup.

## 🔧 Configuration

### Key Settings

**application.properties**:
```properties
server.port=8761
spring.application.name=eureka-server

# Standalone mode - don't register with itself
eureka.client.register-with-eureka=false
eureka.client.fetch-registry=false

# Dashboard
eureka.dashboard.enabled=true
```

### Environment Variables

```bash
# Server Port
SERVER_PORT=8761

# For clustered setup
EUREKA_CLIENT_REGISTERWITHEUREKA=true
EUREKA_CLIENT_FETCHREGISTRY=true
EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://peer1:8761/eureka,http://peer2:8761/eureka
```

## 📊 Eureka Dashboard

Access the web UI at: `http://localhost:8761`

The dashboard shows:
- All registered services
- Number of instances per service
- Instance status (UP, DOWN, OUT_OF_SERVICE)
- Last heartbeat time
- Service metadata

## 🔌 REST API

### Get All Registered Services
```bash
curl http://localhost:8761/eureka/apps
```

### Get Specific Service
```bash
curl http://localhost:8761/eureka/apps/EMPLOYEE-SERVICE
```

### Register a Service
```bash
curl -X POST http://localhost:8761/eureka/apps/APP-NAME \
  -H "Content-Type: application/json" \
  -d '{...instance data...}'
```

### Heartbeat (sent by services)
```bash
curl -X PUT http://localhost:8761/eureka/apps/APP-NAME/INSTANCE-ID
```

## 🎯 How Services Register

Services include the Eureka client dependency:

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
```

And configure:
```properties
eureka.client.service-url.defaultZone=http://localhost:8761/eureka
eureka.instance.prefer-ip-address=true
```

## 🔐 Self-Preservation Mode

Eureka enters self-preservation when:
- Too many services miss heartbeats (possible network partition)
- Prevents mass de-registration during network issues
- Warning message appears in dashboard

To disable (NOT recommended for production):
```properties
eureka.server.enable-self-preservation=false
```

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:8761/actuator/health
```

### Metrics
```bash
curl http://localhost:8761/actuator/metrics
```

### Info Endpoint
```bash
curl http://localhost:8761/actuator/info
```

## 🧪 Testing

### Verify Eureka is Running
```bash
# Check health
curl http://localhost:8761/actuator/health

# Check dashboard
curl http://localhost:8761
```

### Test Service Registration
```bash
# Start a service configured to register with Eureka
# Then check registration
curl http://localhost:8761/eureka/apps | grep -i "service-name"
```

## 🔨 Build & Deploy

### Build JAR
```bash
mvn clean package
```

### Build Docker Image
```bash
docker build -t eureka-server:1.0.0 .
```

### Deploy in Production
```bash
docker run -d \
  -p 8761:8761 \
  --name eureka-server \
  eureka-server:1.0.0
```

### High Availability Setup (Multiple Instances)
```bash
# Start Peer 1
docker run -d -p 8761:8761 \
  -e EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://eureka2:8761/eureka \
  --name eureka1 \
  eureka-server:1.0.0

# Start Peer 2
docker run -d -p 8762:8761 \
  -e EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://eureka1:8761/eureka \
  --name eureka2 \
  eureka-server:1.0.0
```

## 📁 Project Structure

```
eureka-discovery-server/
├── src/
│   ├── main/
│   │   ├── java/com/example/eureka/
│   │   │   └── EurekaServerApplication.java
│   │   └── resources/
│   │       └── application.properties
│   └── test/
├── Dockerfile
├── pom.xml
└── README.md
```

## 🚦 Architecture Flow

```
┌──────────────────────────────────────────────────┐
│           Eureka Discovery Server                │
│              (Service Registry)                  │
│         http://localhost:8761                    │
└────────▲─────────────────────────▲───────────────┘
         │                         │
         │ Register                │ Query
         │                         │
    ┌────┴─────┐              ┌────┴──────┐
    │ Employee │              │    API    │
    │ Service  │              │  Gateway  │
    └──────────┘              └───────────┘
```

## 🐛 Troubleshooting

### Services not appearing in dashboard
- Verify service has `@EnableEurekaClient` or `@EnableDiscoveryClient`
- Check `eureka.client.service-url.defaultZone` in service config
- Ensure network connectivity between service and Eureka
- Check service logs for registration errors

### Self-preservation mode activated
- This is normal during network issues
- Services won't be de-registered even if heartbeats fail
- Wait for network recovery or restart Eureka

### Port 8761 already in use
```bash
# Find and kill the process
lsof -i :8761
kill -9 <PID>
```

## 📚 Key Concepts

### Service Registration
- Services register on startup
- Send heartbeats every 30 seconds (default)
- Lease renewal ensures service is alive

### Service Discovery
- Clients cache service registry locally
- Refresh cache every 30 seconds
- Load balance across multiple instances

### Health Monitoring
- Eureka marks services as UP, DOWN, STARTING, OUT_OF_SERVICE
- Failed heartbeats trigger eviction after 90 seconds

## 🔗 Related Services

- [API Gateway Service](../api-gateway-service) - Uses Eureka for routing
- [Employee Microservice](../employee-microservice) - Registers with Eureka
- [Microservices Architecture](../microservices-architecture) - Complete setup

## 📚 Resources

- [Netflix Eureka Wiki](https://github.com/Netflix/eureka/wiki)
- [Spring Cloud Netflix](https://spring.io/projects/spring-cloud-netflix)
- [Service Discovery Pattern](https://microservices.io/patterns/service-registry.html)

## 👤 Author

**Your Name**
- GitHub: [@yourusername]
- LinkedIn: [Your LinkedIn]

## 📄 License

MIT License
