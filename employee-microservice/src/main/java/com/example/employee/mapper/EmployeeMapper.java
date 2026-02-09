package com.example.employee.mapper;

import com.example.employee.dto.EmployeeCreateDTO;
import com.example.employee.dto.EmployeeDTO;
import com.example.employee.dto.EmployeeUpdateDTO;
import com.example.employee.model.Employee;
import org.mapstruct.*;

import java.util.List;

/**
 * MapStruct Mapper — Compile-time type-safe bean mapping.
 * 
 * Interview Insight: "Why use MapStruct instead of manual mapping?"
 * 
 * MapStruct advantages over manual mapping:
 *   1. Compile-time code generation — errors caught at build time, not runtime
 *   2. Zero reflection overhead — generates plain setter/getter code
 *   3. Null-safe by default (nullValueCheckStrategy)
 *   4. Automatic type conversion (String↔Enum, Date↔String, etc.)
 *   5. @MappingTarget for partial updates without creating new objects
 *   6. Nested object mapping support
 *   7. Expression-based mappings for computed fields
 *   8. Integration with Spring (componentModel = "spring" → @Component bean)
 * 
 * MapStruct vs ModelMapper/Dozer:
 *   - MapStruct: compile-time, fastest, type-safe
 *   - ModelMapper: runtime reflection, slower, configuration-based
 *   - Dozer: runtime, XML config, legacy
 * 
 * Generated implementation is in target/generated-sources/annotations/
 * 
 * @see EmployeeManualMapper for comparison with manual approach
 */
@Mapper(
    componentModel = "spring",
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
    nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS,
    unmappedTargetPolicy = ReportingPolicy.WARN
)
public interface EmployeeMapper {

    /**
     * Maps Employee entity → EmployeeDTO.
     * The @Mapping for fullName uses an expression to compute the value.
     */
    @Mapping(target = "fullName", expression = "java(employee.getFirstName() + \" \" + employee.getLastName())")
    EmployeeDTO toDTO(Employee employee);

    /**
     * Maps a List of Employee entities → List of EmployeeDTOs.
     * MapStruct auto-generates the iteration code.
     */
    List<EmployeeDTO> toDTOList(List<Employee> employees);

    /**
     * Maps EmployeeCreateDTO → Employee entity.
     * Ignores auto-generated fields: id, createdDate, lastModifiedDate, etc.
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdDate", ignore = true)
    @Mapping(target = "lastModifiedDate", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    Employee toEntity(EmployeeCreateDTO createDTO);

    /**
     * Partial update — updates existing Employee from EmployeeUpdateDTO.
     * 
     * @MappingTarget tells MapStruct to update the existing object
     * instead of creating a new one. Combined with IGNORE null strategy,
     * only non-null fields in the DTO will overwrite entity fields.
     * 
     * This is the MapStruct equivalent of the manual updateEntityFromDTO().
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdDate", ignore = true)
    @Mapping(target = "lastModifiedDate", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    void updateEntityFromDTO(EmployeeUpdateDTO updateDTO, @MappingTarget Employee employee);
}
