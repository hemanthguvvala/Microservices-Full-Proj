package com.example.employee.mapper;

import com.example.employee.dto.EmployeeCreateDTO;
import com.example.employee.dto.EmployeeDTO;
import com.example.employee.dto.EmployeeUpdateDTO;
import com.example.employee.model.Employee;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
/**
 * @deprecated Replaced by MapStruct-based {@link EmployeeMapper} interface.
 * Kept for reference to show interview comparison between manual vs MapStruct mapping.
 */
@Deprecated
public class EmployeeManualMapper {

    public EmployeeDTO toDTO(Employee employee) {
        if (employee == null) {
            return null;
        }
        
        EmployeeDTO dto = new EmployeeDTO();
        dto.setId(employee.getId());
        dto.setFirstName(employee.getFirstName());
        dto.setLastName(employee.getLastName());
        dto.setEmail(employee.getEmail());
        dto.setDepartment(employee.getDepartment());
        dto.setPosition(employee.getPosition());
        dto.setSalary(employee.getSalary());
        dto.setHireDate(employee.getHireDate());
        dto.setPhoneNumber(employee.getPhoneNumber());
        dto.setFullName(employee.getFirstName() + " " + employee.getLastName());
        
        return dto;
    }

    public List<EmployeeDTO> toDTOList(List<Employee> employees) {
        return employees.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public Employee toEntity(EmployeeCreateDTO createDTO) {
        if (createDTO == null) {
            return null;
        }
        
        Employee employee = new Employee();
        employee.setFirstName(createDTO.getFirstName());
        employee.setLastName(createDTO.getLastName());
        employee.setEmail(createDTO.getEmail());
        employee.setDepartment(createDTO.getDepartment());
        employee.setPosition(createDTO.getPosition());
        employee.setSalary(createDTO.getSalary());
        employee.setHireDate(createDTO.getHireDate());
        employee.setPhoneNumber(createDTO.getPhoneNumber());
        
        return employee;
    }

    public void updateEntityFromDTO(EmployeeUpdateDTO updateDTO, Employee employee) {
        if (updateDTO == null || employee == null) {
            return;
        }
        
        employee.setFirstName(updateDTO.getFirstName());
        employee.setLastName(updateDTO.getLastName());
        employee.setEmail(updateDTO.getEmail());
        employee.setDepartment(updateDTO.getDepartment());
        employee.setPosition(updateDTO.getPosition());
        employee.setSalary(updateDTO.getSalary());
        employee.setHireDate(updateDTO.getHireDate());
        employee.setPhoneNumber(updateDTO.getPhoneNumber());
    }
}
