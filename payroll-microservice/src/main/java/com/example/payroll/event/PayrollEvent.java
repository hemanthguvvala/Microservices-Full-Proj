package com.example.payroll.event;

import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollEvent implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long payrollId;
    private Long employeeId;
    private BigDecimal netSalary;
    private LocalDate payPeriodStart;
    private LocalDate payPeriodEnd;
    private String status;
    private String eventType; // CREATED, UPDATED, APPROVED, PAYMENT_INITIATED, PAID
    private LocalDateTime timestamp;
}
