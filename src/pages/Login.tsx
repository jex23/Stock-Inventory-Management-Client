import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import type { LoginFormData } from '../types/auth'
import { VALIDATION, ERROR_MESSAGES } from '../constants/api'
import './Login.css'

const Login = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    usernameOrEmail: '',
    password: '',
    isLoading: false
  })
  const [errorMessage, setErrorMessage] = useState('')
  const navigate = useNavigate()

  const validateForm = (): boolean => {
    if (!formData.usernameOrEmail.trim()) {
      setErrorMessage('Username or email is required')
      return false
    }

    if (!formData.password) {
      setErrorMessage('Password is required')
      return false
    }

    if (formData.password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
      setErrorMessage(`Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`)
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!validateForm()) {
      return
    }

    setFormData(prev => ({ ...prev, isLoading: true }))

    try {
      const response = await authService.login({
        username_or_email: formData.usernameOrEmail.trim(),
        password: formData.password
      })

      // Check if this is a first-time login
      if (response.is_first_login) {
        navigate('/change-password-first-login', {
          state: { 
            username_or_email: formData.usernameOrEmail.trim(),
            message: 'Please change your password to continue'
          }
        })
      } else {
        navigate('/home')
      }
    } catch (error) {
      console.error('Login error:', error)
      setErrorMessage(error instanceof Error ? error.message : ERROR_MESSAGES.SERVER_ERROR)
    } finally {
      setFormData(prev => ({ ...prev, isLoading: false }))
    }
  }

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errorMessage) {
      setErrorMessage('')
    }
  }

  const handleForgotPassword = () => {
    navigate('/forgot-password')
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="company-logo">
            <div className="logo-icon">🏢</div>
            <span className="company-name">Stock Inventory Management</span>
          </div>
        </div>
        
        <h1 className="login-title">Welcome Back</h1>
        <p className="login-subtitle">Please sign in to your account</p>
        
        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="usernameOrEmail" className="form-label">
              Username or Email
            </label>
            <input
              type="text"
              id="usernameOrEmail"
              className="form-input"
              value={formData.usernameOrEmail}
              onChange={(e) => handleInputChange('usernameOrEmail', e.target.value)}
              placeholder="Enter your username or email"
              required
              disabled={formData.isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Enter your password"
              required
              disabled={formData.isLoading}
              minLength={VALIDATION.PASSWORD_MIN_LENGTH}
            />
          </div>

          <div className="forgot-password-link-container">
            <span className="forgot-password-link" onClick={handleForgotPassword}>
              Forgot Password?
            </span>
          </div>

          <button type="submit" className="login-button" disabled={formData.isLoading}>
            {formData.isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Don't have an account? <span className="signup-link">Contact Administrator</span></p>
        </div>
      </div>
    </div>
  )
}

export default Login
