import type { UserPosition, UserStatus } from './auth'

// Core User Interface
export interface UserDetails {
  id: number
  first_name: string
  last_name: string
  position: UserPosition
  contract?: string | null
  username: string
  email: string
  status: UserStatus
  login_attempt: number
  created_at: string
  updated_at: string
  is_first_login?: boolean | null
}

// User Creation Request
export interface CreateUserRequest {
  first_name: string
  last_name: string
  position: UserPosition
  contract?: string
  username: string
  email: string
  password: string
  pin: string
}

// User Update Request (partial update)
export interface UpdateUserRequest {
  first_name?: string
  last_name?: string
  position?: UserPosition
  contract?: string
  username?: string
  email?: string
}

// User Status Update Request
export interface UpdateUserStatusRequest {
  status: UserStatus
}

// User Filters for Search/Sort
export interface UserFilters {
  search?: string
  position?: UserPosition
  status?: UserStatus
  contract?: string
  sortBy?: 'name' | 'email' | 'position' | 'created_at' | 'login_attempt'
  sortOrder?: 'asc' | 'desc'
}

// User Statistics
export interface UserStats {
  total: number
  active: number
  disabled: number
  byPosition: {
    admin: number
    owner: number
    supervisor: number
    manager: number
    staff: number
  }
  recentLogins: number
  lockedAccounts: number
}

// User Action Types
export type UserAction = 'create' | 'edit' | 'delete' | 'enable' | 'disable' | 'reset'

// User Form Data
export interface UserFormData {
  first_name: string
  last_name: string
  position: UserPosition | ''
  contract: string
  username: string
  email: string
}

// User Modal States
export interface UserModalState {
  showCreate: boolean
  showEdit: boolean
  showDelete: boolean
  showView: boolean
}

// API Response Types
export interface CreateUserResponse {
  user: UserDetails
  message: string
}

export interface UpdateUserResponse {
  user: UserDetails
  message: string
}

export interface DeleteUserResponse {
  message: string
}

export interface UserActionResponse {
  message: string
  success: boolean
}

// User Validation Errors
export interface UserValidationErrors {
  first_name?: string[]
  last_name?: string[]
  position?: string[]
  username?: string[]
  email?: string[]
  password?: string[]
  pin?: string[]
}

// User Management Permissions
export interface UserPermissions {
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canManageStatus: boolean
  canResetAttempts: boolean
  canViewDetails: boolean
}

// User Activity Log (for future use)
export interface UserActivity {
  id: number
  user_id: number
  action: UserAction
  description: string
  performed_by: number
  created_at: string
}

// User Bulk Operations (for future use)
export interface BulkUserOperation {
  action: 'enable' | 'disable' | 'delete'
  user_ids: number[]
}

export interface BulkUserResponse {
  success_count: number
  error_count: number
  errors: Array<{
    user_id: number
    error: string
  }>
}

// User Export/Import (for future use)
export interface UserExportData {
  users: UserDetails[]
  exported_at: string
  exported_by: number
}

export interface UserImportData {
  users: CreateUserRequest[]
  skip_existing: boolean
  update_existing: boolean
}

// User Password/PIN Management
export interface PasswordResetRequest {
  user_id: number
  new_password?: string
  reset_to_default?: boolean
}

export interface PinResetRequest {
  user_id: number
  new_pin?: string
  reset_to_default?: boolean
}

// User Session Management
export interface UserSession {
  user_id: number
  session_token: string
  created_at: string
  expires_at: string
  ip_address?: string
  user_agent?: string
}

// User Preferences (for future use)
export interface UserPreferences {
  user_id: number
  theme: 'light' | 'dark' | 'auto'
  language: string
  timezone: string
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
}

// User Role Hierarchy
export const USER_ROLE_HIERARCHY: Record<UserPosition, number> = {
  owner: 5,
  admin: 4,
  supervisor: 3,
  manager: 2,
  staff: 1
}

// User Role Permissions Matrix
export const USER_ROLE_PERMISSIONS: Record<UserPosition, UserPermissions> = {
  owner: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canManageStatus: true,
    canResetAttempts: true,
    canViewDetails: true
  },
  admin: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canManageStatus: true,
    canResetAttempts: true,
    canViewDetails: true
  },
  supervisor: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canManageStatus: false,
    canResetAttempts: false,
    canViewDetails: true
  },
  manager: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canManageStatus: false,
    canResetAttempts: false,
    canViewDetails: true
  },
  staff: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canManageStatus: false,
    canResetAttempts: false,
    canViewDetails: false
  }
}

// Helper function to check user permissions
export function getUserPermissions(userPosition: UserPosition): UserPermissions {
  return USER_ROLE_PERMISSIONS[userPosition] || USER_ROLE_PERMISSIONS.staff
}

// Helper function to check if user can perform action on another user
export function canUserManageUser(
  currentUserPosition: UserPosition,
  targetUserPosition: UserPosition
): boolean {
  const currentLevel = USER_ROLE_HIERARCHY[currentUserPosition] || 0
  const targetLevel = USER_ROLE_HIERARCHY[targetUserPosition] || 0
  
  // Owner and Admin can manage all users
  if (currentUserPosition === 'owner' || currentUserPosition === 'admin') {
    return true
  }
  
  // Users can only manage users of lower hierarchy level
  return currentLevel > targetLevel
}

// Default values
export const DEFAULT_USER_FILTERS: UserFilters = {
  search: '',
  position: undefined,
  status: undefined,
  contract: undefined,
  sortBy: 'created_at',
  sortOrder: 'desc'
}

export const DEFAULT_USER_FORM_DATA: UserFormData = {
  first_name: '',
  last_name: '',
  position: '',
  contract: '',
  username: '',
  email: ''
}

export const DEFAULT_MODAL_STATE: UserModalState = {
  showCreate: false,
  showEdit: false,
  showDelete: false,
  showView: false
}