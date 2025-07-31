import type { 
  LoginRequest, 
  LoginResponse, 
  ForgotPasswordRequest, 
  ResetPasswordRequest,
  ChangePasswordFirstLoginRequest,
  User, 
  AuthState,
  ApiResponse
} from '../types/auth';
import { 
  API_CONFIG, 
  API_ENDPOINTS, 
  STORAGE_KEYS, 
  AUTH_CONFIG,
  HTTP_STATUS,
  ERROR_MESSAGES 
} from '../constants/api';

// Custom API Error class for handling HTTP errors
class APIError extends Error {
  status_code?: number;

  constructor(message: string, status_code?: number) {
    super(message);
    this.name = 'APIError';
    this.status_code = status_code;
  }
}

class AuthService {
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    token: null,
    isFirstLogin: false
  };

  private listeners: Set<(state: AuthState) => void> = new Set();

  constructor() {
    this.initializeFromStorage();
  }

  // Event listener management
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.authState));
  }

  // Initialize auth state from localStorage
  private initializeFromStorage() {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      const isAuthenticated = localStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED) === 'true';
      const isFirstLogin = localStorage.getItem(STORAGE_KEYS.IS_FIRST_LOGIN) === 'true';

      if (token && userData && isAuthenticated) {
        this.authState = {
          isAuthenticated: true,
          user: JSON.parse(userData),
          token,
          isFirstLogin
        };
      }
    } catch (error) {
      console.error('Failed to initialize auth from storage:', error);
      this.clearAuthData();
    }
  }

  // Getters
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  getUser(): User | null {
    return this.authState.user;
  }

  getToken(): string | null {
    return this.authState.token;
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  isFirstLogin(): boolean {
    return this.authState.isFirstLogin;
  }

  // Setters
  private setAuthData(loginResponse: LoginResponse) {
    this.authState = {
      isAuthenticated: true,
      user: loginResponse.user,
      token: loginResponse.access_token,
      isFirstLogin: loginResponse.is_first_login
    };

    // Store in localStorage
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, loginResponse.access_token);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(loginResponse.user));
    localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
    localStorage.setItem(STORAGE_KEYS.IS_FIRST_LOGIN, loginResponse.is_first_login.toString());
    
    // Keep backward compatibility
    localStorage.setItem(STORAGE_KEYS.USER_EMAIL, loginResponse.user.email);

    this.notifyListeners();
  }

  private clearAuthData() {
    this.authState = {
      isAuthenticated: false,
      user: null,
      token: null,
      isFirstLogin: false
    };

    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    localStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
    localStorage.removeItem(STORAGE_KEYS.IS_FIRST_LOGIN);
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);

    this.notifyListeners();
  }

  // HTTP Client with auth headers
  private async apiCall<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    const defaultHeaders = {
      ...API_CONFIG.HEADERS,
      ...(this.authState.token && {
        'Authorization': `${AUTH_CONFIG.TOKEN_PREFIX} ${this.authState.token}`
      })
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new APIError(errorData.detail || `HTTP ${response.status}`, response.status);
      }

      // Handle no content responses
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      // Network errors
      throw new APIError(ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  // Auth API Methods
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.apiCall<LoginResponse>(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        body: JSON.stringify(credentials)
      });

      this.setAuthData(response);
      return response;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  async forgotPassword(request: ForgotPasswordRequest): Promise<ApiResponse> {
    try {
      return await this.apiCall<ApiResponse>(API_ENDPOINTS.FORGOT_PASSWORD, {
        method: 'POST',
        body: JSON.stringify(request)
      });
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  async resetPassword(request: ResetPasswordRequest): Promise<ApiResponse> {
    try {
      return await this.apiCall<ApiResponse>(API_ENDPOINTS.RESET_PASSWORD, {
        method: 'POST',
        body: JSON.stringify(request)
      });
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  async changePasswordFirstLogin(request: ChangePasswordFirstLoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.apiCall<LoginResponse>(API_ENDPOINTS.CHANGE_PASSWORD_FIRST_LOGIN, {
        method: 'POST',
        body: JSON.stringify(request)
      });

      this.setAuthData(response);
      return response;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  async changePassword(request: ChangePasswordFirstLoginRequest): Promise<ApiResponse> {
    try {
      const response = await this.apiCall<ApiResponse>(API_ENDPOINTS.CHANGE_PASSWORD_FIRST_LOGIN, {
        method: 'POST',
        body: JSON.stringify(request)
      });

      return response;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      return await this.apiCall<User>(API_ENDPOINTS.USERS_ME);
    } catch (error) {
      // If token is invalid or unprocessable, clear auth data
      if (error instanceof APIError && (
        error.status_code === HTTP_STATUS.UNAUTHORIZED || 
        error.status_code === HTTP_STATUS.UNPROCESSABLE_ENTITY
      )) {
        this.logout();
      }
      throw this.handleAuthError(error);
    }
  }

  async logout(): Promise<void> {
    // Clear local auth data
    this.clearAuthData();
    
    // Could also call a logout endpoint if available
    // await this.apiCall('/logout', { method: 'POST' });
  }

  // Utility method to refresh user data
  async refreshUserData(): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    try {
      const user = await this.getCurrentUser();
      this.authState.user = user;
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      throw error;
    }
  }

  // Update user profile
  async updateUser(updateData: Partial<User>): Promise<User> {
    if (!this.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await this.apiCall<User>(API_ENDPOINTS.USERS_ME, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      // Update local auth state
      this.authState.user = response;
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response));
      this.notifyListeners();

      return response;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  // Handle authentication errors
  private handleAuthError(error: unknown): Error {
    if (error instanceof APIError) {
      switch (error.status_code) {
        case HTTP_STATUS.UNAUTHORIZED:
          return new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
        case HTTP_STATUS.FORBIDDEN:
          return new Error(ERROR_MESSAGES.ACCOUNT_DISABLED);
        case HTTP_STATUS.UNPROCESSABLE_ENTITY:
          return new Error(ERROR_MESSAGES.TOKEN_EXPIRED);
        case HTTP_STATUS.SERVICE_UNAVAILABLE:
          return new Error(ERROR_MESSAGES.SERVER_ERROR);
        default:
          return new Error(error.message || ERROR_MESSAGES.SERVER_ERROR);
      }
    }

    return error instanceof Error ? error : new Error(ERROR_MESSAGES.SERVER_ERROR);
  }

  // Check if token is expired (basic check)
  isTokenExpired(): boolean {
    if (!this.authState.token) return true;

    try {
      // Basic JWT payload decode (without verification)
      const payload = JSON.parse(atob(this.authState.token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }

  // Auto-refresh token if needed
  async ensureValidToken(): Promise<boolean> {
    if (!this.isAuthenticated() || this.isTokenExpired()) {
      this.logout();
      return false;
    }
    return true;
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;