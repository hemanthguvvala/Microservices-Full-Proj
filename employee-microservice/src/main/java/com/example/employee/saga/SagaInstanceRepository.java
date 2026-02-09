package com.example.employee.saga;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SagaInstanceRepository extends JpaRepository<SagaInstance, Long> {
    
    Optional<SagaInstance> findBySagaId(String sagaId);
    
    List<SagaInstance> findByStatus(SagaInstance.SagaStatus status);
    
    List<SagaInstance> findBySagaTypeAndStatus(String sagaType, SagaInstance.SagaStatus status);
}
