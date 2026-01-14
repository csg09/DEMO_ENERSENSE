import { useState, useEffect } from 'react'
import { Search, Plus, X, MapPin, Clock, SquareIcon, Pencil, Trash2, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

interface Site {
  id: string
  name: string
  address: string | null
  timezone: string | null
  facility_type: string | null
  square_footage: number | null
  utility_rate: number | null
  asset_count: number
  created_at: string
  updated_at: string
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
]

const FACILITY_TYPES = [
  { value: 'data_center', label: 'Data Center' },
  { value: 'factory', label: 'Factory' },
  { value: 'office', label: 'Office Building' },
  { value: 'retail', label: 'Retail' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'school', label: 'School' },
]

export default function Sites() {
  const [search, setSearch] = useState('')
  const [facilityTypeFilter, setFacilityTypeFilter] = useState('')
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [isDeleting, setDeleting] = useState(false)
  const { accessToken, user } = useAuthStore()

  // Form state
  const [formName, setFormName] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formTimezone, setFormTimezone] = useState('America/Chicago')
  const [formFacilityType, setFormFacilityType] = useState('data_center')
  const [formSquareFootage, setFormSquareFootage] = useState('')
  const [formUtilityRate, setFormUtilityRate] = useState('')

  const canManageSites = user?.role === 'admin' || user?.role === 'facility_manager'

  useEffect(() => {
    fetchSites()
  }, [accessToken, search, facilityTypeFilter])

  const fetchSites = async () => {
    if (!accessToken) return
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (facilityTypeFilter) params.append('facility_type', facilityTypeFilter)

      const response = await fetch(`/api/sites?${params}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })

      if (!response.ok) throw new Error('Failed to fetch sites')

      const data = await response.json()
      setSites(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchSiteDetail = async (siteId: string) => {
    if (!accessToken) return

    try {
      const response = await fetch(`/api/sites/${siteId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })

      if (!response.ok) throw new Error('Failed to fetch site details')

      const data = await response.json()
      setSelectedSite(data)
      setShowDetailModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load site details')
    }
  }

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      setError('Site name is required')
      return
    }

    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formName.trim(),
          address: formAddress || null,
          timezone: formTimezone,
          facility_type: formFacilityType,
          square_footage: formSquareFootage ? parseInt(formSquareFootage) : null,
          utility_rate: formUtilityRate ? parseFloat(formUtilityRate) : null,
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || 'Failed to create site')
      }

      setSuccessMessage('Site created successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
      setShowCreateModal(false)
      resetForm()
      fetchSites()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create site')
    }
  }

  const handleEditSite = (site: Site) => {
    setFormName(site.name)
    setFormAddress(site.address || '')
    setFormTimezone(site.timezone || 'America/Chicago')
    setFormFacilityType(site.facility_type || 'data_center')
    setFormSquareFootage(site.square_footage ? site.square_footage.toString() : '')
    setFormUtilityRate(site.utility_rate ? site.utility_rate.toString() : '')
    setShowEditModal(true)
  }

  const handleUpdateSite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !selectedSite) {
      setError('Site name is required')
      return
    }

    try {
      const response = await fetch(`/api/sites/${selectedSite.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formName.trim(),
          address: formAddress || null,
          timezone: formTimezone,
          facility_type: formFacilityType,
          square_footage: formSquareFootage ? parseInt(formSquareFootage) : null,
          utility_rate: formUtilityRate ? parseFloat(formUtilityRate) : null,
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || 'Failed to update site')
      }

      setSuccessMessage('Site updated successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
      setShowEditModal(false)
      setShowDetailModal(false)
      resetForm()
      fetchSites()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update site')
    }
  }

  const handleDeleteSite = async () => {
    if (!selectedSite) return

    const assetWarning = selectedSite.asset_count > 0
      ? ` This will also delete ${selectedSite.asset_count} associated asset(s).`
      : ''
    if (!window.confirm(`Are you sure you want to delete "${selectedSite.name}"?${assetWarning} This action cannot be undone.`)) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/sites/${selectedSite.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || 'Failed to delete site')
      }

      setSuccessMessage('Site deleted successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
      setShowDetailModal(false)
      setSelectedSite(null)
      fetchSites()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete site')
    } finally {
      setDeleting(false)
    }
  }


  const resetForm = () => {
    setFormName('')
    setFormAddress('')
    setFormTimezone('America/Chicago')
    setFormFacilityType('data_center')
    setFormSquareFootage('')
    setFormUtilityRate('')
  }

  const getFacilityTypeLabel = (type: string | null) => {
    if (!type) return '-'
    const found = FACILITY_TYPES.find(ft => ft.value === type)
    return found ? found.label : type
  }

  const formatSquareFootage = (sqft: number | null) => {
    if (!sqft) return '-'
    return sqft.toLocaleString() + ' sq ft'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sites</h1>
        {canManageSites && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Plus size={20} />
            Add Site
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search sites..."
            aria-label="Search sites"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
          />
        </div>
        <select
          aria-label="Filter by facility type"
          value={facilityTypeFilter}
          onChange={(e) => setFacilityTypeFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
        >
          <option value="">All Facility Types</option>
          {FACILITY_TYPES.map(ft => (
            <option key={ft.value} value={ft.value}>{ft.label}</option>
          ))}
        </select>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div role="alert" className="p-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div role="alert" className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Sites Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-gray-500">Loading sites...</span>
        </div>
      ) : sites.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No sites found. {canManageSites && 'Click "Add Site" to create your first site.'}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <div
              key={site.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => fetchSiteDetail(site.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{site.name}</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {getFacilityTypeLabel(site.facility_type)}
                  </span>
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  {site.asset_count} assets
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-400" />
                  <span className="truncate">{site.address || 'No address'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-400" />
                  <span>{site.timezone || 'No timezone'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <SquareIcon size={16} className="text-gray-400" />
                  <span>{formatSquareFootage(site.square_footage)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Site Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add New Site</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateSite} className="space-y-4">
              <div>
                <label htmlFor="site-name" className="block text-sm font-medium mb-1">Name *</label>
                <input
                  id="site-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  placeholder="Enter site name"
                  required
                />
              </div>
              <div>
                <label htmlFor="site-address" className="block text-sm font-medium mb-1">Address</label>
                <input
                  id="site-address"
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  placeholder="Enter full address"
                />
              </div>
              <div>
                <label htmlFor="site-timezone" className="block text-sm font-medium mb-1">Timezone</label>
                <select
                  id="site-timezone"
                  value={formTimezone}
                  onChange={(e) => setFormTimezone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="site-facility-type" className="block text-sm font-medium mb-1">Facility Type</label>
                <select
                  id="site-facility-type"
                  value={formFacilityType}
                  onChange={(e) => setFormFacilityType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                >
                  {FACILITY_TYPES.map(ft => (
                    <option key={ft.value} value={ft.value}>{ft.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="site-square-footage" className="block text-sm font-medium mb-1">Square Footage</label>
                <input
                  id="site-square-footage"
                  type="number"
                  value={formSquareFootage}
                  onChange={(e) => setFormSquareFootage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  placeholder="Enter square footage"
                  min="0"
                />
              </div>
              <div>
                <label htmlFor="site-utility-rate" className="block text-sm font-medium mb-1">Utility Rate ($/kWh)</label>
                <input
                  id="site-utility-rate"
                  type="number"
                  step="0.001"
                  value={formUtilityRate}
                  onChange={(e) => setFormUtilityRate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  placeholder="Enter utility rate"
                  min="0"
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
                  Create Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Site Detail Modal */}
      {showDetailModal && selectedSite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{selectedSite.name}</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Facility Type</span>
                  <p className="font-medium">{getFacilityTypeLabel(selectedSite.facility_type)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Assets</span>
                  <p className="font-medium">{selectedSite.asset_count}</p>
                </div>
              </div>

              <div>
                <span className="text-sm text-gray-500">Address</span>
                <p className="font-medium">{selectedSite.address || 'Not specified'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Timezone</span>
                  <p className="font-medium">{selectedSite.timezone || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Square Footage</span>
                  <p className="font-medium">{formatSquareFootage(selectedSite.square_footage)}</p>
                </div>
              </div>

              <div>
                <span className="text-sm text-gray-500">Utility Rate</span>
                <p className="font-medium">
                  {selectedSite.utility_rate ? `$${selectedSite.utility_rate.toFixed(4)}/kWh` : 'Not specified'}
                </p>
              </div>

              <div className="pt-4 border-t dark:border-gray-700">
                <span className="text-sm text-gray-500">Created</span>
                <p className="font-medium">{new Date(selectedSite.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              {canManageSites && (
                <>
                  <button
                    onClick={() => handleEditSite(selectedSite)}
                    className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    <Pencil size={18} />
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteSite}
                    disabled={isDeleting}
                    className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    <Trash2 size={18} />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </>
              )}
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Site Modal */}
      {showEditModal && selectedSite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Site</h2>
              <button onClick={() => { setShowEditModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdateSite} className="space-y-4">
              <div>
                <label htmlFor="edit-site-name" className="block text-sm font-medium mb-1">Name *</label>
                <input
                  id="edit-site-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  placeholder="Enter site name"
                  required
                />
              </div>
              <div>
                <label htmlFor="edit-site-address" className="block text-sm font-medium mb-1">Address</label>
                <input
                  id="edit-site-address"
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  placeholder="Enter full address"
                />
              </div>
              <div>
                <label htmlFor="edit-site-timezone" className="block text-sm font-medium mb-1">Timezone</label>
                <select
                  id="edit-site-timezone"
                  value={formTimezone}
                  onChange={(e) => setFormTimezone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-site-facility-type" className="block text-sm font-medium mb-1">Facility Type</label>
                <select
                  id="edit-site-facility-type"
                  value={formFacilityType}
                  onChange={(e) => setFormFacilityType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                >
                  {FACILITY_TYPES.map(ft => (
                    <option key={ft.value} value={ft.value}>{ft.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-site-square-footage" className="block text-sm font-medium mb-1">Square Footage</label>
                <input
                  id="edit-site-square-footage"
                  type="number"
                  value={formSquareFootage}
                  onChange={(e) => setFormSquareFootage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  placeholder="Enter square footage"
                  min="0"
                />
              </div>
              <div>
                <label htmlFor="edit-site-utility-rate" className="block text-sm font-medium mb-1">Utility Rate ($/kWh)</label>
                <input
                  id="edit-site-utility-rate"
                  type="number"
                  step="0.001"
                  value={formUtilityRate}
                  onChange={(e) => setFormUtilityRate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  placeholder="Enter utility rate"
                  min="0"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
