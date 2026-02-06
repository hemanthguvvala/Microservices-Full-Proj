package com.example.employee.integration;

import com.example.employee.dto.EmployeeCreateDTO;
import com.example.employee.dto.EmployeeUpdateDTO;
import com.example.employee.model.Employee;
import com.example.employee.repository.EmployeeRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class EmployeeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private EmployeeRepository employeeRepository;

    @BeforeEach
    void setUp() {
        employeeRepository.deleteAll();
    }

    @Test
    @DisplayName("Integration Test - Full CRUD workflow")
    void testFullCRUDWorkflow() throws Exception {
        // 1. Create Employee
        EmployeeCreateDTO createDTO = new EmployeeCreateDTO();
        createDTO.setFirstName("John");
        createDTO.setLastName("Doe");
        createDTO.setEmail("john.doe@example.com");
        createDTO.setDepartment("Engineering");
        createDTO.setPosition("Software Engineer");
        createDTO.setSalary(75000.0);
        createDTO.setHireDate(LocalDate.of(2024, 1, 15));
        createDTO.setPhoneNumber("123-456-7890");

        String createResponse = mockMvc.perform(post("/api/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("john.doe@example.com"))
                .andExpect(jsonPath("$.fullName").value("John Doe"))
                .andReturn().getResponse().getContentAsString();

        Long employeeId = objectMapper.readTree(createResponse).get("id").asLong();

        // 2. Get Employee by ID
        mockMvc.perform(get("/api/employees/" + employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(employeeId))
                .andExpect(jsonPath("$.email").value("john.doe@example.com"));

        // 3. Get All Employees
        mockMvc.perform(get("/api/employees"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        // 4. Update Employee
        EmployeeUpdateDTO updateDTO = new EmployeeUpdateDTO();
        updateDTO.setFirstName("Jane");
        updateDTO.setLastName("Smith");
        updateDTO.setEmail("jane.smith@example.com");
        updateDTO.setDepartment("Marketing");
        updateDTO.setPosition("Marketing Manager");
        updateDTO.setSalary(85000.0);
        updateDTO.setHireDate(LocalDate.of(2024, 2, 1));
        updateDTO.setPhoneNumber("098-765-4321");

        mockMvc.perform(put("/api/employees/" + employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("jane.smith@example.com"))
                .andExpect(jsonPath("$.fullName").value("Jane Smith"));

        // 5. Delete Employee
        mockMvc.perform(delete("/api/employees/" + employeeId))
                .andExpect(status().isNoContent());

        // 6. Verify deletion
        mockMvc.perform(get("/api/employees/" + employeeId))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Integration Test - Search by department")
    void testSearchByDepartment() throws Exception {
        // Given
        Employee emp1 = createEmployee("John", "Doe", "john@example.com", "Engineering");
        Employee emp2 = createEmployee("Jane", "Smith", "jane@example.com", "Engineering");
        Employee emp3 = createEmployee("Bob", "Johnson", "bob@example.com", "Marketing");

        employeeRepository.save(emp1);
        employeeRepository.save(emp2);
        employeeRepository.save(emp3);

        // When & Then
        mockMvc.perform(get("/api/employees/department/Engineering"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].department").value("Engineering"));
    }

    @Test
    @DisplayName("Integration Test - Duplicate email validation")
    void testDuplicateEmailValidation() throws Exception {
        // Given
        Employee existingEmployee = createEmployee("John", "Doe", "duplicate@example.com", "Engineering");
        employeeRepository.save(existingEmployee);

        // When & Then
        EmployeeCreateDTO createDTO = new EmployeeCreateDTO();
        createDTO.setFirstName("Jane");
        createDTO.setLastName("Smith");
        createDTO.setEmail("duplicate@example.com");
        createDTO.setDepartment("Marketing");
        createDTO.setPosition("Manager");
        createDTO.setSalary(80000.0);

        mockMvc.perform(post("/api/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDTO)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Employee already exists with email: 'duplicate@example.com'"));
    }

    @Test
    @DisplayName("Integration Test - Validation errors")
    void testValidationErrors() throws Exception {
        // Given
        EmployeeCreateDTO invalidDTO = new EmployeeCreateDTO();
        invalidDTO.setEmail("invalid-email");

        // When & Then
        mockMvc.perform(post("/api/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Validation Failed"))
                .andExpect(jsonPath("$.validationErrors").exists());
    }

    private Employee createEmployee(String firstName, String lastName, String email, String department) {
        Employee employee = new Employee();
        employee.setFirstName(firstName);
        employee.setLastName(lastName);
        employee.setEmail(email);
        employee.setDepartment(department);
        employee.setPosition("Position");
        employee.setSalary(70000.0);
        employee.setHireDate(LocalDate.now());
        return employee;
    }
}
