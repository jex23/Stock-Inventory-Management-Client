import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { userProfileService } from '../services/userProfileService';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import type { User, ChangePasswordFormData, ChangePasswordRequest } from '../types/auth';
import type { 
  UserProfileFormData,
  PinFormData,
  UserProfileValidationErrors,
  PinValidationErrors,
  ProfileLoadingState,
  UserUpdateRequest,
  PinUpdateRequest
} from '../types/userProfile';
import './UserProfile.css';

interface TabType {
  id: 'profile' | 'security' | 'password';
  label: string;
  icon: string;
}

const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'password'>('profile');
  
  // Profile form state
  const [profileFormData, setProfileFormData] = useState<UserProfileFormData>(
    userProfileService.createEmptyFormData()
  );
  const [profileErrors, setProfileErrors] = useState<UserProfileValidationErrors>({});
  
  // PIN form state
  const [pinFormData, setPinFormData] = useState<PinFormData>(
    userProfileService.createEmptyPinFormData()
  );
  const [pinErrors, setPinErrors] = useState<PinValidationErrors>({});
  const [showPinFields, setShowPinFields] = useState<{
    current: boolean;
    new: boolean;
    confirm: boolean;
  }>({ current: false, new: false, confirm: false });
  
  // Password form state
  const [passwordFormData, setPasswordFormData] = useState<ChangePasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    isLoading: false
  });
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [showPasswordFields, setShowPasswordFields] = useState<{
    current: boolean;
    new: boolean;
    confirm: boolean;
  }>({ current: false, new: false, confirm: false });
  
  // Loading states
  const [loading, setLoading] = useState<ProfileLoadingState & { passwordUpdate: boolean }>({
    userUpdate: false,
    pinUpdate: false,
    passwordUpdate: false
  });
  const [initialLoading, setInitialLoading] = useState(true);

  const tabs: TabType[] = [
    { id: 'profile', label: 'Profile Information', icon: '👤' },
    { id: 'password', label: 'Change Password', icon: '🔑' },
    { id: 'security', label: 'Security Settings', icon: '🔒' }
  ];

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  useEffect(() => {
    const initializeProfile = async () => {
      try {
        const user = authService.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        setCurrentUser(user);
        setProfileFormData(userProfileService.userToFormData(user));
      } catch (error) {
        console.error('Failed to initialize user profile:', error);
        toast.showError('Failed to load user profile');
      } finally {
        setInitialLoading(false);
      }
    };

    initializeProfile();
  }, [navigate]);

  // =============================================================================
  // PROFILE FORM HANDLERS
  // =============================================================================

  const handleProfileChange = useCallback((field: keyof UserProfileFormData, value: string) => {
    setProfileFormData(prev => ({ ...prev, [field]: value }));
    // Clear field-specific error when user starts typing
    setProfileErrors(prev => {
      if (prev[field]) {
        return { ...prev, [field]: undefined };
      }
      return prev;
    });
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) return;

    // Validate form
    const errors = userProfileService.validateUserProfile(profileFormData);
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    // Check if there are changes
    if (!userProfileService.hasProfileChanges(currentUser, profileFormData)) {
      toast.showWarning('No changes detected');
      return;
    }

    setLoading(prev => ({ ...prev, userUpdate: true }));
    setProfileErrors({});

    try {
      const updateData: UserUpdateRequest = {
        username: profileFormData.username !== currentUser.username ? profileFormData.username : undefined,
        first_name: profileFormData.first_name !== currentUser.first_name ? profileFormData.first_name : undefined,
        last_name: profileFormData.last_name !== currentUser.last_name ? profileFormData.last_name : undefined,
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof UserUpdateRequest] === undefined) {
          delete updateData[key as keyof UserUpdateRequest];
        }
      });

      const result = await userProfileService.updateUserProfile(currentUser.id, updateData);

      if (result.success && result.user) {
        toast.showSuccess('Profile updated successfully!');
        setCurrentUser(result.user);
        setProfileFormData(userProfileService.userToFormData(result.user));
        
        // Update auth service with new user data
        authService.updateUser(result.user);
      } else {
        toast.showError(result.message);
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      toast.showError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setLoading(prev => ({ ...prev, userUpdate: false }));
    }
  };

  // =============================================================================
  // PIN FORM HANDLERS
  // =============================================================================

  const handlePinChange = useCallback((field: keyof PinFormData, value: string) => {
    // Only allow digits and limit to 4 characters
    const numericValue = value.replace(/\D/g, '').slice(0, 4);
    setPinFormData(prev => ({ ...prev, [field]: numericValue }));
    
    // Clear field-specific error when user starts typing
    if (pinErrors[field]) {
      setPinErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [pinErrors]);

  const togglePinVisibility = (field: keyof typeof showPinFields) => {
    setShowPinFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) return;

    // Validate PIN form
    const errors = userProfileService.validatePin(pinFormData);
    if (Object.keys(errors).length > 0) {
      setPinErrors(errors);
      return;
    }

    setLoading(prev => ({ ...prev, pinUpdate: true }));
    setPinErrors({});

    try {
      const pinUpdateData: PinUpdateRequest = {
        current_pin: pinFormData.current_pin,
        new_pin: pinFormData.new_pin,
        confirm_pin: pinFormData.confirm_pin
      };

      const result = await userProfileService.updateUserPin(currentUser.id, pinUpdateData);

      if (result.success) {
        toast.showSuccess('PIN updated successfully!');
        setPinFormData(userProfileService.createEmptyPinFormData());
        setShowPinFields({ current: false, new: false, confirm: false });
      } else {
        toast.showError(result.message);
      }
    } catch (error) {
      console.error('PIN update failed:', error);
      toast.showError(error instanceof Error ? error.message : 'Failed to update PIN');
    } finally {
      setLoading(prev => ({ ...prev, pinUpdate: false }));
    }
  };

  // =============================================================================
  // PASSWORD FORM HANDLERS
  // =============================================================================

  const handlePasswordChange = useCallback((field: keyof ChangePasswordFormData, value: string) => {
    setPasswordFormData(prev => ({ ...prev, [field]: value }));
    // Clear field-specific error when user starts typing
    if (passwordErrors[field as keyof typeof passwordErrors]) {
      setPasswordErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [passwordErrors]);

  const togglePasswordVisibility = (field: keyof typeof showPasswordFields) => {
    setShowPasswordFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validatePasswordForm = (): boolean => {
    const errors: typeof passwordErrors = {};

    if (!passwordFormData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordFormData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordFormData.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters long';
    }

    if (!passwordFormData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordFormData.confirmPassword !== passwordFormData.newPassword) {
      errors.confirmPassword = 'Password confirmation does not match';
    }

    if (passwordFormData.currentPassword === passwordFormData.newPassword) {
      errors.newPassword = 'New password must be different from current password';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) return;

    if (!validatePasswordForm()) {
      return;
    }

    setLoading(prev => ({ ...prev, passwordUpdate: true }));
    setPasswordErrors({});

    try {
      const passwordChangeData: ChangePasswordRequest = {
        username_or_email: currentUser.email,
        current_password: passwordFormData.currentPassword,
        new_password: passwordFormData.newPassword
      };

      await authService.changePassword(passwordChangeData);

      toast.showSuccess('Password changed successfully!');
      setPasswordFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        isLoading: false
      });
      setShowPasswordFields({ current: false, new: false, confirm: false });
    } catch (error) {
      console.error('Password change failed:', error);
      toast.showError(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setLoading(prev => ({ ...prev, passwordUpdate: false }));
    }
  };

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  const resetProfileForm = () => {
    if (currentUser) {
      setProfileFormData(userProfileService.userToFormData(currentUser));
      setProfileErrors({});
    }
  };

  const resetPinForm = () => {
    setPinFormData(userProfileService.createEmptyPinFormData());
    setPinErrors({});
    setShowPinFields({ current: false, new: false, confirm: false });
  };

  const resetPasswordForm = () => {
    setPasswordFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      isLoading: false
    });
    setPasswordErrors({});
    setShowPasswordFields({ current: false, new: false, confirm: false });
  };

  if (initialLoading) {
    return (
      <div className="user-profile-loading">
        <div className="loading-content">
          <div className="spinner"></div>
          <p>Loading user profile...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="user-profile-error">
        <h2>Access Denied</h2>
        <p>You must be logged in to view this page.</p>
        <button onClick={() => navigate('/login')} className="btn btn-primary">
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="user-profile">
      {/* Header Section */}
      <div className="profile-header-modern">
        <div className="profile-hero">
          <div className="profile-avatar-container">
            <div className="profile-avatar-large">
              {currentUser.first_name?.charAt(0)?.toUpperCase() || 'U'}
              {currentUser.last_name?.charAt(0)?.toUpperCase() || ''}
            </div>
            <div className="avatar-status-indicator"></div>
          </div>
          <div className="profile-hero-info">
            <h1 className="profile-hero-name">
              {currentUser.first_name} {currentUser.last_name}
            </h1>
            <p className="profile-hero-role">{currentUser.position || 'User'}</p>
            <p className="profile-hero-username">@{currentUser.username}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation-modern">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-modern ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon-modern">{tab.icon}</span>
            <span className="tab-label-modern">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content-modern">
        {activeTab === 'profile' && (
          <div className="profile-section-modern">
            <div className="section-header-modern">
              <div className="section-icon">👤</div>
              <div className="section-text">
                <h2>Profile Information</h2>
                <p>Update your personal information and account details</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="profile-form-modern">
              <div className="form-grid-modern">
                {/* Username */}
                <div className="form-group">
                  <label htmlFor="username">Username *</label>
                  <input
                    type="text"
                    id="username"
                    value={profileFormData.username || ''}
                    onChange={(e) => handleProfileChange('username', e.target.value)}
                    className={profileErrors.username ? 'error' : ''}
                    disabled={loading.userUpdate}
                  />
                  {profileErrors.username && (
                    <span className="error-text">{profileErrors.username}</span>
                  )}
                </div>


                {/* First Name */}
                <div className="form-group">
                  <label htmlFor="first_name">First Name *</label>
                  <input
                    type="text"
                    id="first_name"
                    value={profileFormData.first_name || ''}
                    onChange={(e) => handleProfileChange('first_name', e.target.value)}
                    className={profileErrors.first_name ? 'error' : ''}
                    disabled={loading.userUpdate}
                  />
                  {profileErrors.first_name && (
                    <span className="error-text">{profileErrors.first_name}</span>
                  )}
                </div>

                {/* Last Name */}
                <div className="form-group">
                  <label htmlFor="last_name">Last Name *</label>
                  <input
                    type="text"
                    id="last_name"
                    value={profileFormData.last_name || ''}
                    onChange={(e) => handleProfileChange('last_name', e.target.value)}
                    className={profileErrors.last_name ? 'error' : ''}
                    disabled={loading.userUpdate}
                  />
                  {profileErrors.last_name && (
                    <span className="error-text">{profileErrors.last_name}</span>
                  )}
                </div>


              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={resetProfileForm}
                  className="btn btn-secondary"
                  disabled={loading.userUpdate}
                >
                  Reset Changes
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading.userUpdate}
                >
                  {loading.userUpdate ? (
                    <>
                      <div className="spinner-small"></div>
                      Updating...
                    </>
                  ) : (
                    'Update Profile'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="security-section-modern">
            <div className="section-header-modern">
              <div className="section-icon">🔑</div>
              <div className="section-text">
                <h2>Change Password</h2>
                <p>Update your account password for secure access</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="pin-form-modern">
              <div className="form-group">
                <label htmlFor="current_password">Current Password *</label>
                <div className="password-input-group">
                  <input
                    type={showPasswordFields.current ? 'text' : 'password'}
                    id="current_password"
                    value={passwordFormData.currentPassword}
                    onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                    placeholder="Enter current password"
                    className={passwordErrors.currentPassword ? 'error' : ''}
                    disabled={loading.passwordUpdate}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility('current')}
                    disabled={loading.passwordUpdate}
                  >
                    {showPasswordFields.current ? '🙈' : '👁️'}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <span className="error-text">{passwordErrors.currentPassword}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="new_password">New Password *</label>
                <div className="password-input-group">
                  <input
                    type={showPasswordFields.new ? 'text' : 'password'}
                    id="new_password"
                    value={passwordFormData.newPassword}
                    onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                    placeholder="Enter new password"
                    className={passwordErrors.newPassword ? 'error' : ''}
                    disabled={loading.passwordUpdate}
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility('new')}
                    disabled={loading.passwordUpdate}
                  >
                    {showPasswordFields.new ? '🙈' : '👁️'}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <span className="error-text">{passwordErrors.newPassword}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirm_password">Confirm New Password *</label>
                <div className="password-input-group">
                  <input
                    type={showPasswordFields.confirm ? 'text' : 'password'}
                    id="confirm_password"
                    value={passwordFormData.confirmPassword}
                    onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                    placeholder="Confirm new password"
                    className={passwordErrors.confirmPassword ? 'error' : ''}
                    disabled={loading.passwordUpdate}
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility('confirm')}
                    disabled={loading.passwordUpdate}
                  >
                    {showPasswordFields.confirm ? '🙈' : '👁️'}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <span className="error-text">{passwordErrors.confirmPassword}</span>
                )}
              </div>

              <div className="pin-requirements">
                <h4>Password Requirements:</h4>
                <ul>
                  <li>Must be at least 6 characters long</li>
                  <li>Must be different from your current password</li>
                  <li>Use a combination of letters, numbers, and symbols</li>
                  <li>Avoid using easily guessable information</li>
                </ul>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={resetPasswordForm}
                  className="btn btn-secondary"
                  disabled={loading.passwordUpdate}
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading.passwordUpdate}
                >
                  {loading.passwordUpdate ? (
                    <>
                      <div className="spinner-small"></div>
                      Changing Password...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="security-section-modern">
            <div className="section-header-modern">
              <div className="section-icon">🔒</div>
              <div className="section-text">
                <h2>Security Settings</h2>
                <p>Update your PIN for secure access to the system</p>
              </div>
            </div>

            <form onSubmit={handlePinSubmit} className="pin-form-modern">
              <div className="form-group">
                <label htmlFor="current_pin">Current PIN *</label>
                <div className="password-input-group">
                  <input
                    type={showPinFields.current ? 'text' : 'password'}
                    id="current_pin"
                    value={pinFormData.current_pin}
                    onChange={(e) => handlePinChange('current_pin', e.target.value)}
                    placeholder="Enter current 4-digit PIN"
                    maxLength={4}
                    className={pinErrors.current_pin ? 'error' : ''}
                    disabled={loading.pinUpdate}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePinVisibility('current')}
                    disabled={loading.pinUpdate}
                  >
                    {showPinFields.current ? '🙈' : '👁️'}
                  </button>
                </div>
                {pinErrors.current_pin && (
                  <span className="error-text">{pinErrors.current_pin}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="new_pin">New PIN *</label>
                <div className="password-input-group">
                  <input
                    type={showPinFields.new ? 'text' : 'password'}
                    id="new_pin"
                    value={pinFormData.new_pin}
                    onChange={(e) => handlePinChange('new_pin', e.target.value)}
                    placeholder="Enter new 4-digit PIN"
                    maxLength={4}
                    className={pinErrors.new_pin ? 'error' : ''}
                    disabled={loading.pinUpdate}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePinVisibility('new')}
                    disabled={loading.pinUpdate}
                  >
                    {showPinFields.new ? '🙈' : '👁️'}
                  </button>
                </div>
                {pinErrors.new_pin && (
                  <span className="error-text">{pinErrors.new_pin}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirm_pin">Confirm New PIN *</label>
                <div className="password-input-group">
                  <input
                    type={showPinFields.confirm ? 'text' : 'password'}
                    id="confirm_pin"
                    value={pinFormData.confirm_pin}
                    onChange={(e) => handlePinChange('confirm_pin', e.target.value)}
                    placeholder="Confirm new 4-digit PIN"
                    maxLength={4}
                    className={pinErrors.confirm_pin ? 'error' : ''}
                    disabled={loading.pinUpdate}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePinVisibility('confirm')}
                    disabled={loading.pinUpdate}
                  >
                    {showPinFields.confirm ? '🙈' : '👁️'}
                  </button>
                </div>
                {pinErrors.confirm_pin && (
                  <span className="error-text">{pinErrors.confirm_pin}</span>
                )}
              </div>

              <div className="pin-requirements">
                <h4>PIN Requirements:</h4>
                <ul>
                  <li>Must be exactly 4 digits</li>
                  <li>Must be different from your current PIN</li>
                  <li>Avoid using sequential numbers (1234, 4321)</li>
                  <li>Avoid using repeated numbers (1111, 2222)</li>
                </ul>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={resetPinForm}
                  className="btn btn-secondary"
                  disabled={loading.pinUpdate}
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading.pinUpdate}
                >
                  {loading.pinUpdate ? (
                    <>
                      <div className="spinner-small"></div>
                      Updating PIN...
                    </>
                  ) : (
                    'Update PIN'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
      
      {/* Toast notifications */}
      {toast.toasts.map((toastItem) => (
        <Toast
          key={toastItem.id}
          type={toastItem.type}
          message={toastItem.message}
          onClose={() => toast.removeToast(toastItem.id)}
        />
      ))}
    </div>
  );
};

export default UserProfile;