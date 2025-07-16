import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import type { AuthState, User } from '../types/auth'
import { APP_CONFIG } from '../constants/api'
import './Header.css'

// User position display mapping
const USER_POSITION_LABELS: Record<string, string> = {
  admin: 'Administrator',
  owner: 'Owner',
  supervisor: 'Supervisor',
  manager: 'Manager',
  staff: 'Staff'
}

const Header = () => {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState())
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const navigate = useNavigate()

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState)
    return unsubscribe
  }, [])

  // Generate user initials from name
  const getUserInitials = (user: User | null): string => {
    if (!user) return 'U'
    
    const firstInitial = user.first_name?.charAt(0).toUpperCase() || ''
    const lastInitial = user.last_name?.charAt(0).toUpperCase() || ''
    
    return firstInitial + lastInitial || user.username?.charAt(0).toUpperCase() || 'U'
  }

  // Get user's full name
  const getUserDisplayName = (user: User | null): string => {
    if (!user) return 'User'
    
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    
    return user.username || 'User'
  }

  // Get user's role display name
  const getUserRoleDisplay = (user: User | null): string => {
    if (!user?.position) return 'User'
    
    return USER_POSITION_LABELS[user.position] || user.position
  }

  const handleLogout = async () => {
    if (isLoggingOut) return // Prevent double-click
    
    setIsLoggingOut(true)
    
    try {
      await authService.logout()
      // Navigation will happen automatically via auth state change
      // But we can also force navigate as backup
      setTimeout(() => {
        navigate('/login')
      }, 100)
    } catch (error) {
      console.error('Logout error:', error)
      // Force navigate even if logout fails
      navigate('/login')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleLogoClick = () => {
    navigate('/home')
  }

  const { user } = authState
  const userInitials = getUserInitials(user)
  const userDisplayName = getUserDisplayName(user)
  const userRole = getUserRoleDisplay(user)

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <div className="company-logo" onClick={handleLogoClick}>
            <div className="logo-icon">🏢</div>
            <span className="company-name">{APP_CONFIG.APP_NAME}</span>
          </div>
        </div>

        <div className="header-right">
          <div className="user-menu">
            <div className="user-profile">
              <div className="user-avatar">
                <span>{userInitials}</span>
              </div>
              <div className="user-info">
                <span className="user-name" title={userDisplayName}>
                  {userDisplayName}
                </span>
                <span className="user-role" title={userRole}>
                  {userRole}
                </span>
              </div>
            </div>

            <button 
              onClick={handleLogout} 
              className={`logout-button ${isLoggingOut ? 'logging-out' : ''}`}
              disabled={isLoggingOut}
              title="Sign out"
            >
              <span className="logout-icon">
                {isLoggingOut ? '⏳' : '🚪'}
              </span>
              {isLoggingOut ? 'Signing Out...' : 'Logout'}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header