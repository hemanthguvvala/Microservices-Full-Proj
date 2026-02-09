package com.example.employee.repository.mongo;

import com.example.employee.document.AuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * MongoDB Repository for Audit Logs
 */
@Repository
public interface AuditLogRepository extends MongoRepository<AuditLog, String> {
    
    List<AuditLog> findByEntityTypeAndEntityId(String entityType, String entityId);
    
    List<AuditLog> findByPerformedBy(String performedBy);
    
    List<AuditLog> findByTimestampBetween(LocalDateTime start, LocalDateTime end);
    
    List<AuditLog> findByEntityTypeAndOperation(String entityType, String operation);
    
    List<AuditLog> findByStatus(String status);
    
    long countByEntityTypeAndOperation(String entityType, String operation);
}
