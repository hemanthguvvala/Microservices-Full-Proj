package com.example.payroll.service;

import com.example.payroll.client.EmployeeClient;
import com.example.payroll.dto.EmployeeDTO;
import com.example.payroll.dto.PayrollRequest;
import com.example.payroll.dto.PayrollResponse;
import com.example.payroll.exception.DuplicateResourceException;
import com.example.payroll.exception.ResourceNotFoundException;
import com.example.payroll.mapper.PayrollMapper;
import com.example.payroll.model.Payroll;
import com.example.payroll.model.Payroll.PayrollStatus;
import com.example.payroll.repository.PayrollRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PayrollServiceTest {

    @Mock
    private PayrollRepository payrollRepository;

    @Mock
    private PayrollMapper payrollMapper;

    @Mock
    private EmployeeClient employeeClient;

    @Mock
    private KafkaProducerService kafkaProducerService;

    @InjectMocks
    private PayrollService payrollService;

    private PayrollRequest payrollRequest;
    private Payroll payroll;
    private PayrollResponse payrollResponse;
    private EmployeeDTO employeeDTO;

    @BeforeEach
    void setUp() {
        payrollRequest = PayrollRequest.builder()
                .employeeId(1L)
                .basicSalary(new BigDecimal("5000.00"))
                .allowances(new BigDecimal("500.00"))
                .bonuses(new BigDecimal("1000.00"))
                .deductions(new BigDecimal("200.00"))
                .tax(new BigDecimal("900.00"))
                .payPeriodStart(LocalDate.of(2024, 1, 1))
                .payPeriodEnd(LocalDate.of(2024, 1, 31))
                .build();

        payroll = Payroll.builder()
                .id(1L)
                .employeeId(1L)
                .basicSalary(new BigDecimal("5000.00"))
                .allowances(new BigDecimal("500.00"))
                .bonuses(new BigDecimal("1000.00"))
                .deductions(new BigDecimal("200.00"))
                .tax(new BigDecimal("900.00"))
                .netSalary(new BigDecimal("5400.00"))
                .payPeriodStart(LocalDate.of(2024, 1, 1))
                .payPeriodEnd(LocalDate.of(2024, 1, 31))
                .status(PayrollStatus.PENDING)
                .build();

        payrollResponse = PayrollResponse.builder()
                .id(1L)
                .employeeId(1L)
                .basicSalary(new BigDecimal("5000.00"))
                .netSalary(new BigDecimal("5400.00"))
                .status(PayrollStatus.PENDING)
                .build();

        employeeDTO = EmployeeDTO.builder()
                .id(1L)
                .firstName("John")
                .lastName("Doe")
                .email("john.doe@example.com")
                .build();
    }

    @Test
    void createPayroll_Success() {
        when(payrollRepository.existsByEmployeeIdAndPayPeriodStart(anyLong(), any(LocalDate.class)))
                .thenReturn(false);
        when(employeeClient.getEmployeeById(anyLong())).thenReturn(employeeDTO);
        when(payrollMapper.toEntity(any(PayrollRequest.class))).thenReturn(payroll);
        when(payrollRepository.save(any(Payroll.class))).thenReturn(payroll);
        when(payrollMapper.toResponse(any(Payroll.class))).thenReturn(payrollResponse);

        PayrollResponse result = payrollService.createPayroll(payrollRequest);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        verify(payrollRepository).save(any(Payroll.class));
        verify(kafkaProducerService).sendPayrollCreatedEvent(any(Payroll.class));
    }

    @Test
    void createPayroll_DuplicatePayroll_ThrowsException() {
        when(payrollRepository.existsByEmployeeIdAndPayPeriodStart(anyLong(), any(LocalDate.class)))
                .thenReturn(true);

        assertThatThrownBy(() -> payrollService.createPayroll(payrollRequest))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("Payroll already exists");

        verify(payrollRepository, never()).save(any());
    }

    @Test
    void getPayrollById_Success() {
        when(payrollRepository.findById(anyLong())).thenReturn(Optional.of(payroll));
        when(payrollMapper.toResponse(any(Payroll.class))).thenReturn(payrollResponse);

        PayrollResponse result = payrollService.getPayrollById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        verify(payrollRepository).findById(1L);
    }

    @Test
    void getPayrollById_NotFound_ThrowsException() {
        when(payrollRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> payrollService.getPayrollById(1L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Payroll not found");
    }

    @Test
    void approvePayroll_Success() {
        when(payrollRepository.findById(anyLong())).thenReturn(Optional.of(payroll));
        when(payrollRepository.save(any(Payroll.class))).thenReturn(payroll);
        when(payrollMapper.toResponse(any(Payroll.class))).thenReturn(payrollResponse);

        PayrollResponse result = payrollService.approvePayroll(1L);

        assertThat(result).isNotNull();
        verify(payrollRepository).save(any(Payroll.class));
        verify(kafkaProducerService).sendPayrollApprovedEvent(any(Payroll.class));
    }

    @Test
    void deletePayroll_Success() {
        when(payrollRepository.findById(anyLong())).thenReturn(Optional.of(payroll));
        doNothing().when(payrollRepository).delete(any(Payroll.class));

        payrollService.deletePayroll(1L);

        verify(payrollRepository).delete(payroll);
    }
}
