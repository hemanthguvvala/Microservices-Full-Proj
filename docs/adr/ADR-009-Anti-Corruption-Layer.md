# ADR-009: Anti-Corruption Layer for Legacy System Integration

**Date**: 2026-02-07  
**Status**: Accepted  
**Deciders**: Architecture Team

## Context

We need to integrate with a legacy payroll system that has:
- Different data model (different field names)
- Different date formats
- Different status codes
- Legacy business rules we don't want in our domain

We want to protect our clean domain model from being polluted by legacy system concerns.

## Decision

Implement an **Anti-Corruption Layer (ACL)** that translates between our domain model and the legacy system.

```
Our Domain ← ACL Adapter ← Legacy System
```

The ACL is responsible for all translation logic.

## Alternatives Considered

### 1. Direct Integration (No ACL)
**Pros**: Simple, less code  
**Cons**: Pollutes domain model, tight coupling, hard to change

### 2. Legacy System Fields in Domain Model
**Pros**: No translation needed  
**Cons**: Domain model becomes messy, violates clean architecture

### 3. Shared Kernel
**Pros**: Both systems use same model  
**Cons**: Impossible with legacy system we can't change

## Consequences

### Positive
- **Domain Protection**: Clean domain model isolated from legacy concerns
- **Independent Evolution**: Both systems can change independently
- **Explicit Translation**: All mapping logic in one place
- **Testable**: Easy to unit test translation logic
- **Strangler Pattern**: Can gradually replace legacy system

### Negative
- **Additional Layer**: More code to maintain
- **Mapping Overhead**: CPU/memory for translation
- **Complexity**: Developers need to understand ACL concept

## Implementation

### Our Clean Domain Model
```java
public class Employee {
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String department;  // "Information Technology"
    private String position;
    private Double salary;
    private String status;      // "ACTIVE", "INACTIVE", etc.
    private LocalDate hireDate;
}
```

### Legacy System Model
```java
public class LegacyPayrollSystemDTO {
    private String empNo;       // Instead of id
    private String fName;       // Instead of firstName
    private String lName;      
    private String emailAddr;
    private String dept;        // "IT" instead of "Information Technology"
    private String pos;
    private Double monthlySal;
    private String stat;        // "A", "I", "T" codes
    private String hiredDate;   // "dd-MM-yyyy" format
    private String payGrade;    // Legacy-specific field
}
```

### ACL Adapter
```java
@Component
public class LegacyPayrollSystemAdapter {
    
    public LegacyPayrollSystemDTO toLegacyFormat(Employee employee) {
        return LegacyPayrollSystemDTO.builder()
            .empNo(employee.getId().toString())
            .fName(employee.getFirstName())
            .dept(translateDepartment(employee.getDepartment()))
            .stat(translateStatus(employee.getStatus()))
            // ... more translations
            .build();
    }
    
    private String translateDepartment(String dept) {
        return switch(dept) {
            case "Information Technology" -> "IT";
            case "Human Resources" -> "HR";
            default -> dept;
        };
    }
    
    private String translateStatus(String status) {
        return switch(status) {
            case "ACTIVE" -> "A";
            case "INACTIVE" -> "I";
            default -> "U";
        };
    }
}
```

### Usage
```java
@Service
public class LegacyIntegrationService {
    
    @Autowired
    private LegacyPayrollSystemAdapter adapter;
    
    public void syncToLegacy(Employee employee) {
        // Translate using ACL
        LegacyPayrollSystemDTO dto = adapter.toLegacyFormat(employee);
        
        // Call legacy system
        legacyClient.updateEmployee(dto);
    }
}
```

## Translation Rules

### Department Mapping
| Our System | Legacy System |
|-----------|---------------|
| Information Technology | IT |
| Human Resources | HR |
| Research and Development | RND |
| Sales and Marketing | SAL |

### Status Mapping
| Our System | Legacy System |
|-----------|---------------|
| ACTIVE | A |
| INACTIVE | I |
| ON_LEAVE | L |
| TERMINATED | T |

### Date Format
- **Our System**: ISO 8601 (LocalDate)
- **Legacy**: "dd-MM-yyyy" String

## Strangler Fig Pattern

The ACL enables gradual migration from legacy system:

**Phase 1**: Both systems running
```
Create Employee → Save in both systems via ACL
```

**Phase 2**: Gradual feature migration
```
New features → Only new system
Old features → Still use legacy via ACL
```

**Phase 3**: Complete migration
```
All features → New system
Legacy system → Decommissioned
```

## Testing Strategy

### Unit Tests
```java
@Test
public void shouldTranslateDomainToLegacy() {
    Employee employee = createTestEmployee();
    LegacyPayrollSystemDTO dto = adapter.toLegacyFormat(employee);
    
    assertEquals("IT", dto.getDept());
    assertEquals("A", dto.getStat());
    assertEquals("01-01-2024", dto.getHiredDate());
}
```

### Integration Tests
```java
@Test
public void shouldSyncToLegacySystem() {
    // Mock legacy system
    mockLegacyServer.expect(requestTo("/api/employees"))
        .andExpect(method(POST))
        .andRespond(withSuccess());
    
    service.syncToLegacy(employee);
    
    mockLegacyServer.verify();
}
```

## Related Decisions

- ADR-010: Strangler Fig Pattern for Legacy Migration
- ADR-003: Database Per Service
