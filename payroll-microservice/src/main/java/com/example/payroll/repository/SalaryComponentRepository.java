package com.example.payroll.repository;

import com.example.payroll.model.SalaryComponent;
import com.example.payroll.model.SalaryComponent.ComponentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface SalaryComponentRepository extends JpaRepository<SalaryComponent, Long> {

    List<SalaryComponent> findByPayrollId(Long payrollId);

    List<SalaryComponent> findByPayrollIdAndComponentType(Long payrollId, ComponentType componentType);

    @Query("SELECT SUM(sc.amount) FROM SalaryComponent sc WHERE sc.payrollId = :payrollId AND sc.componentType = :type")
    BigDecimal sumAmountByPayrollIdAndComponentType(@Param("payrollId") Long payrollId, 
                                                     @Param("type") ComponentType type);

    @Query("SELECT sc FROM SalaryComponent sc WHERE sc.payrollId = :payrollId AND sc.isTaxable = true")
    List<SalaryComponent> findTaxableComponentsByPayrollId(@Param("payrollId") Long payrollId);

    void deleteByPayrollId(Long payrollId);
}
