package com.example.employee.anticorruption;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Anti-Corruption Layer (ACL) Pattern
 * 
 * Purpose: Protect your domain model from external system changes.
 * Translates between your clean domain model and external/legacy system models.
 * 
 * Example: Legacy Payroll System Integration
 * The legacy system has a different data model and naming conventions.
 * This ACL translates between our Employee model and their format.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LegacyPayrollSystemDTO {
    
    // Legacy system uses different field names and structure
    private String empNo;              // Instead of employeeId
    private String fName;              // Instead of firstName
    private String lName;              // Instead of lastName
    private String emailAddr;          // Instead of email
    private String dept;               // Instead of department
    private String pos;                // Instead of position
    private Double monthlySal;         // Instead of salary
    private String stat;               // Instead of status
    private String hiredDate;          // Instead of hireDate (String format)
    
    // Legacy system specific fields
    private String payGrade;
    private String costCenter;
}
