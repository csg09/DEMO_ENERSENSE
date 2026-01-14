import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Check, ClipboardList, XCircle, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import Breadcrumbs from '@/components/Breadcrumbs'

interface Alert {
  id: string
  title: string
  description: string | null
  severity: string
  status: string
  asset_id: string
  asset_name: string
  triggered_at: string
  triggered_value: number | null
  acknowledged_at: string | null
  acknowledged_by: string | null
  acknowledged_by_name: string | null
  resolved_at: string | null
  resolution_notes: string | null
}

export default function AlertDetail() {
  const { id } = useParams()
  const { accessToken } = useAuthStore()

  const [alert, setAlert] = useState<Alert | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Create work order modal state
  const [showCreateWOModal, setShowCreateWOModal] = useState(false)
  const [woTitle, setWoTitle] = useState('')
  const [woDescription, setWoDescription] = useState('')
  const [woPriority, setWoPriority] = useState('medium')

  useEffect(() => {
    fetchAlert()
  }, [id, accessToken])

  const fetchAlert = async () => {
    if (!accessToken || !id) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/alerts/${id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Alert not found')
        }
        throw new Error('Failed to fetch alert')
      }

      const data = await response.json()
      setAlert(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledge = async () => {
    if (!accessToken || !id) return

    setActionLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/alerts/${id}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to acknowledge alert')
      }

      setSuccessMessage('Alert acknowledged')
      await fetchAlert()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResolve = async () => {
    if (!accessToken || !id) return

    setActionLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/alerts/${id}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to resolve alert')
      }

      setSuccessMessage('Alert resolved')
      await fetchAlert()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const handleClose = async () => {
    if (!accessToken || !id) return

    setActionLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/alerts/${id}/close`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to close alert')
      }

      setSuccessMessage('Alert closed')
      await fetchAlert()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateWorkOrder = async () => {
    if (!accessToken || !id) return

    setActionLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/alerts/${id}/create-work-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: woTitle || undefined,
          description: woDescription || undefined,
          priority: woPriority,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to create work order')
      }

      const data = await response.json()
      setSuccessMessage(`Work order created: ${data.work_order_title}`)
      setShowCreateWOModal(false)
      setWoTitle('')
      setWoDescription('')
      setWoPriority('medium')
      await fetchAlert()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'closed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading alert...</div>
      </div>
    )
  }

  if (error && !alert) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/alerts" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" aria-label="Back to alerts">
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <h1 className="text-2xl font-bold">Alert Details</h1>
        </div>
        <div role="alert" className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      </div>
    )
  }

  if (!alert) return null

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: 'Alerts', path: '/alerts' },
        { label: alert.title }
      ]} />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/alerts" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" aria-label="Back to alerts">
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{alert.title}</h1>
          <p className="text-gray-500">{alert.asset_name}</p>
        </div>

        {/* Action buttons based on status */}
        <div className="flex gap-2">
          {alert.status === 'open' && (
            <button
              onClick={handleAcknowledge}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
            >
              <Check size={20} />
              Acknowledge
            </button>
          )}

          {(alert.status === 'open' || alert.status === 'acknowledged') && (
            <button
              onClick={() => setShowCreateWOModal(true)}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              <ClipboardList size={20} />
              Create Work Order
            </button>
          )}

          {(alert.status === 'open' || alert.status === 'acknowledged' || alert.status === 'in_progress') && (
            <button
              onClick={handleResolve}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              <CheckCircle size={20} />
              Resolve
            </button>
          )}

          {alert.status === 'resolved' && (
            <button
              onClick={handleClose}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
            >
              <XCircle size={20} />
              Close
            </button>
          )}
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div role="alert" className="flex items-center gap-2 p-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg">
          <CheckCircle size={20} />
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div role="alert" className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Alert Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Alert Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(alert.status)}`}>
                {alert.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Severity</label>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getSeverityColor(alert.severity)}`}>
                {alert.severity}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
              <p className="text-gray-700 dark:text-gray-300">{alert.description || 'No description'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Asset</label>
              <Link to={`/assets/${alert.asset_id}`} className="text-primary hover:underline">
                {alert.asset_name}
              </Link>
            </div>
            {alert.triggered_value && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Triggered Value</label>
                <p>{alert.triggered_value}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Triggered At</label>
              <p>{formatDate(alert.triggered_at)}</p>
            </div>
          </div>
        </div>

        {/* Response Info */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Response</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Acknowledged By</label>
              <p>{alert.acknowledged_by_name || 'Not acknowledged'}</p>
            </div>
            {alert.acknowledged_at && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Acknowledged At</label>
                <p>{formatDate(alert.acknowledged_at)}</p>
              </div>
            )}
            {alert.resolved_at && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Resolved At</label>
                <p>{formatDate(alert.resolved_at)}</p>
              </div>
            )}
            {alert.resolution_notes && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Resolution Notes</label>
                <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                  {alert.resolution_notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Work Order Modal */}
      {showCreateWOModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create Work Order from Alert</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title (optional)</label>
                <input
                  type="text"
                  value={woTitle}
                  onChange={(e) => setWoTitle(e.target.value)}
                  placeholder={`Alert: ${alert.title}`}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea
                  value={woDescription}
                  onChange={(e) => setWoDescription(e.target.value)}
                  placeholder="Work order description..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  value={woPriority}
                  onChange={(e) => setWoPriority(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCreateWOModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateWorkOrder}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create Work Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
