import { useState } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useToastStore, Toast, dismissToast } from '@/stores/toastStore'

const variantStyles = {
  default: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
  success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
  error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
  warning: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
}

const variantIcons = {
  default: Info,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
}

const variantIconColors = {
  default: 'text-blue-500',
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
}

function ToastItem({ toast }: { toast: Toast }) {
  const [isExiting, setIsExiting] = useState(false)
  const Icon = variantIcons[toast.variant || 'default']

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      dismissToast(toast.id)
    }, 200)
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg
        transform transition-all duration-200 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        ${variantStyles[toast.variant || 'default']}
      `}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${variantIconColors[toast.variant || 'default']}`} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-medium text-gray-900 dark:text-white">{toast.title}</p>
        )}
        {toast.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{toast.description}</p>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  )
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      <div className="flex flex-col gap-2 pointer-events-auto">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  )
}
