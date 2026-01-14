import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Plus, Filter, X, Loader2, Download, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import Breadcrumbs from '@/components/Breadcrumbs'

const ITEMS_PER_PAGE = 5

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
  due_date: string | null
  created_at: string
  completed_at: string | null
  completed_by: string | null
  completed_by_name: string | null
  resolution_notes: string | null
}

interface Asset {
  id: string
  name: string
}

export default function WorkOrders() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sort_by') || '')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc'
  )
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1', 10))
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { accessToken, user } = useAuthStore()

  // Executive users cannot export CSV
  const canExportCSV = user?.role !== 'executive'

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formAssetId, setFormAssetId] = useState('')
  const [formPriority, setFormPriority] = useState('medium')
  const [formType, setFormType] = useState('reactive')
  const [formDueDate, setFormDueDate] = useState('')

  // Handle column header click for sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, start with ascending
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  // Render sort icon for column header
  const renderSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ChevronsUpDown size={14} className="text-gray-400" />
    }
    return sortOrder === 'asc'
      ? <ChevronUp size={14} className="text-primary" />
      : <ChevronDown size={14} className="text-primary" />
  }

  // Update URL when sort or page changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (sortBy) {
      params.set('sort_by', sortBy)
      params.set('sort_order', sortOrder)
    } else {
      params.delete('sort_by')
      params.delete('sort_order')
    }
    if (currentPage > 1) {
      params.set('page', currentPage.toString())
    } else {
      params.delete('page')
    }
    setSearchParams(params, { replace: true })
  }, [sortBy, sortOrder, currentPage])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, priorityFilter])

  useEffect(() => {
    fetchWorkOrders()
    fetchAssets()
  }, [accessToken, search, statusFilter, priorityFilter, sortBy, sortOrder, currentPage])

  const fetchWorkOrders = async () => {
    if (!accessToken) return
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)
      if (priorityFilter) params.append('priority', priorityFilter)
      if (sortBy) {
        params.append('sort_by', sortBy)
        params.append('sort_order', sortOrder)
      }
      params.append('skip', ((currentPage - 1) * ITEMS_PER_PAGE).toString())
      params.append('limit', ITEMS_PER_PAGE.toString())

      const response = await fetch(`/api/work-orders?${params}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })

      if (!response.ok) throw new Error('Failed to fetch work orders')

      const data = await response.json()
      // Handle both paginated response and array response
      if (Array.isArray(data)) {
        setWorkOrders(data)
        setTotalCount(data.length)
      } else {
        setWorkOrders(data.items || [])
        setTotalCount(data.total || 0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchAssets = async () => {
    if (!accessToken) return
    try {
      const response = await fetch('/api/assets', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })
      if (response.ok) {
        const data = await response.json()
        setAssets(data)
      }
    } catch (err) {
      console.error('Failed to fetch assets:', err)
    }
  }

  // Export work orders to CSV
  const handleExportCSV = () => {
    if (workOrders.length === 0) {
      alert('No work orders to export')
      return
    }

    // Build CSV with all relevant data including status, assignee, and resolution
    let csvContent = 'ID,Title,Description,Type,Priority,Status,Asset,Assigned To,Due Date,Created At,Completed At,Completed By,Resolution Notes\n'

    for (const wo of workOrders) {
      const row = [
        wo.id,
        `"${(wo.title || '').replace(/"/g, '""')}"`,
        `"${(wo.description || '').replace(/"/g, '""')}"`,
        wo.type,
        wo.priority,
        wo.status,
        `"${(wo.asset_name || '').replace(/"/g, '""')}"`,
        wo.assigned_name || '',
        wo.due_date || '',
        wo.created_at,
        wo.completed_at || '',
        wo.completed_by_name || '',
        `"${(wo.resolution_notes || '').replace(/"/g, '""')}"`
      ]
      csvContent += row.join(',') + '\n'
    }

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url

    // Include filter info in filename
    let filename = 'work-orders'
    if (statusFilter) filename += `-${statusFilter}`
    if (priorityFilter) filename += `-${priorityFilter}`
    filename += `-${new Date().toISOString().split('T')[0]}.csv`

    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim() || !formAssetId) {
      setError('Title and Asset are required')
      return
    }

    try {
      const response = await fetch('/api/work-orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription?.trim() || null,
          asset_id: formAssetId,
          priority: formPriority,
          type: formType,
          due_date: formDueDate || null,
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || 'Failed to create work order')
      }

      toast({
        title: 'Work Order Created',
        description: 'Work order has been created successfully',
        variant: 'success',
      })
      setShowCreateModal(false)
      resetForm()
      fetchWorkOrders()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create work order',
        variant: 'error',
      })
    }
  }

  const resetForm = () => {
    setFormTitle('')
    setFormDescription('')
    setFormAssetId('')
    setFormPriority('medium')
    setFormType('reactive')
    setFormDueDate('')
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'assigned': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'on_hold': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setPriorityFilter('')
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: 'Work Orders' }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Work Orders</h1>
        <div className="flex items-center gap-2">
          {canExportCSV && (
            <button
              onClick={handleExportCSV}
              disabled={loading || workOrders.length === 0}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <Download size={20} />
              Export CSV
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Plus size={20} />
            Create Work Order
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search work orders..."
            aria-label="Search work orders"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
          />
        </div>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="closed">Closed</option>
        </select>
        <select
          aria-label="Filter by priority"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
        >
          <option value="">All Priority</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button
          onClick={clearFilters}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Filter size={20} />
          Clear Filters
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div role="alert" className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Work Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center gap-1">
                  Title {renderSortIcon('title')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                onClick={() => handleSort('priority')}
              >
                <div className="flex items-center gap-1">
                  Priority {renderSortIcon('priority')}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status {renderSortIcon('status')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                onClick={() => handleSort('due_date')}
              >
                <div className="flex items-center gap-1">
                  Due Date {renderSortIcon('due_date')}
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-gray-500">Loading work orders...</span>
                  </div>
                </td>
              </tr>
            ) : workOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  No work orders found. Click "Create Work Order" to create your first work order.
                </td>
              </tr>
            ) : (
              workOrders.map((wo) => (
                <tr key={wo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {wo.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{wo.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{wo.asset_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadgeClass(wo.priority)}`}>
                      {wo.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(wo.status)}`}>
                      {wo.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{wo.assigned_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{wo.due_date || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button onClick={() => navigate(`/work-orders/${wo.id}`)} className="text-blue-600 hover:text-blue-800">View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalCount > ITEMS_PER_PAGE && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} work orders
              {` (Page ${currentPage} of ${Math.ceil(totalCount / ITEMS_PER_PAGE)})`}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.ceil(totalCount / ITEMS_PER_PAGE) }, (_, i) => i + 1)
                  .filter(page => {
                    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
                    if (totalPages <= 7) return true
                    if (page === 1 || page === totalPages) return true
                    if (Math.abs(page - currentPage) <= 1) return true
                    return false
                  })
                  .map((page, idx, arr) => (
                    <span key={page}>
                      {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded ${
                          page === currentPage
                            ? 'bg-primary text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    </span>
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
          </div>
        )}
      </div>

      {/* Create Work Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create Work Order</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateWorkOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  placeholder="Enter work order title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Asset *</label>
                <select
                  value={formAssetId}
                  onChange={(e) => setFormAssetId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  required
                >
                  <option value="">Select an asset</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>{asset.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="reactive">Reactive</option>
                  <option value="preventive">Preventive</option>
                  <option value="inspection">Inspection</option>
                  <option value="corrective">Corrective</option>
                </select>
              </div>
              <div>
                <label htmlFor="due-date" className="block text-sm font-medium mb-1">Due Date</label>
                <input
                  id="due-date"
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  rows={3}
                  placeholder="Enter description (optional)"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
