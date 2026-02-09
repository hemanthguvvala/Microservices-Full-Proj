package com.example.employee.controller;

import com.example.employee.document.AuditLog;
import com.example.employee.document.EmployeeSearchDocument;
import com.example.employee.service.AuditLogService;
import com.example.employee.service.EmployeeSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Controller for search and analytics operations
 */
@Slf4j
@RestController
@RequestMapping("/api/search")
@Tag(name = "Search & Analytics", description = "Employee search and audit log APIs")
public class SearchController {

    @Autowired
    private EmployeeSearchService searchService;

    @Autowired
    private AuditLogService auditLogService;

    @Operation(summary = "Search employees by name")
    @GetMapping("/employees/name")
    public ResponseEntity<List<EmployeeSearchDocument>> searchByName(
            @RequestParam String query) {
        log.info("Searching employees by name: {}", query);
        List<EmployeeSearchDocument> results = searchService.searchByName(query);
        return ResponseEntity.ok(results);
    }

    @Operation(summary = "Search employees by department")
    @GetMapping("/employees/department/{department}")
    public ResponseEntity<List<EmployeeSearchDocument>> searchByDepartment(
            @PathVariable String department) {
        log.info("Searching employees by department: {}", department);
        List<EmployeeSearchDocument> results = searchService.searchByDepartment(department);
        return ResponseEntity.ok(results);
    }

    @Operation(summary = "Search employees by position")
    @GetMapping("/employees/position/{position}")
    public ResponseEntity<List<EmployeeSearchDocument>> searchByPosition(
            @PathVariable String position) {
        log.info("Searching employees by position: {}", position);
        List<EmployeeSearchDocument> results = searchService.searchByPosition(position);
        return ResponseEntity.ok(results);
    }

    @Operation(summary = "Search employees by skill")
    @GetMapping("/employees/skill/{skill}")
    public ResponseEntity<List<EmployeeSearchDocument>> searchBySkill(
            @PathVariable String skill) {
        log.info("Searching employees by skill: {}", skill);
        List<EmployeeSearchDocument> results = searchService.searchBySkill(skill);
        return ResponseEntity.ok(results);
    }

    @Operation(summary = "Search employees by salary range")
    @GetMapping("/employees/salary")
    public ResponseEntity<List<EmployeeSearchDocument>> searchBySalaryRange(
            @RequestParam Double minSalary,
            @RequestParam Double maxSalary) {
        log.info("Searching employees with salary between {} and {}", minSalary, maxSalary);
        List<EmployeeSearchDocument> results = searchService.searchBySalaryRange(minSalary, maxSalary);
        return ResponseEntity.ok(results);
    }

    @Operation(summary = "Get audit logs for an entity")
    @GetMapping("/audit/{entityType}/{entityId}")
    public ResponseEntity<List<AuditLog>> getAuditLogs(
            @PathVariable String entityType,
            @PathVariable String entityId) {
        log.info("Fetching audit logs for {} with ID: {}", entityType, entityId);
        List<AuditLog> logs = auditLogService.getAuditLogsForEntity(entityType, entityId);
        return ResponseEntity.ok(logs);
    }

    @Operation(summary = "Get audit logs by user")
    @GetMapping("/audit/user/{username}")
    public ResponseEntity<List<AuditLog>> getAuditLogsByUser(
            @PathVariable String username) {
        log.info("Fetching audit logs for user: {}", username);
        List<AuditLog> logs = auditLogService.getAuditLogsByUser(username);
        return ResponseEntity.ok(logs);
    }

    @Operation(summary = "Get audit logs by date range")
    @GetMapping("/audit/daterange")
    public ResponseEntity<List<AuditLog>> getAuditLogsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        log.info("Fetching audit logs between {} and {}", start, end);
        List<AuditLog> logs = auditLogService.getAuditLogsByDateRange(start, end);
        return ResponseEntity.ok(logs);
    }

    @Operation(summary = "Get operation count")
    @GetMapping("/audit/count")
    public ResponseEntity<Long> getOperationCount(
            @RequestParam String entityType,
            @RequestParam String operation) {
        log.info("Counting {} operations for {}", operation, entityType);
        long count = auditLogService.countOperations(entityType, operation);
        return ResponseEntity.ok(count);
    }
}
