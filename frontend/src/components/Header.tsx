import { useState, useEffect, useCallback } from 'react'
import { Bell, User, LogOut, Moon, Sun } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useWebSocket } from '@/hooks/useWebSocket'

export default function Header() {
  const { user, logout, accessToken } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { alertCount: wsAlertCount, resetAlertCount } = useWebSocket()
  const [apiAlertCount, setApiAlertCount] = useState(0)

  // Fetch open alert count from API as fallback/supplement to WebSocket
  const fetchAlertCount = useCallback(async () => {
    if (!accessToken) return
    try {
      const response = await fetch('/api/alerts?status=open&limit=1', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (response.ok) {
        const data = await response.json()
        // API returns { items: [], total: number } with pagination
        setApiAlertCount(data.total || 0)
      }
    } catch (err) {
      // Silently fail - alert count is not critical
    }
  }, [accessToken])

  // Fetch alert count on mount and periodically
  useEffect(() => {
    fetchAlertCount()
    const interval = setInterval(fetchAlertCount, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [fetchAlertCount])

  // Listen for alert changes from other components
  useEffect(() => {
    const handleAlertChange = () => fetchAlertCount()
    window.addEventListener('alert-change', handleAlertChange)
    window.addEventListener('new-alert', handleAlertChange)
    window.addEventListener('alert-update', handleAlertChange)
    return () => {
      window.removeEventListener('alert-change', handleAlertChange)
      window.removeEventListener('new-alert', handleAlertChange)
      window.removeEventListener('alert-update', handleAlertChange)
    }
  }, [fetchAlertCount])

  // Use WebSocket count if available, otherwise use API count
  const alertCount = wsAlertCount > 0 ? wsAlertCount : apiAlertCount

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Breadcrumbs placeholder */}
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Home</span>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-4">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Notifications"
          onClick={resetAlertCount}
        >
          <Bell size={20} />
          {alertCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {alertCount > 99 ? '99+' : alertCount}
            </span>
          ) : (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          )}
        </button>

        {/* User menu */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="User profile">
            <User size={20} />
          </button>
          <button
            onClick={logout}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500"
            aria-label="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  )
}
