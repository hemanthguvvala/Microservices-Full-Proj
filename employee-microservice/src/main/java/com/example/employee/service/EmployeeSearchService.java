package com.example.employee.service;

import com.example.employee.document.EmployeeSearchDocument;
import com.example.employee.model.Employee;
import com.example.employee.repository.elasticsearch.EmployeeSearchRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service for employee search using Elasticsearch
 */
@Slf4j
@Service
public class EmployeeSearchService {

    @Autowired
    private EmployeeSearchRepository searchRepository;

    public void indexEmployee(Employee employee) {
        try {
            EmployeeSearchDocument doc = EmployeeSearchDocument.builder()
                    .id(String.valueOf(employee.getId()))
                    .employeeId(employee.getId())
                    .firstName(employee.getFirstName())
                    .lastName(employee.getLastName())
                    .email(employee.getEmail())
                    .phoneNumber(employee.getPhoneNumber())
                    .department(employee.getDepartment())
                    .position(employee.getPosition())
                    .salary(employee.getSalary())
                    .hireDate(employee.getHireDate())
                    .status(employee.getStatus())
                    .build();
            
            searchRepository.save(doc);
            log.debug("Indexed employee in Elasticsearch: {}", employee.getId());
        } catch (Exception e) {
            log.error("Failed to index employee {}: {}", employee.getId(), e.getMessage());
        }
    }

    public List<EmployeeSearchDocument> searchByName(String searchTerm) {
        return searchRepository.findByFirstNameContainingOrLastNameContaining(
                searchTerm, searchTerm);
    }

    public List<EmployeeSearchDocument> searchByDepartment(String department) {
        return searchRepository.findByDepartment(department);
    }

    public List<EmployeeSearchDocument> searchByPosition(String position) {
        return searchRepository.findByPosition(position);
    }

    public List<EmployeeSearchDocument> searchBySkill(String skill) {
        return searchRepository.findBySkillsContaining(skill);
    }

    public List<EmployeeSearchDocument> searchBySalaryRange(Double minSalary, Double maxSalary) {
        return searchRepository.findBySalaryBetween(minSalary, maxSalary);
    }

    public void deleteFromIndex(Long employeeId) {
        try {
            searchRepository.deleteById(String.valueOf(employeeId));
            log.debug("Removed employee from Elasticsearch index: {}", employeeId);
        } catch (Exception e) {
            log.error("Failed to delete employee {} from index: {}", employeeId, e.getMessage());
        }
    }
}
