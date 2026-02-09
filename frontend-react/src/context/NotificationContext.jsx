import { createContext, useContext, useState, useEffect } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

const NotificationContext = createContext(null)

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Create WebSocket connection
    const socket = new SockJS('http://localhost:8081/ws')
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      debug: (str) => {
        console.log('STOMP:', str)
      },
      onConnect: () => {
        console.log('WebSocket Connected')
        setConnected(true)
        
        // Subscribe to notification topic
        stompClient.subscribe('/topic/notifications', (message) => {
          const notification = JSON.parse(message.body)
          addNotification(notification)
        })
      },
      onDisconnect: () => {
        console.log('WebSocket Disconnected')
        setConnected(false)
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame)
      }
    })

    stompClient.activate()

    return () => {
      stompClient.deactivate()
    }
  }, [])

  const addNotification = (notification) => {
    const id = Date.now()
    setNotifications(prev => [...prev, { ...notification, id }])
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(id)
    }, 5000)
  }

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <NotificationContext.Provider value={{ notifications, connected, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}
