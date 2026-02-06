package com.example.payroll.service;

import com.example.payroll.client.EmployeeClient;
import com.example.payroll.dto.*;
import com.example.payroll.exception.DuplicateResourceException;
import com.example.payroll.exception.PayrollProcessingException;
import com.example.payroll.exception.ResourceNotFoundException;
import com.example.payroll.mapper.PayrollMapper;
import com.example.payroll.model.Payroll;
import com.example.payroll.model.Payroll.PayrollStatus;
import com.example.payroll.repository.PayrollRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayrollService {

    private final PayrollRepository payrollRepository;
    private final PayrollMapper payrollMapper;
    private final EmployeeClient employeeClient;
    private final KafkaProducerService kafkaProducerService;

    @Transactional
    public PayrollResponse createPayroll(PayrollRequest request) {
        log.info("Creating payroll for employee ID: {}", request.getEmployeeId());

        // Check if payroll already exists for this period
        if (payrollRepository.existsByEmployeeIdAndPayPeriodStart(
                request.getEmployeeId(), request.getPayPeriodStart())) {
            throw new DuplicateResourceException(
                "Payroll already exists for employee " + request.getEmployeeId() + 
                " for period starting " + request.getPayPeriodStart());
        }

        // Verify employee exists
        try {
            EmployeeDTO employee = employeeClient.getEmployeeById(request.getEmployeeId());
            log.info("Verified employee: {} {}", employee.getFirstName(), employee.getLastName());
        } catch (Exception e) {
            log.error("Failed to verify employee: {}", e.getMessage());
            throw new PayrollProcessingException("Failed to verify employee existence", e);
        }

        Payroll payroll = payrollMapper.toEntity(request);
        payroll.setStatus(PayrollStatus.PENDING);
        Payroll savedPayroll = payrollRepository.save(payroll);

        // Publish event
        kafkaProducerService.sendPayrollCreatedEvent(savedPayroll);

        log.info("Payroll created with ID: {}", savedPayroll.getId());
        return payrollMapper.toResponse(savedPayroll);
    }

    @Cacheable(value = "payrolls", key = "#id")
    @Transactional(readOnly = true)
    public PayrollResponse getPayrollById(Long id) {
        log.info("Fetching payroll with ID: {}", id);
        Payroll payroll = payrollRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll not found with ID: " + id));
        return payrollMapper.toResponse(payroll);
    }

    @Transactional(readOnly = true)
    public List<PayrollResponse> getAllPayrolls() {
        log.info("Fetching all payrolls");
        return payrollRepository.findAll().stream()
                .map(payrollMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<PayrollResponse> getAllPayrolls(Pageable pageable) {
        log.info("Fetching all payrolls with pagination");
        return payrollRepository.findAll(pageable)
                .map(payrollMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<PayrollResponse> getPayrollsByEmployeeId(Long employeeId) {
        log.info("Fetching payrolls for employee ID: {}", employeeId);
        return payrollRepository.findByEmployeeId(employeeId).stream()
                .map(payrollMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PayrollResponse> getPayrollsByStatus(PayrollStatus status) {
        log.info("Fetching payrolls with status: {}", status);
        return payrollRepository.findByStatus(status).stream()
                .map(payrollMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PayrollResponse> getPayrollsByDateRange(LocalDate startDate, LocalDate endDate) {
        log.info("Fetching payrolls between {} and {}", startDate, endDate);
        return payrollRepository.findByPayPeriodStartBetween(startDate, endDate).stream()
                .map(payrollMapper::toResponse)
                .collect(Collectors.toList());
    }

    @CacheEvict(value = "payrolls", key = "#id")
    @Transactional
    public PayrollResponse updatePayroll(Long id, PayrollUpdateRequest request) {
        log.info("Updating payroll with ID: {}", id);
        Payroll payroll = payrollRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll not found with ID: " + id));

        payrollMapper.updateEntityFromRequest(payroll, request);
        Payroll updatedPayroll = payrollRepository.save(payroll);

        // Publish event
        kafkaProducerService.sendPayrollUpdatedEvent(updatedPayroll);

        log.info("Payroll updated with ID: {}", id);
        return payrollMapper.toResponse(updatedPayroll);
    }

    @CacheEvict(value = "payrolls", key = "#id")
    @Transactional
    public PayrollResponse approvePayroll(Long id) {
        log.info("Approving payroll with ID: {}", id);
        Payroll payroll = payrollRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll not found with ID: " + id));

        if (payroll.getStatus() != PayrollStatus.PENDING) {
            throw new PayrollProcessingException("Only pending payrolls can be approved");
        }

        payroll.setStatus(PayrollStatus.APPROVED);
        Payroll approvedPayroll = payrollRepository.save(payroll);

        // Publish event
        kafkaProducerService.sendPayrollApprovedEvent(approvedPayroll);

        log.info("Payroll approved with ID: {}", id);
        return payrollMapper.toResponse(approvedPayroll);
    }

    @CacheEvict(value = "payrolls", key = "#id")
    @Transactional
    public PayrollResponse processPayment(Long id) {
        log.info("Processing payment for payroll ID: {}", id);
        Payroll payroll = payrollRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll not found with ID: " + id));

        if (payroll.getStatus() != PayrollStatus.APPROVED) {
            throw new PayrollProcessingException("Only approved payrolls can be processed");
        }

        payroll.setStatus(PayrollStatus.PROCESSING);
        payroll.setPaymentDate(LocalDate.now());
        Payroll processingPayroll = payrollRepository.save(payroll);

        // Publish event for payment processing
        kafkaProducerService.sendPayrollPaymentInitiatedEvent(processingPayroll);

        log.info("Payment processing initiated for payroll ID: {}", id);
        return payrollMapper.toResponse(processingPayroll);
    }

    @CacheEvict(value = "payrolls", key = "#id")
    @Transactional
    public void deletePayroll(Long id) {
        log.info("Deleting payroll with ID: {}", id);
        Payroll payroll = payrollRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll not found with ID: " + id));

        if (payroll.getStatus() == PayrollStatus.PAID) {
            throw new PayrollProcessingException("Cannot delete paid payroll");
        }

        payrollRepository.delete(payroll);
        log.info("Payroll deleted with ID: {}", id);
    }
}
