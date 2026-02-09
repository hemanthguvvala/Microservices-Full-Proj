package com.example.employee.websocket;

import com.example.employee.event.EmployeeEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * Service for sending real-time updates via WebSocket
 */
@Slf4j
@Service
public class WebSocketNotificationService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Broadcast employee event to all subscribed clients
     */
    public void notifyEmployeeChange(EmployeeEvent event) {
        log.debug("Broadcasting employee event: {} for employee {}", 
                  event.getEventType(), event.getEmployeeId());
        messagingTemplate.convertAndSend("/topic/employees", event);
    }

    /**
     * Send notification to specific user
     */
    public void sendToUser(String username, Object payload) {
        log.debug("Sending notification to user: {}", username);
        messagingTemplate.convertAndSendToUser(username, "/queue/notifications", payload);
    }

    /**
     * Broadcast system notification
     */
    public void broadcastSystemNotification(String message) {
        log.info("Broadcasting system notification: {}", message);
        messagingTemplate.convertAndSend("/topic/system", message);
    }
}
