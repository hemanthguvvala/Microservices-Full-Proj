package com.example.employee.config;

import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Routing DataSource for Read-Write Splitting
 * 
 * Routes queries to:
 * - Master database: for write operations (@Transactional)
 * - Replica database: for read-only operations (@Transactional(readOnly = true))
 */
public class ReplicationRoutingDataSource extends AbstractRoutingDataSource {

    @Override
    protected Object determineCurrentLookupKey() {
        boolean isReadOnly = TransactionSynchronizationManager.isCurrentTransactionReadOnly();
        return isReadOnly ? "replica" : "master";
    }
}
