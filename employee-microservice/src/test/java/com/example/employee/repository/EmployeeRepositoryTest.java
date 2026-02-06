package com.example.employee.repository;

import com.example.employee.model.Employee;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class EmployeeRepositoryTest {

    @Autowired
    private EmployeeRepository employeeRepository;

    private Employee employee;

    @BeforeEach
    void setUp() {
        employeeRepository.deleteAll();

        employee = new Employee();
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
    @DisplayName("Should save employee successfully")
    void testSaveEmployee() {
        // When
        Employee savedEmployee = employeeRepository.save(employee);

        // Then
        assertThat(savedEmployee).isNotNull();
        assertThat(savedEmployee.getId()).isNotNull();
        assertThat(savedEmployee.getEmail()).isEqualTo("john.doe@example.com");
    }

    @Test
    @DisplayName("Should find employee by email")
    void testFindByEmail() {
        // Given
        employeeRepository.save(employee);

        // When
        Optional<Employee> foundEmployee = employeeRepository.findByEmail("john.doe@example.com");

        // Then
        assertThat(foundEmployee).isPresent();
        assertThat(foundEmployee.get().getFirstName()).isEqualTo("John");
    }

    @Test
    @DisplayName("Should return empty when email not found")
    void testFindByEmail_NotFound() {
        // When
        Optional<Employee> foundEmployee = employeeRepository.findByEmail("notfound@example.com");

        // Then
        assertThat(foundEmployee).isEmpty();
    }

    @Test
    @DisplayName("Should find employees by department")
    void testFindByDepartment() {
        // Given
        Employee employee2 = new Employee();
        employee2.setFirstName("Jane");
        employee2.setLastName("Smith");
        employee2.setEmail("jane.smith@example.com");
        employee2.setDepartment("Engineering");
        employee2.setPosition("Senior Engineer");
        employee2.setSalary(85000.0);

        employeeRepository.save(employee);
        employeeRepository.save(employee2);

        // When
        List<Employee> engineers = employeeRepository.findByDepartment("Engineering");

        // Then
        assertThat(engineers).hasSize(2);
        assertThat(engineers).extracting(Employee::getDepartment).containsOnly("Engineering");
    }

    @Test
    @DisplayName("Should find employees by position")
    void testFindByPosition() {
        // Given
        employeeRepository.save(employee);

        // When
        List<Employee> softwareEngineers = employeeRepository.findByPosition("Software Engineer");

        // Then
        assertThat(softwareEngineers).hasSize(1);
        assertThat(softwareEngineers.get(0).getPosition()).isEqualTo("Software Engineer");
    }

    @Test
    @DisplayName("Should check if employee exists by email")
    void testExistsByEmail() {
        // Given
        employeeRepository.save(employee);

        // When
        boolean exists = employeeRepository.existsByEmail("john.doe@example.com");
        boolean notExists = employeeRepository.existsByEmail("notfound@example.com");

        // Then
        assertThat(exists).isTrue();
        assertThat(notExists).isFalse();
    }

    @Test
    @DisplayName("Should delete employee")
    void testDeleteEmployee() {
        // Given
        Employee savedEmployee = employeeRepository.save(employee);
        Long employeeId = savedEmployee.getId();

        // When
        employeeRepository.deleteById(employeeId);

        // Then
        Optional<Employee> deletedEmployee = employeeRepository.findById(employeeId);
        assertThat(deletedEmployee).isEmpty();
    }

    @Test
    @DisplayName("Should find all employees")
    void testFindAll() {
        // Given
        Employee employee2 = new Employee();
        employee2.setFirstName("Jane");
        employee2.setLastName("Smith");
        employee2.setEmail("jane.smith@example.com");
        employee2.setDepartment("Marketing");
        employee2.setPosition("Manager");
        employee2.setSalary(80000.0);

        employeeRepository.save(employee);
        employeeRepository.save(employee2);

        // When
        List<Employee> allEmployees = employeeRepository.findAll();

        // Then
        assertThat(allEmployees).hasSize(2);
    }
}
