import { 
  API_CONFIG, 
  HTTP_METHODS, 
  HTTP_STATUS, 
  STORAGE_KEYS,
  AUTH_CONFIG,
  ERROR_MESSAGES 
} from '../constants/api';

import type { 
  UserUpdateRequest,
  PinUpdateRequest,
  UserUpdateResponse,
  PinUpdateResponse,
  UserProfileFormData,
  PinFormData,
  UserProfileValidationErrors,
  PinValidationErrors
} from '../types/userProfile';

import type { User } from '../types/auth';
import { authService } from './authService';

class UserProfileService {
  private baseURL: string;
  private defaultHeaders: HeadersInit;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.defaultHeaders = {
      ...API_CONFIG.HEADERS,
    };
    console.log('👤 UserProfileService initialized');
  }

  private async validateAuth(): Promise<void> {
    if (!authService.isAuthenticated()) {
      console.error('❌ User not authenticated');
      throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
    }
    
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      console.error('❌ No access token found');
      throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
    }
    
    console.log('✅ User authentication validated');
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const headers = {
      ...this.defaultHeaders,
      ...(token && { [AUTH_CONFIG.TOKEN_HEADER]: `${AUTH_CONFIG.TOKEN_PREFIX} ${token}` })
    };
    
    console.log('🔑 User Profile Auth headers prepared:');
    console.log('  - Token exists:', !!token);
    console.log('  - User authenticated:', authService.isAuthenticated());
    console.log('  - Token header key:', AUTH_CONFIG.TOKEN_HEADER);
    console.log('  - Token prefix:', AUTH_CONFIG.TOKEN_PREFIX);
    if (token) {
      console.log('  - Bearer token:', `${AUTH_CONFIG.TOKEN_PREFIX} ${token.substring(0, 20)}...${token.substring(token.length - 10)}`);
      console.log('  - Full Authorization header:', headers[AUTH_CONFIG.TOKEN_HEADER]);
    } else {
      console.log('  - No token found in localStorage');
    }
    
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage: string;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || ERROR_MESSAGES.SERVER_ERROR;
      } catch {
        switch (response.status) {
          case HTTP_STATUS.UNAUTHORIZED:
            errorMessage = ERROR_MESSAGES.UNAUTHORIZED;
            break;
          case HTTP_STATUS.FORBIDDEN:
            errorMessage = ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS;
            break;
          case HTTP_STATUS.NOT_FOUND:
            errorMessage = 'User not found';
            break;
          case HTTP_STATUS.BAD_REQUEST:
            errorMessage = 'Invalid request data';
            break;
          default:
            errorMessage = ERROR_MESSAGES.SERVER_ERROR;
        }
      }
      
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text() as unknown as T;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
    };

    console.log('🚀 Making User Profile API request:');
    console.log('  - Method:', options.method || 'GET');
    console.log('  - URL:', url);
    console.log('  - Headers:', config.headers);
    
    if (options.body) {
      console.log('  - Body:', options.body);
      try {
        const parsedBody = JSON.parse(options.body as string);
        console.log('  - Parsed Body:', parsedBody);
      } catch (e) {
        console.log('  - Body (not JSON):', options.body);
      }
    }

    try {
      const response = await fetch(url, config);
      
      console.log('📥 User Profile Response received:');
      console.log('  - Status:', response.status, response.statusText);
      console.log('  - Headers:', Object.fromEntries(response.headers.entries()));
      
      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('❌ User Profile API Request failed:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
    }
  }

  // =============================================================================
  // VALIDATION HELPERS
  // =============================================================================

  validateUserProfile(data: UserProfileFormData): UserProfileValidationErrors {
    const errors: UserProfileValidationErrors = {};

    // Username validation
    if (!data.username?.trim()) {
      errors.username = 'Username is required';
    } else if (data.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // First name validation
    if (!data.first_name?.trim()) {
      errors.first_name = 'First name is required';
    } else if (data.first_name.length < 2) {
      errors.first_name = 'First name must be at least 2 characters';
    }

    // Last name validation
    if (!data.last_name?.trim()) {
      errors.last_name = 'Last name is required';
    } else if (data.last_name.length < 2) {
      errors.last_name = 'Last name must be at least 2 characters';
    }

    return errors;
  }

  validatePin(data: PinFormData): PinValidationErrors {
    const errors: PinValidationErrors = {};

    // Current PIN validation
    if (!data.current_pin?.trim()) {
      errors.current_pin = 'Current PIN is required';
    } else if (!/^\d{4}$/.test(data.current_pin)) {
      errors.current_pin = 'Current PIN must be 4 digits';
    }

    // New PIN validation
    if (!data.new_pin?.trim()) {
      errors.new_pin = 'New PIN is required';
    } else if (!/^\d{4}$/.test(data.new_pin)) {
      errors.new_pin = 'New PIN must be 4 digits';
    } else if (data.new_pin === data.current_pin) {
      errors.new_pin = 'New PIN must be different from current PIN';
    }

    // Confirm PIN validation
    if (!data.confirm_pin?.trim()) {
      errors.confirm_pin = 'Please confirm your new PIN';
    } else if (data.confirm_pin !== data.new_pin) {
      errors.confirm_pin = 'PIN confirmation does not match';
    }

    return errors;
  }

  // =============================================================================
  // API METHODS
  // =============================================================================

  /**
   * Update user profile information
   */
  async updateUserProfile(userId: number, userData: UserUpdateRequest): Promise<UserUpdateResponse> {
    console.log('👤 Updating user profile:', userId, userData);
    
    try {
      // Validate authentication before making request
      await this.validateAuth();
      
      const response = await this.makeRequest<User>(`/users/${userId}`, {
        method: HTTP_METHODS.PUT,
        body: JSON.stringify(userData)
      });

      console.log('✅ User profile updated successfully');
      return {
        success: true,
        message: 'Profile updated successfully',
        user: response
      };
    } catch (error) {
      console.error('❌ Failed to update user profile:', error);
      
      // If unauthorized, try to refresh auth state
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        console.log('🔄 Attempting to refresh authentication state...');
        try {
          await authService.refreshUserData();
          console.log('✅ Authentication refreshed, retrying...');
          
          // Retry the request once
          const response = await this.makeRequest<User>(`/users/${userId}`, {
            method: HTTP_METHODS.PUT,
            body: JSON.stringify(userData)
          });

          console.log('✅ User profile updated successfully after retry');
          return {
            success: true,
            message: 'Profile updated successfully',
            user: response
          };
        } catch (retryError) {
          console.error('❌ Retry also failed:', retryError);
          return {
            success: false,
            message: 'Authentication failed. Please log in again.'
          };
        }
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update profile'
      };
    }
  }

  /**
   * Update user PIN
   */
  async updateUserPin(userId: number, pinData: PinUpdateRequest): Promise<PinUpdateResponse> {
    console.log('🔒 Updating user PIN for user:', userId);
    
    try {
      // Validate authentication before making request
      await this.validateAuth();
      
      const response = await this.makeRequest<{ message: string }>(`/users/${userId}/pin`, {
        method: HTTP_METHODS.PUT,
        body: JSON.stringify({
          current_pin: pinData.current_pin,
          new_pin: pinData.new_pin
        })
      });

      console.log('✅ User PIN updated successfully');
      return {
        success: true,
        message: response.message || 'PIN updated successfully'
      };
    } catch (error) {
      console.error('❌ Failed to update user PIN:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update PIN'
      };
    }
  }

  /**
   * Get current user profile (from auth service or direct API call)
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // Validate authentication before making request
      await this.validateAuth();
      
      const response = await this.makeRequest<User>('/auth/me');
      return response;
    } catch (error) {
      console.error('❌ Failed to get current user:', error);
      return null;
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Convert User object to form data
   */
  userToFormData(user: User): UserProfileFormData {
    return {
      username: user.username || '',
      first_name: user.first_name || '',
      last_name: user.last_name || ''
    };
  }

  /**
   * Create empty form data
   */
  createEmptyFormData(): UserProfileFormData {
    return {
      username: '',
      first_name: '',
      last_name: ''
    };
  }

  /**
   * Create empty PIN form data
   */
  createEmptyPinFormData(): PinFormData {
    return {
      current_pin: '',
      new_pin: '',
      confirm_pin: ''
    };
  }

  /**
   * Check if form data has changes compared to original user data
   */
  hasProfileChanges(original: User, current: UserProfileFormData): boolean {
    return (
      original.username !== current.username ||
      original.first_name !== current.first_name ||
      original.last_name !== current.last_name
    );
  }
}

// Create and export singleton instance
export const userProfileService = new UserProfileService();

// Export the class for testing
export { UserProfileService };