package com.example.employee.saga;

import com.example.employee.client.PayrollCreateRequest;
import com.example.employee.client.PayrollResponse;
import com.example.employee.client.PayrollServiceClient;
import com.example.employee.model.Employee;
import com.example.employee.repository.EmployeeRepository;
import com.example.employee.saga.dto.EmployeeOnboardingData;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/**
 * Employee Onboarding Saga
 * 
 * Coordinates the onboarding process across multiple services:
 * 1. Create Employee Record
 * 2. Create Payroll Record (via HTTP call)
 * 3. Send Welcome Email
 * 4. Grant System Access
 * 
 * If any step fails, compensating transactions are executed in reverse order.
 */
@Slf4j
@Service
@Transactional
public class EmployeeOnboardingSaga implements SagaOrchestrator {

    @Autowired
    private SagaInstanceRepository sagaRepository;

    @Autowired
    private EmployeeRepository employeeRepository;
    
    @Autowired
    private PayrollServiceClient payrollServiceClient;
    
    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String SAGA_TYPE = "EMPLOYEE_ONBOARDING";
    private static final List<String> STEPS = Arrays.asList(
            "CREATE_EMPLOYEE",
            "CREATE_PAYROLL",
            "SEND_WELCOME_EMAIL",
            "GRANT_SYSTEM_ACCESS"
    );

    @Override
    public void start(SagaInstance saga) {
        log.info("Starting Employee Onboarding Saga: {}", saga.getSagaId());
        saga.setStatus(SagaInstance.SagaStatus.IN_PROGRESS);
        saga.setCurrentStep(STEPS.get(0));
        sagaRepository.save(saga);
        
        executeNextStep(saga);
    }

    @Override
    public void executeNextStep(SagaInstance saga) {
        String currentStep = saga.getCurrentStep();
        log.info("Executing saga step: {} for saga: {}", currentStep, saga.getSagaId());
        
        try {
            switch (currentStep) {
                case "CREATE_EMPLOYEE":
                    executeCreateEmployee(saga);
                    break;
                case "CREATE_PAYROLL":
                    executeCreatePayroll(saga);
                    break;
                case "SEND_WELCOME_EMAIL":
                    executeSendWelcomeEmail(saga);
                    break;
                case "GRANT_SYSTEM_ACCESS":
                    executeGrantSystemAccess(saga);
                    break;
                default:
                    throw new IllegalStateException("Unknown step: " + currentStep);
            }
            
            markStepCompleted(saga, currentStep);
            moveToNextStep(saga);
            
        } catch (Exception e) {
            log.error("Saga step failed: {} for saga: {}", currentStep, saga.getSagaId(), e);
            saga.setStatus(SagaInstance.SagaStatus.COMPENSATING);
            saga.setErrorMessage(e.getMessage());
            sagaRepository.save(saga);
            compensate(saga);
        }
    }

    @Override
    public void compensate(SagaInstance saga) {
        log.info("Compensating saga: {}", saga.getSagaId());
        
        // Execute compensating transactions in reverse order
        List<String> completedSteps = saga.getStepStatuses().keySet().stream()
                .filter(step -> "COMPLETED".equals(saga.getStepStatuses().get(step)))
                .toList();
        
        for (int i = completedSteps.size() - 1; i >= 0; i--) {
            String step = completedSteps.get(i);
            try {
                compensateStep(saga, step);
                saga.getStepStatuses().put(step, "COMPENSATED");
            } catch (Exception e) {
                log.error("Compensation failed for step: {} in saga: {}", step, saga.getSagaId(), e);
            }
        }
        
        saga.setStatus(SagaInstance.SagaStatus.COMPENSATED);
        sagaRepository.save(saga);
    }

