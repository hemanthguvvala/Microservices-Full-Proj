package com.example.payroll.controller;

import com.example.payroll.dto.PayrollRequest;
import com.example.payroll.dto.PayrollResponse;
import com.example.payroll.dto.PayrollUpdateRequest;
import com.example.payroll.model.Payroll.PayrollStatus;
import com.example.payroll.service.PayrollService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/payrolls")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Payroll", description = "Payroll Management APIs")
public class PayrollController {

    private final PayrollService payrollService;

    @PostMapping
    @Operation(summary = "Create a new payroll")
    public ResponseEntity<PayrollResponse> createPayroll(@Valid @RequestBody PayrollRequest request) {
        log.info("REST request to create payroll for employee: {}", request.getEmployeeId());
        PayrollResponse response = payrollService.createPayroll(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get payroll by ID")
    public ResponseEntity<PayrollResponse> getPayrollById(@PathVariable Long id) {
        log.info("REST request to get payroll: {}", id);
        PayrollResponse response = payrollService.getPayrollById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "Get all payrolls")
    public ResponseEntity<List<PayrollResponse>> getAllPayrolls() {
        log.info("REST request to get all payrolls");
        List<PayrollResponse> payrolls = payrollService.getAllPayrolls();
        return ResponseEntity.ok(payrolls);
    }

    @GetMapping("/page")
    @Operation(summary = "Get all payrolls with pagination")
    public ResponseEntity<Page<PayrollResponse>> getAllPayrollsPaginated(Pageable pageable) {
        log.info("REST request to get all payrolls with pagination");
        Page<PayrollResponse> payrolls = payrollService.getAllPayrolls(pageable);
        return ResponseEntity.ok(payrolls);
    }

    @GetMapping("/employee/{employeeId}")
    @Operation(summary = "Get payrolls by employee ID")
    public ResponseEntity<List<PayrollResponse>> getPayrollsByEmployeeId(@PathVariable Long employeeId) {
        log.info("REST request to get payrolls for employee: {}", employeeId);
        List<PayrollResponse> payrolls = payrollService.getPayrollsByEmployeeId(employeeId);
        return ResponseEntity.ok(payrolls);
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "Get payrolls by status")
    public ResponseEntity<List<PayrollResponse>> getPayrollsByStatus(@PathVariable PayrollStatus status) {
        log.info("REST request to get payrolls with status: {}", status);
        List<PayrollResponse> payrolls = payrollService.getPayrollsByStatus(status);
        return ResponseEntity.ok(payrolls);
    }

    @GetMapping("/date-range")
    @Operation(summary = "Get payrolls by date range")
    public ResponseEntity<List<PayrollResponse>> getPayrollsByDateRange(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        log.info("REST request to get payrolls between {} and {}", startDate, endDate);
        List<PayrollResponse> payrolls = payrollService.getPayrollsByDateRange(startDate, endDate);
        return ResponseEntity.ok(payrolls);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update payroll")
    public ResponseEntity<PayrollResponse> updatePayroll(
            @PathVariable Long id,
            @Valid @RequestBody PayrollUpdateRequest request) {
        log.info("REST request to update payroll: {}", id);
        PayrollResponse response = payrollService.updatePayroll(id, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/approve")
    @Operation(summary = "Approve payroll")
    public ResponseEntity<PayrollResponse> approvePayroll(@PathVariable Long id) {
        log.info("REST request to approve payroll: {}", id);
        PayrollResponse response = payrollService.approvePayroll(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/process-payment")
    @Operation(summary = "Process payroll payment")
    public ResponseEntity<PayrollResponse> processPayment(@PathVariable Long id) {
        log.info("REST request to process payment for payroll: {}", id);
        PayrollResponse response = payrollService.processPayment(id);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete payroll")
    public ResponseEntity<Void> deletePayroll(@PathVariable Long id) {
        log.info("REST request to delete payroll: {}", id);
        payrollService.deletePayroll(id);
        return ResponseEntity.noContent().build();
    }
}
