# Database Sharding and Read Replica Configuration Guide

## Overview

This document explains how to implement database sharding and read replica patterns for horizontal scaling.

## 1. Read Replica Configuration (Implemented)

### Master-Slave Replication

**Purpose**: Distribute read load across multiple database instances.

```yaml
# application.yml
spring:
  datasource:
    master:  # Write operations
      url: jdbc:postgresql://master-db:5432/employeedb
      username: postgres
      password: postgres
      hikari:
        maximum-pool-size: 20
        minimum-idle: 5
    
    replica:  # Read operations
      url: jdbc:postgresql://replica-db:5432/employeedb
      username: postgres
      password: postgres
      hikari:
        maximum-pool-size: 50
        minimum-idle: 10
```

### Usage in Code

```java
// Write operation - routes to master
@Transactional
public Employee createEmployee(Employee employee) {
    return employeeRepository.save(employee);
}

// Read operation - routes to replica
@Transactional(readOnly = true)
public Employee getEmployee(Long id) {
    return employeeRepository.findById(id).orElse(null);
}
```

## 2. Database Sharding Patterns

### What is Sharding?

Sharding is horizontal partitioning where data is distributed across multiple database instances based on a shard key.

### Common Sharding Strategies

#### A. Range-Based Sharding

```
Shard 1: employee_id 1-1000
Shard 2: employee_id 1001-2000
Shard 3: employee_id 2001-3000
```

#### B. Hash-Based Sharding

```java
int shardId = Math.abs(employeeId.hashCode() % numberOfShards);
```

#### C. Geographic Sharding

```
Shard 1: US employees
Shard 2: EU employees
Shard 3: APAC employees
```

#### D. Consistent Hashing

Distributes data evenly and minimizes resharding when adding/removing nodes.

### 3. Implementing Sharding with ShardingSphere

#### Add Dependency

```xml
<dependency>
    <groupId>org.apache.shardingsphere</groupId>
    <artifactId>shardingsphere-jdbc-core-spring-boot-starter</artifactId>
    <version>5.4.0</version>
</dependency>
```

#### Configuration

```yaml
spring:
  shardingsphere:
    datasource:
      names: ds0,ds1,ds2
      ds0:
        type: com.zaxxer.hikari.HikariDataSource
        driver-class-name: org.postgresql.Driver
        jdbc-url: jdbc:postgresql://shard0:5432/employeedb
        username: postgres
        password: postgres
      ds1:
        type: com.zaxxer.hikari.HikariDataSource
        driver-class-name: org.postgresql.Driver
        jdbc-url: jdbc:postgresql://shard1:5432/employeedb
        username: postgres
        password: postgres
      ds2:
        type: com.zaxxer.hikari.HikariDataSource
        driver-class-name: org.postgresql.Driver
        jdbc-url: jdbc:postgresql://shard2:5432/employeedb
        username: postgres
        password: postgres
    
    rules:
      sharding:
        tables:
          employee:
            actual-data-nodes: ds$->{0..2}.employee
            table-strategy:
              standard:
                sharding-column: id
                sharding-algorithm-name: employee-inline
        sharding-algorithms:
          employee-inline:
            type: INLINE
            props:
              algorithm-expression: ds$->{id % 3}
```

## 4. PostgreSQL Replication Setup

### Master Configuration (postgresql.conf)

```conf
wal_level = replica
max_wal_senders = 3
wal_keep_segments = 64
```

### Replica Configuration

```conf
hot_standby = on
```

### Create Replication Slot

```sql
-- On master
SELECT * FROM pg_create_physical_replication_slot('replica_slot');
```

### Start Replica

```bash
# On replica server
pg_basebackup -h master-host -D /var/lib/postgresql/data -U replication -P -R
```

## 5. Sharding Best Practices

### ✅ DO

1. **Choose the Right Shard Key**
   - High cardinality
   - Evenly distributed
   - Rarely changes

2. **Consider Query Patterns**
   - Minimize cross-shard queries
   - Use shard key in WHERE clauses

3. **Plan for Growth**
   - Allow adding shards
   - Consider resharding strategy

4. **Monitor Shard Balance**
   - Track data distribution
   - Rebalance if needed

### ❌ DON'T

1. Don't use auto-incrementing IDs across shards
2. Don't shard prematurely (start with read replicas)
3. Don't ignore transaction boundaries
4. Don't forget to test failover scenarios

## 6. Monitoring and Operations

### Health Checks

```java
@Scheduled(fixedDelay = 60000)
public void checkReplicaLag() {
    // Check replication lag
    String sql = "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS lag";
    // Alert if lag > threshold
}
```

### Metrics to Track

- Replication lag
- Shard data distribution
- Query performance per shard
- Cross-shard query count

## 7. Alternatives and Tools

### Cloud-Native Solutions

- **AWS Aurora**: Automatic read replicas, auto-scaling
- **Google Cloud Spanner**: Global distributed database
- **Azure Cosmos DB**: Multi-master replication
- **CockroachDB**: Distributed SQL with automatic sharding

### Middleware Solutions

- **Vitess**: MySQL sharding and scaling
- **ProxySQL**: Query routing and load balancing
- **Citus**: PostgreSQL extension for sharding

## 8. Example Deployment

### Docker Compose Setup

```yaml
version: '3.8'
services:
  postgres-master:
    image: postgres:14
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: employeedb
    ports:
      - "5432:5432"
    volumes:
      - master-data:/var/lib/postgresql/data
  
  postgres-replica:
    image: postgres:14
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    command: postgres -c 'hot_standby=on'
    ports:
      - "5433:5432"
    depends_on:
      - postgres-master
    volumes:
      - replica-data:/var/lib/postgresql/data

volumes:
  master-data:
  replica-data:
```

## 9. Testing Strategy

### Test Read Replica Failover

```java
@Test
public void testReplicaFailover() {
    // Stop replica
    // Verify queries still work from master
    // Start replica
    // Verify replica catches up
}
```

### Test Shard Distribution

```java
@Test
public void testShardDistribution() {
    // Insert 1000 employees
    // Verify even distribution across shards
    // Verify queries work correctly
}
```

## 10. Migration Strategy

### Phase 1: Single Database
- Current state
- All reads and writes to one DB

### Phase 2: Read Replicas
- Add read replicas
- Route read queries to replicas
- Monitor replication lag

### Phase 3: Sharding
- Choose shard key
- Setup multiple shards
- Migrate data gradually
- Update application logic

## Resources

- [PostgreSQL Replication](https://www.postgresql.org/docs/current/replication.html)
- [Apache ShardingSphere](https://shardingsphere.apache.org/)
- [Vitess Documentation](https://vitess.io/)
- [Database Sharding Patterns](https://www.digitalocean.com/community/tutorials/understanding-database-sharding)
