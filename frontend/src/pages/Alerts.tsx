import { useState, useEffect } from 'react'
import { Search, Filter, CheckCircle, Eye, Plus, Loader2, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import Breadcrumbs from '@/components/Breadcrumbs'

interface Asset {
  id: string
  name: string
}

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
}

const ITEMS_PER_PAGE = 5

export default function Alerts() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1', 10))

  // Initialize state from URL search params
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [severityFilter, setSeverityFilter] = useState(searchParams.get('severity') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const navigate = useNavigate()
  const { accessToken, user } = useAuthStore()

  // Executive users cannot export CSV
  const canExportCSV = user?.role !== 'executive'

  // Update URL when filters or page change
  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (severityFilter) params.set('severity', severityFilter)
    if (statusFilter) params.set('status', statusFilter)
    if (currentPage > 1) params.set('page', currentPage.toString())
    setSearchParams(params, { replace: true })
  }, [search, severityFilter, statusFilter, currentPage, setSearchParams])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, severityFilter, statusFilter])

  // Create alert modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [assets, setAssets] = useState<Asset[]>([])
  const [newAlertTitle, setNewAlertTitle] = useState('')
  const [newAlertDescription, setNewAlertDescription] = useState('')
  const [newAlertAssetId, setNewAlertAssetId] = useState('')
  const [newAlertSeverity, setNewAlertSeverity] = useState('medium')
  const [creating, setCreating] = useState(false)

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (severityFilter) params.append('severity', severityFilter)
      if (statusFilter) params.append('status', statusFilter)
      params.append('skip', ((currentPage - 1) * ITEMS_PER_PAGE).toString())
      params.append('limit', ITEMS_PER_PAGE.toString())

      const response = await fetch(`/api/alerts?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch alerts')
      }

      const data = await response.json()
      // API returns { items: [], total: number } with pagination
      if (Array.isArray(data)) {
        // Old API format without pagination
        setAlerts(data)
        setTotalCount(data.length)
      } else {
        // New API format with pagination
        setAlerts(data.items || [])
        setTotalCount(data.total || 0)
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [search, severityFilter, statusFilter, currentPage])

  const handleAcknowledge = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        throw new Error('Failed to acknowledge alert')
      }

      // Refresh alerts and notify header
      fetchAlerts()
      window.dispatchEvent(new CustomEvent('alert-change'))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to acknowledge alert')
    }
  }

  const handleResolve = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        throw new Error('Failed to resolve alert')
      }

      // Refresh alerts and notify header
      fetchAlerts()
      window.dispatchEvent(new CustomEvent('alert-change'))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to resolve alert')
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
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const clearFilters = () => {
    setSearch('')
    setSeverityFilter('')
    setStatusFilter('')
  }

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/assets', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setAssets(data)
      }
    } catch (err) {
      console.error('Failed to fetch assets:', err)
    }
  }

  const openCreateModal = async () => {
    await fetchAssets()
    setShowCreateModal(true)
  }

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAlertTitle.trim() || !newAlertAssetId) return

    setCreating(true)
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newAlertTitle.trim(),
          description: newAlertDescription || null,
          asset_id: newAlertAssetId,
          severity: newAlertSeverity
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create alert')
      }

      // Reset form and close modal
      setNewAlertTitle('')
      setNewAlertDescription('')
      setNewAlertAssetId('')
      setNewAlertSeverity('medium')
      setShowCreateModal(false)

      // Refresh alerts and notify header
      fetchAlerts()
      window.dispatchEvent(new CustomEvent('alert-change'))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create alert')
    } finally {
      setCreating(false)
    }
  }

  // Export filtered alerts to CSV
  const handleExportCSV = async () => {
    try {
      // Fetch ALL filtered alerts (not just current page) for export
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (severityFilter) params.append('severity', severityFilter)
      if (statusFilter) params.append('status', statusFilter)
      params.append('skip', '0')
      params.append('limit', '10000') // Get all matching alerts

      const response = await fetch(`/api/alerts?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch alerts for export')
      }

      const data = await response.json()
      const exportAlerts = Array.isArray(data) ? data : (data.items || [])

      if (exportAlerts.length === 0) {
        alert('No alerts to export')
        return
      }

      // Build CSV content
      let csvContent = 'ID,Title,Description,Severity,Status,Asset,Triggered At,Acknowledged By,Acknowledged At,Resolved At\n'

      for (const alert of exportAlerts) {
        const row = [
          alert.id,
          `"${(alert.title || '').replace(/"/g, '""')}"`,
          `"${(alert.description || '').replace(/"/g, '""')}"`,
          alert.severity,
          alert.status,
          `"${(alert.asset_name || '').replace(/"/g, '""')}"`,
          alert.triggered_at,
          alert.acknowledged_by_name || '',
          alert.acknowledged_at || '',
          alert.resolved_at || ''
        ]
        csvContent += row.join(',') + '\n'
      }

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      // Include filter info in filename
      let filename = 'alerts'
      if (severityFilter) filename += `-${severityFilter}`
      if (statusFilter) filename += `-${statusFilter}`
      filename += `-${new Date().toISOString().split('T')[0]}.csv`

      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export alerts')
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: 'Alerts' }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Alerts</h1>
        <div className="flex items-center gap-2">
          {canExportCSV && (
            <button
              onClick={handleExportCSV}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <Download size={20} />
              Export CSV
            </button>
          )}
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Plus size={20} />
            Create Test Alert
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search alerts..."
            aria-label="Search alerts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
          />
        </div>
        <select
          aria-label="Filter by severity"
          className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
        >
          <option value="">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          aria-label="Filter by status"
          className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <button
          onClick={clearFilters}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Filter size={20} />
          Clear Filters
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div role="alert" className="p-4 bg-red-100 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      {/* Alerts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-x-auto">
        {/* Pagination info */}
        {totalCount > 0 && (
          <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-500">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} alerts
            {totalCount > ITEMS_PER_PAGE && ` (Page ${currentPage} of ${Math.ceil(totalCount / ITEMS_PER_PAGE)})`}
          </div>
        )}
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Triggered</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acknowledged By</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-gray-500">Loading alerts...</span>
                  </div>
                </td>
              </tr>
            ) : alerts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No alerts to display.
                </td>
              </tr>
            ) : (
              alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{alert.title}</div>
                    {alert.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">{alert.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{alert.asset_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(alert.status)}`}>
                      {alert.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(alert.triggered_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {alert.acknowledged_by_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      {alert.status === 'open' && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="flex items-center gap-1 px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                        >
                          <CheckCircle size={16} />
                          Acknowledge
                        </button>
                      )}
                      {(alert.status === 'open' || alert.status === 'acknowledged') && (
                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="flex items-center gap-1 px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          <CheckCircle size={16} />
                          Resolve
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/alerts/${alert.id}`)}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        <Eye size={16} />
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {totalCount > ITEMS_PER_PAGE && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.ceil(totalCount / ITEMS_PER_PAGE) }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded ${
                    page === currentPage
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / ITEMS_PER_PAGE), p + 1))}
              disabled={currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)}
              className="flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Create Alert Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create Test Alert</h2>
            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={newAlertTitle}
                  onChange={(e) => setNewAlertTitle(e.target.value)}
                  placeholder="Alert title"
                  required
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newAlertDescription}
                  onChange={(e) => setNewAlertDescription(e.target.value)}
                  placeholder="Alert description"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Asset *</label>
                <select
                  value={newAlertAssetId}
                  onChange={(e) => setNewAlertAssetId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="">Select an asset...</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Severity</label>
                <select
                  value={newAlertSeverity}
                  onChange={(e) => setNewAlertSeverity(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newAlertTitle || !newAlertAssetId}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
