package com.example.employee.config;

import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskDecorator;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

import java.util.Map;
import java.util.concurrent.Executor;

/**
 * Async thread pool configuration WITH MDC propagation via TaskDecorator.
 *
 * Problem without TaskDecorator:
 *   Thread A (HTTP request): MDC = {correlationId="abc123", userId="u42"}
 *   @Async method runs on Thread B from pool: MDC = {} <- EMPTY!
 *   Log lines from async work have no correlationId -> impossible to trace.
 *
 * Solution: TaskDecorator captures MDC from the caller thread BEFORE submitting
 * and restores it on the worker thread BEFORE the task runs, then clears after.
 *
 * Interview: "How do you make MDC work with @Async?"
 * -> Add a TaskDecorator to your ThreadPoolTaskExecutor that captures MDC
 *    from the submitting thread and restores it in the execution thread.
 *    Without this, all @Async log lines lose their trace/correlation context.
 */
@Slf4j
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    /**
     * MDC-propagating TaskDecorator.
     * 1. Captures MDC snapshot from caller thread before Runnable submission
     * 2. On worker thread: restores MDC snapshot before running the task
     * 3. After task: clears MDC to prevent context leaking to the next task
     *    (thread pools REUSE threads - critical to clean up!)
     */
    @Bean
    public TaskDecorator mdcTaskDecorator() {
        return runnable -> {
            // Capture from calling thread (e.g., HTTP request thread)
            Map<String, String> callerMdc = MDC.getCopyOfContextMap();

            RequestAttributes callerRequestAttributes;
            try {
                callerRequestAttributes = RequestContextHolder.currentRequestAttributes();
            } catch (IllegalStateException e) {
                callerRequestAttributes = null;
            }
            final RequestAttributes reqAttr = callerRequestAttributes;

            return () -> {
                try {
                    if (callerMdc != null) {
                        MDC.setContextMap(callerMdc);
                    }
                    if (reqAttr != null) {
                        RequestContextHolder.setRequestAttributes(reqAttr);
                    }
                    runnable.run();
                } finally {
                    MDC.clear();
                    RequestContextHolder.resetRequestAttributes();
                }
            };
        };
    }

    @Override
    @Bean(name = "taskExecutor")
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.setTaskDecorator(mdcTaskDecorator());
        executor.initialize();
        log.info("Async executor initialized: coreSize=5 maxSize=10 MDC-propagation=ENABLED");
        return executor;
    }

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (throwable, method, params) ->
            log.error("Async method {} threw exception: {}", method.getName(), throwable.getMessage(), throwable);
    }
}
