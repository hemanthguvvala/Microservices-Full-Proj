import React, { useState, useEffect } from 'react';
import { useWebSocket, type EmployeeNotification, type WsStatus } from '../hooks/useWebSocket';

// ─── Status badge colors ──────────────────────────────────────────────────────
const statusColors: Record<WsStatus, string> = {
  CONNECTED:    'bg-green-500',
  CONNECTING:   'bg-yellow-400 animate-pulse',
  DISCONNECTED: 'bg-gray-400',
  ERROR:        'bg-red-500',
};

// ─── Notification type colors ─────────────────────────────────────────────────
const notificationColors: Record<EmployeeNotification['type'], string> = {
  EMPLOYEE_CREATED: 'border-l-green-500 bg-green-50 dark:bg-green-900/20',
  EMPLOYEE_UPDATED: 'border-l-blue-500  bg-blue-50  dark:bg-blue-900/20',
  EMPLOYEE_DELETED: 'border-l-red-500   bg-red-50   dark:bg-red-900/20',
  SALARY_CHANGED:   'border-l-purple-500 bg-purple-50 dark:bg-purple-900/20',
  PROMOTION:        'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
  INFO:             'border-l-gray-400  bg-gray-50   dark:bg-gray-800/20',
};

const typeIcons: Record<EmployeeNotification['type'], string> = {
  EMPLOYEE_CREATED: '🆕',
  EMPLOYEE_UPDATED: '✏️',
  EMPLOYEE_DELETED: '🗑️',
  SALARY_CHANGED:   '💰',
  PROMOTION:        '🏆',
  INFO:             'ℹ️',
};

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * Real-time Employee Notification Feed using WebSocket.
 *
 * Connects to employee-microservice WebSocket endpoint:
 * ws://localhost:8080/ws/notifications
 *
 * The backend uses:
 * - Spring WebSocketConfig with @EnableWebSocketMessageBroker
 * - SimpMessagingTemplate for server-push to /topic/employee-events
 * - STOMP protocol over WebSocket (but our hook uses raw WS for simplicity)
 *
 * Interview: "How does this frontend connect to the Spring Boot WebSocket?"
 * → Spring Boot exposes a STOMP endpoint at /ws
 *   STOMP is a simple messaging protocol over WebSocket.
 *   Client subscribes to /topic/employee-events.
 *   Server pushes new events via SimpMessagingTemplate.convertAndSend().
 *   Alternative: use SockJS (fallback for non-WS environments) + stomp.js
 */
interface NotificationFeedProps {
  wsUrl?: string;
  maxVisible?: number;
}

const NotificationFeed: React.FC<NotificationFeedProps> = ({
  wsUrl = 'ws://localhost:8080/ws/employee-notifications',
  maxVisible = 20,
}) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [soundEnabled, setSoundEnabled] = useState(false);

  const { status, notifications, lastMessage, disconnect, clearNotifications, isConnected } =
    useWebSocket({
      url: wsUrl,
      onMessage: (notification) => {
        if (soundEnabled) {
          // Browser notification API
          if (Notification.permission === 'granted') {
            new Notification(`Employee Update: ${notification.type}`, {
              body: notification.message,
              icon: '/employee-icon.png',
            });
          }
        }
      },
      reconnectDelay: 3000,
      maxReconnectAttempts: 10,
    });

  // Request browser notification permission
  useEffect(() => {
    if (soundEnabled && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [soundEnabled]);

  const filteredNotifications = notifications
    .filter(n => filter === 'ALL' || n.type === filter)
    .slice(0, maxVisible);

  const eventTypes = ['ALL', 'EMPLOYEE_CREATED', 'EMPLOYEE_UPDATED', 'EMPLOYEE_DELETED', 'SALARY_CHANGED', 'PROMOTION'];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* ── Header ── */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Live Employee Events
          </h2>
          {/* Connection status badge */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${statusColors[status]}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification count */}
          {notifications.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full font-medium">
              {notifications.length} events
            </span>
          )}

          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded"
            title={soundEnabled ? 'Disable notifications' : 'Enable notifications'}
          >
            {soundEnabled ? '🔔' : '🔕'}
          </button>

          {/* Clear button */}
          <button
            onClick={clearNotifications}
            className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Clear
          </button>

          {/* Disconnect / Reconnect */}
          <button
            onClick={disconnect}
            disabled={!isConnected}
            className="px-2 py-1 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-40 transition"
          >
            {isConnected ? 'Disconnect' : 'Disconnected'}
          </button>
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-1 px-4 pt-3 pb-1 overflow-x-auto">
        {eventTypes.map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition ${
              filter === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {type === 'ALL' ? `All (${notifications.length})` : type.replace('EMPLOYEE_', '')}
          </button>
        ))}
      </div>

      {/* ── Last message banner ── */}
      {lastMessage && (
        <div className="mx-4 mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-700 dark:text-blue-300">
          <span className="font-semibold">Latest: </span>
          {typeIcons[lastMessage.type]} {lastMessage.employeeName} — {lastMessage.message}
        </div>
      )}

      {/* ── Notification stream ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-600">
            <div className="text-4xl mb-2">{isConnected ? '⚡' : '⚪'}</div>
            <p className="text-sm">
              {isConnected
                ? 'Listening for employee events...'
                : 'Connect to see live events'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationCard key={notification.id} notification={notification} />
          ))
        )}
      </div>

      {/* ── Footer: connection info ── */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-400 dark:text-gray-500">
        WebSocket: {wsUrl}
        {' · '}
        {isConnected ? 'Real-time updates active' : 'Auto-reconnecting...'}
      </div>
    </div>
  );
};

// ─── Notification Card ────────────────────────────────────────────────────────
const NotificationCard: React.FC<{ notification: EmployeeNotification }> = ({ notification }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border-l-4 rounded-r-lg p-3 cursor-pointer transition-all hover:shadow-sm ${notificationColors[notification.type]}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{typeIcons[notification.type]}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                {notification.employeeName}
              </span>
              {notification.department && (
                <span className="px-1.5 py-0.5 text-xs bg-white/60 dark:bg-gray-700/60 rounded text-gray-600 dark:text-gray-400">
                  {notification.department}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {notification.message}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <time className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
            {new Date(notification.timestamp).toLocaleTimeString()}
          </time>
          <div className="text-xs text-gray-400 mt-0.5">{expanded ? '▲' : '▼'}</div>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-white/50 dark:border-gray-700/50 text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div><span className="font-medium">Employee ID:</span> {notification.employeeId}</div>
          <div><span className="font-medium">Event Type:</span> {notification.type}</div>
          <div><span className="font-medium">Timestamp:</span> {notification.timestamp}</div>
          {notification.tenantId && (
            <div><span className="font-medium">Tenant:</span> {notification.tenantId}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationFeed;
