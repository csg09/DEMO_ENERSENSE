import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { User, Bell, Shield, Users, Building, Plus, X, Pencil, UserX, AlertTriangle, Trash2, Power } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

interface SettingsTab {
  id: string
  name: string
  icon: React.ElementType
  adminOnly?: boolean
  roles?: string[]
}

interface OrgUser {
  id: string
  name: string
  email: string
  role: string
  status: string
  created_at: string
}

interface AlertRule {
  id: string
  name: string
  asset_type_id: string | null
  asset_type_name: string | null
  asset_id: string | null
  asset_name: string | null
  sensor_type: string
  condition: string
  threshold_value: number
  threshold_value_2: number | null
  duration_minutes: number
  severity: string
  enabled: boolean
  created_at: string
}

const USER_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'facility_manager', label: 'Facility Manager' },
  { value: 'technician', label: 'Technician' },
  { value: 'viewer', label: 'Viewer' },
]

const USER_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
]

const settingsTabs: SettingsTab[] = [
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'security', name: 'Security', icon: Shield },
  { id: 'alert-rules', name: 'Alert Rules', icon: AlertTriangle, adminOnly: true },
  { id: 'users', name: 'User Management', icon: Users, adminOnly: true },
  { id: 'tenant', name: 'Organization', icon: Building, adminOnly: true },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const { user, accessToken } = useAuthStore()

  // User Management state
  const [users, setUsers] = useState<OrgUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null)

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [isInviting, setIsInviting] = useState(false)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Deactivate state
  const [isDeactivating, setIsDeactivating] = useState(false)

  // Alert Rules state
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [rulesLoading, setRulesLoading] = useState(false)
  const [rulesError, setRulesError] = useState<string | null>(null)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)
  const [ruleSensorType, setRuleSensorType] = useState('temperature')
  const [ruleCondition, setRuleCondition] = useState('gt')
  const [ruleThreshold, setRuleThreshold] = useState('')
  const [ruleDuration, setRuleDuration] = useState('15')
  const [ruleSeverity, setRuleSeverity] = useState('medium')
  const [isSavingRule, setIsSavingRule] = useState(false)

  // Check if user has access to Settings page (only admin)
  const hasAccess = user?.role === 'admin'

  // Fetch users when users tab is active
  useEffect(() => {
    if (activeTab === 'users' && hasAccess) {
      fetchUsers()
    }
  }, [activeTab, hasAccess, accessToken])

  // Fetch alert rules when alert-rules tab is active
  useEffect(() => {
    if (activeTab === 'alert-rules' && hasAccess) {
      fetchAlertRules()
    }
  }, [activeTab, hasAccess, accessToken])

  const fetchAlertRules = async () => {
    if (!accessToken) return
    setRulesLoading(true)
    setRulesError(null)

    try {
      const response = await fetch('/api/alerts/rules', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })

      if (!response.ok) throw new Error('Failed to fetch alert rules')

      const data = await response.json()
      setAlertRules(data)
    } catch (err) {
      setRulesError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setRulesLoading(false)
    }
  }

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ruleThreshold) {
      setRulesError('Threshold value is required')
      return
    }

    setIsSavingRule(true)
    setRulesError(null)

    try {
      const url = editingRule
        ? `/api/alerts/rules/${editingRule.id}`
        : '/api/alerts/rules'

      const response = await fetch(url, {
        method: editingRule ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_type: ruleSensorType,
          condition: ruleCondition,
          threshold_value: parseFloat(ruleThreshold),
          duration_minutes: parseInt(ruleDuration),
          severity: ruleSeverity,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to save rule')
      }

      setShowRuleModal(false)
      setEditingRule(null)
      resetRuleForm()
      fetchAlertRules()
      setSuccessMessage(editingRule ? 'Rule updated successfully' : 'Rule created successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setRulesError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSavingRule(false)
    }
  }

  const handleToggleRule = async (rule: AlertRule) => {
    try {
      const response = await fetch(`/api/alerts/rules/${rule.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: !rule.enabled }),
      })

      if (!response.ok) throw new Error('Failed to update rule')

      fetchAlertRules()
      setSuccessMessage(`Rule ${rule.enabled ? 'disabled' : 'enabled'} successfully`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setRulesError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    try {
      const response = await fetch(`/api/alerts/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })

      if (!response.ok) throw new Error('Failed to delete rule')

      fetchAlertRules()
      setSuccessMessage('Rule deleted successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setRulesError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const openEditRuleModal = (rule: AlertRule) => {
    setEditingRule(rule)
    setRuleSensorType(rule.sensor_type)
    setRuleCondition(rule.condition)
    setRuleThreshold(rule.threshold_value.toString())
    setRuleDuration(rule.duration_minutes.toString())
    setRuleSeverity(rule.severity)
    setShowRuleModal(true)
  }

  const resetRuleForm = () => {
    setRuleSensorType('temperature')
    setRuleCondition('gt')
    setRuleThreshold('')
    setRuleDuration('15')
    setRuleSeverity('medium')
  }

  const openNewRuleModal = () => {
    setEditingRule(null)
    resetRuleForm()
    setShowRuleModal(true)
  }

  const fetchUsers = async () => {
    if (!accessToken) return
    setUsersLoading(true)
    setUsersError(null)

    try {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })

      if (!response.ok) throw new Error('Failed to fetch users')

      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setUsersLoading(false)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !inviteName) {
      setUsersError('Email and Name are required')
      return
    }

    setIsInviting(true)
    setUsersError(null)

    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName,
          role: inviteRole,
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || 'Failed to invite user')
      }

      const data = await response.json()
      setInviteToken(data.invite_token || data.token || 'INVITE_TOKEN_GENERATED')
      setSuccessMessage(`User invited successfully!`)
      setTimeout(() => setSuccessMessage(null), 5000)
      fetchUsers()
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to invite user')
    } finally {
      setIsInviting(false)
    }
  }

  const openEditModal = (orgUser: OrgUser) => {
    setSelectedUser(orgUser)
    setEditName(orgUser.name)
    setEditRole(orgUser.role)
    setEditStatus(orgUser.status)
    setShowEditModal(true)
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !editName) {
      setUsersError('Name is required')
      return
    }

    setIsUpdating(true)
    setUsersError(null)

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName,
          role: editRole,
          status: editStatus,
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || 'Failed to update user')
      }

      setSuccessMessage('User updated successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
      setShowEditModal(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setIsUpdating(false)
    }
  }

  const openDeactivateConfirm = (orgUser: OrgUser) => {
    setSelectedUser(orgUser)
    setShowDeactivateConfirm(true)
  }

  const handleDeactivateUser = async () => {
    if (!selectedUser) return

    setIsDeactivating(true)
    setUsersError(null)

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || 'Failed to deactivate user')
      }

      setSuccessMessage('User deactivated successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
      setShowDeactivateConfirm(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to deactivate user')
    } finally {
      setIsDeactivating(false)
    }
  }

  const resetInviteForm = () => {
    setInviteEmail('')
    setInviteName('')
    setInviteRole('viewer')
    setInviteToken(null)
  }

  const closeInviteModal = () => {
    setShowInviteModal(false)
    resetInviteForm()
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      case 'facility_manager': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'technician': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'viewer': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'inactive': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleLabel = (role: string) => {
    const found = USER_ROLES.find(r => r.value === role)
    return found ? found.label : role
  }

  // Redirect if user doesn't have access
  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />
  }

  // Filter tabs based on user role
  const visibleTabs = settingsTabs.filter(tab => {
    if (!tab.adminOnly && !tab.roles) return true
    if (tab.adminOnly) return user?.role === 'admin'
    if (tab.roles) return tab.roles.includes(user?.role || '')
    return true
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Navigation */}
        <nav className="lg:w-64 space-y-1">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <tab.icon size={20} />
              {tab.name}
            </button>
          ))}
        </nav>

        {/* Settings Content */}
        <div className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Profile Settings</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="profile-name" className="block text-sm font-medium mb-2">Name</label>
                  <input
                    id="profile-name"
                    type="text"
                    defaultValue={user?.name || ''}
                    className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label htmlFor="profile-email" className="block text-sm font-medium mb-2">Email</label>
                  <input
                    id="profile-email"
                    type="email"
                    defaultValue={user?.email || ''}
                    className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
                <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Notification Preferences</h2>
              <p className="text-gray-500">Configure how you receive notifications.</p>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Security Settings</h2>
              <p className="text-gray-500">Manage your password and security preferences.</p>
            </div>
          )}

          {activeTab === 'alert-rules' && user?.role === 'admin' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Alert Rules</h2>
                <button
                  onClick={openNewRuleModal}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  <Plus size={20} />
                  Create Rule
                </button>
              </div>

              {/* Error Message */}
              {rulesError && (
                <div role="alert" className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                  {rulesError}
                </div>
              )}

              {/* Rules List */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                {rulesLoading ? (
                  <div className="p-8 text-center text-gray-500">Loading alert rules...</div>
                ) : alertRules.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No alert rules configured. Click "Create Rule" to add one.
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sensor Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Threshold</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {alertRules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap font-medium">{rule.sensor_type}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{rule.condition}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{rule.threshold_value}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{rule.duration_minutes} min</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              rule.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              rule.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                              rule.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {rule.severity}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              rule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {rule.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleToggleRule(rule)}
                                className={`p-2 rounded ${rule.enabled ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}
                                title={rule.enabled ? 'Disable Rule' : 'Enable Rule'}
                              >
                                <Power size={16} />
                              </button>
                              <button
                                onClick={() => openEditRuleModal(rule)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit Rule"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                                title="Delete Rule"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Alert Rule Modal */}
          {showRuleModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">{editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}</h2>
                  <button onClick={() => setShowRuleModal(false)} className="text-gray-500 hover:text-gray-700">
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={handleCreateRule} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Sensor Type</label>
                    <select
                      value={ruleSensorType}
                      onChange={(e) => setRuleSensorType(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                    >
                      <option value="temperature">Temperature</option>
                      <option value="humidity">Humidity</option>
                      <option value="pressure">Pressure</option>
                      <option value="power">Power</option>
                      <option value="flow">Flow Rate</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Condition</label>
                    <select
                      value={ruleCondition}
                      onChange={(e) => setRuleCondition(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                    >
                      <option value="gt">Greater Than</option>
                      <option value="lt">Less Than</option>
                      <option value="gte">Greater Than or Equal</option>
                      <option value="lte">Less Than or Equal</option>
                      <option value="eq">Equal To</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Threshold Value *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={ruleThreshold}
                      onChange={(e) => setRuleThreshold(e.target.value)}
                      placeholder="e.g., 85"
                      required
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={ruleDuration}
                      onChange={(e) => setRuleDuration(e.target.value)}
                      placeholder="15"
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                    />
                    <p className="text-xs text-gray-500 mt-1">How long condition must persist before triggering</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Severity</label>
                    <select
                      value={ruleSeverity}
                      onChange={(e) => setRuleSeverity(e.target.value)}
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
                      onClick={() => setShowRuleModal(false)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingRule || !ruleThreshold}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isSavingRule ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'users' && user?.role === 'admin' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">User Management</h2>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  <Plus size={20} />
                  Invite User
                </button>
              </div>

              {/* Success Message */}
              {successMessage && (
                <div role="alert" className="p-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg">
                  {successMessage}
                </div>
              )}

              {/* Error Message */}
              {usersError && (
                <div role="alert" className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                  {usersError}
                </div>
              )}

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          Loading users...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          No users found. Click "Invite User" to add users to your organization.
                        </td>
                      </tr>
                    ) : (
                      users.map((orgUser) => (
                        <tr key={orgUser.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap font-medium">{orgUser.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{orgUser.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeClass(orgUser.role)}`}>
                              {getRoleLabel(orgUser.role)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(orgUser.status)}`}>
                              {orgUser.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditModal(orgUser)}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                                title="Edit user"
                              >
                                <Pencil size={18} />
                              </button>
                              {orgUser.status !== 'inactive' && orgUser.id !== user?.id && (
                                <button
                                  onClick={() => openDeactivateConfirm(orgUser)}
                                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                  title="Deactivate user"
                                >
                                  <UserX size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'tenant' && user?.role === 'admin' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Organization Settings</h2>
              <p className="text-gray-500">Configure organization-wide settings.</p>
            </div>
          )}
        </div>
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Invite User</h2>
              <button onClick={closeInviteModal} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            {inviteToken ? (
              <div className="space-y-4">
                <div role="alert" className="p-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg">
                  User invited successfully!
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Invite Token/Link</label>
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono text-sm break-all">
                    {inviteToken}
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    In a real application, this invite link would be emailed to the user. For testing purposes, the token is displayed here.
                  </p>
                </div>
                <button
                  onClick={closeInviteModal}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInviteUser} className="space-y-4">
                <div>
                  <label htmlFor="invite-email" className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="invite-name" className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    id="invite-name"
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="invite-role" className="block text-sm font-medium mb-1">Role</label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  >
                    {USER_ROLES.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeInviteModal}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isInviting ? 'Inviting...' : 'Invite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit User</h2>
              <button onClick={() => { setShowEditModal(false); setSelectedUser(null); }} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={selectedUser.email}
                  disabled
                  className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium mb-1">Name *</label>
                <input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div>
                <label htmlFor="edit-role" className="block text-sm font-medium mb-1">Role</label>
                <select
                  id="edit-role"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                >
                  {USER_ROLES.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-status" className="block text-sm font-medium mb-1">Status</label>
                <select
                  id="edit-status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                >
                  {USER_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedUser(null); }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {showDeactivateConfirm && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Deactivate User</h2>
              <button onClick={() => { setShowDeactivateConfirm(false); setSelectedUser(null); }} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                Are you sure you want to deactivate <strong>{selectedUser.name}</strong> ({selectedUser.email})?
              </p>
              <p className="text-sm text-gray-500">
                This user will no longer be able to access the system. You can reactivate them later by editing their status.
              </p>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowDeactivateConfirm(false); setSelectedUser(null); }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeactivateUser}
                  disabled={isDeactivating}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  {isDeactivating ? 'Deactivating...' : 'Deactivate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
