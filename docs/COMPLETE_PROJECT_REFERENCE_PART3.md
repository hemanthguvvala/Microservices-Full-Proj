# PART 3: INFRASTRUCTURE, CLOUD, DEVOPS, FRONTEND & SQL

---

## 16. DOCKER & CONTAINERIZATION

### 16.1 Dockerfile Structure (Used in All 6 Microservices)
```dockerfile
# Multi-stage build — smaller final image
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B          # Cache dependencies
COPY src ./src
RUN mvn clean package -DskipTests -B      # Build JAR

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**Interview Q&A:**
- **Q: Why multi-stage Docker builds?**
  A: Stage 1 (build) has Maven + JDK — large (~800MB). Stage 2 (runtime) has only JRE — small (~200MB). Final image doesn't contain source code or build tools. Smaller images = faster deployments, less attack surface.

- **Q: Docker image layers and caching?**
  A: Each Dockerfile instruction creates a layer. Docker caches layers — if a layer hasn't changed, Docker reuses the cached version. That's why we COPY pom.xml first (dependencies change rarely) → cache hit. Source code changes frequently → only the last layers rebuild.

- **Q: Alpine vs Ubuntu base images?**
  A: Alpine = ~5MB, minimal, BusyBox-based. Ubuntu = ~70MB. Alpine is smaller but may have compatibility issues with some native libraries. We use Alpine for minimal footprint.

---

### 16.2 Docker Compose (20+ Services)
```yaml
# docker-compose.yml — Full local development stack
services:
  # === Application Services ===
  employee-service:
    build: ./employee-microservice
    ports: ["8081:8081"]
    depends_on: [postgres-master, redis, kafka, eureka-server]
    environment:
      SPRING_PROFILES_ACTIVE: dev
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres-master:5432/employeedb

  payroll-service:
    build: ./payroll-microservice
    ports: ["8083:8083"]
    depends_on: [postgres-master, redis, kafka, eureka-server]

  notification-service:
    build: ./notification-microservice
    ports: ["8084:8084"]
    depends_on: [postgres-master, redis, kafka, eureka-server]

  api-gateway:
    build: ./api-gateway-service
    ports: ["8080:8080"]
    depends_on: [eureka-server]

  eureka-server:
    build: ./eureka-discovery-server
    ports: ["8761:8761"]

  config-server:
    build: ./config-server
    ports: ["8888:8888"]

  # === Data Layer ===
  postgres-master:
    image: postgres:15-alpine
    ports: ["5432:5432"]
    volumes: [postgres-data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s

  postgres-replica:
    image: postgres:15-alpine
    ports: ["5433:5432"]
    depends_on: [postgres-master]

  mongodb:
    image: mongo:7
    ports: ["27017:27017"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  elasticsearch:
    image: elasticsearch:8.11.0
    ports: ["9200:9200"]
    environment:
      discovery.type: single-node
      xpack.security.enabled: "false"

  # === Messaging ===
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    ports: ["2181:2181"]

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    ports: ["9092:9092"]
    depends_on: [zookeeper]

  # === Monitoring ===
  prometheus:
    image: prom/prometheus
    ports: ["9090:9090"]
    volumes: [./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml]

  grafana:
    image: grafana/grafana
    ports: ["3000:3000"]

  zipkin:
    image: openzipkin/zipkin
    ports: ["9411:9411"]

  jaeger:
    image: jaegertracing/all-in-one
    ports: ["16686:16686"]

  logstash:
    image: logstash:8.11.0

  kibana:
    image: kibana:8.11.0
    ports: ["5601:5601"]
```

**Interview Q&A:**
- **Q: Docker Compose vs Kubernetes?**
  A: Docker Compose = single machine, development/testing. Kubernetes = multi-machine cluster, production. Compose is simpler (docker-compose up), K8s has auto-scaling, self-healing, rolling updates.

- **Q: What is depends_on vs healthcheck?**
  A: `depends_on` only waits for container to start, not for the app to be ready. `healthcheck` with `condition: service_healthy` waits until the health check passes.

---

## 17. KUBERNETES & CONTAINER ORCHESTRATION

### 17.1 K8s Manifests (16 files)
```
k8s/
├── base/
│   ├── namespace.yaml
│   ├── employee-deployment.yaml
│   ├── employee-service.yaml
│   ├── payroll-deployment.yaml
│   ├── payroll-service.yaml
│   ├── gateway-deployment.yaml
│   ├── gateway-service.yaml
│   ├── eureka-deployment.yaml
│   ├── eureka-service.yaml
│   ├── postgres-statefulset.yaml
│   ├── postgres-service.yaml
│   ├── redis-deployment.yaml
│   ├── redis-service.yaml
│   ├── kafka-statefulset.yaml
│   └── configmap.yaml
├── overlays/
│   ├── dev/
│   └── prod/
└── kustomization.yaml
```

### 17.2 Key K8s Concepts Used

#### Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: employee-service
  namespace: microservices
spec:
  replicas: 3
  selector:
    matchLabels:
      app: employee-service
  template:
    metadata:
      labels:
        app: employee-service
    spec:
      containers:
        - name: employee-service
          image: employee-service:latest
          ports:
            - containerPort: 8081
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "500m"
              memory: "1Gi"
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8081
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8081
            initialDelaySeconds: 60
            periodSeconds: 15
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "prod"
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
```

#### StatefulSet (for databases)
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  template:
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

**Interview Q&A:**
- **Q: Deployment vs StatefulSet?**
  A: Deployment = stateless apps (any pod can handle any request). StatefulSet = stateful apps (databases) — stable network identity, ordered deployment, persistent volumes.

- **Q: What are resource requests vs limits?**
  A: Requests = guaranteed minimum resources (used for scheduling). Limits = maximum resources (OOMKilled if exceeded). Requests ≤ Limits.

- **Q: What is a readiness vs liveness probe?**
  A: Readiness = "can this pod serve traffic?" (fails → removed from Service). Liveness = "is this pod alive?" (fails → pod restarted). Our project uses Spring Actuator health endpoints.

- **Q: What is Kustomize?**
  A: Template-free customization of K8s manifests. Base manifests + overlays for different environments (dev, staging, prod). No Helm template syntax needed.

---

### 17.3 Helm Chart
```
helm/
├── Chart.yaml
├── values.yaml
├── values-dev.yaml
├── values-prod.yaml
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── configmap.yaml
    ├── secret.yaml
    ├── hpa.yaml
    └── ingress.yaml
```

**Interview Q&A:**
- **Q: Helm vs Kustomize?**
  A: Helm = templating engine with package management (charts, releases, rollbacks). Kustomize = patch-based overlays (no templates). Helm for complex apps with many config variants; Kustomize for simpler overlay-based customization. Our project has BOTH.

- **Q: What is HPA (Horizontal Pod Autoscaler)?**
  A: Automatically scales pod replicas based on CPU/memory utilization or custom metrics. Example: scale from 2 to 10 pods when CPU > 70%.

---

## 18. AWS CLOUD INFRASTRUCTURE (TERRAFORM)

### 18.1 Terraform Modules (10 files)
```
terraform/
├── main.tf          → Provider config + module calls
├── variables.tf     → Input variables
├── outputs.tf       → Output values
├── terraform.tfvars → Variable values
├── modules/
│   ├── vpc/         → VPC + Subnets + NAT Gateway + Internet Gateway
│   ├── eks/         → EKS Cluster + Node Groups + IAM
│   ├── rds/         → PostgreSQL RDS + Multi-AZ + Encryption
│   ├── elasticache/ → Redis ElastiCache cluster
│   ├── msk/         → Managed Kafka (MSK) cluster
│   ├── ecr/         → Container Registry for Docker images
│   ├── s3/          → S3 Buckets for file storage
│   └── cloudwatch/  → CloudWatch Logs + Alarms + Dashboards
```

### 18.2 Key Terraform Concepts Used

```hcl
# VPC Module
module "vpc" {
  source     = "./modules/vpc"
  cidr_block = "10.0.0.0/16"
  azs        = ["us-east-1a", "us-east-1b", "us-east-1c"]
  
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  single_nat_gateway = false  # One per AZ for HA
}

# EKS Module
module "eks" {
  source          = "./modules/eks"
  cluster_name    = "microservices-cluster"
  cluster_version = "1.28"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  
  node_groups = {
    general = {
      instance_types = ["t3.medium"]
      min_size       = 2
      max_size       = 10
      desired_size   = 3
    }
  }
}

# RDS Module
module "rds" {
  source               = "./modules/rds"
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "db.t3.medium"
  allocated_storage    = 50
  multi_az             = true
  storage_encrypted    = true
  backup_retention     = 7
}
```

**Interview Q&A:**
- **Q: What is Terraform state?**
  A: Terraform tracks the real-world resources it manages in a state file (terraform.tfstate). This maps resources in your config to actual infrastructure. Best practice: store state in S3 with DynamoDB locking.

- **Q: Terraform plan vs apply?**
  A: `plan` = dry run, shows what would change. `apply` = actually create/modify/destroy resources. Always `plan` before `apply` in production.

- **Q: What are Terraform modules?**
  A: Reusable packages of Terraform configuration. Our project has 8 modules — each manages one AWS service. Modules promote reuse, DRY principle, and organization.

- **Q: What is Terraform's lifecycle?**
  A: `init` (download providers/modules) → `plan` (preview changes) → `apply` (execute changes) → `destroy` (tear down).

---

## 19. CI/CD (GITHUB ACTIONS)

### 19.1 Pipeline Structure (3 Pipelines)
```
.github/workflows/
├── employee-service-ci.yml     → Java build + test + Docker + deploy
├── notification-service-ci.yml → Same for notification
└── frontend-ci.yml             → Node build + test + Docker + deploy
```

### 19.2 Java Microservice Pipeline
```yaml
name: Employee Service CI/CD
on:
  push:
    branches: [main, develop]
    paths: ['employee-microservice/**']
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: testdb
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: 'maven'
      
      - name: Build & Test
        run: mvn clean verify -f employee-microservice/pom.xml
      
      - name: Code Coverage
        run: mvn jacoco:report -f employee-microservice/pom.xml
      
      - name: SonarQube Analysis
        run: mvn sonar:sonar -Dsonar.projectKey=employee-service
      
      - name: Build Docker Image
        run: docker build -t employee-service:${{ github.sha }} ./employee-microservice
      
      - name: Push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker push $ECR_REGISTRY/employee-service:${{ github.sha }}
      
      - name: Deploy to EKS
        run: |
          kubectl set image deployment/employee-service employee-service=$ECR_REGISTRY/employee-service:${{ github.sha }}
```

**Interview Q&A:**
- **Q: What is CI vs CD?**
  A: CI (Continuous Integration) = automatically build and test on every push. CD (Continuous Delivery) = automatically deploy to staging. CD (Continuous Deployment) = automatically deploy to production.

- **Q: What is a service container in GitHub Actions?**
  A: A Docker container that runs alongside your job — used for databases, caches, etc. Our pipeline runs PostgreSQL as a service container for integration tests.

---

## 20. FRONTEND — REACT 18 + TYPESCRIPT COMPLETE REFERENCE

### 20.1 Tech Stack
| Technology | Version | Purpose |
|---|---|---|
| React | 18.2 | UI library (component-based) |
| TypeScript | 5.3 | Type safety |
| Vite | 5.0 | Build tool (faster than Webpack) |
| TailwindCSS | 3.x | Utility-first CSS |
| Redux Toolkit | 2.x | Global state management |
| React Query (TanStack) | 5.x | Server state management |
| React Router | 6.x | SPA routing |
| Axios | 1.x | HTTP client |
| MSW (Mock Service Worker) | 2.x | API mocking for tests |
| Storybook | 7.x | Component development & documentation |
| Playwright | 1.x | E2E testing |
| Jest | 29.x | Unit testing |
| React Hook Form | 7.x | Form handling with validation |
| Zod | 3.x | Schema validation |

### 20.2 Project Structure
```
frontend-react/
├── src/
│   ├── api/              → Axios HTTP clients
│   ├── components/       → Reusable UI components
│   │   ├── common/       → Button, Modal, Table, Pagination
│   │   ├── employees/    → Employee-specific components
│   │   └── layout/       → Header, Sidebar, Footer
│   ├── hooks/            → 15 custom hooks
│   ├── pages/            → Route-level components
│   ├── store/            → Redux slices + store config
│   ├── types/            → TypeScript interfaces
│   ├── utils/            → Helpers, formatters, validators
│   ├── mocks/            → MSW handlers
│   ├── App.tsx           → Root component
│   └── main.tsx          → Entry point
├── e2e/                  → Playwright tests
├── .storybook/           → Storybook config
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### 20.3 Key React Patterns Used

#### Custom Hooks (15+)
```typescript
// useEmployees — data fetching with React Query
export function useEmployees(params: EmployeeQueryParams) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: () => employeeApi.getAll(params),
    staleTime: 5 * 60 * 1000,     // Cache for 5 minutes
    placeholderData: keepPreviousData,
  });
}

