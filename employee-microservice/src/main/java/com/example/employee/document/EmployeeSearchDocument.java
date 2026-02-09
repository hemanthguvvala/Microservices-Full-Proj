package com.example.employee.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

import java.time.LocalDate;

/**
 * Employee Document for Elasticsearch
 * Enables full-text search and analytics on employee data
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(indexName = "employees")
public class EmployeeSearchDocument {

    @Id
    private String id;
    
    @Field(type = FieldType.Long)
    private Long employeeId;
    
    @Field(type = FieldType.Text, analyzer = "standard")
    private String firstName;
    
    @Field(type = FieldType.Text, analyzer = "standard")
    private String lastName;
    
    @Field(type = FieldType.Keyword)
    private String email;
    
    @Field(type = FieldType.Text)
    private String phoneNumber;
    
    @Field(type = FieldType.Text, analyzer = "standard")
    private String department;
    
    @Field(type = FieldType.Text, analyzer = "standard")
    private String position;
    
    @Field(type = FieldType.Double)
    private Double salary;
    
    @Field(type = FieldType.Date)
    private LocalDate hireDate;
    
    @Field(type = FieldType.Keyword)
    private String status;
    
    @Field(type = FieldType.Text)
    private String skills;  // Comma-separated skills for search
}
