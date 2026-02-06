package com.example.payroll.repository;

import com.example.payroll.model.Payroll;
import com.example.payroll.model.Payroll.PayrollStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class PayrollRepositoryTest {

    @Autowired
    private PayrollRepository payrollRepository;

    @Test
    void savePayroll_Success() {
        Payroll payroll = Payroll.builder()
                .employeeId(1L)
                .basicSalary(new BigDecimal("5000.00"))
                .allowances(new BigDecimal("500.00"))
                .payPeriodStart(LocalDate.of(2024, 1, 1))
                .payPeriodEnd(LocalDate.of(2024, 1, 31))
                .status(PayrollStatus.PENDING)
                .build();

        Payroll saved = payrollRepository.save(payroll);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getEmployeeId()).isEqualTo(1L);
        assertThat(saved.getNetSalary()).isNotNull();
    }

    @Test
    void findByEmployeeId_ReturnsPayrolls() {
        Payroll payroll1 = createPayroll(1L, LocalDate.of(2024, 1, 1));
        Payroll payroll2 = createPayroll(1L, LocalDate.of(2024, 2, 1));
        payrollRepository.saveAll(List.of(payroll1, payroll2));

        List<Payroll> found = payrollRepository.findByEmployeeId(1L);

        assertThat(found).hasSize(2);
        assertThat(found).extracting(Payroll::getEmployeeId).containsOnly(1L);
    }

    @Test
    void findByStatus_ReturnsPayrolls() {
        Payroll payroll = createPayroll(1L, LocalDate.of(2024, 1, 1));
        payroll.setStatus(PayrollStatus.APPROVED);
        payrollRepository.save(payroll);

        List<Payroll> found = payrollRepository.findByStatus(PayrollStatus.APPROVED);

        assertThat(found).isNotEmpty();
        assertThat(found).allMatch(p -> p.getStatus() == PayrollStatus.APPROVED);
    }

    @Test
    void existsByEmployeeIdAndPayPeriodStart_ReturnsTrue() {
        Payroll payroll = createPayroll(1L, LocalDate.of(2024, 1, 1));
        payrollRepository.save(payroll);

        boolean exists = payrollRepository.existsByEmployeeIdAndPayPeriodStart(1L, LocalDate.of(2024, 1, 1));

        assertThat(exists).isTrue();
    }

    private Payroll createPayroll(Long employeeId, LocalDate startDate) {
        return Payroll.builder()
                .employeeId(employeeId)
                .basicSalary(new BigDecimal("5000.00"))
                .allowances(new BigDecimal("500.00"))
                .payPeriodStart(startDate)
                .payPeriodEnd(startDate.plusDays(30))
                .status(PayrollStatus.PENDING)
                .build();
    }
}
