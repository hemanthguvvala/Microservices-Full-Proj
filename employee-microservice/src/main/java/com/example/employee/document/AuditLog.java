package com.example.employee.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Audit Log Document stored in MongoDB
 * Tracks all operations performed on the system
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "audit_logs")
public class AuditLog {

    @Id
    private String id;
    
    private String entityType;        // Employee, User, etc.
    private String entityId;          // ID of the entity
    private String operation;         // CREATE, UPDATE, DELETE, READ
    private String performedBy;       // Username who performed the action
    private LocalDateTime timestamp;
    private String ipAddress;
    private String userAgent;
    private Map<String, Object> oldValues;  // Before state
    private Map<String, Object> newValues;  // After state
    private String status;            // SUCCESS, FAILURE
    private String errorMessage;      // If operation failed
}
