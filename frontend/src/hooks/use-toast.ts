// Re-export from toast store for convenience
export { toast, dismissToast, useToastStore } from '@/stores/toastStore'
export type { Toast } from '@/stores/toastStore'

// Custom hook that provides toast functionality
export function useToast() {
  const { toasts, addToast, dismissToast } = require('@/stores/toastStore').useToastStore.getState()

  return {
    toasts,
    toast: addToast,
    dismiss: dismissToast,
  }
}
