import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Filter, Edit, Trash2, Eye } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

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

export default function Assets() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { accessToken } = useAuthStore()

  useEffect(() => {
    fetchAssets()
  }, [search, typeFilter, statusFilter, accessToken])

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Assets</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
          <Plus size={20} />
          Add Asset
        </button>
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
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  Loading assets...
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
    </div>
  )
}
