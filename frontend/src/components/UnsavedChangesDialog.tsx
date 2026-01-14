import { AlertTriangle } from 'lucide-react'

interface UnsavedChangesDialogProps {
  isOpen: boolean
  onStay: () => void
  onLeave: () => void
}

export default function UnsavedChangesDialog({ isOpen, onStay, onLeave }: UnsavedChangesDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-bold">Unsaved Changes</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onStay}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"
          >
            Stay
          </button>
          <button
            onClick={onLeave}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  )
}
