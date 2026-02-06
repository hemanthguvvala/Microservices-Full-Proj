package com.example.employee.event;

import com.example.employee.model.Employee;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeEvent implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    private String eventId;
    private EventType eventType;
    private Employee employee;
    private String performedBy;
    private LocalDateTime timestamp;
    private String message;
    
    public enum EventType {
        CREATED,
        UPDATED,
        DELETED
    }
    
    public EmployeeEvent(EventType eventType, Employee employee, String performedBy) {
        this.eventId = java.util.UUID.randomUUID().toString();
        this.eventType = eventType;
        this.employee = employee;
        this.performedBy = performedBy;
        this.timestamp = LocalDateTime.now();
        this.message = generateMessage();
    }
    
    private String generateMessage() {
        String action = switch (eventType) {
            case CREATED -> "created";
            case UPDATED -> "updated";
            case DELETED -> "deleted";
        };
        return String.format("Employee %s %s %s by %s", 
            employee.getFirstName() + " " + employee.getLastName(), 
            action, 
            timestamp, 
            performedBy);
    }
}
