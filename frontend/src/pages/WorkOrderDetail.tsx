import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Play, Pause, CheckCircle, XCircle, UserPlus, Clock, History, Upload, X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import Breadcrumbs from '@/components/Breadcrumbs'

// Max file size in bytes (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_FILE_SIZE_MB = 5

interface WorkOrder {
  id: string
  title: string
  description: string | null
  type: string
  priority: string
  status: string
  asset_id: string
  asset_name: string
  assigned_to: string | null
  assigned_name: string | null
  created_by: string
  created_by_name: string
  resolution_notes: string | null
  completed_at: string | null
  due_date: string | null
  created_at: string
  updated_at: string | null
  history: HistoryEntry[]
}

interface HistoryEntry {
  id: string
  action: string
  old_value: string | null
  new_value: string | null
  note: string | null
  user_name: string
  created_at: string
}

interface AssignableUser {
  id: string
  name: string
  role: string
}

export default function WorkOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { accessToken, user } = useAuthStore()

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Assign modal state
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')

  // Complete modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [timeSpent, setTimeSpent] = useState('')
  const [completionError, setCompletionError] = useState<string | null>(null)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchWorkOrder()
  }, [id, accessToken])

  const fetchWorkOrder = async () => {
    if (!accessToken || !id) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/work-orders/${id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Work order not found')
        }
        throw new Error('Failed to fetch work order')
      }

      const data = await response.json()
      setWorkOrder(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchAssignableUsers = async () => {
    if (!accessToken) return

    try {
      const response = await fetch('/api/work-orders/users', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAssignableUsers(data)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  const handleStatusChange = async (newStatus: string, note?: string) => {
    if (!accessToken || !id) return

    setActionLoading(true)
    setError(null)

    try {
      const body: { status: string; note?: string; resolution_notes?: string; time_spent?: number } = { status: newStatus }
      if (note) body.note = note
      if (newStatus === 'completed' && resolutionNotes) {
        body.resolution_notes = resolutionNotes
        body.time_spent = parseFloat(timeSpent)
      }

      const response = await fetch(`/api/work-orders/${id}/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to change status')
      }

      setShowCompleteModal(false)
      setResolutionNotes('')
      await fetchWorkOrder()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAssign = async () => {
    if (!accessToken || !id || !selectedUserId) return

    setActionLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/work-orders/${id}/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assigned_to: selectedUserId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to assign work order')
      }

      setShowAssignModal(false)
      setSelectedUserId('')
      await fetchWorkOrder()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const openAssignModal = async () => {
    await fetchAssignableUsers()
    setShowAssignModal(true)
  }

  const openCompleteModal = () => {
    setShowCompleteModal(true)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Clear previous error and upload state
    setFileError(null)
    setUploadProgress(0)
    setIsUploading(false)
    setUploadComplete(false)

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit. Please select a smaller file or compress the current one.`)
      // Reset the input so user can try again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setAttachedFile(file)

    // Start upload with progress indicator
    await uploadFile(file)
  }

  const removeAttachedFile = () => {
    setAttachedFile(null)
    setFileError(null)
    setUploadProgress(0)
    setIsUploading(false)
    setUploadComplete(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Simulate file upload with progress (in real app, use XMLHttpRequest or fetch with progress)
  const uploadFile = async (file: File): Promise<void> => {
    setIsUploading(true)
    setUploadProgress(0)
    setUploadComplete(false)

    // Simulate upload progress over ~2 seconds
    const totalSteps = 20
    const stepDuration = 100 // ms per step

    for (let i = 0; i <= totalSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, stepDuration))
      setUploadProgress(Math.round((i / totalSteps) * 100))
    }

    setIsUploading(false)
    setUploadComplete(true)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
      case 'assigned': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'on_hold': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'closed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const canAssign = user?.role === 'admin' || user?.role === 'facility_manager'
  const canClose = user?.role === 'admin' || user?.role === 'facility_manager'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading work order...</div>
      </div>
    )
  }

  if (error && !workOrder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/work-orders" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" aria-label="Back to work orders">
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <h1 className="text-2xl font-bold">Work Order Details</h1>
        </div>
        <div role="alert" className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      </div>
    )
  }

  if (!workOrder) return null

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: 'Work Orders', path: '/work-orders' },
        { label: workOrder.title }
      ]} />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/work-orders" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" aria-label="Back to work orders">
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{workOrder.title}</h1>
          <p className="text-gray-500">{workOrder.type} - {workOrder.asset_name}</p>
        </div>

        {/* Action buttons based on status */}
        <div className="flex gap-2">
          {canAssign && (workOrder.status === 'open' || workOrder.status === 'assigned') && (
            <button
              onClick={openAssignModal}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <UserPlus size={20} />
              {workOrder.assigned_to ? 'Reassign' : 'Assign'}
            </button>
          )}

          {(workOrder.status === 'assigned' || workOrder.status === 'on_hold') && (
            <button
              onClick={() => handleStatusChange('in_progress', 'Started work')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              <Play size={20} />
              {workOrder.status === 'on_hold' ? 'Resume' : 'Start Work'}
            </button>
          )}

          {workOrder.status === 'in_progress' && (
            <>
              <button
                onClick={() => handleStatusChange('on_hold', 'Put on hold')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <Pause size={20} />
                Hold
              </button>
              <button
                onClick={openCompleteModal}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                <CheckCircle size={20} />
                Complete
              </button>
            </>
          )}

          {workOrder.status === 'completed' && canClose && (
            <button
              onClick={() => handleStatusChange('closed', 'Work order closed')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
            >
              <XCircle size={20} />
              Close
            </button>
          )}

          <button
            onClick={() => navigate(`/work-orders/${id}/edit`)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Edit size={20} />
            Edit
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div role="alert" className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Work Order Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Work Order Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(workOrder.status)}`}>
                {workOrder.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Priority</label>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(workOrder.priority)}`}>
                {workOrder.priority}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Type</label>
              <p>{workOrder.type}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
              <p className="text-gray-700 dark:text-gray-300">{workOrder.description || 'No description'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Asset</label>
              <Link to={`/assets/${workOrder.asset_id}`} className="text-primary hover:underline">
                {workOrder.asset_name}
              </Link>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Due Date</label>
              <p>{workOrder.due_date || 'Not set'}</p>
            </div>
          </div>
        </div>

        {/* Assignment & Completion */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Assignment & Completion</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Assigned To</label>
              <p>{workOrder.assigned_name || 'Unassigned'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Created By</label>
              <p>{workOrder.created_by_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Created At</label>
              <p>{formatDate(workOrder.created_at)}</p>
            </div>
            {workOrder.completed_at && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Completed At</label>
                <p>{formatDate(workOrder.completed_at)}</p>
              </div>
            )}
            {workOrder.resolution_notes && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Resolution Notes</label>
                <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                  {workOrder.resolution_notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <History size={20} />
          History
        </h2>
        {workOrder.history && workOrder.history.length > 0 ? (
          <div className="space-y-4">
            {workOrder.history.map((entry) => (
              <div key={entry.id} className="flex gap-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                <div className="flex-shrink-0">
                  <Clock size={16} className="text-gray-400 mt-1" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{entry.action.replace('_', ' ')}</span>
                    {entry.old_value && entry.new_value && (
                      <span className="text-sm text-gray-500">
                        {entry.old_value} → {entry.new_value}
                      </span>
                    )}
                  </div>
                  {entry.note && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{entry.note}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {entry.user_name} - {formatDate(entry.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No history available</p>
        )}
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Assign Work Order</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select User</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="">Select a user...</option>
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!selectedUserId || actionLoading}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {actionLoading ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Complete Work Order</h2>
            <div className="space-y-4">
              {completionError && (
                <div role="alert" className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  {completionError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Resolution Notes <span className="text-red-500">*</span></label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => {
                    setResolutionNotes(e.target.value)
                    setCompletionError(null)
                  }}
                  placeholder="Describe how the work was completed (minimum 50 characters)..."
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 ${
                    resolutionNotes.length > 0 && resolutionNotes.length < 50
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : ''
                  }`}
                />
                <p className={`text-sm mt-1 ${
                  resolutionNotes.length >= 50
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-500'
                }`}>
                  {resolutionNotes.length}/50 characters minimum
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time Spent (hours) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={timeSpent}
                  onChange={(e) => {
                    setTimeSpent(e.target.value)
                    setCompletionError(null)
                  }}
                  placeholder="Enter time spent in hours"
                  step="0.5"
                  min="0.5"
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 ${
                    timeSpent !== '' && (parseFloat(timeSpent) <= 0 || isNaN(parseFloat(timeSpent)))
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : ''
                  }`}
                />
              </div>
              {/* File Attachment Section */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Attachment <span className="text-gray-400">(optional, max {MAX_FILE_SIZE_MB}MB)</span>
                </label>

                {/* File Error Message */}
                {fileError && (
                  <div role="alert" className="p-3 mb-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm flex items-start gap-2">
                    <XCircle size={18} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">File too large!</span>
                      <p>{fileError}</p>
                    </div>
                  </div>
                )}

                {/* File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />

                {!attachedFile ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary dark:hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400"
                  >
                    <Upload size={20} />
                    <span>Click to upload a file</span>
                  </button>
                ) : isUploading ? (
                  /* Upload Progress Indicator */
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Upload size={18} className="text-blue-600 dark:text-blue-400 animate-pulse" />
                        <span className="text-sm font-medium truncate max-w-[200px]">{attachedFile.name}</span>
                      </div>
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{uploadProgress}%</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-100 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                        role="progressbar"
                        aria-valuenow={uploadProgress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="File upload progress"
                      />
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Uploading file...</p>
                  </div>
                ) : uploadComplete ? (
                  /* Upload Complete State */
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium truncate max-w-[200px]">{attachedFile.name}</span>
                      <span className="text-xs text-gray-500">({formatFileSize(attachedFile.size)})</span>
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Upload complete!</span>
                    </div>
                    <button
                      type="button"
                      onClick={removeAttachedFile}
                      className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  /* File Attached but not uploading yet - fallback */
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium truncate max-w-[200px]">{attachedFile.name}</span>
                      <span className="text-xs text-gray-500">({formatFileSize(attachedFile.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={removeAttachedFile}
                      className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowCompleteModal(false)
                    setCompletionError(null)
                    setResolutionNotes('')
                    setTimeSpent('')
                    setAttachedFile(null)
                    setFileError(null)
                    setUploadProgress(0)
                    setIsUploading(false)
                    setUploadComplete(false)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Validate resolution notes
                    if (resolutionNotes.length < 50) {
                      setCompletionError('Resolution notes must be at least 50 characters')
                      return
                    }
                    // Validate time spent
                    const timeSpentValue = parseFloat(timeSpent)
                    if (!timeSpent || isNaN(timeSpentValue) || timeSpentValue <= 0) {
                      setCompletionError('Time spent must be provided and greater than 0')
                      return
                    }
                    handleStatusChange('completed', 'Work completed')
                  }}
                  disabled={actionLoading || resolutionNotes.length < 50 || !timeSpent || parseFloat(timeSpent) <= 0}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Completing...' : 'Mark Complete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
