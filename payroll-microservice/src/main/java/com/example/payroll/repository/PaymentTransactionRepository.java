package com.example.payroll.repository;

import com.example.payroll.model.PaymentTransaction;
import com.example.payroll.model.PaymentTransaction.TransactionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    Optional<PaymentTransaction> findByTransactionReference(String transactionReference);

    List<PaymentTransaction> findByPayrollId(Long payrollId);

    List<PaymentTransaction> findByStatus(TransactionStatus status);

    @Query("SELECT pt FROM PaymentTransaction pt WHERE pt.status = :status AND pt.retryCount < :maxRetries")
    List<PaymentTransaction> findFailedTransactionsForRetry(@Param("status") TransactionStatus status,
                                                             @Param("maxRetries") Integer maxRetries);

    @Query("SELECT pt FROM PaymentTransaction pt WHERE pt.status = :status AND pt.createdAt < :threshold")
    List<PaymentTransaction> findStalledTransactions(@Param("status") TransactionStatus status,
                                                      @Param("threshold") LocalDateTime threshold);
}
