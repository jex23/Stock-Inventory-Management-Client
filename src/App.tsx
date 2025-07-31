import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { authService } from './services/authService'
import type { AuthState } from './types/auth'
import { SidebarProvider, useSidebar } from './contexts/SidebarContext'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ChangePasswordFirstLogin from './pages/ChangePasswordFirstLogin'
import Dashboard from './pages/Dashboard'
import StockIn from './pages/Stock'
import ProcessManagement from './pages/ProcessManagement'
import BatchProcessUpload from './pages/BatchProcessUpload'
import Products from './pages/Products'
import Dispatching from './pages/Dispatching'
import Archive from './pages/Archive'
import Users from './pages/Users'
import UserProfile from './pages/UserProfile'
import FinishedProducts from './pages/FinishedProducts'
import SupplierPage from './pages/Supplier'
import SalesReport from './pages/SalesReport'
import InventoryReport from './pages/InventoryReport'
import Settings from './pages/Settings'
import Help from './pages/Help'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import './App.css'

// Layout component for authenticated pages
const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => {
  const { isExpanded } = useSidebar()

  return (
    <div className="app-layout">
      <Header />
      <div className="main-layout">
        <Sidebar />
        <main className={`main-content ${isExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
          <div className="content-wrapper">
            {children}
          </div>
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

  return (
    <SidebarProvider>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </SidebarProvider>
  )
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
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
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
          path="/batch-process-upload" 
          element={
            <ProtectedRoute>
              <BatchProcessUpload />
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
        
        {/* Legacy Home Route - Redirect to Dashboard */}
        <Route 
          path="/home" 
          element={
            <Navigate to="/dashboard" replace />
          } 
        />
        
        {/* Archive Management Route */}
        <Route 
          path="/archive" 
          element={
            <ProtectedRoute>
              <Archive />
            </ProtectedRoute>
          } 
        />
        
        {/* User Profile Route */}
        <Route 
          path="/user-profile" 
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          } 
        />
        
        {/* Reports Routes */}
        <Route 
          path="/sales-report" 
          element={
            <ProtectedRoute>
              <SalesReport />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/inventory-report" 
          element={
            <ProtectedRoute>
              <InventoryReport />
            </ProtectedRoute>
          } 
        />
        
        {/* Default redirect based on authentication status */}
        <Route 
          path="/" 
          element={
            <Navigate to={authState.isAuthenticated ? "/dashboard" : "/login"} replace />
          } 
        />
        
        {/* Catch all route - redirects to appropriate default page */}
        <Route 
          path="*" 
          element={
            <Navigate to={authState.isAuthenticated ? "/dashboard" : "/login"} replace />
          } 
        />
      </Routes>
    </div>
  )
}

export default App