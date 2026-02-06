package com.example.employee.controller;

import com.example.employee.dto.EmployeeCreateDTO;
import com.example.employee.dto.EmployeeDTO;
import com.example.employee.dto.EmployeeUpdateDTO;
import com.example.employee.mapper.EmployeeMapper;
import com.example.employee.model.Employee;
import com.example.employee.service.EmployeeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/employees")
@Tag(name = "Employee Management", description = "APIs for managing employee data")
public class EmployeeController {

    @Autowired
    private EmployeeService employeeService;

    @Autowired
    private EmployeeMapper employeeMapper;

    @Operation(summary = "Get all employees with pagination", 
               description = "Retrieve a paginated list of all employees with optional sorting")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved employees",
                     content = @Content(mediaType = "application/json", 
                                      schema = @Schema(implementation = Page.class)))
    })
    @GetMapping
    public ResponseEntity<Page<EmployeeDTO>> getAllEmployees(
            @Parameter(description = "Page number (0-indexed)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Number of items per page") @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "Sort by field") @RequestParam(defaultValue = "id") String sortBy,
            @Parameter(description = "Sort direction (asc/desc)") @RequestParam(defaultValue = "asc") String direction) {
        
        log.info("GET /api/employees - Fetching employees with pagination: page={}, size={}, sortBy={}, direction={}", 
                 page, size, sortBy, direction);
        
        Sort.Direction sortDirection = direction.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sortBy));
        
        Page<Employee> employeePage = employeeService.getAllEmployees(pageable);
        Page<EmployeeDTO> employeeDTOPage = employeePage.map(employeeMapper::toDTO);
        
        log.debug("Found {} employees on page {} of {}", 
                  employeeDTOPage.getNumberOfElements(), page, employeeDTOPage.getTotalPages());
        
        return ResponseEntity.ok(employeeDTOPage);
    }

    @Operation(summary = "Get employee by ID", description = "Retrieve a specific employee by their ID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Employee found",
                     content = @Content(mediaType = "application/json", 
                                      schema = @Schema(implementation = EmployeeDTO.class))),
        @ApiResponse(responseCode = "404", description = "Employee not found")
    })
    @GetMapping("/{id}")
    public ResponseEntity<EmployeeDTO> getEmployeeById(
            @Parameter(description = "Employee ID", required = true) @PathVariable Long id) {
        log.info("GET /api/employees/{} - Fetching employee by ID", id);
        Employee employee = employeeService.getEmployeeById(id);
        log.debug("Found employee: {}", employee.getEmail());
        return ResponseEntity.ok(employeeMapper.toDTO(employee));
    }

    @Operation(summary = "Get employee by email", description = "Retrieve a specific employee by their email address")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Employee found"),
        @ApiResponse(responseCode = "404", description = "Employee not found")
    })
    @GetMapping("/email/{email}")
    public ResponseEntity<EmployeeDTO> getEmployeeByEmail(
            @Parameter(description = "Employee email address", required = true) @PathVariable String email) {
        Employee employee = employeeService.getEmployeeByEmail(email);
        return ResponseEntity.ok(employeeMapper.toDTO(employee));
    }

    @Operation(summary = "Get employees by department", description = "Retrieve all employees in a specific department")
    @ApiResponse(responseCode = "200", description = "Successfully retrieved employees")
    @GetMapping("/department/{department}")
    public ResponseEntity<List<EmployeeDTO>> getEmployeesByDepartment(
            @Parameter(description = "Department name", required = true) @PathVariable String department) {
        List<Employee> employees = employeeService.getEmployeesByDepartment(department);
        return ResponseEntity.ok(employeeMapper.toDTOList(employees));
    }

    @Operation(summary = "Get employees by position", description = "Retrieve all employees with a specific position")
    @ApiResponse(responseCode = "200", description = "Successfully retrieved employees")
    @GetMapping("/position/{position}")
    public ResponseEntity<List<EmployeeDTO>> getEmployeesByPosition(
            @Parameter(description = "Position title", required = true) @PathVariable String position) {
        List<Employee> employees = employeeService.getEmployeesByPosition(position);
        return ResponseEntity.ok(employeeMapper.toDTOList(employees));
    }

    @Operation(summary = "Create a new employee", description = "Add a new employee to the system")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Employee created successfully",
                     content = @Content(mediaType = "application/json", 
                                      schema = @Schema(implementation = EmployeeDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "409", description = "Employee with this email already exists")
    })
    @PostMapping
    public ResponseEntity<EmployeeDTO> createEmployee(
            @Parameter(description = "Employee data", required = true) @Valid @RequestBody EmployeeCreateDTO createDTO) {
        log.info("POST /api/employees - Creating new employee with email: {}", createDTO.getEmail());
        Employee employee = employeeMapper.toEntity(createDTO);
        Employee createdEmployee = employeeService.createEmployee(employee);
        log.info("Successfully created employee with ID: {}", createdEmployee.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(employeeMapper.toDTO(createdEmployee));
    }

    @Operation(summary = "Update an employee", description = "Update an existing employee's information")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Employee updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "404", description = "Employee not found"),
        @ApiResponse(responseCode = "409", description = "Email already taken by another employee")
    })
    @PutMapping("/{id}")
    public ResponseEntity<EmployeeDTO> updateEmployee(
            @Parameter(description = "Employee ID", required = true) @PathVariable Long id, 
            @Parameter(description = "Updated employee data", required = true) @Valid @RequestBody EmployeeUpdateDTO updateDTO) {
        log.info("PUT /api/employees/{} - Updating employee", id);
        Employee employee = employeeService.getEmployeeById(id);
        employeeMapper.updateEntityFromDTO(updateDTO, employee);
        Employee updatedEmployee = employeeService.updateEmployee(id, employee);
        log.info("Successfully updated employee with ID: {}", id);
        return ResponseEntity.ok(employeeMapper.toDTO(updatedEmployee));
    }

    @Operation(summary = "Delete an employee", description = "Remove an employee from the system")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Employee deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Employee not found")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmployee(
            @Parameter(description = "Employee ID", required = true) @PathVariable Long id) {
        log.info("DELETE /api/employees/{} - Deleting employee", id);
        employeeService.deleteEmployee(id);
        log.info("Successfully deleted employee with ID: {}", id);
        return ResponseEntity.noContent().build();
    }
}
