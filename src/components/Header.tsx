import { useState, useEffect, useRef } from 'react'
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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface HeaderProps {}

const Header: React.FC<HeaderProps> = () => {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState())
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState)
    return unsubscribe
  }, [])

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])


  const handleLogout = async () => {
    if (isLoggingOut) return // Prevent double-click

    setIsLoggingOut(true)
    setIsDropdownOpen(false) // Close dropdown

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

  const handleProfileClick = () => {
    setIsDropdownOpen(false)
    navigate('/user-profile')
  }

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  const handleLogoClick = () => {
    navigate('/dashboard')
  }

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

  const { user } = authState
  const userInitials = getUserInitials(user)
  const userDisplayName = getUserDisplayName(user)
  const userRole = getUserRoleDisplay(user)

  return (
    <header className="header">
      <div className="header-content">
        <div className="company-logo" onClick={handleLogoClick}>
          <div className="logo-icon">🏢</div>
          <span className="company-name">{APP_CONFIG.APP_NAME}</span>
        </div>

        <div className="header-right">
          {/* User Info Card with Dropdown */}
          {authState.isAuthenticated && (
            <div className="user-menu" ref={dropdownRef}>
              <div className="header-user-card" onClick={toggleDropdown}>
                <div className="header-user-avatar">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={userDisplayName} className="avatar-image" />
                  ) : (
                    <span className="avatar-initials">{userInitials}</span>
                  )}
                </div>
                <div className="header-user-info">
                  <div className="header-user-name">{userDisplayName}</div>
                  <div className="header-user-role">{userRole}</div>
                </div>
                <div className="dropdown-arrow">
                  <span className={`arrow ${isDropdownOpen ? 'open' : ''}`}>▼</span>
                </div>
              </div>
              
              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="user-dropdown">
                  <button
                    onClick={handleProfileClick}
                    className="dropdown-item"
                  >
                    <span className="dropdown-icon">👤</span>
                    Update Profile
                  </button>
                  <div className="dropdown-divider"></div>
                  <button
                    onClick={handleLogout}
                    className={`dropdown-item logout-item ${isLoggingOut ? 'logging-out' : ''}`}
                    disabled={isLoggingOut}
                  >
                    <span className="dropdown-icon">
                      {isLoggingOut ? '⏳' : '🚪'}
                    </span>
                    {isLoggingOut ? 'Signing Out...' : 'Logout'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header