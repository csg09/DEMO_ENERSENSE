import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Filter, Edit, Trash2, Eye, X, Loader2, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import Breadcrumbs from '@/components/Breadcrumbs'

interface Asset {
  id: string
  name: string
  type: string
  type_id: string
  site: string
  site_id: string
  status: string
  criticality: string
  manufacturer: string | null
  model: string | null
  health: number
  sensor_count: number
}

interface AssetType {
  id: string
  name: string
}

interface Site {
  id: string
  name: string
}

export default function Assets() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { accessToken, user } = useAuthStore()

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [formName, setFormName] = useState('')
  const [formAssetTypeId, setFormAssetTypeId] = useState('')
  const [formSiteId, setFormSiteId] = useState('')
  const [formStatus, setFormStatus] = useState('active')
  const [formCriticality, setFormCriticality] = useState('medium')
  const [formManufacturer, setFormManufacturer] = useState('')
  const [formModel, setFormModel] = useState('')
  const [formSerialNumber, setFormSerialNumber] = useState('')
  const [formCapacity, setFormCapacity] = useState('')
  const [creating, setCreating] = useState(false)

  const canManageAssets = user?.role === 'admin' || user?.role === 'facility_manager'

  // Unsaved changes dialog state
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  // Check if form has unsaved changes (is "dirty")
  const isFormDirty = useCallback(() => {
    if (!showCreateModal) return false
    return !!(
      formName ||
      formManufacturer ||
      formModel ||
      formSerialNumber ||
      formCapacity
    )
  }, [showCreateModal, formName, formManufacturer, formModel, formSerialNumber, formCapacity])

  // Handle beforeunload event for browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormDirty()) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isFormDirty])

  // Intercept navigation clicks when form is dirty
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href]') as HTMLAnchorElement
      if (link && isFormDirty()) {
        const href = link.getAttribute('href')
        // Only intercept internal navigation
        if (href && href.startsWith('/') && !href.startsWith(window.location.pathname)) {
          e.preventDefault()
          e.stopPropagation()
          setPendingNavigation(href)
          setShowUnsavedDialog(true)
        }
      }
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [isFormDirty])

  // Handle confirming leave (proceed with navigation)
  const handleConfirmLeave = () => {
    setShowCreateModal(false)
    setShowUnsavedDialog(false)
    if (pendingNavigation) {
      navigate(pendingNavigation)
      setPendingNavigation(null)
    }
  }

  // Handle staying (cancel navigation)
  const handleStay = () => {
    setShowUnsavedDialog(false)
    setPendingNavigation(null)
  }

  useEffect(() => {
    fetchAssets()
  }, [search, typeFilter, statusFilter, accessToken])

  useEffect(() => {
    if (showCreateModal) {
      fetchAssetTypes()
      fetchSites()
    }
  }, [showCreateModal, accessToken])

  const fetchAssetTypes = async () => {
    if (!accessToken) return
    try {
      const response = await fetch('/api/assets/types', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })
      if (response.ok) {
        const data = await response.json()
        setAssetTypes(data)
        if (data.length > 0 && !formAssetTypeId) {
          setFormAssetTypeId(data[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch asset types:', err)
    }
  }

  const fetchSites = async () => {
    if (!accessToken) return
    try {
      const response = await fetch('/api/sites', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })
      if (response.ok) {
        const data = await response.json()
        setSites(data)
        if (data.length > 0 && !formSiteId) {
          setFormSiteId(data[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch sites:', err)
    }
  }

  const fetchAssets = async () => {
    if (!accessToken) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (typeFilter) params.append('asset_type_id', typeFilter)
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/assets?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch assets')
      }

      const data = await response.json()
      setAssets(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-green-600'
    if (health >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }


  const handleViewAsset = (assetId: string) => {
    navigate(`/assets/${assetId}`)
  }

  const handleEditAsset = (assetId: string) => {
    navigate(`/assets/${assetId}?edit=true`)
  }

  const handleDeleteAsset = async (assetId: string, assetName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${assetName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to delete asset')
      }

      // Remove the asset from the local state
      setAssets(assets.filter(a => a.id !== assetId))
      toast({ title: 'Asset deleted', description: 'Asset deleted successfully', variant: 'success' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while deleting')
    }
  }

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formAssetTypeId || !formSiteId) {
      setError('Name, asset type, and site are required')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formName.trim(),
          asset_type_id: formAssetTypeId,
          site_id: formSiteId,
          status: formStatus,
          criticality: formCriticality,
          manufacturer: formManufacturer || null,
          model: formModel || null,
          serial_number: formSerialNumber || null,
          capacity: formCapacity || null,
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || 'Failed to create asset')
      }

      toast({ title: 'Asset created', description: 'Asset created successfully', variant: 'success' })
      setShowCreateModal(false)
      resetForm()
      fetchAssets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create asset')
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setFormName('')
    setFormAssetTypeId('')
    setFormSiteId('')
    setFormStatus('active')
    setFormCriticality('medium')
    setFormManufacturer('')
    setFormModel('')
    setFormSerialNumber('')
    setFormCapacity('')
  }

  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: 'Assets' }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Assets</h1>
        {canManageAssets && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Plus size={20} />
            Add Asset
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search assets..."
            aria-label="Search assets"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
          />
        </div>
        <select
          aria-label="Filter by asset type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
        >
          <option value="">All Types</option>
          <option value="chiller">Chiller</option>
          <option value="ahu">AHU</option>
          <option value="pump">Pump</option>
        </select>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
          <Filter size={20} />
          More Filters
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div role="alert" className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Assets Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Health</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-gray-500">Loading assets...</span>
                  </div>
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No assets found. Click "Add Asset" to create your first asset.
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium">{asset.name}</div>
                    {asset.manufacturer && (
                      <div className="text-sm text-gray-500">{asset.manufacturer} {asset.model}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{asset.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{asset.site}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(asset.status)}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`font-medium ${getHealthColor(asset.health)}`}>
                      {asset.health}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleViewAsset(asset.id)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                        title="View"
                        aria-label="View asset"
                      >
                        <Eye size={18} className="text-gray-500" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => handleEditAsset(asset.id)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                        title="Edit"
                        aria-label="Edit asset"
                      >
                        <Edit size={18} className="text-gray-500" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => handleDeleteAsset(asset.id, asset.name)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                        title="Delete"
                        aria-label="Delete asset"
                      >
                        <Trash2 size={18} className="text-red-500" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Unsaved Changes Warning Dialog */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h2 className="text-xl font-bold">Unsaved Changes</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              You have unsaved changes in your form. If you leave now, your changes will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmLeave}
                className="flex-1 px-4 py-2 border border-red-500 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Leave
              </button>
              <button
                onClick={handleStay}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Stay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Asset Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add New Asset</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateAsset} className="space-y-4">
              <div>
                <label htmlFor="asset-name" className="block text-sm font-medium mb-1">Name *</label>
                <input
                  id="asset-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  placeholder="Enter asset name"
                  required
                />
              </div>
              <div>
                <label htmlFor="asset-type" className="block text-sm font-medium mb-1">Asset Type *</label>
                <select
                  id="asset-type"
                  value={formAssetTypeId}
                  onChange={(e) => setFormAssetTypeId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  required
                >
                  <option value="">Select asset type</option>
                  {assetTypes.map(at => (
                    <option key={at.id} value={at.id}>{at.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="asset-site" className="block text-sm font-medium mb-1">Site *</label>
                <select
                  id="asset-site"
                  value={formSiteId}
                  onChange={(e) => setFormSiteId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  required
                >
                  <option value="">Select site</option>
                  {sites.map(site => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="asset-status" className="block text-sm font-medium mb-1">Status</label>
                <select
                  id="asset-status"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <label htmlFor="asset-criticality" className="block text-sm font-medium mb-1">Criticality</label>
                <select
                  id="asset-criticality"
                  value={formCriticality}
                  onChange={(e) => setFormCriticality(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label htmlFor="asset-manufacturer" className="block text-sm font-medium mb-1">Manufacturer</label>
                <input
                  id="asset-manufacturer"
                  type="text"
                  value={formManufacturer}
                  onChange={(e) => setFormManufacturer(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  placeholder="Enter manufacturer"
                />
              </div>
              <div>
                <label htmlFor="asset-model" className="block text-sm font-medium mb-1">Model</label>
                <input
                  id="asset-model"
                  type="text"
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  placeholder="Enter model"
                />
              </div>
              <div>
                <label htmlFor="asset-serial" className="block text-sm font-medium mb-1">Serial Number</label>
                <input
                  id="asset-serial"
                  type="text"
                  value={formSerialNumber}
                  onChange={(e) => setFormSerialNumber(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  placeholder="Enter serial number"
                />
              </div>
              <div>
                <label htmlFor="asset-capacity" className="block text-sm font-medium mb-1">Capacity</label>
                <input
                  id="asset-capacity"
                  type="text"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  placeholder="Enter capacity (e.g., 500 tons)"
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
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
