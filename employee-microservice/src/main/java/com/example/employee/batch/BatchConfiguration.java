package com.example.employee.batch;

import com.example.employee.model.Employee;
import com.example.employee.repository.EmployeeRepository;
import com.example.employee.service.EmployeeSearchService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.launch.support.RunIdIncrementer;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.batch.item.ItemReader;
import org.springframework.batch.item.ItemWriter;
import org.springframework.batch.item.data.RepositoryItemReader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.PlatformTransactionManager;

import java.util.HashMap;
import java.util.Map;

/**
 * Spring Batch Configuration for ETL Jobs
 * Example: Sync employees from PostgreSQL to Elasticsearch
 */
@Slf4j
@Configuration
public class BatchConfiguration {

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private EmployeeSearchService searchService;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    /**
     * Reader - reads employees from PostgreSQL database
     */
    @Bean
    public RepositoryItemReader<Employee> employeeReader() {
        RepositoryItemReader<Employee> reader = new RepositoryItemReader<>();
        reader.setRepository(employeeRepository);
        reader.setMethodName("findAll");
        reader.setPageSize(100);
        
        Map<String, Sort.Direction> sorts = new HashMap<>();
        sorts.put("id", Sort.Direction.ASC);
        reader.setSort(sorts);
        
        return reader;
    }

    /**
     * Processor - transforms employee data if needed
     */
    @Bean
    public ItemProcessor<Employee, Employee> employeeProcessor() {
        return employee -> {
            log.debug("Processing employee: {}", employee.getId());
            // Add any transformation logic here
            return employee;
        };
    }

    /**
     * Writer - writes to Elasticsearch
     */
    @Bean
    public ItemWriter<Employee> employeeElasticsearchWriter() {
        return employees -> {
            for (Employee employee : employees) {
                searchService.indexEmployee(employee);
            }
            log.info("Indexed {} employees to Elasticsearch", employees.size());
        };
    }

    /**
     * Step - ETL step
     */
    @Bean
    public Step syncEmployeesToElasticsearchStep(ItemReader<Employee> reader,
                                                  ItemProcessor<Employee, Employee> processor,
                                                  ItemWriter<Employee> writer) {
        return new StepBuilder("syncEmployeesToElasticsearchStep", jobRepository)
                .<Employee, Employee>chunk(100, transactionManager)
                .reader(reader)
                .processor(processor)
                .writer(writer)
                .build();
    }

    /**
     * Job - Sync employees to Elasticsearch
     */
    @Bean
    public Job syncEmployeesToElasticsearchJob(Step syncEmployeesToElasticsearchStep) {
        return new JobBuilder("syncEmployeesToElasticsearchJob", jobRepository)
                .incrementer(new RunIdIncrementer())
                .start(syncEmployeesToElasticsearchStep)
                .build();
    }
}
