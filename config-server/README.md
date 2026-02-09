# Spring Cloud Config Server

Centralized configuration management server for all microservices in the ecosystem.

## 🚀 Features

- ✅ Centralized configuration management
- ✅ Environment-specific configurations (dev, test, prod)
- ✅ Git or native file system backend
- ✅ Configuration encryption/decryption
- ✅ Dynamic configuration refresh
- ✅ Integration with Eureka for service discovery
- ✅ Secured with Spring Security

## 📋 Configuration Backends

### Native (Local File System)
```yaml
spring:
  cloud:
    config:
      server:
        native:
          search-locations: file:../config-repository
  profiles:
    active: native
```

### Git Repository
```yaml
spring:
  cloud:
    config:
      server:
        git:
          uri: https://github.com/your-org/config-repo
          default-label: main
  profiles:
    active: git
```

## 🏃 Running the Server

### Local Development
```bash
mvn clean install
mvn spring-boot:run
```

### Docker
```bash
docker build -t config-server:1.0 .
docker run -p 8888:8888 config-server:1.0
```

## 🔧 Configuration File Structure

```
config-repository/
├── application.yml                  # Common config for all services
├── application-dev.yml              # Dev environment
├── application-prod.yml             # Prod environment
├── employee-service.yml             # Employee service specific
├── employee-service-dev.yml         # Employee service dev
├── payroll-service.yml              # Payroll service specific
└── api-gateway.yml                  # API Gateway specific
```

## 📡 API Endpoints

### Get Configuration
```bash
# Get default configuration
GET http://localhost:8888/employee-service/default

# Get environment-specific configuration
GET http://localhost:8888/employee-service/dev
GET http://localhost:8888/employee-service/prod

# Get with label (Git branch)
GET http://localhost:8888/employee-service/dev/main
```

### Health Check
```bash
GET http://localhost:8888/actuator/health
```

## 🔐 Security

Default credentials (change in production):
- Username: `config-admin`
- Password: `config-secret`

### Client Configuration
```yaml
spring:
  cloud:
    config:
      uri: http://localhost:8888
      username: config-admin
      password: config-secret
```

## 🔄 Dynamic Configuration Refresh

Clients can refresh configuration without restart:

```bash
# Trigger refresh on client
POST http://localhost:8081/actuator/refresh
```

Add `@RefreshScope` to beans that need dynamic refresh:
```java
@RefreshScope
@RestController
public class MyController {
    @Value("${my.property}")
    private String myProperty;
}
```

## 🔒 Configuration Encryption

### Setup Encryption Key
```yaml
encrypt:
  key: my-secret-encryption-key
```

### Encrypt Values
```bash
# Encrypt
curl http://localhost:8888/encrypt -d "mysecret"

# Decrypt
curl http://localhost:8888/decrypt -d "{cipher}encrypted-value"
```

### Use Encrypted Values
```yaml
# In config file
datasource:
  password: '{cipher}AQA...'
```

## 📊 Monitoring

- Health: http://localhost:8888/actuator/health
- Metrics: http://localhost:8888/actuator/metrics
- Environment: http://localhost:8888/actuator/env

## 🔗 Integration with Services

### 1. Add Dependency
```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-config</artifactId>
</dependency>
```

### 2. Configure Client
```yaml
# application.yml or bootstrap.yml
spring:
  application:
    name: employee-service
  cloud:
    config:
      uri: http://localhost:8888
      username: config-admin
      password: config-secret
      fail-fast: true
  config:
    import: optional:configserver:http://localhost:8888
```

## 🎯 Best Practices

1. **Use Git Backend in Production**: Native is for development only
2. **Encrypt Sensitive Data**: Use encryption for passwords, keys, tokens
3. **Version Control**: Keep configuration in Git with proper branching
4. **Environment Separation**: Use profiles (dev, test, prod)
5. **Security**: Always secure config server with authentication
6. **High Availability**: Run multiple instances behind load balancer

## 🐛 Troubleshooting

### Config Server Not Starting
- Check if port 8888 is available
- Verify Eureka server is running
- Check configuration file paths

### Clients Can't Connect
- Verify config server URL
- Check authentication credentials
- Ensure config server is registered with Eureka

### Configuration Not Updating
- Use `/actuator/refresh` endpoint on client
- Check `@RefreshScope` annotation
- Verify Spring Cloud Bus for broadcast refresh

## 📚 Resources

- [Spring Cloud Config Documentation](https://spring.io/projects/spring-cloud-config)
- [Configuration Encryption](https://cloud.spring.io/spring-cloud-config/reference/html/#_encryption_and_decryption)