// useDebounce — delay search input
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// useLocalStorage — persistent state
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
}
```

#### Redux Toolkit
```typescript
// store/employeeSlice.ts
const employeeSlice = createSlice({
  name: 'employees',
  initialState: { selectedId: null, filters: {} },
  reducers: {
    setSelectedEmployee: (state, action) => { state.selectedId = action.payload; },
    setFilters: (state, action) => { state.filters = action.payload; },
    clearFilters: (state) => { state.filters = {}; },
  },
});
```

#### Axios Interceptors
```typescript
// api/axiosConfig.ts
const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**Interview Q&A:**
- **Q: React Query vs Redux for API data?**
  A: React Query = server state (cache, refetch, pagination, optimistic updates). Redux = client state (UI state, user preferences). Don't store API data in Redux — let React Query handle it.

- **Q: What is Vite vs Webpack?**
  A: Vite uses native ES modules for dev (instant start, HMR). Webpack bundles everything (slower start). Vite uses esbuild for pre-bundling (10-100x faster than Webpack).

- **Q: What is MSW (Mock Service Worker)?**
  A: Intercepts HTTP requests at the network level using Service Workers. Tests run against mock APIs without changing application code. Our project uses MSW for unit tests and Storybook.

---

## 21. ADVANCED SQL (4 Files)

