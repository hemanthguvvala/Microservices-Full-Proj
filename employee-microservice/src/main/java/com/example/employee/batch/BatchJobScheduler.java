package com.example.employee.batch;

import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler for running batch jobs
 * Example: Sync data to Elasticsearch every day at midnight
 */
@Slf4j
@Component
public class BatchJobScheduler {

    @Autowired
    private JobLauncher jobLauncher;

    @Autowired
    private Job syncEmployeesToElasticsearchJob;

    /**
     * Runs daily at midnight to sync employees to Elasticsearch
     */
    @Scheduled(cron = "0 0 0 * * ?")  // Midnight every day
    public void syncEmployeesToElasticsearch() {
        try {
            log.info("Starting scheduled job: syncEmployeesToElasticsearch");
            
            JobParameters jobParameters = new JobParametersBuilder()
                    .addLong("time", System.currentTimeMillis())
                    .toJobParameters();
            
            jobLauncher.run(syncEmployeesToElasticsearchJob, jobParameters);
            
            log.info("Completed scheduled job: syncEmployeesToElasticsearch");
        } catch (Exception e) {
            log.error("Failed to run scheduled job: {}", e.getMessage(), e);
        }
    }

    /**
     * Runs every hour to perform data cleanup
     */
    @Scheduled(cron = "0 0 * * * ?")  // Every hour
    public void performDataCleanup() {
        log.info("Running data cleanup job...");
        // Add cleanup logic here
    }

    /**
     * Runs every 10 minutes to sync audit logs
     */
    @Scheduled(fixedDelay = 600000)  // 10 minutes
    public void syncAuditLogs() {
        log.debug("Syncing audit logs...");
        // Add audit log sync logic
    }
}
