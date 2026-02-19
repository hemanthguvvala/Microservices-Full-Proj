package com.example.analytics.repository;

import com.example.analytics.model.EmployeeAnalyticsEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public interface AnalyticsEventRepository extends JpaRepository<EmployeeAnalyticsEvent, Long> {

    List<EmployeeAnalyticsEvent> findByEmployeeIdAndTenantId(String employeeId, String tenantId);

    List<EmployeeAnalyticsEvent> findByEmployeeIdAndTenantIdAndEventTimestampMsBetween(
            String employeeId, String tenantId, long fromMs, long toMs);

    // Aggregate queries — used for the AnalyticsResponse build
    @Query("SELECT COUNT(e) FROM EmployeeAnalyticsEvent e WHERE e.tenantId = :tenantId" +
           " AND (:dept = '' OR e.department = :dept)" +
           " AND e.eventType = :eventType" +
           " AND e.eventTimestampMs BETWEEN :from AND :to")
    long countByTenantAndTypeAndPeriod(
            @Param("tenantId") String tenantId,
            @Param("dept") String dept,
            @Param("eventType") String eventType,
            @Param("from") long from,
            @Param("to") long to);

    @Query("SELECT e.department, COUNT(e) FROM EmployeeAnalyticsEvent e" +
           " WHERE e.tenantId = :tenantId" +
           " AND e.eventTimestampMs BETWEEN :from AND :to" +
           " GROUP BY e.department")
    List<Object[]> countEventsByDepartment(
            @Param("tenantId") String tenantId,
            @Param("from") long from,
            @Param("to") long to);

    @Query("SELECT e.eventType, COUNT(e) FROM EmployeeAnalyticsEvent e" +
           " WHERE e.tenantId = :tenantId" +
           " AND e.eventTimestampMs BETWEEN :from AND :to" +
           " GROUP BY e.eventType")
    List<Object[]> countEventsByType(
            @Param("tenantId") String tenantId,
            @Param("from") long from,
            @Param("to") long to);

    @Query("SELECT e.department, COUNT(DISTINCT e.employeeId) FROM EmployeeAnalyticsEvent e" +
           " WHERE e.tenantId = :tenantId" +
           " AND e.eventType = 'EMPLOYEE_CREATED'" +
           " GROUP BY e.department")
    List<Object[]> getCurrentHeadcountByDepartment(@Param("tenantId") String tenantId);
}
