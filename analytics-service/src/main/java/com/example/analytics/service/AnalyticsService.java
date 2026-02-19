package com.example.analytics.service;

import com.example.analytics.grpc.AnalyticsResponse;
import com.example.analytics.grpc.BatchEventAck;
import com.example.analytics.grpc.DepartmentHeadcountResponse;
import com.example.analytics.model.EmployeeAnalyticsEvent;
import com.example.analytics.repository.AnalyticsEventRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Core analytics business logic.
 * Called both by gRPC service and Kafka consumer.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final AnalyticsEventRepository repository;
    private final ObjectMapper objectMapper;

    @Transactional
    public String recordEvent(String employeeId,
                               String tenantId,
                               String eventType,
                               String department,
                               String performedBy,
                               long eventTimestampMs,
                               Map<String, String> metadata,
                               String correlationId) {
        try {
            String metaJson = metadata != null ? objectMapper.writeValueAsString(metadata) : "{}";

            EmployeeAnalyticsEvent event = EmployeeAnalyticsEvent.builder()
                    .employeeId(employeeId)
                    .tenantId(tenantId)
                    .eventType(eventType)
                    .department(department)
                    .performedBy(performedBy)
                    .eventTimestampMs(eventTimestampMs == 0 ? System.currentTimeMillis() : eventTimestampMs)
                    .correlationId(correlationId)
                    .metadataJson(metaJson)
                    .source("GRPC")
                    .build();

            EmployeeAnalyticsEvent saved = repository.save(event);
            return saved.getId().toString();

        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize metadata", e);
        }
    }

    @Transactional
    public String recordEventFromKafka(String employeeId, String tenantId,
                                        String eventType, String department,
                                        String performedBy, String correlationId) {
        EmployeeAnalyticsEvent event = EmployeeAnalyticsEvent.builder()
                .employeeId(employeeId)
                .tenantId(tenantId)
                .eventType(eventType)
                .department(department)
                .performedBy(performedBy)
                .eventTimestampMs(System.currentTimeMillis())
                .correlationId(correlationId)
                .metadataJson("{}")
                .source("KAFKA")
                .build();
        return repository.save(event).getId().toString();
    }

    @Transactional(readOnly = true)
    public List<EmployeeAnalyticsEvent> getEvents(String employeeId, String tenantId,
                                                    long fromMs, long toMs) {
        if (fromMs == 0 && toMs == 0) {
            return repository.findByEmployeeIdAndTenantId(employeeId, tenantId);
        }
        long effectiveTo = toMs == 0 ? System.currentTimeMillis() : toMs;
        return repository.findByEmployeeIdAndTenantIdAndEventTimestampMsBetween(
                employeeId, tenantId, fromMs, effectiveTo);
    }

    @Transactional(readOnly = true)
    public AnalyticsResponse buildAnalyticsResponse(String tenantId, long from, long to, String department) {
        long now = System.currentTimeMillis();
        long effectiveFrom = from == 0 ? 0 : from;
        long effectiveTo = to == 0 ? now : to;
        String dept = department == null ? "" : department;

        long newHires    = repository.countByTenantAndTypeAndPeriod(tenantId, dept, "EMPLOYEE_CREATED", effectiveFrom, effectiveTo);
        long promotions  = repository.countByTenantAndTypeAndPeriod(tenantId, dept, "EMPLOYEE_PROMOTED", effectiveFrom, effectiveTo);
        long departures  = repository.countByTenantAndTypeAndPeriod(tenantId, dept, "EMPLOYEE_DELETED", effectiveFrom, effectiveTo);
        long transfers   = repository.countByTenantAndTypeAndPeriod(tenantId, dept, "EMPLOYEE_DEPARTMENT_TRANSFERRED", effectiveFrom, effectiveTo);

        AnalyticsResponse.Builder builder = AnalyticsResponse.newBuilder()
                .setNewHires((int) newHires)
                .setPromotions((int) promotions)
                .setDepartures((int) departures)
                .setTransfers((int) transfers);

        // Add department breakdown
        repository.countEventsByDepartment(tenantId, effectiveFrom, effectiveTo).forEach(row -> {
            String deptName = (String) row[0];
            long count = (long) row[1];
            if (deptName != null) {
                builder.putEventsByDepartment(deptName, (int) count);
            }
        });

        // Add event type breakdown
        repository.countEventsByType(tenantId, effectiveFrom, effectiveTo).forEach(row -> {
            String type = (String) row[0];
            long count = (long) row[1];
            if (type != null) {
                builder.putEventsByType(type, (int) count);
            }
        });

        return builder.build();
    }

    @Transactional(readOnly = true)
    public DepartmentHeadcountResponse getDepartmentHeadcount(String tenantId, String department) {
        DepartmentHeadcountResponse.Builder builder = DepartmentHeadcountResponse.newBuilder()
                .setAsOfTimestampMs(System.currentTimeMillis());

        List<Object[]> rows = repository.getCurrentHeadcountByDepartment(tenantId);
        int total = 0;
        for (Object[] row : rows) {
            String dept = (String) row[0];
            long count = (long) row[1];
            if (dept != null && (department.isBlank() || department.equals(dept))) {
                builder.putHeadcountByDepartment(dept, (int) count);
                total += (int) count;
            }
        }
        builder.setTotal(total);
        return builder.build();
    }
}
