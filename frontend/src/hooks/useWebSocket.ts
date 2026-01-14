import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'

interface AlertData {
  id: string
  title: string
  description?: string
  severity: string
  status: string
  asset_id: string
  asset_name: string
  triggered_at: string
}

interface WebSocketMessage {
  type: 'new_alert' | 'alert_update'
  data: AlertData
}

export function useWebSocket() {
  const { accessToken } = useAuthStore()
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [alertCount, setAlertCount] = useState(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (!accessToken || wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close()
    }

    // Use the same host/port as the page to go through the Vite proxy
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/notifications?token=${accessToken}`

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)

          if (message.type === 'new_alert') {
            // Show toast notification for new alert
            toast({
              title: `New Alert: ${message.data.title}`,
              description: `${message.data.severity.toUpperCase()} - ${message.data.asset_name}`,
              variant: message.data.severity === 'critical' ? 'error' :
                       message.data.severity === 'high' ? 'warning' : 'default',
              duration: 8000,
            })

            // Increment alert count
            setAlertCount(prev => prev + 1)

            // Dispatch custom event for other components to react
            window.dispatchEvent(new CustomEvent('new-alert', { detail: message.data }))
          } else if (message.type === 'alert_update') {
            // Dispatch custom event for alert updates
            window.dispatchEvent(new CustomEvent('alert-update', { detail: message.data }))
          }
        } catch (e) {
          // Ignore non-JSON messages (like pong)
        }
      }

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        setIsConnected(false)
        wsRef.current = null

        // Reconnect after 5 seconds if not intentionally closed
        if (event.code !== 1000 && accessToken) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, 5000)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
    }
  }, [accessToken])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected')
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  // Connect when accessToken becomes available
  useEffect(() => {
    if (accessToken) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [accessToken, connect, disconnect])

  // Ping to keep connection alive
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping')
      }
    }, 30000)

    return () => clearInterval(pingInterval)
  }, [])

  const resetAlertCount = useCallback(() => {
    setAlertCount(0)
  }, [])

  return {
    isConnected,
    alertCount,
    resetAlertCount,
  }
}
