package com.example.employee.anticorruption;

import com.example.employee.model.Employee;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/**
 * Service for interacting with legacy payroll system
 * through the Anti-Corruption Layer
 */
@Slf4j
@Service
public class LegacyPayrollIntegrationService {

    @Autowired
    private LegacyPayrollSystemAdapter adapter;

    @Autowired
    private RestTemplate restTemplate;

    private static final String LEGACY_SYSTEM_URL = "http://legacy-payroll-system:8090/api";

    /**
     * Sync employee to legacy system
     */
    public void syncEmployeeToLegacySystem(Employee employee) {
        try {
            // Transform our domain model to legacy format using ACL
            LegacyPayrollSystemDTO legacyDTO = adapter.toLegacyFormat(employee);
            
            // Send to legacy system
            String url = LEGACY_SYSTEM_URL + "/employees";
            restTemplate.postForObject(url, legacyDTO, String.class);
            
            log.info("Successfully synced employee {} to legacy system", employee.getId());
        } catch (Exception e) {
            log.error("Failed to sync employee {} to legacy system", employee.getId(), e);
            throw new RuntimeException("Legacy system sync failed", e);
        }
    }

    /**
     * Fetch employee from legacy system
     */
    public Employee fetchEmployeeFromLegacySystem(String empNo) {
        try {
            String url = LEGACY_SYSTEM_URL + "/employees/" + empNo;
            LegacyPayrollSystemDTO legacyDTO = restTemplate.getForObject(url, LegacyPayrollSystemDTO.class);
            
            // Transform legacy format to our domain model using ACL
            Employee employee = adapter.fromLegacyFormat(legacyDTO);
            
            log.info("Successfully fetched employee {} from legacy system", empNo);
            return employee;
        } catch (Exception e) {
            log.error("Failed to fetch employee {} from legacy system", empNo, e);
            throw new RuntimeException("Legacy system fetch failed", e);
        }
    }
}
