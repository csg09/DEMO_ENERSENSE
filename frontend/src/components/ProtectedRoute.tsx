import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Redirect to login and remember where they were trying to go
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
