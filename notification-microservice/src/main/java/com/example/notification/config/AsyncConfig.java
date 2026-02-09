package com.example.notification.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Async Executor Configuration — powers @Async and @TransactionalEventListener.
 *
 * Interview Insight:
 *   "How does @Async work in Spring?"
 *   → "@Async runs a method on a separate thread from a configured TaskExecutor.
 *
 *      CRITICAL RULES for @Async:
 *        1. Must annotate @EnableAsync on a @Configuration class
 *        2. The @Async method MUST be called from another bean (not self)
 *           → Reason: Spring proxies. this.asyncMethod() bypasses the proxy.
 *        3. Must return void or CompletableFuture<T>
 *        4. Cannot be private (proxy can't intercept)
 *
 *      Default executor: SimpleAsyncTaskExecutor (creates new thread per call — BAD).
 *      Always define a custom ThreadPoolTaskExecutor with bounded queue:
 *        corePoolSize    — threads always alive
 *        maxPoolSize     — max threads under load
 *        queueCapacity   — tasks waiting when core is full
 *        CallerRunsPolicy — fallback: caller thread executes (backpressure)
 *
 *      Named executors:
 *        @Async('notificationTaskExecutor') — picks specific executor bean"
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "notificationTaskExecutor")
    public Executor notificationTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("notif-async-");
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }
}
