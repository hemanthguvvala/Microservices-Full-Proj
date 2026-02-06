package com.example.employee.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

/**
 * Configuration for JPA Auditing.
 * Automatically populates @CreatedBy, @LastModifiedBy, @CreatedDate, @LastModifiedDate fields.
 */
@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorProvider")
public class AuditConfig {

    @Bean
    public AuditorAware<String> auditorProvider() {
        return new AuditorAwareImpl();
    }

    /**
     * Implementation of AuditorAware to get current auditor (logged-in user).
     */
    public static class AuditorAwareImpl implements AuditorAware<String> {

        @Override
        public Optional<String> getCurrentAuditor() {
            try {
                Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
                
                if (authentication == null || !authentication.isAuthenticated() || 
                    "anonymousUser".equals(authentication.getPrincipal())) {
                    return Optional.of("system");
                }
                
                return Optional.of(authentication.getName());
            } catch (Exception e) {
                return Optional.of("system");
            }
        }
    }
}
