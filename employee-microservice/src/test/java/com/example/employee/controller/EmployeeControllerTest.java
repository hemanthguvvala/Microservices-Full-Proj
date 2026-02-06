package com.example.employee.controller;

import com.example.employee.dto.EmployeeCreateDTO;
import com.example.employee.dto.EmployeeDTO;
import com.example.employee.dto.EmployeeUpdateDTO;
import com.example.employee.exception.DuplicateResourceException;
import com.example.employee.exception.ResourceNotFoundException;
import com.example.employee.mapper.EmployeeMapper;
import com.example.employee.model.Employee;
import com.example.employee.service.EmployeeService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(EmployeeController.class)
class EmployeeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private EmployeeService employeeService;

    @MockBean
    private EmployeeMapper employeeMapper;

    private Employee employee;
    private EmployeeDTO employeeDTO;
    private EmployeeCreateDTO employeeCreateDTO;
    private EmployeeUpdateDTO employeeUpdateDTO;

    @BeforeEach
    void setUp() {
        employee = new Employee();
        employee.setId(1L);
        employee.setFirstName("John");
        employee.setLastName("Doe");
        employee.setEmail("john.doe@example.com");
        employee.setDepartment("Engineering");
        employee.setPosition("Software Engineer");
        employee.setSalary(75000.0);
        employee.setHireDate(LocalDate.of(2024, 1, 15));
        employee.setPhoneNumber("123-456-7890");

        employeeDTO = new EmployeeDTO();
        employeeDTO.setId(1L);
        employeeDTO.setFirstName("John");
        employeeDTO.setLastName("Doe");
        employeeDTO.setEmail("john.doe@example.com");
        employeeDTO.setDepartment("Engineering");
        employeeDTO.setPosition("Software Engineer");
        employeeDTO.setSalary(75000.0);
        employeeDTO.setHireDate(LocalDate.of(2024, 1, 15));
        employeeDTO.setPhoneNumber("123-456-7890");
        employeeDTO.setFullName("John Doe");

        employeeCreateDTO = new EmployeeCreateDTO();
        employeeCreateDTO.setFirstName("John");
        employeeCreateDTO.setLastName("Doe");
        employeeCreateDTO.setEmail("john.doe@example.com");
        employeeCreateDTO.setDepartment("Engineering");
        employeeCreateDTO.setPosition("Software Engineer");
        employeeCreateDTO.setSalary(75000.0);
        employeeCreateDTO.setHireDate(LocalDate.of(2024, 1, 15));
        employeeCreateDTO.setPhoneNumber("123-456-7890");

        employeeUpdateDTO = new EmployeeUpdateDTO();
        employeeUpdateDTO.setFirstName("Jane");
        employeeUpdateDTO.setLastName("Smith");
        employeeUpdateDTO.setEmail("jane.smith@example.com");
        employeeUpdateDTO.setDepartment("Marketing");
        employeeUpdateDTO.setPosition("Marketing Manager");
        employeeUpdateDTO.setSalary(85000.0);
        employeeUpdateDTO.setHireDate(LocalDate.of(2024, 2, 1));
        employeeUpdateDTO.setPhoneNumber("098-765-4321");
    }

    @Test
    @DisplayName("GET /api/employees - Should return all employees")
    void testGetAllEmployees() throws Exception {
        // Given
        List<Employee> employees = Arrays.asList(employee, new Employee());
        List<EmployeeDTO> employeeDTOs = Arrays.asList(employeeDTO, new EmployeeDTO());
        
        when(employeeService.getAllEmployees()).thenReturn(employees);
        when(employeeMapper.toDTOList(employees)).thenReturn(employeeDTOs);

        // When & Then
        mockMvc.perform(get("/api/employees"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].email").value("john.doe@example.com"));

        verify(employeeService, times(1)).getAllEmployees();
        verify(employeeMapper, times(1)).toDTOList(employees);
    }

    @Test
    @DisplayName("GET /api/employees/{id} - Should return employee by ID")
    void testGetEmployeeById_Success() throws Exception {
        // Given
        when(employeeService.getEmployeeById(1L)).thenReturn(employee);
        when(employeeMapper.toDTO(employee)).thenReturn(employeeDTO);

        // When & Then
        mockMvc.perform(get("/api/employees/1"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.email").value("john.doe@example.com"))
                .andExpect(jsonPath("$.fullName").value("John Doe"));

        verify(employeeService, times(1)).getEmployeeById(1L);
        verify(employeeMapper, times(1)).toDTO(employee);
    }

    @Test
    @DisplayName("GET /api/employees/{id} - Should return 404 when employee not found")
    void testGetEmployeeById_NotFound() throws Exception {
        // Given
        when(employeeService.getEmployeeById(anyLong()))
                .thenThrow(new ResourceNotFoundException("Employee", "id", 999L));

        // When & Then
        mockMvc.perform(get("/api/employees/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Employee not found with id: '999'"));

        verify(employeeService, times(1)).getEmployeeById(999L);
    }

    @Test
    @DisplayName("GET /api/employees/email/{email} - Should return employee by email")
    void testGetEmployeeByEmail_Success() throws Exception {
        // Given
        when(employeeService.getEmployeeByEmail("john.doe@example.com")).thenReturn(employee);
        when(employeeMapper.toDTO(employee)).thenReturn(employeeDTO);

        // When & Then
        mockMvc.perform(get("/api/employees/email/john.doe@example.com"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.email").value("john.doe@example.com"));

        verify(employeeService, times(1)).getEmployeeByEmail("john.doe@example.com");
    }

    @Test
    @DisplayName("GET /api/employees/department/{department} - Should return employees by department")
    void testGetEmployeesByDepartment() throws Exception {
        // Given
        List<Employee> employees = Arrays.asList(employee);
        List<EmployeeDTO> employeeDTOs = Arrays.asList(employeeDTO);
        
        when(employeeService.getEmployeesByDepartment("Engineering")).thenReturn(employees);
        when(employeeMapper.toDTOList(employees)).thenReturn(employeeDTOs);

        // When & Then
        mockMvc.perform(get("/api/employees/department/Engineering"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].department").value("Engineering"));

        verify(employeeService, times(1)).getEmployeesByDepartment("Engineering");
    }

    @Test
    @DisplayName("GET /api/employees/position/{position} - Should return employees by position")
    void testGetEmployeesByPosition() throws Exception {
        // Given
        List<Employee> employees = Arrays.asList(employee);
        List<EmployeeDTO> employeeDTOs = Arrays.asList(employeeDTO);
        
        when(employeeService.getEmployeesByPosition("Software Engineer")).thenReturn(employees);
        when(employeeMapper.toDTOList(employees)).thenReturn(employeeDTOs);

        // When & Then
        mockMvc.perform(get("/api/employees/position/Software Engineer"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].position").value("Software Engineer"));

        verify(employeeService, times(1)).getEmployeesByPosition("Software Engineer");
    }

    @Test
    @DisplayName("POST /api/employees - Should create employee successfully")
    void testCreateEmployee_Success() throws Exception {
        // Given
        when(employeeMapper.toEntity(any(EmployeeCreateDTO.class))).thenReturn(employee);
        when(employeeService.createEmployee(any(Employee.class))).thenReturn(employee);
        when(employeeMapper.toDTO(employee)).thenReturn(employeeDTO);

        // When & Then
        mockMvc.perform(post("/api/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(employeeCreateDTO)))
                .andExpect(status().isCreated())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.email").value("john.doe@example.com"))
                .andExpect(jsonPath("$.fullName").value("John Doe"));

        verify(employeeService, times(1)).createEmployee(any(Employee.class));
    }

    @Test
    @DisplayName("POST /api/employees - Should return 400 for invalid input")
    void testCreateEmployee_InvalidInput() throws Exception {
        // Given
        EmployeeCreateDTO invalidDTO = new EmployeeCreateDTO();
        invalidDTO.setEmail("invalid-email");

        // When & Then
        mockMvc.perform(post("/api/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Validation Failed"));

        verify(employeeService, never()).createEmployee(any(Employee.class));
    }

    @Test
    @DisplayName("POST /api/employees - Should return 409 for duplicate email")
    void testCreateEmployee_DuplicateEmail() throws Exception {
        // Given
        when(employeeMapper.toEntity(any(EmployeeCreateDTO.class))).thenReturn(employee);
        when(employeeService.createEmployee(any(Employee.class)))
                .thenThrow(new DuplicateResourceException("Employee", "email", "john.doe@example.com"));

        // When & Then
        mockMvc.perform(post("/api/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(employeeCreateDTO)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Employee already exists with email: 'john.doe@example.com'"));

        verify(employeeService, times(1)).createEmployee(any(Employee.class));
    }

    @Test
    @DisplayName("PUT /api/employees/{id} - Should update employee successfully")
    void testUpdateEmployee_Success() throws Exception {
        // Given
        when(employeeService.getEmployeeById(1L)).thenReturn(employee);
        doNothing().when(employeeMapper).updateEntityFromDTO(any(EmployeeUpdateDTO.class), any(Employee.class));
        when(employeeService.updateEmployee(anyLong(), any(Employee.class))).thenReturn(employee);
        when(employeeMapper.toDTO(employee)).thenReturn(employeeDTO);

        // When & Then
        mockMvc.perform(put("/api/employees/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(employeeUpdateDTO)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").value(1));

        verify(employeeService, times(1)).getEmployeeById(1L);
        verify(employeeService, times(1)).updateEmployee(anyLong(), any(Employee.class));
    }

    @Test
    @DisplayName("PUT /api/employees/{id} - Should return 404 when employee not found")
    void testUpdateEmployee_NotFound() throws Exception {
        // Given
        when(employeeService.getEmployeeById(anyLong()))
                .thenThrow(new ResourceNotFoundException("Employee", "id", 999L));

        // When & Then
        mockMvc.perform(put("/api/employees/999")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(employeeUpdateDTO)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));

        verify(employeeService, times(1)).getEmployeeById(999L);
        verify(employeeService, never()).updateEmployee(anyLong(), any(Employee.class));
    }

    @Test
    @DisplayName("DELETE /api/employees/{id} - Should delete employee successfully")
    void testDeleteEmployee_Success() throws Exception {
        // Given
        doNothing().when(employeeService).deleteEmployee(1L);

        // When & Then
        mockMvc.perform(delete("/api/employees/1"))
                .andExpect(status().isNoContent());

        verify(employeeService, times(1)).deleteEmployee(1L);
    }

    @Test
    @DisplayName("DELETE /api/employees/{id} - Should return 404 when employee not found")
    void testDeleteEmployee_NotFound() throws Exception {
        // Given
        doThrow(new ResourceNotFoundException("Employee", "id", 999L))
                .when(employeeService).deleteEmployee(999L);

        // When & Then
        mockMvc.perform(delete("/api/employees/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));

        verify(employeeService, times(1)).deleteEmployee(999L);
    }
}
