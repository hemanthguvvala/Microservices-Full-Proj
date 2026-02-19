import { useState, useEffect, useRef, useCallback } from 'react';

// WebSocket connection states
export type WsStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export interface EmployeeNotification {
  id: string;
  type: 'EMPLOYEE_CREATED' | 'EMPLOYEE_UPDATED' | 'EMPLOYEE_DELETED' | 'SALARY_CHANGED' | 'PROMOTION' | 'INFO';
  employeeId: string;
  employeeName: string;
  message: string;
  department?: string;
  timestamp: string;
  tenantId?: string;
}

interface UseWebSocketOptions {
  url: string;
  onMessage?: (notification: EmployeeNotification) => void;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

/**
 * useWebSocket — custom hook for WebSocket connection management.
 *
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Connection status tracking
 * - Message history (last N messages)
 * - Heartbeat via ping messages
 *
 * Interview: "How is WebSocket different from REST?"
 * REST:      Client initiates every request (request-response)
 * WebSocket: Full-duplex persistent connection. Server can PUSH to client
 *            without client polling. Ideal for: live dashboards, chat, notifications.
 *
 * Interview: "When would you use WebSocket vs SSE vs polling?"
 * Polling:   Simplest, works everywhere, high server load
 * SSE:       Server → Client only, simpler than WS, auto-reconnect built-in
 * WebSocket: Bidirectional, lowest latency, best for real-time bidirectional
 *
 * Interview: "What are the challenges with WebSocket at scale?"
 * - Persistent connections consume memory (vs stateless HTTP)
 * - Requires sticky sessions or a pub/sub broker (Redis) for horizontal scaling
 * - Behind load balancers: need WebSocket-aware LB (not all LBs support upgrade)
 * - Our backend: Spring Boot uses STOMP over WebSocket + SimpMessagingTemplate
 */
export function useWebSocket({
  url,
  onMessage,
  reconnectDelay = 3000,
  maxReconnectAttempts = 10,
}: UseWebSocketOptions) {
  const [status, setStatus] = useState<WsStatus>('DISCONNECTED');
  const [notifications, setNotifications] = useState<EmployeeNotification[]>([]);
  const [lastMessage, setLastMessage] = useState<EmployeeNotification | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const heartbeatTimer = useRef<ReturnType<typeof setInterval>>();

  const clearTimers = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('CONNECTING');

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected to:', url);
        setStatus('CONNECTED');
        reconnectAttempts.current = 0;

        // Heartbeat: send ping every 30s to keep connection alive
        // Interview: "Why do you need heartbeats on WebSocket?"
        // → Firewalls/proxies close idle TCP connections after ~60-90s.
        //   A heartbeat prevents the connection from being considered idle.
        heartbeatTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
          }
        }, 30_000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Ignore PONG responses from server
          if (data.type === 'PONG') return;

          const notification: EmployeeNotification = {
            id: data.id || crypto.randomUUID(),
            type: data.type || 'INFO',
            employeeId: data.employeeId || '',
            employeeName: data.employeeName || 'Unknown',
            message: data.message || JSON.stringify(data),
            department: data.department,
            timestamp: data.timestamp || new Date().toISOString(),
            tenantId: data.tenantId,
          };

          setLastMessage(notification);
          setNotifications(prev => [notification, ...prev].slice(0, 100)); // Keep last 100
          onMessage?.(notification);

        } catch (err) {
          console.warn('[WebSocket] Failed to parse message:', event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setStatus('ERROR');
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Closed:', event.code, event.reason);
        setStatus('DISCONNECTED');
        clearTimers();

        // Auto-reconnect with exponential backoff
        // Interview: "What is exponential backoff?"
        // → Instead of retrying every N ms (which floods the server),
        //   double the delay each retry: 3s, 6s, 12s, 24s...
        //   Cap at ~60s. Prevents thundering herd when server restarts.
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts.current), 60_000);
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          reconnectAttempts.current += 1;
          reconnectTimer.current = setTimeout(connect, delay);
        } else {
          console.error('[WebSocket] Max reconnect attempts reached, giving up');
          setStatus('ERROR');
        }
      };

    } catch (err) {
      console.error('[WebSocket] Failed to create connection:', err);
      setStatus('ERROR');
    }
  }, [url, onMessage, reconnectDelay, maxReconnectAttempts, clearTimers]);

  const disconnect = useCallback(() => {
    clearTimers();
    reconnectAttempts.current = maxReconnectAttempts; // Prevent auto-reconnect
    wsRef.current?.close(1000, 'User disconnected');
  }, [clearTimers, maxReconnectAttempts]);

  const sendMessage = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('[WebSocket] Cannot send: not connected');
    }
  }, []);

  const clearNotifications = useCallback(() => setNotifications([]), []);

  useEffect(() => {
    connect();
    return () => {
      clearTimers();
      reconnectAttempts.current = maxReconnectAttempts;
      wsRef.current?.close(1000, 'Component unmounted');
    };
  }, [connect]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    status,
    notifications,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    clearNotifications,
    isConnected: status === 'CONNECTED',
  };
}
