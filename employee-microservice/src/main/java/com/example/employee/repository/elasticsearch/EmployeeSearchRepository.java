package com.example.employee.repository.elasticsearch;

import com.example.employee.document.EmployeeSearchDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Elasticsearch Repository for Employee Search
 */
@Repository
public interface EmployeeSearchRepository extends ElasticsearchRepository<EmployeeSearchDocument, String> {
    
    List<EmployeeSearchDocument> findByFirstNameContainingOrLastNameContaining(
            String firstName, String lastName);
    
    List<EmployeeSearchDocument> findByDepartment(String department);
    
    List<EmployeeSearchDocument> findByPosition(String position);
    
    List<EmployeeSearchDocument> findBySkillsContaining(String skill);
    
    List<EmployeeSearchDocument> findBySalaryBetween(Double minSalary, Double maxSalary);
}
