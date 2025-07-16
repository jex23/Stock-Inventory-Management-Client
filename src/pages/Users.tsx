import { useState, useEffect } from 'react'
import { authService } from '../services/authService'
import { usersService } from '../services/usersService'
import type { UserDetails, UserFilters, UserStats, CreateUserRequest, UpdateUserRequest } from '../types/users'
import type { AuthState, UserStatus, UserPosition } from '../types/auth'
import '../styles/tables.css'
import './Users.css'

interface UserFormData {
  first_name: string
  last_name: string
  position: UserPosition | ''
  contract: 'regular' | 'probationary' | 'seasonal' | 'part_time' | 'terminated' | ''
  username: string
  email: string
}

const Users = () => {
  // State management
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState())
  const [users, setUsers] = useState<UserDetails[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<number, string>>({})

  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set())
  const [bulkAction, setBulkAction] = useState<'enable' | 'disable' | ''>('')
  const [bulkLoading, setBulkLoading] = useState(false)


  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null)
  const [modalLoading, setModalLoading] = useState(false)

  // Form states
  const [createFormData, setCreateFormData] = useState<UserFormData>({
    first_name: '',
    last_name: '',
    position: '',
    contract: '',
    username: '',
    email: ''
  })
  const [editFormData, setEditFormData] = useState<UserFormData>({
    first_name: '',
    last_name: '',
    position: '',
    contract: '',
    username: '',
    email: ''
  })
  const [formErrors, setFormErrors] = useState<string[]>([])

  // Filters and sorting
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    position: undefined,
    status: undefined,
    contract: undefined,
    sortBy: 'created_at',
    sortOrder: 'desc'
  })

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState)
    return unsubscribe
  }, [])

  // Load users on component mount
  useEffect(() => {
    loadUsers()
  }, [])

  // Filter users when filters change
  useEffect(() => {
    const filtered = usersService.filterUsers(users, filters)
    setFilteredUsers(filtered)
    // Clear selections when filters change
    setSelectedUsers(new Set())
  }, [users, filters])

  // Calculate stats when users change
  useEffect(() => {
    if (users.length > 0) {
      const userStats = usersService.calculateStats(users)
      setStats(userStats)
    }
  }, [users])

  // Load users from API
  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const userData = await usersService.getAllUsers()
      setUsers(userData)
    } catch (err) {
      console.error('Failed to load users:', err)
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  // Handle bulk user selection
  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      const allUserIds = filteredUsers
        .filter(user => user.id !== authState.user?.id) // Exclude self
        .map(user => user.id)
      setSelectedUsers(new Set(allUserIds))
    }
  }

  const handleSelectUser = (userId: number) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  // Handle bulk status update
  const handleBulkStatusUpdate = async () => {
    if (!bulkAction || selectedUsers.size === 0) return

    setBulkLoading(true)
    const errors: string[] = []
    const updatedUsers: number[] = []

    try {
      for (const userId of selectedUsers) {
        try {
          await usersService.updateUserStatus(userId, bulkAction as UserStatus)
          updatedUsers.push(userId)
        } catch (err) {
          errors.push(`User ${userId}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }

      // Update local state for successful updates
      if (updatedUsers.length > 0) {
        setUsers(prev => prev.map(user => 
          updatedUsers.includes(user.id) 
            ? { ...user, status: bulkAction as UserStatus }
            : user
        ))
      }

      // Show results
      if (errors.length > 0) {
        alert(`Bulk update completed with ${errors.length} errors:\n${errors.join('\n')}`)
      } else {
        alert(`Successfully updated ${updatedUsers.length} users to ${bulkAction}`)
      }

      // Reset selections
      setSelectedUsers(new Set())
      setBulkAction('')
    } catch (err) {
      alert('Bulk update failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setBulkLoading(false)
    }
  }

  // Handle user status change from dropdown
  const handleStatusChange = async (userId: number, newStatus: UserStatus) => {
    try {
      setActionLoading(prev => ({ ...prev, [userId]: 'status' }))
      await usersService.updateUserStatus(userId, newStatus)
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, status: newStatus } : user
      ))
    } catch (err) {
      console.error('Failed to update user status:', err)
      alert(err instanceof Error ? err.message : 'Failed to update user status')
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev }
        delete newState[userId]
        return newState
      })
    }
  }

  // Handle reset login attempts
  const handleResetAttempts = async (userId: number) => {
    try {
      setActionLoading(prev => ({ ...prev, [userId]: 'reset' }))
      await usersService.resetLoginAttempts(userId)
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, login_attempt: 0 } : user
      ))
    } catch (err) {
      console.error('Failed to reset login attempts:', err)
      alert(err instanceof Error ? err.message : 'Failed to reset login attempts')
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev }
        delete newState[userId]
        return newState
      })
    }
  }

  // Handle create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Additional validation for required fields
    const errors: string[] = []
    
    if (!createFormData.first_name.trim()) {
      errors.push('First name is required')
    }
    
    if (!createFormData.last_name.trim()) {
      errors.push('Last name is required')
    }
    
    if (!createFormData.username.trim()) {
      errors.push('Username is required')
    }
    
    if (!createFormData.email.trim()) {
      errors.push('Email is required')
    }
    
    if (createFormData.position === '') {
      errors.push('Position is required')
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (createFormData.email && !emailRegex.test(createFormData.email)) {
      errors.push('Invalid email format')
    }
    
    if (errors.length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      setModalLoading(true)
      setFormErrors([])
      
      const contractText = getContractDisplayText(createFormData.contract)
      
      const newUser = await usersService.createUser({
        ...createFormData,
        position: createFormData.position as UserPosition,
        contract: contractText
      })
      
      // Add to local state
      setUsers(prev => [...prev, newUser])
      
      // Reset form and close modal
      setCreateFormData({
        first_name: '',
        last_name: '',
        position: '',
        contract: '',
        username: '',
        email: ''
      })
      setShowCreateModal(false)
      
      alert('User created successfully! Default password: ' + 
            usersService.generateDefaultPassword(createFormData.first_name, createFormData.last_name) +
            ', Default PIN: ' + usersService.generateDefaultPin())
    } catch (err) {
      console.error('Failed to create user:', err)
      setFormErrors([err instanceof Error ? err.message : 'Failed to create user'])
    } finally {
      setModalLoading(false)
    }
  }

  // Handle edit user
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedUser) return
    
    // Additional validation for required fields
    const errors: string[] = []
    
    if (!editFormData.first_name.trim()) {
      errors.push('First name is required')
    }
    
    if (!editFormData.last_name.trim()) {
      errors.push('Last name is required')
    }
    
    if (!editFormData.username.trim()) {
      errors.push('Username is required')
    }
    
    if (!editFormData.email.trim()) {
      errors.push('Email is required')
    }
    
    if (editFormData.position === '') {
      errors.push('Position is required')
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (editFormData.email && !emailRegex.test(editFormData.email)) {
      errors.push('Invalid email format')
    }
    
    if (errors.length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      setModalLoading(true)
      setFormErrors([])
      
      const updateData: UpdateUserRequest = {}
      if (editFormData.first_name !== selectedUser.first_name) updateData.first_name = editFormData.first_name
      if (editFormData.last_name !== selectedUser.last_name) updateData.last_name = editFormData.last_name
      if (editFormData.position && editFormData.position !== selectedUser.position) updateData.position = editFormData.position as UserPosition
      
      const contractDisplayText = getContractDisplayText(editFormData.contract)
      if (contractDisplayText !== (selectedUser.contract || '')) updateData.contract = contractDisplayText
      
      if (editFormData.username !== selectedUser.username) updateData.username = editFormData.username
      if (editFormData.email !== selectedUser.email) updateData.email = editFormData.email
      
      const updatedUser = await usersService.updateUser(selectedUser.id, updateData)
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === selectedUser.id ? updatedUser : user
      ))
      
      setShowEditModal(false)
      setSelectedUser(null)
    } catch (err) {
      console.error('Failed to update user:', err)
      setFormErrors([err instanceof Error ? err.message : 'Failed to update user'])
    } finally {
      setModalLoading(false)
    }
  }

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return
    
    try {
      setModalLoading(true)
      await usersService.deleteUser(selectedUser.id)
      
      // Remove from local state
      setUsers(prev => prev.filter(user => user.id !== selectedUser.id))
      
      setShowDeleteModal(false)
      setSelectedUser(null)
    } catch (err) {
      console.error('Failed to delete user:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setModalLoading(false)
    }
  }

  // Modal handlers
  const openCreateModal = () => {
    setShowCreateModal(true)
    setFormErrors([])
  }

  const openEditModal = (user: UserDetails) => {
    setSelectedUser(user)
    
    // Map contract value to dropdown options
    let contractValue: 'regular' | 'probationary' | 'seasonal' | 'part_time' | 'terminated' | '' = ''
    if (user.contract) {
      const normalizedContract = user.contract.toLowerCase().replace(/\s+/g, '_')
      switch (normalizedContract) {
        case 'regular':
          contractValue = 'regular'
          break
        case 'probationary':
          contractValue = 'probationary'
          break
        case 'seasonal':
          contractValue = 'seasonal'
          break
        case 'part_time':
        case 'part-time':
          contractValue = 'part_time'
          break
        case 'terminated':
          contractValue = 'terminated'
          break
        default:
          contractValue = ''
      }
    }
    
    setEditFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      position: user.position,
      contract: contractValue,
      username: user.username,
      email: user.email
    })
    setFormErrors([])
    setShowEditModal(true)
  }

  const openDeleteModal = (user: UserDetails) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }

  const closeModals = () => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setShowDeleteModal(false)
    setSelectedUser(null)
    setFormErrors([])
  }

  // Handle filter changes
  const handleFilterChange = (key: keyof UserFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Handle sorting
  const handleSort = (column: 'name' | 'email' | 'position' | 'created_at' | 'login_attempt') => {
    const newSortOrder = filters.sortBy === column && filters.sortOrder === 'asc' ? 'desc' : 'asc'
    setFilters(prev => ({ ...prev, sortBy: column, sortOrder: newSortOrder }))
  }

  // Get user status info for display (account status only)
  const getUserStatusInfo = (user: UserDetails) => {
    // Check for locked account first (highest priority)
    if (user.login_attempt >= 5) {
      return { type: 'locked', text: 'Locked', dot: 'locked' }
    }
    
    // Show account status (enabled/disabled)
    if (user.status === 'enabled') {
      return { type: 'online', text: 'Active', dot: 'online' }
    } else if (user.status === 'disabled') {
      return { type: 'offline', text: 'Disabled', dot: 'offline' }
    }
    
    // Fallback for unexpected status values
    return { type: 'offline', text: 'Unknown', dot: 'offline' }
  }

  // Get login attempts display class
  const getLoginAttemptsClass = (attempts: number) => {
    if (attempts >= 4) return 'danger'
    if (attempts >= 2) return 'warning'
    return 'normal'
  }

  // Get contract display info
  const getContractDisplayText = (value: string) => {
    switch (value) {
      case 'regular': return 'Regular'
      case 'probationary': return 'Probationary'
      case 'seasonal': return 'Seasonal'
      case 'part_time': return 'Part Time'
      case 'terminated': return 'Terminated'
      default: return ''
    }
  }

  // Get contract display class for styling
  const getContractDisplayClass = (contract: string) => {
    if (!contract) return ''
    const normalized = contract.toLowerCase()
    if (normalized.includes('regular')) return 'contract-regular'
    if (normalized.includes('probationary')) return 'contract-probationary'
    if (normalized.includes('seasonal')) return 'contract-seasonal'
    if (normalized.includes('part time') || normalized.includes('part-time')) return 'contract-part-time'
    if (normalized.includes('terminated')) return 'contract-terminated'
    return 'contract-other'
  }

  // Check if current user can manage users
  const canManageUsers = () => {
    return authState.user?.position === 'admin' || authState.user?.position === 'owner'
  }

  if (loading) {
    return (
      <div className="users-page">
        <div className="table-container">
          <div className="table-loading">
            <div className="loading-spinner"></div>
            <p>Loading users...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="users-page">
        <div className="users-error">
          <div className="users-error-icon">⚠️</div>
          <h3 className="users-error-title">Failed to Load Users</h3>
          <p className="users-error-message">{error}</p>
          <button className="users-retry-btn" onClick={loadUsers}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="users-page">
      {/* Page Header */}
      <div className="users-header">
        <h1 className="users-title">
          👥 User Management
        </h1>
        <p className="users-subtitle">
          Manage user accounts, permissions, and access controls
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="users-stats">
          <div className="stat-card total">
            <div className="stat-card-header">
              <span className="stat-card-title">Total Users</span>
              <span className="stat-card-icon">👥</span>
            </div>
            <h3 className="stat-card-value">{stats.total}</h3>
            <div className="stat-card-trend neutral">
              All registered users
            </div>
          </div>

          <div className="stat-card active">
            <div className="stat-card-header">
              <span className="stat-card-title">Active Users</span>
              <span className="stat-card-icon">✅</span>
            </div>
            <h3 className="stat-card-value">{stats.active}</h3>
            <div className="stat-card-trend positive">
              {Math.round((stats.active / stats.total) * 100)}% of total
            </div>
          </div>

          <div className="stat-card disabled">
            <div className="stat-card-header">
              <span className="stat-card-title">Disabled</span>
              <span className="stat-card-icon">❌</span>
            </div>
            <h3 className="stat-card-value">{stats.disabled}</h3>
            <div className="stat-card-trend negative">
              {Math.round((stats.disabled / stats.total) * 100)}% of total
            </div>
          </div>

          <div className="stat-card locked">
            <div className="stat-card-header">
              <span className="stat-card-title">Locked Accounts</span>
              <span className="stat-card-icon">🔒</span>
            </div>
            <h3 className="stat-card-value">{stats.lockedAccounts}</h3>
            <div className={`stat-card-trend ${stats.lockedAccounts > 0 ? 'negative' : 'positive'}`}>
              Max login attempts reached
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="users-table-container">
        <div className="users-table-header">
          <h2 className="users-table-title">
            📋 User Directory
          </h2>
          <p className="users-table-subtitle">
            {filteredUsers.length} of {users.length} users displayed
            {(filters.search || filters.position || filters.status || filters.contract) && (
              <span className="filter-indicator"> (filtered)</span>
            )}
          </p>

          <div className="users-table-actions">
            <div className="users-table-filters">
              {/* Search */}
              <div className="table-search">
                <span className="table-search-icon">🔍</span>
                <input
                  type="text"
                  className="table-search-input"
                  placeholder="Search users..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>

              {/* Position Filter */}
              <div className="table-filter">
                <select
                  className="table-filter-select"
                  value={filters.position || ''}
                  onChange={(e) => handleFilterChange('position', e.target.value || undefined)}
                >
                  <option value="">All Positions</option>
                  <option value="admin">Administrator</option>
                  <option value="owner">Owner</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              {/* Contract Filter */}
              <div className="table-filter">
                <select
                  className="table-filter-select"
                  value={filters.contract || ''}
                  onChange={(e) => handleFilterChange('contract', e.target.value || undefined)}
                >
                  <option value="">All Contracts</option>
                  <option value="Regular">Regular</option>
                  <option value="Probationary">Probationary</option>
                  <option value="Seasonal">Seasonal</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="table-filter">
                <select
                  className="table-filter-select"
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                >
                  <option value="">All Status</option>
                  <option value="enabled">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>

            <div className="users-table-buttons">
              <button className="table-btn table-btn-secondary" onClick={loadUsers}>
                🔄 Refresh
              </button>
              
              {/* Bulk Actions */}
              {canManageUsers() && selectedUsers.size > 0 && (
                <div className="bulk-actions">
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value as 'enable' | 'disable' | '')}
                    className="bulk-action-select"
                  >
                    <option value="">Bulk Action ({selectedUsers.size} selected)</option>
                    <option value="enabled">Enable Selected</option>
                    <option value="disabled">Disable Selected</option>
                  </select>
                  <button 
                    className="table-btn table-btn-warning"
                    onClick={handleBulkStatusUpdate}
                    disabled={!bulkAction || bulkLoading}
                  >
                    {bulkLoading ? 'Updating...' : 'Apply'}
                  </button>
                </div>
              )}
              
              {canManageUsers() && (
                <button className="table-btn table-btn-primary" onClick={openCreateModal}>
                  ➕ Add User
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="table-content">
          <table className="data-table">
            <thead className="table-head">
              <tr className="table-head-row">
                {canManageUsers() && (
                  <th className="table-head-cell text-center">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === filteredUsers.filter(u => u.id !== authState.user?.id).length && filteredUsers.length > 0}
                      onChange={handleSelectAll}
                      className="bulk-select-checkbox"
                      title="Select All"
                    />
                  </th>
                )}
                <th 
                  className={`table-head-cell sortable ${filters.sortBy === 'name' ? 'sorted' : ''}`}
                  onClick={() => handleSort('name')}
                >
                  User
                  <span className="sort-icon">
                    {filters.sortBy === 'name' ? (filters.sortOrder === 'asc' ? '↑' : '↓') : '⇅'}
                  </span>
                </th>
                <th 
                  className={`table-head-cell sortable ${filters.sortBy === 'position' ? 'sorted' : ''}`}
                  onClick={() => handleSort('position')}
                >
                  Position
                  <span className="sort-icon">
                    {filters.sortBy === 'position' ? (filters.sortOrder === 'asc' ? '↑' : '↓') : '⇅'}
                  </span>
                </th>
                <th className="table-head-cell">Contract</th>
                <th className="table-head-cell">Status</th>
                <th className="table-head-cell text-center">Login Attempts</th>
                <th 
                  className={`table-head-cell sortable ${filters.sortBy === 'created_at' ? 'sorted' : ''}`}
                  onClick={() => handleSort('created_at')}
                >
                  Created
                  <span className="sort-icon">
                    {filters.sortBy === 'created_at' ? (filters.sortOrder === 'asc' ? '↑' : '↓') : '⇅'}
                  </span>
                </th>
                {canManageUsers() && (
                  <th className="table-head-cell text-center">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredUsers.map((user) => {
                const statusInfo = getUserStatusInfo(user)
                const attemptsClass = getLoginAttemptsClass(user.login_attempt)
                
                return (
                  <tr key={user.id} className="table-body-row">
                    {/* Bulk Selection Checkbox */}
                    {canManageUsers() && (
                      <td className="table-body-cell text-center">
                        {user.id !== authState.user?.id ? (
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => handleSelectUser(user.id)}
                            className="user-select-checkbox"
                          />
                        ) : (
                          <span className="self-indicator" title="Your account">👤</span>
                        )}
                      </td>
                    )}

                    {/* User Info */}
                    <td className="table-body-cell">
                      <div className="cell-user">
                        <div className="cell-avatar">
                          {usersService.getUserInitials(user)}
                        </div>
                        <div className="cell-user-info">
                          <div className="cell-user-name">
                            {usersService.getUserDisplayName(user)}
                          </div>
                          <div className="cell-user-email">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Position */}
                    <td className="table-body-cell">
                      <span className={`cell-badge position-${user.position}`}>
                        {usersService.getUserRoleDisplay(user.position)}
                      </span>
                    </td>

                    {/* Contract */}
                    <td className="table-body-cell">
                      {user.contract && user.contract.trim() !== '' ? (
                        <span className={`cell-badge ${getContractDisplayClass(user.contract)}`}>
                          {user.contract}
                        </span>
                      ) : (
                        <span className="cell-badge contract-none">
                          Not Set
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="table-body-cell">
                      <div className={`user-status-indicator ${statusInfo.type}`}>
                        <span className={`status-dot ${statusInfo.dot}`}></span>
                        {statusInfo.text}
                      </div>
                    </td>

                    {/* Login Attempts */}
                    <td className="table-body-cell text-center">
                      <div className={`login-attempts ${attemptsClass}`}>
                        {user.login_attempt === 0 ? '✅' : '⚠️'} {user.login_attempt}/5
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="table-body-cell">
                      <div className="date-display">
                        <span className="date-primary">
                          {usersService.formatRelativeTime(user.created_at)}
                        </span>
                        <span className="date-secondary">
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    {canManageUsers() && (
                      <td className="table-body-cell text-center">
                        <div className="user-actions">
                          {/* Status Dropdown */}
                          <div className="user-status-dropdown">
                            <select
                              value={user.status}
                              onChange={(e) => handleStatusChange(user.id, e.target.value as UserStatus)}
                              disabled={!!actionLoading[user.id] || user.id === authState.user?.id}
                              className={`status-select ${user.status} ${actionLoading[user.id] === 'status' ? 'loading' : ''}`}
                              title="Change User Status"
                            >
                              <option value="enabled">Active</option>
                              <option value="disabled">Disabled</option>
                            </select>
                          </div>

                          {/* Edit */}
                          <button 
                            className="user-action-btn edit"
                            title="Edit User"
                            onClick={() => openEditModal(user)}
                          >
                            ✏️
                          </button>

                          {/* Reset Login Attempts */}
                          {user.login_attempt > 0 && (
                            <button 
                              className={`user-action-btn reset ${actionLoading[user.id] === 'reset' ? 'loading' : ''}`}
                              title="Reset Login Attempts"
                              onClick={() => handleResetAttempts(user.id)}
                              disabled={!!actionLoading[user.id]}
                            >
                              {actionLoading[user.id] === 'reset' ? '' : '🔄'}
                            </button>
                          )}

                          {/* Delete (only if not self) */}
                          {user.id !== authState.user?.id && (
                            <button 
                              className="user-action-btn delete"
                              title="Delete User"
                              onClick={() => openDeleteModal(user)}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="table-empty">
              <div className="table-empty-icon">👥</div>
              <div className="table-empty-text">No users found</div>
              <div className="table-empty-subtext">
                {filters.search || filters.position || filters.status || filters.contract
                  ? 'Try adjusting your filters' 
                  : 'No users have been created yet'
                }
              </div>
            </div>
          )}
        </div>

        <div className="table-footer">
          <div className="table-info">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New User</h3>
              <button className="modal-close" onClick={closeModals}>×</button>
            </div>
            
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                {formErrors.length > 0 && (
                  <div className="form-errors">
                    {formErrors.map((error, index) => (
                      <div key={index} className="form-error">{error}</div>
                    ))}
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="create-first-name">First Name *</label>
                    <input
                      id="create-first-name"
                      type="text"
                      value={createFormData.first_name}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="create-last-name">Last Name *</label>
                    <input
                      id="create-last-name"
                      type="text"
                      value={createFormData.last_name}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="create-username">Username *</label>
                    <input
                      id="create-username"
                      type="text"
                      value={createFormData.username}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, username: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="create-email">Email *</label>
                    <input
                      id="create-email"
                      type="email"
                      value={createFormData.email}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="create-position">Position *</label>
                  <select
                    id="create-position"
                    value={createFormData.position}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, position: e.target.value as UserPosition | '' }))}
                    required
                  >
                    <option value="">Select Position</option>
                    <option value="admin">Administrator</option>
                    <option value="owner">Owner</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="create-contract">Contract Type</label>
                  <select
                    id="create-contract"
                    value={createFormData.contract}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, contract: e.target.value as 'regular' | 'probationary' | 'seasonal' | 'part_time' | 'terminated' | '' }))}
                  >
                    <option value="">Select Contract Type</option>
                    <option value="regular">Regular</option>
                    <option value="probationary">Probationary</option>
                    <option value="seasonal">Seasonal</option>
                    <option value="part_time">Part Time</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>

                <div className="form-note">
                  <strong>Note:</strong> Default password will be: {createFormData.first_name}{createFormData.last_name}123
                  <br />
                  Default PIN will be: 1234
                  <br />
                  Contract type is optional and can be set later.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModals}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                  {modalLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit User: {usersService.getUserDisplayName(selectedUser)}</h3>
              <button className="modal-close" onClick={closeModals}>×</button>
            </div>
            
            <form onSubmit={handleEditUser}>
              <div className="modal-body">
                {formErrors.length > 0 && (
                  <div className="form-errors">
                    {formErrors.map((error, index) => (
                      <div key={index} className="form-error">{error}</div>
                    ))}
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-first-name">First Name *</label>
                    <input
                      id="edit-first-name"
                      type="text"
                      value={editFormData.first_name}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-last-name">Last Name *</label>
                    <input
                      id="edit-last-name"
                      type="text"
                      value={editFormData.last_name}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-username">Username *</label>
                    <input
                      id="edit-username"
                      type="text"
                      value={editFormData.username}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, username: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-email">Email *</label>
                    <input
                      id="edit-email"
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-position">Position *</label>
                  <select
                    id="edit-position"
                    value={editFormData.position}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, position: e.target.value as UserPosition | '' }))}
                    required
                  >
                    <option value="">Select Position</option>
                    <option value="admin">Administrator</option>
                    <option value="owner">Owner</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-contract">Contract Type</label>
                  <select
                    id="edit-contract"
                    value={editFormData.contract}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, contract: e.target.value as 'regular' | 'probationary' | 'seasonal' | 'part_time' | 'terminated' | '' }))}
                  >
                    <option value="">Select Contract Type</option>
                    <option value="regular">Regular</option>
                    <option value="probationary">Probationary</option>
                    <option value="seasonal">Seasonal</option>
                    <option value="part_time">Part Time</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModals}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                  {modalLoading ? 'Updating...' : 'Update User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete User</h3>
              <button className="modal-close" onClick={closeModals}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="delete-confirmation">
                <div className="delete-icon">⚠️</div>
                <p>Are you sure you want to delete <strong>{usersService.getUserDisplayName(selectedUser)}</strong>?</p>
                <p className="delete-warning">This action cannot be undone.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeModals}>
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={handleDeleteUser}
                disabled={modalLoading}
              >
                {modalLoading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users