### 21.1 Window Functions
```sql
-- Rank employees by salary within each department
SELECT
    first_name, last_name, department, salary,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) as rank,
    DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) as dense_rank,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) as row_num,
    LAG(salary) OVER (PARTITION BY department ORDER BY salary DESC) as prev_salary,
    LEAD(salary) OVER (PARTITION BY department ORDER BY salary DESC) as next_salary,
    SUM(salary) OVER (PARTITION BY department) as dept_total,
    AVG(salary) OVER (PARTITION BY department) as dept_avg
FROM employees;
```

**Interview Q&A:**
- **Q: RANK vs DENSE_RANK vs ROW_NUMBER?**
  A: ROW_NUMBER = unique sequential (1,2,3,4). RANK = ties get same rank, skip (1,2,2,4). DENSE_RANK = ties get same rank, no skip (1,2,2,3).

### 21.2 Common Table Expressions (CTEs)
```sql
-- Recursive CTE: Org hierarchy
WITH RECURSIVE org_tree AS (
    -- Anchor: top-level managers
    SELECT id, first_name, manager_id, 1 as level
    FROM employees WHERE manager_id IS NULL
    
    UNION ALL
    
    -- Recursive: their reports
    SELECT e.id, e.first_name, e.manager_id, t.level + 1
    FROM employees e
    JOIN org_tree t ON e.manager_id = t.id
)
SELECT * FROM org_tree ORDER BY level, first_name;
```