    private void compensateStep(SagaInstance saga, String step) {
        log.info("Compensating step: {} for saga: {}", step, saga.getSagaId());
        
        try {
            EmployeeOnboardingData data = objectMapper.readValue(saga.getSagaData(), EmployeeOnboardingData.class);
            
            switch (step) {
                case "CREATE_EMPLOYEE":
                    log.info("Compensating: Deleting employee record");
                    if (data.getEmployeeId() != null) {
                        employeeRepository.deleteById(data.getEmployeeId());
                        log.info("Employee deleted: {}", data.getEmployeeId());
                    }
                    break;
                    
                case "CREATE_PAYROLL":
                    log.info("Compensating: Deleting payroll record");
                    if (data.getEmployeeId() != null) {
                        try {
                            payrollServiceClient.deletePayrollByEmployeeId(data.getEmployeeId());
                            log.info("Payroll deleted for employee: {}", data.getEmployeeId());
                        } catch (Exception e) {
                            log.error("Failed to delete payroll (payroll service may be down)", e);
                        }
                    }
                    break;
                    
                case "SEND_WELCOME_EMAIL":
                    log.info("Compensating: Sending cancellation email");
                    if (mailSender != null && data.getEmailSent()) {
                        try {
                            SimpleMailMessage message = new SimpleMailMessage();
                            message.setTo(data.getEmail());
                            message.setSubject("Onboarding Process Update");
                            message.setText(
                                String.format("Dear %s %s,\n\n" +
                                    "We regret to inform you that there was an issue with your onboarding process. " +
                                    "Our HR team will contact you shortly with more information.\n\n" +
                                    "We apologize for any inconvenience.\n\n" +
                                    "Best regards,\n" +
                                    "HR Department",
                                    data.getFirstName(), data.getLastName())
                            );
                            mailSender.send(message);
                            log.info("Cancellation email sent to: {}", data.getEmail());
                        } catch (Exception e) {
                            log.error("Failed to send cancellation email", e);
                        }
                    }
                    break;
                    
                case "GRANT_SYSTEM_ACCESS":
                    log.info("Compensating: Revoking system access");
                    if (data.getUserId() != null && data.isAccessGranted()) {
                        // In production: Disable/delete user account
                        log.info("System access revoked for user: {}", data.getUserId());
                    }
                    break;
            }
        } catch (Exception e) {
            log.error("Compensation failed for step: {}", step, e);
            // Log but don't throw - compensation should be best effort
        }
    }

    private void executeCreateEmployee(SagaInstance saga) {
        log.info("Creating employee record");
        
        try {
            EmployeeOnboardingData data = objectMapper.readValue(saga.getSagaData(), EmployeeOnboardingData.class);
            
            Employee employee = new Employee();
            employee.setFirstName(data.getFirstName());
            employee.setLastName(data.getLastName());
            employee.setEmail(data.getEmail());
            employee.setDepartment(data.getDepartment());
            employee.setPosition(data.getPosition());
            employee.setSalary(data.getSalary());
            employee.setHireDate(data.getHireDate() != null ? data.getHireDate() : LocalDate.now());
            employee.setPhoneNumber(data.getPhoneNumber());
            
            Employee savedEmployee = employeeRepository.save(employee);
            data.setEmployeeId(savedEmployee.getId());
            
            // Update saga data with employee ID
            saga.setSagaData(objectMapper.writeValueAsString(data));
            sagaRepository.save(saga);
            
            log.info("Employee created successfully with ID: {}", savedEmployee.getId());
            
        } catch (Exception e) {
            log.error("Failed to create employee", e);
            throw new RuntimeException("Failed to create employee: " + e.getMessage(), e);
        }
    }

