package com.example.payroll.exception;

public class PayrollProcessingException extends RuntimeException {
    public PayrollProcessingException(String message) {
        super(message);
    }
    
    public PayrollProcessingException(String message, Throwable cause) {
        super(message, cause);
    }
}
