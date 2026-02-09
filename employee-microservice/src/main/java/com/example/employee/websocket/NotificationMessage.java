package com.example.employee.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Notification message sent via WebSocket
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationMessage {
    private String type;        // INFO, WARNING, ERROR, SUCCESS
    private String title;
    private String message;
    private Long timestamp;
    private Object data;
}
