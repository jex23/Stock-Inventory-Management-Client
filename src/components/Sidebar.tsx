import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authService } from '../services/authService'
import type { AuthState, User } from '../types/auth'
import { useSidebar } from '../contexts/SidebarContext'
import './Sidebar.css'

// User position display mapping
const USER_POSITION_LABELS: Record<string, string> = {
  admin: 'Administrator',
  owner: 'Owner',
  supervisor: 'Supervisor',
  manager: 'Manager',
  staff: 'Staff'
}

interface SidebarProps {}

const Sidebar = ({}: SidebarProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState())
  const { isExpanded, setIsExpanded } = useSidebar()

  const handleMouseEnter = () => {
    setIsExpanded(true)
  }

  const handleMouseLeave = () => {
    setIsExpanded(false)
  }

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState)
    return unsubscribe
  }, [])

  const menuSections = [
    {
      id: 'main',
      title: 'Main',
      items: [
        { id: 'dashboard', icon: '📊', label: 'Dashboard', path: '/dashboard', badge: null },
      ]
    },
    {
      id: 'inventory',
      title: 'Inventory Management',
      items: [
        { id: 'stock-in', icon: '📦', label: 'Stock Management', path: '/stock-in', badge: null },
        { id: 'process', icon: '⚙️', label: 'Process Management', path: '/process', badge: null },
        { id: 'batch-process-upload', icon: '🔄', label: 'Create Batch Process', path: '/batch-process-upload', badge: null },
        { id: 'dispatching', icon: '🚚', label: 'Dispatching', path: '/dispatching', badge: null },
        { id: 'archive', icon: '🗄️', label: 'Archive', path: '/archive', badge: null },
      ]
    },
    {
      id: 'products',
      title: 'Product Management',
      items: [
        { id: 'products', icon: '📋', label: 'Products', path: '/products', badge: null },
        { id: 'finished-products', icon: '✅', label: 'Finished Products', path: '/finished-products', badge: null },
        { id: 'supplier', icon: '🏭', label: 'Suppliers', path: '/supplier', badge: null },
      ]
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      items: [
        { id: 'sales-report', icon: '📈', label: 'Sales Report', path: '/sales-report', badge: null },
        { id: 'inventory-report', icon: '📊', label: 'Inventory Report', path: '/inventory-report', badge: null },
      ]
    },
    {
      id: 'administration',
      title: 'Administration',
      items: [
        { id: 'users', icon: '👥', label: 'User Management', path: '/users', badge: null },
        { id: 'user-profile', icon: '👤', label: 'User Profile', path: '/user-profile', badge: null },
        { id: 'settings', icon: '⚙️', label: 'Settings', path: '/settings', badge: null },
        { id: 'help', icon: '❓', label: 'Help & Support', path: '/help', badge: null },
      ]
    }
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
      {/* Sidebar */}
      <aside 
        className={`sidebar ${isExpanded ? 'sidebar-open' : 'sidebar-closed'}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="sidebar-content">

          {/* Main Navigation */}
          <nav className="sidebar-nav">
            {menuSections.map((section) => (
              <div key={section.id} className="nav-section">
                <div className="nav-section-title">
                  {isExpanded && <span>{section.title}</span>}
                </div>
                <ul className="nav-list">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <button
                        className={`nav-item ${isActiveRoute(item.path) ? 'active' : ''}`}
                        onClick={() => handleNavigation(item.path)}
                        title={!isExpanded ? item.label : ''}
                      >
                        <span className="nav-icon">{item.icon}</span>
                        {isExpanded && (
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
            ))}
          </nav>

          {/* Bottom Navigation with User Info */}
          <div className="sidebar-bottom">
            {/* User Info in Sidebar */}
            {isExpanded && (
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