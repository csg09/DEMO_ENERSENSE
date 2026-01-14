import { create } from 'zustand'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'success' | 'error' | 'warning'
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  dismissToast: (id: string) => void
  dismissAll: () => void
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (options) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: Toast = {
      id,
      duration: 5000,
      variant: 'default',
      ...options,
    }

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }))

    // Auto-dismiss after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        get().dismissToast(id)
      }, newToast.duration)
    }

    return id
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  dismissAll: () => {
    set({ toasts: [] })
  },
}))

// Convenience function for adding toasts without hook
export function toast(options: Omit<Toast, 'id'>) {
  return useToastStore.getState().addToast(options)
}

export function dismissToast(id: string) {
  useToastStore.getState().dismissToast(id)
}

// Expose toast function globally for testing
if (typeof window !== 'undefined') {
  (window as any).__toast__ = toast
}
