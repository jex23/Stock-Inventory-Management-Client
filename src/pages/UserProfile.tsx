import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { userProfileService } from '../services/userProfileService';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import type { User } from '../types/auth';
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
  id: 'profile' | 'security';
  label: string;
  icon: string;
}

const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  
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
  
  // Loading states
  const [loading, setLoading] = useState<ProfileLoadingState>({
    userUpdate: false,
    pinUpdate: false
  });
  const [initialLoading, setInitialLoading] = useState(true);

  const tabs: TabType[] = [
    { id: 'profile', label: 'Profile Information', icon: '👤' },
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
      {/* Header */}
      <div className="profile-header">
        <div className="header-content">
          <div className="header-text">
            <h1>👤 User Profile</h1>
            <p>Manage your account information and security settings</p>
          </div>
          <div className="user-avatar-large">
            <span>{currentUser.first_name?.charAt(0)}{currentUser.last_name?.charAt(0)}</span>
          </div>
        </div>
      </div>


      {/* Tab Navigation */}
      <div className="tab-navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'profile' && (
          <div className="profile-section">
            <div className="section-header">
              <h2>👤 Profile Information</h2>
              <p>Update your personal information and account details</p>
            </div>

            <form onSubmit={handleProfileSubmit} className="profile-form">
              <div className="form-grid">
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

        {activeTab === 'security' && (
          <div className="security-section">
            <div className="section-header">
              <h2>🔒 Security Settings</h2>
              <p>Update your PIN for secure access to the system</p>
            </div>

            <form onSubmit={handlePinSubmit} className="pin-form">
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