import type {
  UserDetails,
  CreateUserRequest,
  UpdateUserRequest,
  UpdateUserStatusRequest,
  UserStats,
  UserFilters
} from '../types/users'
import type { UserStatus } from '../types/auth'
import { authService } from './authService'
import { API_CONFIG, API_ENDPOINTS, HTTP_STATUS, ERROR_MESSAGES } from '../constants/api'

// Custom API Error class for users service
class UsersAPIError extends Error {
  status_code?: number

  constructor(message: string, status_code?: number) {
    super(message)
    this.name = 'UsersAPIError'
    this.status_code = status_code
  }
}

class UsersService {
  // HTTP Client with auth headers
  private async apiCall<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`
    
    const token = authService.getToken()
    const defaultHeaders = {
      ...API_CONFIG.HEADERS,
      ...(token && {
        'Authorization': `Bearer ${token}`
      })
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
        throw new UsersAPIError(errorData.detail || `HTTP ${response.status}`, response.status)
      }

      // Handle no content responses
      if (response.status === 204) {
        return {} as T
      }

      return await response.json()
    } catch (error) {
      if (error instanceof UsersAPIError) {
        throw error
      }
      
      // Network errors
      throw new UsersAPIError(ERROR_MESSAGES.NETWORK_ERROR)
    }
  }

  // Get all users
  async getAllUsers(): Promise<UserDetails[]> {
    try {
      const users = await this.apiCall<UserDetails[]>(API_ENDPOINTS.USERS, {
        method: 'GET'
      })
      
      console.log('Received users from API:', users)
      
      return users.map(user => ({
        ...user,
        // Ensure consistent date format
        created_at: new Date(user.created_at).toISOString(),
        updated_at: new Date(user.updated_at).toISOString(),
        // Ensure contract field is properly handled - keep null as null, empty string as empty
        contract: user.contract === null ? null : user.contract || null
      }))
    } catch (error) {
      console.error('Failed to fetch users:', error)
      throw this.handleUsersError(error)
    }
  }

  // Get single user by ID
  async getUserById(userId: number): Promise<UserDetails> {
    try {
      const user = await this.apiCall<UserDetails>(`${API_ENDPOINTS.USERS}/${userId}`, {
        method: 'GET'
      })
      
      return {
        ...user,
        created_at: new Date(user.created_at).toISOString(),
        updated_at: new Date(user.updated_at).toISOString()
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
      throw this.handleUsersError(error)
    }
  }

  // Create new user with default password and pin
  async createUser(userData: Omit<CreateUserRequest, 'password' | 'pin'>): Promise<UserDetails> {
    try {
      // Generate default password: firstname + lastname + 123
      const defaultPassword = `${userData.first_name}${userData.last_name}123`
      const defaultPin = '1234'

      const createData: CreateUserRequest = {
        ...userData,
        password: defaultPassword,
        pin: defaultPin,
        // Ensure contract is included and not undefined
        contract: userData.contract || ''
      }

      console.log('Creating user with data:', createData)

      const newUser = await this.apiCall<UserDetails>(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        body: JSON.stringify(createData)
      })
      
      console.log('User created successfully:', newUser)
      
      return {
        ...newUser,
        created_at: new Date(newUser.created_at).toISOString(),
        updated_at: new Date(newUser.updated_at).toISOString()
      }
    } catch (error) {
      console.error('Failed to create user:', error)
      throw this.handleUsersError(error)
    }
  }

  // Update user information
  async updateUser(userId: number, userData: UpdateUserRequest): Promise<UserDetails> {
    try {
      const updatedUser = await this.apiCall<UserDetails>(`${API_ENDPOINTS.USERS}/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData)
      })
      
      return {
        ...updatedUser,
        created_at: new Date(updatedUser.created_at).toISOString(),
        updated_at: new Date(updatedUser.updated_at).toISOString()
      }
    } catch (error) {
      console.error('Failed to update user:', error)
      throw this.handleUsersError(error)
    }
  }

  // Delete user
  async deleteUser(userId: number): Promise<{ message: string }> {
    try {
      return await this.apiCall<{ message: string }>(`${API_ENDPOINTS.USERS}/${userId}`, {
        method: 'DELETE'
      })
    } catch (error) {
      console.error('Failed to delete user:', error)
      throw this.handleUsersError(error)
    }
  }

  // Update user status (enable/disable)
  async updateUserStatus(userId: number, status: UserStatus): Promise<{ message: string }> {
    try {
      return await this.apiCall<{ message: string }>(`${API_ENDPOINTS.USERS}/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      })
    } catch (error) {
      console.error('Failed to update user status:', error)
      throw this.handleUsersError(error)
    }
  }

  // Reset user login attempts
  async resetLoginAttempts(userId: number): Promise<{ message: string }> {
    try {
      return await this.apiCall<{ message: string }>(`${API_ENDPOINTS.USERS}/${userId}/reset-attempts`, {
        method: 'PUT'
      })
    } catch (error) {
      console.error('Failed to reset login attempts:', error)
      throw this.handleUsersError(error)
    }
  }

  // Filter and sort users locally
  filterUsers(users: UserDetails[], filters: UserFilters): UserDetails[] {
    let filteredUsers = [...users]

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filteredUsers = filteredUsers.filter(user =>
        user.first_name.toLowerCase().includes(searchTerm) ||
        user.last_name.toLowerCase().includes(searchTerm) ||
        user.username.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
      )
    }

    // Position filter
    if (filters.position) {
      filteredUsers = filteredUsers.filter(user => user.position === filters.position)
    }

    // Status filter
    if (filters.status) {
      filteredUsers = filteredUsers.filter(user => user.status === filters.status)
    }

    // Contract filter
    if (filters.contract) {
      filteredUsers = filteredUsers.filter(user => user.contract === filters.contract)
    }

    // Sorting
    if (filters.sortBy) {
      filteredUsers.sort((a, b) => {
        let aValue: any
        let bValue: any

        switch (filters.sortBy) {
          case 'name':
            aValue = `${a.first_name} ${a.last_name}`.toLowerCase()
            bValue = `${b.first_name} ${b.last_name}`.toLowerCase()
            break
          case 'email':
            aValue = a.email.toLowerCase()
            bValue = b.email.toLowerCase()
            break
          case 'position':
            aValue = a.position
            bValue = b.position
            break
          case 'created_at':
            aValue = new Date(a.created_at).getTime()
            bValue = new Date(b.created_at).getTime()
            break
          case 'login_attempt':
            aValue = a.login_attempt
            bValue = b.login_attempt
            break
          default:
            return 0
        }

        if (aValue < bValue) return filters.sortOrder === 'desc' ? 1 : -1
        if (aValue > bValue) return filters.sortOrder === 'desc' ? -1 : 1
        return 0
      })
    }

    return filteredUsers
  }

  // Calculate user statistics
  calculateStats(users: UserDetails[]): UserStats {
    const stats: UserStats = {
      total: users.length,
      active: 0,
      disabled: 0,
      byPosition: {
        admin: 0,
        owner: 0,
        supervisor: 0,
        manager: 0,
        staff: 0
      },
      recentLogins: 0,
      lockedAccounts: 0
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    users.forEach(user => {
      // Status counts
      if (user.status === 'enabled') {
        stats.active++
      } else {
        stats.disabled++
      }

      // Position counts
      stats.byPosition[user.position]++

      // Recent logins (users with 0 login attempts, meaning successful recent login)
      if (user.login_attempt === 0 && new Date(user.updated_at) > oneDayAgo) {
        stats.recentLogins++
      }

      // Locked accounts (max attempts reached)
      if (user.login_attempt >= 5) {
        stats.lockedAccounts++
      }
    })

    return stats
  }

  // Generate default password for new users
  generateDefaultPassword(firstName: string, lastName: string): string {
    return `${firstName}${lastName}123`
  }

  // Generate default PIN for new users
  generateDefaultPin(): string {
    return '1234'
  }

  // Get user display name
  getUserDisplayName(user: UserDetails): string {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user.username
  }

  // Get user initials
  getUserInitials(user: UserDetails): string {
    const firstInitial = user.first_name?.charAt(0).toUpperCase() || ''
    const lastInitial = user.last_name?.charAt(0).toUpperCase() || ''
    return firstInitial + lastInitial || user.username?.charAt(0).toUpperCase() || 'U'
  }

  // Format user role for display
  getUserRoleDisplay(position: string): string {
    const roleMap: Record<string, string> = {
      admin: 'Administrator',
      owner: 'Owner',
      supervisor: 'Supervisor',
      manager: 'Manager',
      staff: 'Staff'
    }
    return roleMap[position] || position
  }

  // Format dates for display
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString()
  }

  // Format relative time
  formatRelativeTime(dateString: string): string {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  // Validate user data
  validateUserData(userData: Partial<CreateUserRequest | UpdateUserRequest>): string[] {
    const errors: string[] = []

    if ('first_name' in userData && userData.first_name !== undefined && !userData.first_name?.trim()) {
      errors.push('First name is required')
    }

    if ('last_name' in userData && userData.last_name !== undefined && !userData.last_name?.trim()) {
      errors.push('Last name is required')
    }

    if ('username' in userData && userData.username !== undefined && !userData.username?.trim()) {
      errors.push('Username is required')
    }

    if ('email' in userData && userData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(userData.email)) {
        errors.push('Invalid email format')
      }
    }

    if ('position' in userData && userData.position !== undefined && !userData.position) {
      errors.push('Position is required')
    }

    return errors
  }

  // Handle API errors
  private handleUsersError(error: unknown): Error {
    if (error instanceof UsersAPIError) {
      switch (error.status_code) {
        case HTTP_STATUS.UNAUTHORIZED:
          return new Error('You are not authorized to perform this action.')
        case HTTP_STATUS.FORBIDDEN:
          return new Error('You do not have permission to manage users.')
        case HTTP_STATUS.NOT_FOUND:
          return new Error('User not found.')
        case HTTP_STATUS.BAD_REQUEST:
          return new Error(error.message || 'Invalid request data.')
        case HTTP_STATUS.CONFLICT:
          return new Error(error.message || 'Username or email already exists.')
        case HTTP_STATUS.SERVICE_UNAVAILABLE:
          return new Error(ERROR_MESSAGES.SERVER_ERROR)
        default:
          return new Error(error.message || ERROR_MESSAGES.SERVER_ERROR)
      }
    }

    return error instanceof Error ? error : new Error(ERROR_MESSAGES.SERVER_ERROR)
  }
}

// Export singleton instance
export const usersService = new UsersService()
export default usersService