    private void executeCreatePayroll(SagaInstance saga) {
        log.info("Creating payroll record");
        
        try {
            EmployeeOnboardingData data = objectMapper.readValue(saga.getSagaData(), EmployeeOnboardingData.class);
            
            if (data.getEmployeeId() == null) {
                throw new IllegalStateException("Employee ID is missing");
            }
            
            PayrollCreateRequest request = new PayrollCreateRequest();
            request.setEmployeeId(data.getEmployeeId());
            request.setEmployeeName(data.getFirstName() + " " + data.getLastName());
            request.setSalary(data.getSalary());
            request.setDepartment(data.getDepartment());
            request.setEffectiveDate(data.getHireDate());
            
            PayrollResponse response = payrollServiceClient.createPayroll(request);
            data.setPayrollId(response.getId());
            
            // Update saga data with payroll ID
            saga.setSagaData(objectMapper.writeValueAsString(data));
            sagaRepository.save(saga);
            
            log.info("Payroll created successfully with ID: {} for employee: {}", response.getId(), data.getEmployeeId());
            
        } catch (Exception e) {
            log.error("Failed to create payroll", e);
            throw new RuntimeException("Failed to create payroll: " + e.getMessage(), e);
        }
    }

    private void executeSendWelcomeEmail(SagaInstance saga) {
        log.info("Sending welcome email");
        
        try {
            EmployeeOnboardingData data = objectMapper.readValue(saga.getSagaData(), EmployeeOnboardingData.class);
            
            if (mailSender != null) {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(data.getEmail());
                message.setSubject("Welcome to the Company!");
                message.setText(
                    String.format("Dear %s %s,\n\n" +
                        "Welcome to our company! We're excited to have you join our %s team as a %s.\n\n" +
                        "Your hire date is %s.\n\n" +
                        "Best regards,\n" +
                        "HR Department",
                        data.getFirstName(), data.getLastName(),
                        data.getDepartment(), data.getPosition(),
                        data.getHireDate())
                );
                
                mailSender.send(message);
                data.setEmailSent(true);
                log.info("Welcome email sent successfully to: {}", data.getEmail());
            } else {
                log.warn("Email sender not configured. Skipping email for: {}", data.getEmail());
                data.setEmailSent(false);
            }
            
            saga.setSagaData(objectMapper.writeValueAsString(data));
            sagaRepository.save(saga);
            
        } catch (Exception e) {
            log.error("Failed to send welcome email", e);
            throw new RuntimeException("Failed to send welcome email: " + e.getMessage(), e);
        }
    }

    private void executeGrantSystemAccess(SagaInstance saga) {
        log.info("Granting system access");
        
        try {
            EmployeeOnboardingData data = objectMapper.readValue(saga.getSagaData(), EmployeeOnboardingData.class);
            
            // Generate username from email
            String username = data.getEmail().split("@")[0];
            data.setUserId(username);
            data.setAccessGranted(true);
            
            // In production, this would:
            // 1. Create user account in auth system
            // 2. Assign roles based on position/department
            // 3. Generate temporary password
            // 4. Set up SSO/LDAP integration
            
            log.info("System access granted for user: {} (employee ID: {})", username, data.getEmployeeId());
            
            saga.setSagaData(objectMapper.writeValueAsString(data));
            sagaRepository.save(saga);
            
        } catch (Exception e) {
            log.error("Failed to grant system access", e);
            throw new RuntimeException("Failed to grant system access: " + e.getMessage(), e);
        }
    }

    private void markStepCompleted(SagaInstance saga, String step) {
        saga.getStepStatuses().put(step, "COMPLETED");
        sagaRepository.save(saga);
    }

    private void moveToNextStep(SagaInstance saga) {
        int currentIndex = STEPS.indexOf(saga.getCurrentStep());
        if (currentIndex < STEPS.size() - 1) {
            saga.setCurrentStep(STEPS.get(currentIndex + 1));
            sagaRepository.save(saga);
            executeNextStep(saga);
        } else {
            // Saga completed
            saga.setStatus(SagaInstance.SagaStatus.COMPLETED);
            sagaRepository.save(saga);
            log.info("Saga completed successfully: {}", saga.getSagaId());
        }
    }

    @Override
    public List<String> getSteps() {
        return STEPS;
    }

    @Override
    public String getSagaType() {
        return SAGA_TYPE;
    }
}
