package com.example.payroll.controller;

import com.example.payroll.dto.PayrollRequest;
import com.example.payroll.dto.PayrollResponse;
import com.example.payroll.model.Payroll.PayrollStatus;
import com.example.payroll.service.PayrollService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PayrollController.class)
class PayrollControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PayrollService payrollService;

    private PayrollRequest payrollRequest;
    private PayrollResponse payrollResponse;

    @BeforeEach
    void setUp() {
        payrollRequest = PayrollRequest.builder()
                .employeeId(1L)
                .basicSalary(new BigDecimal("5000.00"))
                .allowances(new BigDecimal("500.00"))
                .payPeriodStart(LocalDate.of(2024, 1, 1))
                .payPeriodEnd(LocalDate.of(2024, 1, 31))
                .build();

        payrollResponse = PayrollResponse.builder()
                .id(1L)
                .employeeId(1L)
                .basicSalary(new BigDecimal("5000.00"))
                .netSalary(new BigDecimal("5400.00"))
                .status(PayrollStatus.PENDING)
                .build();
    }

    @Test
    void createPayroll_Success() throws Exception {
        when(payrollService.createPayroll(any(PayrollRequest.class))).thenReturn(payrollResponse);

        mockMvc.perform(post("/api/payrolls")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payrollRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.employeeId").value(1));
    }

    @Test
    void getPayrollById_Success() throws Exception {
        when(payrollService.getPayrollById(anyLong())).thenReturn(payrollResponse);

        mockMvc.perform(get("/api/payrolls/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.employeeId").value(1));
    }

    @Test
    void getAllPayrolls_Success() throws Exception {
        List<PayrollResponse> payrolls = Arrays.asList(payrollResponse);
        when(payrollService.getAllPayrolls()).thenReturn(payrolls);

        mockMvc.perform(get("/api/payrolls"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void approvePayroll_Success() throws Exception {
        payrollResponse.setStatus(PayrollStatus.APPROVED);
        when(payrollService.approvePayroll(anyLong())).thenReturn(payrollResponse);

        mockMvc.perform(post("/api/payrolls/1/approve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    void deletePayroll_Success() throws Exception {
        mockMvc.perform(delete("/api/payrolls/1"))
                .andExpect(status().isNoContent());
    }
}