### 21.3 Table Partitioning
```sql
-- Range partition by date
CREATE TABLE payment_transactions (
    id BIGSERIAL,
    amount DECIMAL(15,2),
    transaction_date DATE,
    status VARCHAR(20)
) PARTITION BY RANGE (transaction_date);

CREATE TABLE transactions_2024_q1 PARTITION OF payment_transactions
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE transactions_2024_q2 PARTITION OF payment_transactions
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
```

### 21.4 Triggers & Row-Level Security
```sql
-- Audit trigger
CREATE OR REPLACE FUNCTION audit_employee_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO employee_audit_log (employee_id, action, old_data, new_data, changed_at)
    VALUES (COALESCE(NEW.id, OLD.id), TG_OP, row_to_json(OLD), row_to_json(NEW), NOW());
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employee_audit
AFTER INSERT OR UPDATE OR DELETE ON employees
FOR EACH ROW EXECUTE FUNCTION audit_employee_changes();

-- Row-Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_access ON employees
    USING (department = current_setting('app.current_department'));
```

**Interview Q&A:**
- **Q: What is Row-Level Security?**
  A: RLS restricts which rows a user can access based on policies. Even direct SQL queries are filtered. PostgreSQL enforces this at the database level.

- **Q: When to use table partitioning?**
  A: When tables grow very large (millions of rows). Partition by date (time-series data), by tenant (multi-tenant), by status. Benefits: faster queries (scan only relevant partitions), easier data management (drop old partitions).

---

## 22. TESTING STRATEGY — COMPLETE REFERENCE

### 22.1 Testing Pyramid
```
        ╱╲
       ╱  ╲        E2E Tests (Playwright)        — Few, slow, high confidence
      ╱    ╲       
     ╱──────╲      Integration Tests              — Some, medium speed
    ╱        ╲     (Testcontainers, @SpringBootTest)
   ╱──────────╲    
  ╱            ╲   Slice Tests                    — Fast, focused
 ╱              ╲  (@WebMvcTest, @DataJpaTest, @GraphQlTest)
╱────────────────╲ 
╲                ╱ Unit Tests                     — Many, fastest
 ╲              ╱  (JUnit 5, Mockito)
  ╲────────────╱   
```

