import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import type { ForgotPasswordFormData } from '../types/auth'
import { VALIDATION, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants/api'
import './ForgotPassword.css'

const ForgotPassword = () => {
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
    step: 1,
    isLoading: false
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const navigate = useNavigate()

  const validateEmailStep = (): boolean => {
    if (!formData.email.trim()) {
      setErrorMessage('Email address is required')
      return false
    }

    if (!VALIDATION.EMAIL_REGEX.test(formData.email)) {
      setErrorMessage(ERROR_MESSAGES.INVALID_EMAIL)
      return false
    }

    return true
  }

  const validateResetStep = (): boolean => {
    if (!formData.otp.trim()) {
      setErrorMessage('Reset code is required')
      return false
    }

    if (formData.otp.length !== VALIDATION.OTP_LENGTH) {
      setErrorMessage(`Reset code must be ${VALIDATION.OTP_LENGTH} digits`)
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

    return true
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!validateEmailStep()) {
      return
    }

    setFormData(prev => ({ ...prev, isLoading: true }))

    try {
      await authService.forgotPassword({ email: formData.email.trim() })
      
      setFormData(prev => ({ ...prev, step: 2 }))
      setSuccessMessage('Reset code has been sent to your email')
    } catch (error) {
      console.error('Forgot password error:', error)
      setErrorMessage(error instanceof Error ? error.message : ERROR_MESSAGES.SERVER_ERROR)
    } finally {
      setFormData(prev => ({ ...prev, isLoading: false }))
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!validateResetStep()) {
      return
    }

    setFormData(prev => ({ ...prev, isLoading: true }))

    try {
      await authService.resetPassword({
        email: formData.email.trim(),
        otp: formData.otp.trim(),
        new_password: formData.newPassword
      })
      
      setSuccessMessage(SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESS)
      
      // Navigate to login after a short delay
      setTimeout(() => {
        navigate('/login', {
          state: { message: 'Password reset successful! Please login with your new password.' }
        })
      }, 2000)
    } catch (error) {
      console.error('Reset password error:', error)
      setErrorMessage(error instanceof Error ? error.message : ERROR_MESSAGES.SERVER_ERROR)
    } finally {
      setFormData(prev => ({ ...prev, isLoading: false }))
    }
  }

  const handleInputChange = (field: keyof ForgotPasswordFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear messages when user starts typing
    if (errorMessage) setErrorMessage('')
    if (successMessage) setSuccessMessage('')
  }

  const handleBackToLogin = () => {
    navigate('/login')
  }

  const handleBackToEmail = () => {
    setFormData(prev => ({
      ...prev,
      step: 1,
      otp: '',
      newPassword: '',
      confirmPassword: ''
    }))
    setErrorMessage('')
    setSuccessMessage('')
  }

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <div className="forgot-password-header">
          <div className="company-logo">
            <div className="logo-icon">🏢</div>
            <span className="company-name">Stock Inventory Management</span>
          </div>
        </div>

        {formData.step === 1 ? (
          <>
            <h1 className="forgot-password-title">Forgot Password</h1>
            <p className="forgot-password-subtitle">
              Enter your email address and we'll send you a reset code
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

            <form onSubmit={handleEmailSubmit} className="forgot-password-form">
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={formData.isLoading}
                />
              </div>

              <button type="submit" className="forgot-password-button" disabled={formData.isLoading}>
                {formData.isLoading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Sending Reset Code...
                  </>
                ) : (
                  'Send Reset Code'
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="forgot-password-title">Reset Password</h1>
            <p className="forgot-password-subtitle">
              Enter the reset code and your new password
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

            <form onSubmit={handlePasswordReset} className="forgot-password-form">
              <div className="form-group">
                <label htmlFor="email-readonly" className="form-label">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email-readonly"
                  className="form-input readonly"
                  value={formData.email}
                  readOnly
                  disabled
                />
              </div>

              <div className="form-group">
                <label htmlFor="otp" className="form-label">
                  Reset Code
                </label>
                <input
                  type="text"
                  id="otp"
                  className="form-input"
                  value={formData.otp}
                  onChange={(e) => handleInputChange('otp', e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit reset code"
                  required
                  disabled={formData.isLoading}
                  maxLength={VALIDATION.OTP_LENGTH}
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
                  placeholder="Enter new password"
                  required
                  disabled={formData.isLoading}
                  minLength={VALIDATION.PASSWORD_MIN_LENGTH}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  className="form-input"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm new password"
                  required
                  disabled={formData.isLoading}
                  minLength={VALIDATION.PASSWORD_MIN_LENGTH}
                />
              </div>

              <button type="submit" className="forgot-password-button" disabled={formData.isLoading}>
                {formData.isLoading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>

              <button 
                type="button" 
                className="back-button" 
                onClick={handleBackToEmail}
                disabled={formData.isLoading}
              >
                Back to Email
              </button>
            </form>
          </>
        )}

        <div className="forgot-password-footer">
          <p>
            Remember your password? 
            <span className="login-link" onClick={handleBackToLogin}>
              Back to Login
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
