import { useEffect, useCallback, useState } from 'react'

interface UseUnsavedChangesOptions {
  isDirty: boolean
  onConfirmLeave?: () => void
}

interface UseUnsavedChangesReturn {
  showWarning: boolean
  pendingNavigation: string | null
  confirmNavigation: () => void
  cancelNavigation: () => void
  handleNavigationAttempt: (path: string) => boolean
}

/**
 * Hook to warn users when navigating away from a form with unsaved changes.
 *
 * Usage:
 * const { showWarning, confirmNavigation, cancelNavigation, handleNavigationAttempt } = useUnsavedChanges({ isDirty: formIsDirty })
 *
 * Then in your navigation handler:
 * if (!handleNavigationAttempt('/new-path')) return; // Will show warning if dirty
 */
export function useUnsavedChanges({ isDirty, onConfirmLeave }: UseUnsavedChangesOptions): UseUnsavedChangesReturn {
  const [showWarning, setShowWarning] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  // Handle browser back/forward/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    if (isDirty) {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDirty])

  const handleNavigationAttempt = useCallback((path: string): boolean => {
    if (isDirty) {
      setPendingNavigation(path)
      setShowWarning(true)
      return false // Block navigation
    }
    return true // Allow navigation
  }, [isDirty])

  const confirmNavigation = useCallback(() => {
    setShowWarning(false)
    if (onConfirmLeave) {
      onConfirmLeave()
    }
    if (pendingNavigation) {
      // Navigation will be handled by the component
      setPendingNavigation(null)
    }
  }, [pendingNavigation, onConfirmLeave])

  const cancelNavigation = useCallback(() => {
    setShowWarning(false)
    setPendingNavigation(null)
  }, [])

  return {
    showWarning,
    pendingNavigation,
    confirmNavigation,
    cancelNavigation,
    handleNavigationAttempt,
  }
}

export default useUnsavedChanges