### 22.2 Unit Test Example
```java
@ExtendWith(MockitoExtension.class)
class EmployeeServiceTest {
    @Mock private EmployeeRepository employeeRepository;
    @Mock private EmployeeMapper employeeMapper;
    @InjectMocks private EmployeeService employeeService;

    @Test
    @DisplayName("Should create employee successfully")
    void shouldCreateEmployee() {
        // Given
        EmployeeCreateDTO dto = new EmployeeCreateDTO("John", "Doe", "john@example.com", "Engineering");
        Employee entity = Employee.builder().id(1L).firstName("John").build();
        EmployeeDTO expected = new EmployeeDTO(1L, "John", "Doe", "john@example.com", "Engineering");

        when(employeeMapper.toEntity(dto)).thenReturn(entity);
        when(employeeRepository.save(entity)).thenReturn(entity);
        when(employeeMapper.toDTO(entity)).thenReturn(expected);

        // When
        EmployeeDTO result = employeeService.createEmployee(dto);

        // Then
        assertThat(result.firstName()).isEqualTo("John");
        verify(employeeRepository).save(entity);
        verify(kafkaProducerService).sendEmployeeEvent("CREATED", entity);
    }
}
```

### 22.3 Slice Tests
```java
// Controller Slice Test
@WebMvcTest(EmployeeController.class)
class EmployeeControllerTest {
    @Autowired private MockMvc mockMvc;
    @MockBean private EmployeeService employeeService;

    @Test
    void shouldReturnEmployee() throws Exception {
        when(employeeService.getEmployee(1L)).thenReturn(dto);

        mockMvc.perform(get("/api/v1/employees/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.firstName").value("John"));
    }
}

// Repository Slice Test
@DataJpaTest
@ActiveProfiles("test")
class EmployeeRepositoryTest {
    @Autowired private EmployeeRepository repository;

    @Test
    void shouldFindByDepartment() {
        repository.save(Employee.builder().firstName("John").department("Engineering").build());
        List<Employee> result = repository.findByDepartment("Engineering");
        assertThat(result).hasSize(1);
    }
}

// GraphQL Slice Test
@GraphQlTest(NotificationGraphQLController.class)
class NotificationGraphQLControllerTest {
    @Autowired private GraphQlTester graphQlTester;
    @MockBean private NotificationService notificationService;

    @Test
    void shouldQueryNotification() {
        when(notificationService.getById(1L)).thenReturn(response);
        graphQlTester.document("{ notification(id: 1) { id title } }")
            .execute()
            .path("notification.title").entity(String.class).isEqualTo("Welcome");
    }
}
```

### 22.4 Testcontainers Integration Test
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EmployeeTestcontainersIT {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private MockMvc mockMvc;

    @Test
    void shouldCreateAndRetrieveEmployee() throws Exception {
        String json = """
            {"firstName":"John","lastName":"Doe","email":"john@test.com","department":"Eng"}
            """;

        mockMvc.perform(post("/api/v1/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists());
    }
}
```

**Interview Q&A:**
- **Q: @WebMvcTest vs @SpringBootTest?**
  A: @WebMvcTest loads ONLY controller + security layer — fast. @SpringBootTest loads the ENTIRE Spring context — slow but tests everything. Use @WebMvcTest for controller logic, @SpringBootTest for integration tests.

- **Q: What are Testcontainers?**
  A: JUnit extension that manages Docker containers. Real PostgreSQL, Redis, Kafka in tests. No H2 compatibility issues. Our project uses it for integration tests with real PostgreSQL.

---

## 23. OPENAPI / SWAGGER DOCUMENTATION

**Configuration:**
```java
@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Employee Microservice API")
                .version("1.0.0")
                .description("REST API for employee management"))
            .addSecurityItem(new SecurityRequirement().addList("Bearer"))
            .components(new Components()
                .addSecuritySchemes("Bearer", new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")));
    }
}
```

**Access:** `http://localhost:8081/swagger-ui.html`

---

## 24. API VERSIONING

**Strategy Used:** URL path versioning (`/api/v1/employees`)
```java
@RequestMapping("/api/v1/employees")   // Version in URL
public class EmployeeController { ... }
```

**Interview Q&A:**
- **Q: What are the API versioning strategies?**
  A: 1) URL path (`/api/v1/`) — simplest, most common (our project). 2) Header (`Accept: application/vnd.company.v1+json`). 3) Query param (`?version=1`). 4) Content negotiation. URL path is the MNC standard.

---
