package com.example.employee.mapper;

import com.example.employee.dto.EmployeeCreateDTO;
import com.example.employee.dto.EmployeeDTO;
import com.example.employee.dto.EmployeeUpdateDTO;
import com.example.employee.model.Employee;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class EmployeeMapperTest {

    private EmployeeMapper employeeMapper;
    private Employee employee;

    @BeforeEach
    void setUp() {
        employeeMapper = new EmployeeMapper();

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
    @DisplayName("Should convert Employee to EmployeeDTO")
    void testToDTO() {
        // When
        EmployeeDTO dto = employeeMapper.toDTO(employee);

        // Then
        assertThat(dto).isNotNull();
        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getFirstName()).isEqualTo("John");
        assertThat(dto.getLastName()).isEqualTo("Doe");
        assertThat(dto.getEmail()).isEqualTo("john.doe@example.com");
        assertThat(dto.getDepartment()).isEqualTo("Engineering");
        assertThat(dto.getPosition()).isEqualTo("Software Engineer");
        assertThat(dto.getSalary()).isEqualTo(75000.0);
        assertThat(dto.getHireDate()).isEqualTo(LocalDate.of(2024, 1, 15));
        assertThat(dto.getPhoneNumber()).isEqualTo("123-456-7890");
        assertThat(dto.getFullName()).isEqualTo("John Doe");
    }

    @Test
    @DisplayName("Should return null when converting null Employee to DTO")
    void testToDTO_Null() {
        // When
        EmployeeDTO dto = employeeMapper.toDTO(null);

        // Then
        assertThat(dto).isNull();
    }

    @Test
    @DisplayName("Should convert list of Employees to list of EmployeeDTOs")
    void testToDTOList() {
        // Given
        Employee employee2 = new Employee();
        employee2.setId(2L);
        employee2.setFirstName("Jane");
        employee2.setLastName("Smith");
        List<Employee> employees = Arrays.asList(employee, employee2);

        // When
        List<EmployeeDTO> dtos = employeeMapper.toDTOList(employees);

        // Then
        assertThat(dtos).hasSize(2);
        assertThat(dtos.get(0).getFirstName()).isEqualTo("John");
        assertThat(dtos.get(1).getFirstName()).isEqualTo("Jane");
    }

    @Test
    @DisplayName("Should convert EmployeeCreateDTO to Employee")
    void testToEntity() {
        // Given
        EmployeeCreateDTO createDTO = new EmployeeCreateDTO();
        createDTO.setFirstName("Alice");
        createDTO.setLastName("Johnson");
        createDTO.setEmail("alice.johnson@example.com");
        createDTO.setDepartment("Marketing");
        createDTO.setPosition("Marketing Manager");
        createDTO.setSalary(80000.0);
        createDTO.setHireDate(LocalDate.of(2024, 3, 1));
        createDTO.setPhoneNumber("555-123-4567");

        // When
        Employee result = employeeMapper.toEntity(createDTO);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isNull(); // ID should not be set on creation
        assertThat(result.getFirstName()).isEqualTo("Alice");
        assertThat(result.getLastName()).isEqualTo("Johnson");
        assertThat(result.getEmail()).isEqualTo("alice.johnson@example.com");
        assertThat(result.getDepartment()).isEqualTo("Marketing");
        assertThat(result.getPosition()).isEqualTo("Marketing Manager");
        assertThat(result.getSalary()).isEqualTo(80000.0);
        assertThat(result.getHireDate()).isEqualTo(LocalDate.of(2024, 3, 1));
        assertThat(result.getPhoneNumber()).isEqualTo("555-123-4567");
    }

    @Test
    @DisplayName("Should return null when converting null EmployeeCreateDTO to Entity")
    void testToEntity_Null() {
        // When
        Employee result = employeeMapper.toEntity(null);

        // Then
        assertThat(result).isNull();
    }

    @Test
    @DisplayName("Should update Employee from EmployeeUpdateDTO")
    void testUpdateEntityFromDTO() {
        // Given
        EmployeeUpdateDTO updateDTO = new EmployeeUpdateDTO();
        updateDTO.setFirstName("UpdatedFirstName");
        updateDTO.setLastName("UpdatedLastName");
        updateDTO.setEmail("updated@example.com");
        updateDTO.setDepartment("Sales");
        updateDTO.setPosition("Sales Manager");
        updateDTO.setSalary(90000.0);
        updateDTO.setHireDate(LocalDate.of(2024, 4, 1));
        updateDTO.setPhoneNumber("999-888-7777");

        // When
        employeeMapper.updateEntityFromDTO(updateDTO, employee);

        // Then
        assertThat(employee.getId()).isEqualTo(1L); // ID should remain unchanged
        assertThat(employee.getFirstName()).isEqualTo("UpdatedFirstName");
        assertThat(employee.getLastName()).isEqualTo("UpdatedLastName");
        assertThat(employee.getEmail()).isEqualTo("updated@example.com");
        assertThat(employee.getDepartment()).isEqualTo("Sales");
        assertThat(employee.getPosition()).isEqualTo("Sales Manager");
        assertThat(employee.getSalary()).isEqualTo(90000.0);
        assertThat(employee.getHireDate()).isEqualTo(LocalDate.of(2024, 4, 1));
        assertThat(employee.getPhoneNumber()).isEqualTo("999-888-7777");
    }

    @Test
    @DisplayName("Should handle null parameters in updateEntityFromDTO")
    void testUpdateEntityFromDTO_NullParameters() {
        // Given
        Employee originalEmployee = new Employee();
        originalEmployee.setId(1L);
        originalEmployee.setFirstName("Original");

        // When
        employeeMapper.updateEntityFromDTO(null, originalEmployee);

        // Then
        assertThat(originalEmployee.getFirstName()).isEqualTo("Original"); // Should remain unchanged

        // When
        employeeMapper.updateEntityFromDTO(new EmployeeUpdateDTO(), null);

        // Then - should not throw exception
    }
}
