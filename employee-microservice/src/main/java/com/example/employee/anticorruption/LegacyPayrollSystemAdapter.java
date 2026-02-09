package com.example.employee.anticorruption;

import com.example.employee.model.Employee;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Anti-Corruption Layer Adapter
 * 
 * Translates between our clean domain model (Employee) and
 * the legacy payroll system's data model (LegacyPayrollSystemDTO).
 * 
 * Benefits:
 * 1. Isolates domain model from external changes
 * 2. Allows independent evolution of both systems
 * 3. Makes integration code explicit and testable
 * 4. Prevents pollution of domain model with external concerns
 */
@Component
public class LegacyPayrollSystemAdapter {

    private static final DateTimeFormatter LEGACY_DATE_FORMAT = 
            DateTimeFormatter.ofPattern("dd-MM-yyyy");

    /**
     * Convert our Employee domain model to legacy system format
     */
    public LegacyPayrollSystemDTO toLegacyFormat(Employee employee) {
        return LegacyPayrollSystemDTO.builder()
                .empNo(String.valueOf(employee.getId()))
                .fName(employee.getFirstName())
                .lName(employee.getLastName())
                .emailAddr(employee.getEmail())
                .dept(translateDepartment(employee.getDepartment()))
                .pos(employee.getPosition())
                .monthlySal(employee.getSalary())
                .stat(translateStatus(employee.getStatus()))
                .hiredDate(employee.getHireDate().format(LEGACY_DATE_FORMAT))
                .payGrade(determinePayGrade(employee.getSalary()))
                .costCenter(determineCostCenter(employee.getDepartment()))
                .build();
    }

    /**
     * Convert legacy system format to our Employee domain model
     */
    public Employee fromLegacyFormat(LegacyPayrollSystemDTO legacyDTO) {
        Employee employee = new Employee();
        employee.setId(Long.parseLong(legacyDTO.getEmpNo()));
        employee.setFirstName(legacyDTO.getFName());
        employee.setLastName(legacyDTO.getLName());
        employee.setEmail(legacyDTO.getEmailAddr());
        employee.setDepartment(reverseDepartmentTranslation(legacyDTO.getDept()));
        employee.setPosition(legacyDTO.getPos());
        employee.setSalary(legacyDTO.getMonthlySal());
        employee.setStatus(reverseStatusTranslation(legacyDTO.getStat()));
        employee.setHireDate(LocalDate.parse(legacyDTO.getHiredDate(), LEGACY_DATE_FORMAT));
        return employee;
    }

    /**
     * Translate department names (our system uses full names)
     */
    private String translateDepartment(String department) {
        return switch (department) {
            case "Information Technology" -> "IT";
            case "Human Resources" -> "HR";
            case "Research and Development" -> "RND";
            case "Sales and Marketing" -> "SAL";
            default -> department;
        };
    }

    private String reverseDepartmentTranslation(String legacyDept) {
        return switch (legacyDept) {
            case "IT" -> "Information Technology";
            case "HR" -> "Human Resources";
            case "RND" -> "Research and Development";
            case "SAL" -> "Sales and Marketing";
            default -> legacyDept;
        };
    }

    /**
     * Translate status codes
     */
    private String translateStatus(String status) {
        return switch (status) {
            case "ACTIVE" -> "A";
            case "INACTIVE" -> "I";
            case "ON_LEAVE" -> "L";
            case "TERMINATED" -> "T";
            default -> "U";  // Unknown
        };
    }

    private String reverseStatusTranslation(String legacyStat) {
        return switch (legacyStat) {
            case "A" -> "ACTIVE";
            case "I" -> "INACTIVE";
            case "L" -> "ON_LEAVE";
            case "T" -> "TERMINATED";
            default -> "ACTIVE";
        };
    }

    /**
     * Business logic specific to legacy system
     */
    private String determinePayGrade(Double salary) {
        if (salary < 50000) return "G1";
        if (salary < 75000) return "G2";
        if (salary < 100000) return "G3";
        return "G4";
    }

    private String determineCostCenter(String department) {
        return switch (department) {
            case "Information Technology" -> "CC-1000";
            case "Human Resources" -> "CC-2000";
            case "Research and Development" -> "CC-3000";
            case "Sales and Marketing" -> "CC-4000";
            default -> "CC-9999";  // Default cost center
        };
    }
}
