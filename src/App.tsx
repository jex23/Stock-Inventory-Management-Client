import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { authService } from './services/authService'
import type { AuthState } from './types/auth'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ChangePasswordFirstLogin from './pages/ChangePasswordFirstLogin'
import Home from './pages/Home'
import StockIn from './pages/Stock'
import ProcessManagement from './pages/ProcessManagement'
import Products from './pages/Products'
import Dispatching from './pages/Dispatching'
import Users from './pages/Users'
import FinishedProducts from './pages/FinishedProducts'
import SupplierPage from './pages/Supplier'
import Settings from './pages/Settings'
import Help from './pages/Help'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Footer from './components/Footer'
import './App.css'

// Layout component for authenticated pages
const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Close sidebar on mobile by default
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    // Set initial state
    handleResize()
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="app-layout">
      <Header />
      <div className="main-layout">
        <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
        <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
          <div className="content-wrapper">
            {children}
          </div>
          <Footer />
        </main>
      </div>
    </div>
  )
}

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState())

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe(setAuthState)
    return unsubscribe
  }, [])

  // Check if token is expired
  useEffect(() => {
    const checkTokenValidity = async () => {
      if (authState.isAuthenticated && authService.isTokenExpired()) {
        await authService.logout()
      }
    }
    
    checkTokenValidity()
  }, [authState.isAuthenticated])

  if (!authState.isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <AuthenticatedLayout>{children}</AuthenticatedLayout>
}

// Public Route component (redirects if authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState())

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState)
    return unsubscribe
  }, [])

  if (authState.isAuthenticated) {
    return <Navigate to="/home" replace />
  }

  return <>{children}</>
}

function App() {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState())
  const location = useLocation()

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState)
    return unsubscribe
  }, [])

  // Initialize auth service and check token validity on app start
  useEffect(() => {
    const initializeAuth = async () => {
      if (authState.isAuthenticated) {
        try {
          // Verify token is still valid by fetching user data
          await authService.getCurrentUser()
        } catch (error) {
          console.log('Token invalid, logging out...')
          await authService.logout()
        }
      }
    }

    initializeAuth()
  }, [])

  return (
    <div className="App">
      <Routes>
        {/* Public routes - Authentication */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/forgot-password" 
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          } 
        />

        <Route 
          path="/change-password-first-login" 
          element={
            <PublicRoute>
              <ChangePasswordFirstLogin />
            </PublicRoute>
          } 
        />
        
        {/* Protected routes - Main Application */}
        <Route 
          path="/home" 
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } 
        />
        
        {/* Inventory Management Routes */}
        <Route 
          path="/stock-in" 
          element={
            <ProtectedRoute>
              <StockIn />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/process" 
          element={
            <ProtectedRoute>
              <ProcessManagement />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dispatching" 
          element={
            <ProtectedRoute>
              <Dispatching />
            </ProtectedRoute>
          } 
        />
        
        {/* Product & Category Management Routes */}
        <Route 
          path="/products" 
          element={
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/finished-products" 
          element={
            <ProtectedRoute>
              <FinishedProducts />
            </ProtectedRoute>
          } 
        />
        
        {/* Supplier & User Management Routes */}
        <Route 
          path="/supplier" 
          element={
            <ProtectedRoute>
              <SupplierPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/users" 
          element={
            <ProtectedRoute>
              <Users />
            </ProtectedRoute>
          } 
        />
        
        {/* System & Configuration Routes */}
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/help" 
          element={
            <ProtectedRoute>
              <Help />
            </ProtectedRoute>
          } 
        />
        
        {/* Default redirect based on authentication status */}
        <Route 
          path="/" 
          element={
            <Navigate to={authState.isAuthenticated ? "/home" : "/login"} replace />
          } 
        />
        
        {/* Catch all route - redirects to appropriate default page */}
        <Route 
          path="*" 
          element={
            <Navigate to={authState.isAuthenticated ? "/home" : "/login"} replace />
          } 
        />
      </Routes>
    </div>
  )
}

export default App