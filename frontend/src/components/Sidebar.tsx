import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Box,
  Bell,
  ClipboardList,
  FileBarChart,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  roles?: string[]  // If specified, only these roles can see the item
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sites', icon: Building2, label: 'Sites', roles: ['admin', 'facility_manager'] },
  { to: '/assets', icon: Box, label: 'Assets', roles: ['admin', 'facility_manager', 'technician'] },
  { to: '/alerts', icon: Bell, label: 'Alerts', roles: ['admin', 'facility_manager', 'technician'] },
  { to: '/work-orders', icon: ClipboardList, label: 'Work Orders', roles: ['admin', 'facility_manager', 'technician'] },
  { to: '/reports', icon: FileBarChart, label: 'Reports', roles: ['admin', 'facility_manager', 'executive'] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useAuthStore()

  // Filter nav items based on user role
  const visibleNavItems = navItems.filter(item => {
    // If no role restriction, show to everyone
    if (!item.roles) return true

    // If roles specified, check if user's role is in the list
    return item.roles.includes(user?.role || '')
  })

  return (
    <aside
      className={cn(
        "flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <span className="text-xl font-bold text-primary">SmartSense</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              )
            }
            aria-label={collapsed ? item.label : undefined}
          >
            <item.icon size={20} aria-hidden="true" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
