// User Profile Types
import type { User } from './auth';

// User update request (excluding sensitive fields)
export interface UserUpdateRequest {
  username?: string;
  first_name?: string;
  last_name?: string;
}

// PIN update request
export interface PinUpdateRequest {
  current_pin: string;
  new_pin: string;
  confirm_pin: string;
}

// User profile form data (local state)
export interface UserProfileFormData {
  username: string;
  first_name: string;
  last_name: string;
}

// PIN form data (local state)
export interface PinFormData {
  current_pin: string;
  new_pin: string;
  confirm_pin: string;
}

// API Response types
export interface UserUpdateResponse {
  success: boolean;
  message: string;
  user?: User;
}

export interface PinUpdateResponse {
  success: boolean; 
  message: string;
}

// Form validation errors
export interface UserProfileValidationErrors {
  username?: string;
  first_name?: string;
  last_name?: string;
  general?: string;
}

export interface PinValidationErrors {
  current_pin?: string;
  new_pin?: string;
  confirm_pin?: string;
  general?: string;
}

// Loading states
export interface ProfileLoadingState {
  userUpdate: boolean;
  pinUpdate: boolean;
}

// Available user positions/roles
export const USER_POSITIONS = [
  { value: 'admin', label: 'Administrator' },
  { value: 'owner', label: 'Owner' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'manager', label: 'Manager' }, 
  { value: 'staff', label: 'Staff' }
] as const;

export type UserPosition = typeof USER_POSITIONS[number]['value'];