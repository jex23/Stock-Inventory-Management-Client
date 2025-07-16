import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authService } from '../services/authService'
import type { AuthState, User } from '../types/auth'
import './Sidebar.css'

// User position display mapping
const USER_POSITION_LABELS: Record<string, string> = {
  admin: 'Administrator',
  owner: 'Owner',
  supervisor: 'Supervisor',
  manager: 'Manager',
  staff: 'Staff'
}

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState())

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState)
    return unsubscribe
  }, [])

  const menuItems = [
    { id: 'home', icon: '🏠', label: 'Home', path: '/home', badge: null },
    { id: 'stock-in', icon: '📦', label: 'Stock-in Management', path: '/stock-in', badge: null  },
    { id: 'process', icon: '⚙️', label: 'Process Management', path: '/process', badge: null },
    { id: 'dispatching', icon: '🚚', label: 'Dispatching', path: '/dispatching', badge: null  },
    { id: 'sales-report', icon: '📈', label: 'Sales Report', path: '/sales-report', badge: null  },
    { id: 'archive', icon: '🗄️', label: 'Archive', path: '/archive', badge: null  },
    { id: 'users', icon: '👥', label: 'Users', path: '/users', badge: null  },
    { id: 'products', icon: '📋', label: 'Products', path: '/products', badge: null },
    { id: 'finished-products', icon: '✅', label: 'Finished Products', path: '/finished-products', badge: null },
    { id: 'supplier', icon: '🏭', label: 'Supplier', path: '/supplier', badge: null },
  ]

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

  const handleNavigation = (path: string) => {
    navigate(path)
  }

  const isActiveRoute = (path: string) => {
    return location.pathname === path
  }

  const { user } = authState
  const userInitials = getUserInitials(user)
  const userDisplayName = getUserDisplayName(user)
  const userRole = getUserRoleDisplay(user)

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onToggle}></div>
      )}
      
      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="sidebar-content">
          {/* Toggle Button */}
          <button className="sidebar-toggle" onClick={onToggle}>
            <span className="toggle-icon">{isOpen ? '◀' : '▶'}</span>
          </button>

          {/* Main Navigation */}
          <nav className="sidebar-nav">
            <div className="nav-section">
              <div className="nav-section-title">
                {isOpen && <span>Main Menu</span>}
              </div>
              <ul className="nav-list">
                {menuItems.map((item) => (
                  <li key={item.id}>
                    <button
                      className={`nav-item ${isActiveRoute(item.path) ? 'active' : ''}`}
                      onClick={() => handleNavigation(item.path)}
                      title={!isOpen ? item.label : ''}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      {isOpen && (
                        <>
                          <span className="nav-label">{item.label}</span>
                          {item.badge && (
                            <span className="nav-badge">{item.badge}</span>
                          )}
                        </>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Bottom Navigation with User Info */}
          <div className="sidebar-bottom">
            {/* User Info in Sidebar */}
            {isOpen && (
              <div className="sidebar-user">
                <div className="sidebar-user-avatar">
                  <span>{userInitials}</span>
                </div>
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name" title={userDisplayName}>
                    {userDisplayName}
                  </div>
                  <div className="sidebar-user-role" title={userRole}>
                    {userRole}
                  </div>
                  <div className="sidebar-user-status">
                    <span className="status-dot"></span>
                    Online
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar