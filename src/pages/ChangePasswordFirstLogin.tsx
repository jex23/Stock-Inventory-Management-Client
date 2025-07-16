import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authService } from '../services/authService'
import type { ChangePasswordFormData } from '../types/auth'
import { VALIDATION, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants/api'
import './ChangePasswordFirstLogin.css'

interface LocationState {
  username_or_email?: string;
  message?: string;
}

const ChangePasswordFirstLogin = () => {
  const [formData, setFormData] = useState<ChangePasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    isLoading: false
  })
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const state = location.state as LocationState
    if (state?.username_or_email) {
      setUsernameOrEmail(state.username_or_email)
    }
    if (state?.message) {
      setSuccessMessage(state.message)
    }
  }, [location.state])

  const validateForm = (): boolean => {
    if (!usernameOrEmail.trim()) {
      setErrorMessage('Username or email is required')
      return false
    }

    if (!formData.currentPassword) {
      setErrorMessage('Current password is required')
      return false
    }

    if (!formData.newPassword) {
      setErrorMessage('New password is required')
      return false
    }

    if (formData.newPassword.length < VALIDATION.PASSWORD_MIN_LENGTH) {
      setErrorMessage(ERROR_MESSAGES.WEAK_PASSWORD)
      return false
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setErrorMessage(ERROR_MESSAGES.PASSWORD_MISMATCH)
      return false
    }

    if (formData.currentPassword === formData.newPassword) {
      setErrorMessage('New password must be different from current password')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!validateForm()) {
      return
    }

    setFormData(prev => ({ ...prev, isLoading: true }))

    try {
      const response = await authService.changePasswordFirstLogin({
        username_or_email: usernameOrEmail.trim(),
        current_password: formData.currentPassword,
        new_password: formData.newPassword
      })

      setSuccessMessage(SUCCESS_MESSAGES.PASSWORD_CHANGED)
      
      // Navigate to home after successful password change
      setTimeout(() => {
        navigate('/home')
      }, 1500)
    } catch (error) {
      console.error('Change password error:', error)
      setErrorMessage(error instanceof Error ? error.message : ERROR_MESSAGES.SERVER_ERROR)
    } finally {
      setFormData(prev => ({ ...prev, isLoading: false }))
    }
  }

  const handleInputChange = (field: keyof ChangePasswordFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear messages when user starts typing
    if (errorMessage) setErrorMessage('')
    if (successMessage && field !== 'isLoading') setSuccessMessage('')
  }

  const handleUsernameEmailChange = (value: string) => {
    setUsernameOrEmail(value)
    if (errorMessage) setErrorMessage('')
  }

  const handleBackToLogin = () => {
    navigate('/login')
  }

  return (
    <div className="change-password-container">
      <div className="change-password-card">
        <div className="change-password-header">
          <div className="company-logo">
            <div className="logo-icon">🏢</div>
            <span className="company-name">Stock Inventory Management</span>
          </div>
        </div>

        <h1 className="change-password-title">Change Password</h1>
        <p className="change-password-subtitle">
          Please change your password to continue using the system
        </p>

        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="change-password-form">
          <div className="form-group">
            <label htmlFor="usernameOrEmail" className="form-label">
              Username or Email
            </label>
            <input
              type="text"
              id="usernameOrEmail"
              className="form-input"
              value={usernameOrEmail}
              onChange={(e) => handleUsernameEmailChange(e.target.value)}
              placeholder="Enter your username or email"
              required
              disabled={formData.isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="currentPassword" className="form-label">
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              className="form-input"
              value={formData.currentPassword}
              onChange={(e) => handleInputChange('currentPassword', e.target.value)}
              placeholder="Enter your current password"
              required
              disabled={formData.isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword" className="form-label">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              className="form-input"
              value={formData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              placeholder="Enter your new password"
              required
              disabled={formData.isLoading}
              minLength={VALIDATION.PASSWORD_MIN_LENGTH}
            />
            <small className="form-hint">
              Password must be at least {VALIDATION.PASSWORD_MIN_LENGTH} characters long
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              className="form-input"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="Confirm your new password"
              required
              disabled={formData.isLoading}
              minLength={VALIDATION.PASSWORD_MIN_LENGTH}
            />
          </div>

          <button type="submit" className="change-password-button" disabled={formData.isLoading}>
            {formData.isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Changing Password...
              </>
            ) : (
              'Change Password'
            )}
          </button>
        </form>

        <div className="change-password-footer">
          <p>
            <span className="back-link" onClick={handleBackToLogin}>
              Back to Login
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ChangePasswordFirstLogin