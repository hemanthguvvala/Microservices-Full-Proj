package com.example.employee;

import com.example.employee.model.Role;
import com.example.employee.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {
    
    private final RoleRepository roleRepository;
    
    @Override
    public void run(String... args) {
        try {
            // Initialize roles if they don't exist
            if (roleRepository.count() == 0) {
                log.info("Initializing roles...");
                
                Role userRole = new Role();
                userRole.setName(Role.RoleName.ROLE_USER);
                roleRepository.save(userRole);
                
                Role adminRole = new Role();
                adminRole.setName(Role.RoleName.ROLE_ADMIN);
                roleRepository.save(adminRole);
                
                Role managerRole = new Role();
                managerRole.setName(Role.RoleName.ROLE_MANAGER);
                roleRepository.save(managerRole);
                
                log.info("Roles initialized successfully");
            } else {
                log.debug("Roles already exist, skipping initialization");
            }
        } catch (Exception e) {
            log.warn("Could not initialize roles: {}", e.getMessage());
            // Don't fail the application startup if role initialization fails
        }
    }
}
