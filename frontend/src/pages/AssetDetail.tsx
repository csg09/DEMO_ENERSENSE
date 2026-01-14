import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Save, X, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import Breadcrumbs, { BreadcrumbItem } from '@/components/Breadcrumbs'

interface Asset {
  id: string
  name: string
  type: string | null
  type_id: string
  site: string | null
  site_id: string
  system: string | null
  system_id: string | null
  status: string
  criticality: string
  manufacturer: string | null
  model: string | null
  serial_number: string | null
  install_date: string | null
  capacity: string | null
  metadata: Record<string, unknown> | null
  health: number
  sensors: Array<{
    id: string
    name: string
    type: string
    unit: string
  }>
  created_at: string | null
  updated_at: string | null
}

interface EditFormData {
  name: string
  status: string
  criticality: string
  manufacturer: string
  model: string
  serial_number: string
  capacity: string
}

export default function AssetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { accessToken } = useAuthStore()

  const [asset, setAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditFormData>({
    name: '',
    status: '',
    criticality: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    capacity: ''
  })

  useEffect(() => {
    fetchAsset()
  }, [id, accessToken])

  // Check if edit=true query param is present to auto-enter edit mode
  useEffect(() => {
    if (searchParams.get('edit') === 'true' && asset) {
      setIsEditing(true)
    }
  }, [searchParams, asset])

  const fetchAsset = async () => {
    if (!accessToken || !id) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/assets/${id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Asset not found')
        }
        throw new Error('Failed to fetch asset')
      }

      const data = await response.json()
      setAsset(data)
      setEditForm({
        name: data.name || '',
        status: data.status || '',
        criticality: data.criticality || '',
        manufacturer: data.manufacturer || '',
        model: data.model || '',
        serial_number: data.serial_number || '',
        capacity: data.capacity || ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setSuccessMessage(null)
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (asset) {
      setEditForm({
        name: asset.name || '',
        status: asset.status || '',
        criticality: asset.criticality || '',
        manufacturer: asset.manufacturer || '',
        model: asset.model || '',
        serial_number: asset.serial_number || '',
        capacity: asset.capacity || ''
      })
    }
  }

  const handleSave = async () => {
    if (!accessToken || !id) return

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/assets/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to update asset')
      }

      const data = await response.json()
      setSuccessMessage(data.message || 'Asset updated successfully')
      setIsEditing(false)

      // Refresh asset data
      await fetchAsset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof EditFormData, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  const handleDelete = async () => {
    if (!accessToken || !id || !asset) return

    if (!window.confirm(`Are you sure you want to delete "${asset.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/assets/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to delete asset')
      }

      navigate('/assets')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
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

  const getCriticalityBadgeClass = (criticality: string) => {
    switch (criticality) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-green-600'
    if (health >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading asset...</div>
      </div>
    )
  }

  if (error && !asset) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/assets" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" aria-label="Back to assets">
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <h1 className="text-2xl font-bold">Asset Details</h1>
        </div>
        <div role="alert" className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      </div>
    )
  }

  if (!asset) {
    return null
  }

  // Build breadcrumb items based on asset hierarchy
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Assets', path: '/assets' },
  ]
  if (asset.site) {
    breadcrumbItems.push({ label: asset.site, path: `/assets?site=${asset.site_id}` })
  }
  if (asset.system) {
    breadcrumbItems.push({ label: asset.system, path: `/assets?system=${asset.system_id}` })
  }
  breadcrumbItems.push({ label: asset.name })

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbItems} />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/assets" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" aria-label="Back to assets">
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{asset.name}</h1>
          <p className="text-gray-500">{asset.type} - {asset.site}</p>
        </div>
        {!isEditing ? (
          <>
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Edit size={20} />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              <Trash2 size={20} />
              Delete
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              <Save size={20} />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <X size={20} />
              Cancel
            </button>
          </>
        )}
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
        <div role="alert" className="flex items-center gap-2 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Asset Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                />
              ) : (
                <p className="text-lg">{asset.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Type</label>
              <p>{asset.type || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Site</label>
              <p>{asset.site || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">System</label>
              <p>{asset.system || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
              {isEditing ? (
                <select
                  value={editForm.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              ) : (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(asset.status)}`}>
                  {asset.status}
                </span>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Criticality</label>
              {isEditing ? (
                <select
                  value={editForm.criticality}
                  onChange={(e) => handleInputChange('criticality', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              ) : (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCriticalityBadgeClass(asset.criticality)}`}>
                  {asset.criticality}
                </span>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Health Score</label>
              <span className={`text-2xl font-bold ${getHealthColor(asset.health)}`}>
                {asset.health}%
              </span>
            </div>
          </div>
        </div>

        {/* Equipment Details */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Equipment Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Manufacturer</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.manufacturer}
                  onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                />
              ) : (
                <p>{asset.manufacturer || '-'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Model</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                />
              ) : (
                <p>{asset.model || '-'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Serial Number</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.serial_number}
                  onChange={(e) => handleInputChange('serial_number', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                />
              ) : (
                <p>{asset.serial_number || '-'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Capacity</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.capacity}
                  onChange={(e) => handleInputChange('capacity', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                />
              ) : (
                <p>{asset.capacity || '-'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Install Date</label>
              <p>{asset.install_date || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sensors */}
      {asset.sensors && asset.sensors.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Sensors ({asset.sensors.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {asset.sensors.map((sensor) => (
              <div key={sensor.id} className="p-4 border rounded-lg">
                <div className="font-medium">{sensor.name}</div>
                <div className="text-sm text-gray-500">{sensor.type} ({sensor.unit})</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="text-sm text-gray-500 flex gap-4">
        {asset.created_at && (
          <span>Created: {new Date(asset.created_at).toLocaleString()}</span>
        )}
        {asset.updated_at && (
          <span>Last Updated: {new Date(asset.updated_at).toLocaleString()}</span>
        )}
      </div>
    </div>
  )
}
