// User Position Types
export const USER_POSITIONS = {
  ADMIN: 'admin',
  OWNER: 'owner',
  SUPERVISOR: 'supervisor',
  MANAGER: 'manager',
  STAFF: 'staff'
} as const

export type UserPosition = typeof USER_POSITIONS[keyof typeof USER_POSITIONS]

// User Status Types
export const USER_STATUS = {
  ENABLED: 'enabled',
  DISABLED: 'disabled'
} as const

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS]

// Base User Interface
export interface User {
  id: number;
  first_name: string;
  last_name: string;
  position: UserPosition;
  username: string;
  email: string;
  status: UserStatus;
  login_attempt: number;
  created_at: string;
  updated_at: string;
  is_first_login?: boolean;
}

// Auth Request Models
export interface LoginRequest {
  username_or_email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  new_password: string;
}

export interface ChangePasswordFirstLoginRequest {
  username_or_email: string;
  current_password: string;
  new_password: string;
}

// Auth Response Models
export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
  is_first_login: boolean;
}

export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  detail?: string;
}

// Auth State
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isFirstLogin: boolean;
}

// View Models for UI
export interface LoginFormData {
  usernameOrEmail: string;
  password: string;
  isLoading: boolean;
}

export interface ForgotPasswordFormData {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
  step: 1 | 2; // 1 for email, 2 for reset form
  isLoading: boolean;
}

export interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  isLoading: boolean;
}