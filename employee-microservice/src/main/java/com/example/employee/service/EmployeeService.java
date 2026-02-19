package com.example.employee.service;

import com.example.employee.event.EmployeeEvent;
import com.example.employee.exception.DuplicateResourceException;
import com.example.employee.exception.ResourceNotFoundException;
import com.example.employee.metrics.MetricsService;
import com.example.employee.model.Employee;
import com.example.employee.outbox.OutboxEvent;
import com.example.employee.outbox.OutboxEventRepository;
import com.example.employee.repository.EmployeeRepository;
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.github.resilience4j.retry.annotation.Retry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@Transactional
public class EmployeeService {

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private KafkaProducerService kafkaProducerService;

    @Autowired
    private MetricsService metricsService;

    @Autowired
    private OutboxEventRepository outboxRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = "employees", key = "#pageable.pageNumber + '-' + #pageable.pageSize + '-' + #pageable.sort.toString()")
    @CircuitBreaker(name = "employeeService", fallbackMethod = "getAllEmployeesFallback")
    @RateLimiter(name = "employeeService")
    @Bulkhead(name = "employeeService")
    public Page<Employee> getAllEmployees(Pageable pageable) {
        Timer.Sample sample = metricsService.startTimer();
        log.debug("Service: Fetching employees with pagination - page: {}, size: {}",
                pageable.getPageNumber(), pageable.getPageSize());
        Page<Employee> employeePage = employeeRepository.findAll(pageable);
        log.debug("Service: Retrieved {} employees on page {} of {}",
                employeePage.getNumberOfElements(),
                employeePage.getNumber(),
                employeePage.getTotalPages());
        metricsService.recordEmployeeRetrieved();
        metricsService.recordTimer(sample, "getAllEmployees");
        return employeePage;
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "employeesList")
    @CircuitBreaker(name = "employeeService", fallbackMethod = "getAllEmployeesListFallback")
    @RateLimiter(name = "employeeService")
    @Bulkhead(name = "employeeService")
    public List<Employee> getAllEmployees() {
        Timer.Sample sample = metricsService.startTimer();
        log.debug("Service: Fetching all employees from database");
        List<Employee> employees = employeeRepository.findAll();
        log.debug("Service: Retrieved {} employees", employees.size());
        metricsService.recordEmployeeRetrieved();
        metricsService.recordTimer(sample, "getAllEmployeesList");
        return employees;
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "employee", key = "#id")
    @CircuitBreaker(name = "employeeService", fallbackMethod = "getEmployeeByIdFallback")
    @Retry(name = "employeeService")
    @RateLimiter(name = "employeeService")
    public Employee getEmployeeById(Long id) {
        Timer.Sample sample = metricsService.startTimer();
        log.debug("Service: Fetching employee by ID: {}", id);
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Service: Employee not found with ID: {}", id);
                    metricsService.recordEmployeeNotFound();
                    return new ResourceNotFoundException("Employee", "id", id);
                });
        metricsService.recordEmployeeRetrieved();
        metricsService.recordTimer(sample, "getEmployeeById");
        return employee;
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "employeeByEmail", key = "#email")
    public Employee getEmployeeByEmail(String email) {
        return employeeRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "email", email));
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "employeesByDepartment", key = "#department")
    public List<Employee> getEmployeesByDepartment(String department) {
        return employeeRepository.findByDepartment(department);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "employeesByPosition", key = "#position")
    public List<Employee> getEmployeesByPosition(String position) {
        return employeeRepository.findByPosition(position);
    }

    @CacheEvict(value = { "employees", "employeesList", "employeesByDepartment",
            "employeesByPosition" }, allEntries = true)
    @CircuitBreaker(name = "employeeService", fallbackMethod = "createEmployeeFallback")
    @Retry(name = "employeeService")
    @RateLimiter(name = "employeeService")
    public Employee createEmployee(Employee employee) {
        Timer.Sample sample = metricsService.startTimer();
        log.debug("Service: Creating new employee with email: {}", employee.getEmail());
        if (employeeRepository.existsByEmail(employee.getEmail())) {
            log.warn("Service: Employee with email {} already exists", employee.getEmail());
            metricsService.recordValidationError();
            throw new DuplicateResourceException("Employee", "email", employee.getEmail());
        }
        Employee savedEmployee = employeeRepository.save(employee);
        log.info("Service: Successfully created employee with ID: {}", savedEmployee.getId());

        // Publish Kafka event
        publishEvent(EmployeeEvent.EventType.CREATED, savedEmployee);

        metricsService.recordEmployeeCreated();
        metricsService.recordTimer(sample, "createEmployee");
        return savedEmployee;
    }

    @CacheEvict(value = { "employee", "employees", "employeesList", "employeeByEmail", "employeesByDepartment",
            "employeesByPosition" }, allEntries = true)
    @CircuitBreaker(name = "employeeService", fallbackMethod = "updateEmployeeFallback")
    @Retry(name = "employeeService")
    @RateLimiter(name = "employeeService")
    public Employee updateEmployee(Long id, Employee employeeDetails) {
        Timer.Sample sample = metricsService.startTimer();
        log.debug("Service: Updating employee with ID: {}", id);
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Service: Employee not found with ID: {}", id);
                    metricsService.recordEmployeeNotFound();
                    return new ResourceNotFoundException("Employee", "id", id);
                });

        // Check if email is being changed and if it's already taken by another employee
        if (!employee.getEmail().equals(employeeDetails.getEmail()) &&
                employeeRepository.existsByEmail(employeeDetails.getEmail())) {
            log.warn("Service: Email {} is already taken by another employee", employeeDetails.getEmail());
            metricsService.recordValidationError();
            throw new DuplicateResourceException("Employee", "email", employeeDetails.getEmail());
        }

        employee.setFirstName(employeeDetails.getFirstName());
        employee.setLastName(employeeDetails.getLastName());
        employee.setEmail(employeeDetails.getEmail());
        employee.setDepartment(employeeDetails.getDepartment());
        employee.setPosition(employeeDetails.getPosition());
        employee.setSalary(employeeDetails.getSalary());
        employee.setHireDate(employeeDetails.getHireDate());
        employee.setPhoneNumber(employeeDetails.getPhoneNumber());

        Employee updatedEmployee = employeeRepository.save(employee);
        log.info("Service: Successfully updated employee with ID: {}", id);

        // Publish Kafka event
        publishEvent(EmployeeEvent.EventType.UPDATED, updatedEmployee);

        metricsService.recordEmployeeUpdated();
        metricsService.recordTimer(sample, "updateEmployee");

        return updatedEmployee;
    }

    @CacheEvict(value = { "employee", "employees", "employeesList", "employeeByEmail", "employeesByDepartment",
            "employeesByPosition" }, allEntries = true)
    @CircuitBreaker(name = "employeeService", fallbackMethod = "deleteEmployeeFallback")
    @Retry(name = "employeeService")
    @RateLimiter(name = "employeeService")
    public void deleteEmployee(Long id) {
        Timer.Sample sample = metricsService.startTimer();
        log.debug("Service: Deleting employee with ID: {}", id);
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Service: Employee not found with ID: {}", id);
                    metricsService.recordEmployeeNotFound();
                    return new ResourceNotFoundException("Employee", "id", id);
                });

        employeeRepository.deleteById(id);
        log.info("Service: Successfully deleted employee with ID: {}", id);

        // Publish Kafka event
        publishEvent(EmployeeEvent.EventType.DELETED, employee);

        metricsService.recordEmployeeDeleted();
        metricsService.recordTimer(sample, "deleteEmployee");
    }

    /**
     * Publish employee event via Transactional Outbox Pattern.
     *
     * Interview: "Why not publish directly to Kafka?"
     * → "Direct publish is a dual-write: DB commit + Kafka send are two separate
     * operations. If Kafka fails after DB commit, the event is lost forever.
     * The Outbox pattern writes the event to the DB in the SAME transaction,
     * guaranteeing atomicity. A separate poller publishes to Kafka."
     */
    private void publishEvent(EmployeeEvent.EventType eventType, Employee employee) {
        try {
            String performedBy = getCurrentUsername();
            EmployeeEvent event = new EmployeeEvent(eventType, employee, performedBy);

            // Write to outbox table in the SAME transaction (no dual-write!)
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateType("Employee")
                    .aggregateId(String.valueOf(employee.getId()))
                    .eventType(eventType.name())
                    .topic("employee-events")
                    .payload(new com.fasterxml.jackson.databind.ObjectMapper()
                            .writeValueAsString(event))
                    .build();
            outboxRepository.save(outboxEvent);

            log.debug("Outbox: Stored {} event for employee ID: {}", eventType, employee.getId());
        } catch (Exception e) {
            log.error("Failed to store {} event for employee ID: {}: {}",
                    eventType, employee.getId(), e.getMessage());
        }
    }

    /**
     * Get current authenticated username
     */
    private String getCurrentUsername() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()) {
                return authentication.getName();
            }
        } catch (Exception e) {
            log.warn("Unable to get current username: {}", e.getMessage());
        }
        return "system";
    }

    // ========== Fallback Methods for Circuit Breaker ==========

    /**
     * Fallback method when getAllEmployees with pagination fails
     */
    private Page<Employee> getAllEmployeesFallback(Pageable pageable, Throwable throwable) {
        log.error("Circuit breaker activated for getAllEmployees (pageable). Reason: {}", throwable.getMessage());
        return Page.empty(pageable);
    }

    /**
     * Fallback method when getAllEmployees list fails
     */
    private List<Employee> getAllEmployeesListFallback(Throwable throwable) {
        log.error("Circuit breaker activated for getAllEmployeesList. Reason: {}", throwable.getMessage());
        return List.of();
    }

    /**
     * Fallback method when getEmployeeById fails
     */
    private Employee getEmployeeByIdFallback(Long id, Throwable throwable) {
        log.error("Circuit breaker activated for getEmployeeById (id: {}). Reason: {}", id, throwable.getMessage());
        throw new ResourceNotFoundException("Employee", "id", id);
    }

    /**
     * Fallback method when createEmployee fails
     */
    private Employee createEmployeeFallback(Employee employee, Throwable throwable) {
        log.error("Circuit breaker activated for createEmployee. Reason: {}", throwable.getMessage());
        throw new RuntimeException("Service temporarily unavailable. Please try again later.");
    }

    /**
     * Fallback method when updateEmployee fails
     */
    private Employee updateEmployeeFallback(Long id, Employee employeeDetails, Throwable throwable) {
        log.error("Circuit breaker activated for updateEmployee (id: {}). Reason: {}", id, throwable.getMessage());
        throw new RuntimeException("Service temporarily unavailable. Please try again later.");
    }

    /**
     * Fallback method when deleteEmployee fails
     */
    private void deleteEmployeeFallback(Long id, Throwable throwable) {
        log.error("Circuit breaker activated for deleteEmployee (id: {}). Reason: {}", id, throwable.getMessage());
        throw new RuntimeException("Service temporarily unavailable. Please try again later.");
    }
}
