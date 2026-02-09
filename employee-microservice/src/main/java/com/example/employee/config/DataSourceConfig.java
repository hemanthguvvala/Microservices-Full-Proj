package com.example.employee.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.datasource.LazyConnectionDataSourceProxy;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

/**
 * Database Sharding and Read Replica Configuration
 * 
 * This configuration demonstrates:
 * 1. Master-Slave (Read Replica) setup for read/write splitting
 * 2. Basic sharding concepts with routing datasource
 * 
 * For production use, consider:
 * - ShardingSphere for advanced sharding
 * - ProxySQL for MySQL replication management
 * - Vitess for horizontal sharding at scale
 */
@Configuration
@EnableJpaRepositories(
    basePackages = "com.example.employee.repository"
)
public class DataSourceConfig {

    /**
     * Master DataSource (Write Operations)
     */
    @Bean
    @ConfigurationProperties("spring.datasource.master")
    public DataSourceProperties masterDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    public DataSource masterDataSource() {
        return masterDataSourceProperties()
                .initializeDataSourceBuilder()
                .type(HikariDataSource.class)
                .build();
    }

    /**
     * Read Replica DataSource (Read Operations)
     * Configure in application.yml:
     * spring:
     *   datasource:
     *     master:
     *       url: jdbc:postgresql://master-db:5432/employeedb
     *       username: postgres
     *       password: postgres
     *     replica:
     *       url: jdbc:postgresql://replica-db:5432/employeedb
     *       username: postgres
     *       password: postgres
     */
    @Bean
    @ConfigurationProperties("spring.datasource.replica")
    public DataSourceProperties replicaDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    public DataSource replicaDataSource() {
        return replicaDataSourceProperties()
                .initializeDataSourceBuilder()
                .type(HikariDataSource.class)
                .build();
    }

    /**
     * Routing DataSource for Read-Write Splitting
     */
    @Bean
    public DataSource routingDataSource(
            @Qualifier("masterDataSource") DataSource masterDataSource,
            @Qualifier("replicaDataSource") DataSource replicaDataSource) {
        
        ReplicationRoutingDataSource routingDataSource = new ReplicationRoutingDataSource();
        
        Map<Object, Object> dataSourceMap = new HashMap<>();
        dataSourceMap.put("master", masterDataSource);
        dataSourceMap.put("replica", replicaDataSource);
        
        routingDataSource.setTargetDataSources(dataSourceMap);
        routingDataSource.setDefaultTargetDataSource(masterDataSource);
        
        return routingDataSource;
    }

    /**
     * Primary DataSource with lazy initialization
     */
    @Primary
    @Bean
    public DataSource dataSource(@Qualifier("routingDataSource") DataSource routingDataSource) {
        return new LazyConnectionDataSourceProxy(routingDataSource);
    }
}
