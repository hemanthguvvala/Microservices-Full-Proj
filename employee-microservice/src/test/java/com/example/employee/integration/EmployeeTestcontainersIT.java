package com.example.employee.integration;

import com.example.employee.model.Employee;
import com.example.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testcontainers Integration Test — Tests against a REAL PostgreSQL in Docker.
 * 
 * Interview Insight:
 *   "Why use Testcontainers instead of H2 for integration tests?"
 *   → "H2 is an in-memory DB with a different SQL dialect. Tests may pass
 *      on H2 but fail in production due to:
 *      - Different data types (JSONB, ARRAY not supported in H2)
 *      - Different SQL syntax (window functions, CTEs may differ)
 *      - Missing PostgreSQL features (LISTEN/NOTIFY, pg_trgm, RLS)
 *
 *      Testcontainers spins up a real PostgreSQL Docker container, ensuring
 *      test behavior matches production exactly."
 * 
 * Key Concepts:
 *   @Testcontainers         — JUnit 5 extension for container lifecycle
 *   @Container               — Auto-manage container start/stop
 *   @DynamicPropertySource   — Inject container's dynamic port into Spring
 *   static container         — Shared across all test methods (faster)
 *   PostgreSQLContainer      — Pre-configured PostgreSQL Docker image
 * 
 * Prerequisites: Docker must be running on the machine.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc(addFilters = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class EmployeeTestcontainersIT {

    /**
     * Singleton container pattern — one container for ALL tests.
     * 'static' = start once, share across test methods (much faster).
     */
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EmployeeRepository employeeRepository;

    /**
     * @DynamicPropertySource — Injects container's JDBC URL into Spring.
     * Port is random (to avoid conflicts), so we can't hardcode it.
     */
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.flyway.enabled", () -> "false");
        // Disable external services not needed for this test
        registry.add("spring.autoconfigure.exclude", () -> String.join(",",
            "org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration",
            "org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration",
            "org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration",
            "org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration",
            "org.springframework.boot.autoconfigure.data.elasticsearch.ElasticsearchDataAutoConfiguration",
            "org.springframework.boot.autoconfigure.elasticsearch.ElasticsearchRestClientAutoConfiguration",
            "org.springframework.boot.autoconfigure.batch.BatchAutoConfiguration"
        ));
    }

    @BeforeEach
    void setUp() {
        employeeRepository.deleteAll();
    }

    @Test
    @Order(1)
    @DisplayName("PostgreSQL container should be running")
    void containerShouldBeRunning() {
        assertThat(postgres.isRunning()).isTrue();
        assertThat(postgres.getDatabaseName()).isEqualTo("testdb");
    }

    @Test
    @Order(2)
    @DisplayName("Should create employee in real PostgreSQL")
    void shouldCreateEmployee() throws Exception {
        String json = """
            {
                "firstName": "John",
                "lastName": "Doe",
                "email": "john.doe@example.com",
                "department": "Engineering",
                "position": "Senior Developer",
                "salary": 95000.00,
                "hireDate": "2024-01-15",
                "phoneNumber": "555-0100"
            }
            """;

        mockMvc.perform(post("/api/v1/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.firstName").value("John"))
                .andExpect(jsonPath("$.email").value("john.doe@example.com"))
                .andExpect(jsonPath("$.fullName").value("John Doe"));

        assertThat(employeeRepository.count()).isEqualTo(1);
    }

    @Test
    @Order(3)
    @DisplayName("Should paginate employees from PostgreSQL")
    void shouldPaginateEmployees() throws Exception {
        for (int i = 1; i <= 15; i++) {
            Employee emp = new Employee();
            emp.setFirstName("Emp" + i);
            emp.setLastName("Test");
            emp.setEmail("emp" + i + "@test.com");
            emp.setDepartment("Engineering");
            emp.setPosition("Developer");
            emp.setSalary(50000.0 + i * 1000);
            emp.setHireDate(LocalDate.of(2024, 1, i));
            employeeRepository.save(emp);
        }

        mockMvc.perform(get("/api/v1/employees")
                        .param("page", "0")
                        .param("size", "5")
                        .param("sortBy", "firstName")
                        .param("direction", "asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(5)))
                .andExpect(jsonPath("$.totalElements").value(15))
                .andExpect(jsonPath("$.totalPages").value(3));
    }

    @Test
    @Order(4)
    @DisplayName("Should enforce unique email constraint in PostgreSQL")
    void shouldEnforceUniqueEmail() throws Exception {
        Employee emp = new Employee();
        emp.setFirstName("Jane");
        emp.setLastName("Doe");
        emp.setEmail("dupe@test.com");
        emp.setDepartment("HR");
        emp.setPosition("Manager");
        emp.setSalary(75000.0);
        employeeRepository.save(emp);

        String dupeJson = """
            {
                "firstName": "Other",
                "lastName": "Person",
                "email": "dupe@test.com",
                "department": "Finance",
                "position": "Analyst",
                "salary": 65000.00
            }
            """;

        mockMvc.perform(post("/api/v1/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(dupeJson))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @Order(5)
    @DisplayName("Should update and delete in PostgreSQL")
    void shouldUpdateAndDelete() throws Exception {
        Employee emp = new Employee();
        emp.setFirstName("ToUpdate");
        emp.setLastName("Test");
        emp.setEmail("update@pg.com");
        emp.setDepartment("Engineering");
        emp.setPosition("Junior");
        emp.setSalary(55000.0);
        Employee saved = employeeRepository.save(emp);

        String updateJson = """
            {
                "firstName": "Updated",
                "lastName": "Employee",
                "email": "updated@pg.com",
                "department": "Engineering",
                "position": "Senior",
                "salary": 85000.00
            }
            """;

        mockMvc.perform(put("/api/v1/employees/" + saved.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.position").value("Senior"));

        mockMvc.perform(delete("/api/v1/employees/" + saved.getId()))
                .andExpect(status().isNoContent());

        assertThat(employeeRepository.findById(saved.getId())).isEmpty();
    }
}
