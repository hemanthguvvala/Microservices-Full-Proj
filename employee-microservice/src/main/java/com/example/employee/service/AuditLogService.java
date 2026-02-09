package com.example.employee.service;

import com.example.employee.document.AuditLog;
import com.example.employee.repository.mongo.AuditLogRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Service for managing audit logs in MongoDB
 */
@Slf4j
@Service
public class AuditLogService {

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Async
    public void logOperation(String entityType, String entityId, String operation,
                            String performedBy, Map<String, Object> oldValues,
                            Map<String, Object> newValues, String status) {
        try {
            AuditLog auditLog = AuditLog.builder()
                    .entityType(entityType)
                    .entityId(entityId)
                    .operation(operation)
                    .performedBy(performedBy)
                    .timestamp(LocalDateTime.now())
                    .oldValues(oldValues)
                    .newValues(newValues)
                    .status(status)
                    .build();
            
            auditLogRepository.save(auditLog);
            log.debug("Audit log created: {} {} by {}", operation, entityType, performedBy);
        } catch (Exception e) {
            log.error("Failed to create audit log: {}", e.getMessage(), e);
        }
    }

    public List<AuditLog> getAuditLogsForEntity(String entityType, String entityId) {
        return auditLogRepository.findByEntityTypeAndEntityId(entityType, entityId);
    }

    public List<AuditLog> getAuditLogsByUser(String username) {
        return auditLogRepository.findByPerformedBy(username);
    }

    public List<AuditLog> getAuditLogsByDateRange(LocalDateTime start, LocalDateTime end) {
        return auditLogRepository.findByTimestampBetween(start, end);
    }

    public long countOperations(String entityType, String operation) {
        return auditLogRepository.countByEntityTypeAndOperation(entityType, operation);
    }
}
