import { useState, useEffect } from 'react'
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
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [developerCode, setDeveloperCode] = useState('')
  const [showDeveloperInput, setShowDeveloperInput] = useState(false)
  const [developerError, setDeveloperError] = useState('')
  const navigate = useNavigate()

  // Check if login should be restricted (August 2, 2025 or later)
  useEffect(() => {
    const currentDate = new Date()
    const restrictionDate = new Date('2025-08-02')
    
    if (currentDate >= restrictionDate) {
      const bypassGranted = localStorage.getItem('developer_bypass_granted')
      if (!bypassGranted) {
        setShowPaymentModal(true)
      }
    }
  }, [])

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

    // Check for payment restriction
    const currentDate = new Date()
    const restrictionDate = new Date('2025-08-02')
    
    if (currentDate >= restrictionDate) {
      const bypassGranted = localStorage.getItem('developer_bypass_granted')
      if (!bypassGranted) {
        setShowPaymentModal(true)
        return
      }
    }

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
        // Check if there's a stored redirect path
        const redirectPath = localStorage.getItem('redirectPath')
        if (redirectPath) {
          localStorage.removeItem('redirectPath')
          navigate(redirectPath)
        } else {
          navigate('/dashboard')
        }
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

  const handleDeveloperBypass = () => {
    if (developerCode === '4dm1n!_abc123') {
      localStorage.setItem('developer_bypass_granted', 'true')
      setShowPaymentModal(false)
      setShowDeveloperInput(false)
      setDeveloperCode('')
      setDeveloperError('')
    } else {
      setDeveloperError('Invalid developer code')
    }
  }

  const handleDeveloperCodeChange = (value: string) => {
    setDeveloperCode(value)
    if (developerError) {
      setDeveloperError('')
    }
  }

  return (
    <div className="login-container">
      {/* Payment Restriction Modal */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="payment-modal">
            <div className="modal-header">
              <h2>🚫 Login Disabled</h2>
            </div>
            <div className="modal-body">
              <p className="payment-message">
                <strong>Payment Required</strong>
              </p>
              <p>
                This application requires payment to continue accessing the system. 
                Please contact the administrator for payment details.
              </p>
              {!showDeveloperInput && (
                <div className="modal-actions">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setShowDeveloperInput(true)}
                  >
                    Developer Access
                  </button>
                </div>
              )}
              
              {showDeveloperInput && (
                <div className="developer-bypass">
                  <h4>Developer Bypass</h4>
                  <div className="form-group">
                    <input
                      type="password"
                      placeholder="Enter developer code"
                      value={developerCode}
                      onChange={(e) => handleDeveloperCodeChange(e.target.value)}
                      className={`form-input ${developerError ? 'error' : ''}`}
                      onKeyDown={(e) => e.key === 'Enter' && handleDeveloperBypass()}
                    />
                    {developerError && (
                      <span className="error-text">{developerError}</span>
                    )}
                  </div>
                  <div className="developer-actions">
                    <button 
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowDeveloperInput(false)
                        setDeveloperCode('')
                        setDeveloperError('')
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={handleDeveloperBypass}
                    >
                      Verify Code
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
