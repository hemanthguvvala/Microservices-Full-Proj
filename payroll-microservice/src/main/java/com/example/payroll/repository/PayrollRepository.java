package com.example.payroll.repository;

import com.example.payroll.model.Payroll;
import com.example.payroll.model.Payroll.PayrollStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PayrollRepository extends JpaRepository<Payroll, Long> {

    List<Payroll> findByEmployeeId(Long employeeId);

    Page<Payroll> findByEmployeeId(Long employeeId, Pageable pageable);

    List<Payroll> findByStatus(PayrollStatus status);

    Page<Payroll> findByStatus(PayrollStatus status, Pageable pageable);

    @Query("SELECT p FROM Payroll p WHERE p.employeeId = :employeeId AND p.payPeriodStart = :payPeriodStart")
    Optional<Payroll> findByEmployeeIdAndPayPeriodStart(@Param("employeeId") Long employeeId, 
                                                         @Param("payPeriodStart") LocalDate payPeriodStart);

    @Query("SELECT p FROM Payroll p WHERE p.payPeriodStart BETWEEN :startDate AND :endDate")
    List<Payroll> findByPayPeriodStartBetween(@Param("startDate") LocalDate startDate, 
                                               @Param("endDate") LocalDate endDate);

    @Query("SELECT p FROM Payroll p WHERE p.employeeId = :employeeId AND p.payPeriodStart BETWEEN :startDate AND :endDate")
    List<Payroll> findByEmployeeIdAndPayPeriodBetween(@Param("employeeId") Long employeeId,
                                                       @Param("startDate") LocalDate startDate,
                                                       @Param("endDate") LocalDate endDate);

    @Query("SELECT p FROM Payroll p WHERE p.status = :status AND p.paymentDate <= :date")
    List<Payroll> findByStatusAndPaymentDateBefore(@Param("status") PayrollStatus status,
                                                    @Param("date") LocalDate date);

    boolean existsByEmployeeIdAndPayPeriodStart(Long employeeId, LocalDate payPeriodStart);
}
