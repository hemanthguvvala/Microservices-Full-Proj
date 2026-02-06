package com.example.employee.service;

import com.example.employee.exception.DuplicateResourceException;
import com.example.employee.exception.ResourceNotFoundException;
import com.example.employee.model.Employee;
import com.example.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmployeeServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private EmployeeService employeeService;

    private Employee employee;

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
    }

    @Test
    @DisplayName("Should return all employees")
    void testGetAllEmployees() {
        // Given
        List<Employee> employees = Arrays.asList(employee, new Employee());
        when(employeeRepository.findAll()).thenReturn(employees);

        // When
        List<Employee> result = employeeService.getAllEmployees();

        // Then
        assertThat(result).hasSize(2);
        verify(employeeRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("Should return employee by ID when found")
    void testGetEmployeeById_Success() {
        // Given
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee));

        // When
        Employee result = employeeService.getEmployeeById(1L);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getEmail()).isEqualTo("john.doe@example.com");
        verify(employeeRepository, times(1)).findById(1L);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when employee not found by ID")
    void testGetEmployeeById_NotFound() {
        // Given
        when(employeeRepository.findById(anyLong())).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> employeeService.getEmployeeById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Employee not found with id: '999'");
        verify(employeeRepository, times(1)).findById(999L);
    }

    @Test
    @DisplayName("Should return employee by email when found")
    void testGetEmployeeByEmail_Success() {
        // Given
        when(employeeRepository.findByEmail("john.doe@example.com")).thenReturn(Optional.of(employee));

        // When
        Employee result = employeeService.getEmployeeByEmail("john.doe@example.com");

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmail()).isEqualTo("john.doe@example.com");
        verify(employeeRepository, times(1)).findByEmail("john.doe@example.com");
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when employee not found by email")
    void testGetEmployeeByEmail_NotFound() {
        // Given
        when(employeeRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> employeeService.getEmployeeByEmail("notfound@example.com"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Employee not found with email");
    }

    @Test
    @DisplayName("Should return employees by department")
    void testGetEmployeesByDepartment() {
        // Given
        List<Employee> employees = Arrays.asList(employee, new Employee());
        when(employeeRepository.findByDepartment("Engineering")).thenReturn(employees);

        // When
        List<Employee> result = employeeService.getEmployeesByDepartment("Engineering");

        // Then
        assertThat(result).hasSize(2);
        verify(employeeRepository, times(1)).findByDepartment("Engineering");
    }

    @Test
    @DisplayName("Should return employees by position")
    void testGetEmployeesByPosition() {
        // Given
        List<Employee> employees = Arrays.asList(employee);
        when(employeeRepository.findByPosition("Software Engineer")).thenReturn(employees);

        // When
        List<Employee> result = employeeService.getEmployeesByPosition("Software Engineer");

        // Then
        assertThat(result).hasSize(1);
        verify(employeeRepository, times(1)).findByPosition("Software Engineer");
    }

    @Test
    @DisplayName("Should create employee successfully")
    void testCreateEmployee_Success() {
        // Given
        when(employeeRepository.existsByEmail(employee.getEmail())).thenReturn(false);
        when(employeeRepository.save(any(Employee.class))).thenReturn(employee);

        // When
        Employee result = employeeService.createEmployee(employee);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmail()).isEqualTo("john.doe@example.com");
        verify(employeeRepository, times(1)).existsByEmail(employee.getEmail());
        verify(employeeRepository, times(1)).save(employee);
    }

    @Test
    @DisplayName("Should throw DuplicateResourceException when creating employee with existing email")
    void testCreateEmployee_DuplicateEmail() {
        // Given
        when(employeeRepository.existsByEmail(employee.getEmail())).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> employeeService.createEmployee(employee))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("Employee already exists with email");
        verify(employeeRepository, times(1)).existsByEmail(employee.getEmail());
        verify(employeeRepository, never()).save(any(Employee.class));
    }

    @Test
    @DisplayName("Should update employee successfully")
    void testUpdateEmployee_Success() {
        // Given
        Employee updatedEmployee = new Employee();
        updatedEmployee.setFirstName("Jane");
        updatedEmployee.setLastName("Smith");
        updatedEmployee.setEmail("jane.smith@example.com");
        updatedEmployee.setDepartment("Marketing");
        updatedEmployee.setPosition("Marketing Manager");
        updatedEmployee.setSalary(85000.0);
        updatedEmployee.setHireDate(LocalDate.of(2024, 2, 1));
        updatedEmployee.setPhoneNumber("098-765-4321");

        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee));
        when(employeeRepository.existsByEmail("jane.smith@example.com")).thenReturn(false);
        when(employeeRepository.save(any(Employee.class))).thenReturn(employee);

        // When
        Employee result = employeeService.updateEmployee(1L, updatedEmployee);

        // Then
        assertThat(result).isNotNull();
        verify(employeeRepository, times(1)).findById(1L);
        verify(employeeRepository, times(1)).save(any(Employee.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when updating non-existent employee")
    void testUpdateEmployee_NotFound() {
        // Given
        when(employeeRepository.findById(anyLong())).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> employeeService.updateEmployee(999L, employee))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Employee not found with id");
        verify(employeeRepository, times(1)).findById(999L);
        verify(employeeRepository, never()).save(any(Employee.class));
    }

    @Test
    @DisplayName("Should throw DuplicateResourceException when updating with existing email")
    void testUpdateEmployee_DuplicateEmail() {
        // Given
        Employee updatedEmployee = new Employee();
        updatedEmployee.setEmail("existing@example.com");

        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee));
        when(employeeRepository.existsByEmail("existing@example.com")).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> employeeService.updateEmployee(1L, updatedEmployee))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("Employee already exists with email");
        verify(employeeRepository, times(1)).findById(1L);
        verify(employeeRepository, never()).save(any(Employee.class));
    }

    @Test
    @DisplayName("Should delete employee successfully")
    void testDeleteEmployee_Success() {
        // Given
        when(employeeRepository.existsById(1L)).thenReturn(true);
        doNothing().when(employeeRepository).deleteById(1L);

        // When
        employeeService.deleteEmployee(1L);

        // Then
        verify(employeeRepository, times(1)).existsById(1L);
        verify(employeeRepository, times(1)).deleteById(1L);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when deleting non-existent employee")
    void testDeleteEmployee_NotFound() {
        // Given
        when(employeeRepository.existsById(anyLong())).thenReturn(false);

        // When & Then
        assertThatThrownBy(() -> employeeService.deleteEmployee(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Employee not found with id");
        verify(employeeRepository, times(1)).existsById(999L);
        verify(employeeRepository, never()).deleteById(anyLong());
    }
}
