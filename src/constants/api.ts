// API Base Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:4567',
  TIMEOUT: 30000, // 30 seconds
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  RATE_LIMIT_DELAY: 1000
} as const

// API Endpoints
export const API_ENDPOINTS = {
  // Health Check
  HEALTH: '/',
  
  // Direct Authentication Endpoints (for easy access)
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  CHANGE_PASSWORD_FIRST_LOGIN: '/change-password-first-login',
  
  // Direct User Management Endpoints (for easy access)
  USERS: '/users',
  USERS_ME: '/users/me',
  REGISTER: '/register',
  
  // Authentication Endpoints (nested for organization)
  AUTH: {
    LOGIN: '/login',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
    CHANGE_PASSWORD_FIRST_LOGIN: '/change-password-first-login',
  },
  
  // User Management Endpoints (nested for organization)
  USER_MANAGEMENT: {
    BASE: '/users',
    ME: '/users/me',
    REGISTER: '/register',
    BY_ID: (userId: number) => `/users/${userId}`,
    UPDATE_STATUS: (userId: number) => `/users/${userId}/status`,
    RESET_ATTEMPTS: (userId: number) => `/users/${userId}/reset-attempts`,
  },
  
  // Category Management Endpoints
  CATEGORIES: {
    BASE: '/categories',
    BY_ID: (categoryId: number) => `/categories/${categoryId}`,
    SEARCH: (query: string) => `/categories?search=${encodeURIComponent(query)}`,
  },
  
  // Product Management Endpoints
  PRODUCTS: {
    BASE: '/products',
    BY_ID: (productId: number) => `/products/${productId}`,
    SEARCH: (query: string) => `/products?search=${encodeURIComponent(query)}`,
    BY_CATEGORY: (categoryId: number) => `/products?category=${categoryId}`,
    BY_PRICE_RANGE: (min: number, max: number) => `/products?min_price=${min}&max_price=${max}`,
  },
  
  // Supplier Management Endpoints
  SUPPLIERS: {
    BASE: '/suppliers',
    BY_ID: (supplierId: number) => `/suppliers/${supplierId}`,
    SEARCH: (query: string) => `/suppliers?search=${encodeURIComponent(query)}`,
    BY_EMAIL: (email: string) => `/suppliers?email=${encodeURIComponent(email)}`,
    BY_CONTACT: (contact: string) => `/suppliers?contact=${encodeURIComponent(contact)}`,
  },

  // Stock Management Endpoints
  STOCKS: {
    BASE: '/stocks',
    BY_ID: (stockId: number) => `/stocks/${stockId}`,
    STATS: '/stocks/stats',
    BATCHES: '/stocks/batches',
    BATCH_DETAILS: (batchNumber: string) => `/stocks/batches/${batchNumber}`,
    NEXT_BATCH_NUMBER: '/stocks/next-batch-number',
    CREATE_BATCH: '/stocks/batch',
    DELETE_BATCH: (batchNumber: string) => `/stocks/batches/${batchNumber}`,
    ARCHIVE_BATCH: (batchNumber: string) => `/stocks/batches/${batchNumber}/archive`,
    SET_ARCHIVE_BATCH: (batchNumber: string) => `/stocks/batches/${batchNumber}/set-archive`,
    ARCHIVE_STOCK: (stockId: number) => `/stocks/${stockId}/archive`,
    USE_STOCK: (stockId: number) => `/stocks/${stockId}/use`,
  },

  // Process Management Endpoints
  PROCESS_MANAGEMENT: {
    BASE: '/process-management',
    BY_ID: (processId: number) => `/process-management/${processId}`,
    STATS: '/process-management/stats',
    BATCHES: '/process-management/batches',
    BATCH_DETAILS: (batchNumber: string) => `/process-management/batches/${batchNumber}`,
    NEXT_BATCH_NUMBER: '/process-management/next-batch-number',
    CREATE_BATCH: '/process-management/batch',
    DELETE_BATCH: (batchNumber: string) => `/process-management/batches/${batchNumber}`,
    ARCHIVE_BATCH: (batchNumber: string) => `/process-management/batches/${batchNumber}/archive`,
    SET_ARCHIVE_BATCH: (batchNumber: string) => `/process-management/batches/${batchNumber}/set-archive`,
  },
  
  // Future Inventory Management Endpoints (for when you add them)
  INVENTORY: {
    STOCK_IN: '/inventory/stock-in',
    STOCK_OUT: '/inventory/stock-out',
    STOCK_LEVELS: '/inventory/levels',
    LOW_STOCK: '/inventory/low-stock',
    MOVEMENTS: '/inventory/movements',
    BY_PRODUCT: (productId: number) => `/inventory/product/${productId}`,
    BY_SUPPLIER: (supplierId: number) => `/inventory/supplier/${supplierId}`,
  },
  
  // Future Process Management Endpoints
  PROCESSES: {
    BASE: '/processes',
    BY_ID: (processId: number) => `/processes/${processId}`,
    BY_STATUS: (status: string) => `/processes?status=${status}`,
    BY_PRODUCT: (productId: number) => `/processes/product/${productId}`,
  },
  
  // Future Dispatching Endpoints
  DISPATCHING: {
    BASE: '/dispatching',
    ORDERS: '/dispatching/orders',
    SHIPMENTS: '/dispatching/shipments',
    BY_ID: (dispatchId: number) => `/dispatching/${dispatchId}`,
    BY_STATUS: (status: string) => `/dispatching?status=${status}`,
    TRACKING: (trackingNumber: string) => `/dispatching/tracking/${trackingNumber}`,
  },
  
  // Reports and Analytics Endpoints
  REPORTS: {
    DASHBOARD: '/reports/dashboard',
    INVENTORY: '/reports/inventory',
    SALES: '/reports/sales',
    SUPPLIERS: '/reports/suppliers',
    PRODUCTS: '/reports/products',
    EXPORT: (type: string, format: string) => `/reports/${type}/export?format=${format}`,
  }
} as const

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

// Stock Unit Types
export const STOCK_UNITS = {
  KG: 'kg',
  G: 'g',
  MG: 'mg',
  LB: 'lb',
  OZ: 'oz',
  L: 'l',
  ML: 'ml',
  PCS: 'pcs',
  BOX: 'box',
  PACK: 'pack',
  SACK: 'sack',
  BOTTLE: 'bottle',
  CAN: 'can',
  JAR: 'jar',
  ROLL: 'roll'
} as const

export type StockUnit = typeof STOCK_UNITS[keyof typeof STOCK_UNITS]

// Stock Category Types
export const STOCK_CATEGORIES = {
  FINISHED_PRODUCT: 'finished product',
  RAW_MATERIAL: 'raw material'
} as const

export type StockCategory = typeof STOCK_CATEGORIES[keyof typeof STOCK_CATEGORIES]

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

// Legacy endpoint mappings for backward compatibility
export const LEGACY_ENDPOINTS = {
  LOGIN: API_ENDPOINTS.LOGIN,
  FORGOT_PASSWORD: API_ENDPOINTS.FORGOT_PASSWORD,
  RESET_PASSWORD: API_ENDPOINTS.RESET_PASSWORD,
  CHANGE_PASSWORD_FIRST_LOGIN: API_ENDPOINTS.CHANGE_PASSWORD_FIRST_LOGIN,
  USERS_ME: API_ENDPOINTS.USERS_ME,
  USERS: API_ENDPOINTS.USERS,
  REGISTER: API_ENDPOINTS.REGISTER,
  USER_BY_ID: API_ENDPOINTS.USER_MANAGEMENT.BY_ID,
  UPDATE_USER_STATUS: API_ENDPOINTS.USER_MANAGEMENT.UPDATE_STATUS,
  RESET_LOGIN_ATTEMPTS: API_ENDPOINTS.USER_MANAGEMENT.RESET_ATTEMPTS,
  CATEGORIES: API_ENDPOINTS.CATEGORIES.BASE,
  CATEGORY_BY_ID: API_ENDPOINTS.CATEGORIES.BY_ID,
  PRODUCTS: API_ENDPOINTS.PRODUCTS.BASE,
  PRODUCT_BY_ID: API_ENDPOINTS.PRODUCTS.BY_ID,
  SUPPLIERS: API_ENDPOINTS.SUPPLIERS.BASE,
  SUPPLIER_BY_ID: API_ENDPOINTS.SUPPLIERS.BY_ID,
  HEALTH: API_ENDPOINTS.HEALTH,
} as const

// HTTP Methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
  OPTIONS: 'OPTIONS',
  HEAD: 'HEAD'
} as const

// HTTP Status Codes
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  
  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const

// Authentication Configuration
export const AUTH_CONFIG = {
  TOKEN_PREFIX: 'Bearer',
  TOKEN_HEADER: 'Authorization',
  MAX_LOGIN_ATTEMPTS: 5,
  TOKEN_EXPIRE_MINUTES: 30,
  RESET_TOKEN_EXPIRE_MINUTES: 30,
  TOKEN_EXPIRE_BUFFER: 5 * 60 * 1000, // 5 minutes in milliseconds
  REFRESH_THRESHOLD: 15 * 60 * 1000, // 15 minutes in milliseconds
  LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes in milliseconds
} as const

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  USER_DATA: 'user_data',
  IS_AUTHENTICATED: 'isAuthenticated',
  USER_EMAIL: 'userEmail',
  IS_FIRST_LOGIN: 'is_first_login',
  PREFERENCES: 'user_preferences',
  REFRESH_TOKEN: 'refresh_token',
  REMEMBER_ME: 'remember_me'
} as const

// User Positions (for display)
export const USER_POSITIONS_DISPLAY = {
  [USER_POSITIONS.ADMIN]: 'Administrator',
  [USER_POSITIONS.OWNER]: 'Owner',
  [USER_POSITIONS.SUPERVISOR]: 'Supervisor', 
  [USER_POSITIONS.MANAGER]: 'Manager',
  [USER_POSITIONS.STAFF]: 'Staff'
} as const

// User Status (for display)
export const USER_STATUS_DISPLAY = {
  [USER_STATUS.ENABLED]: 'Active',
  [USER_STATUS.DISABLED]: 'Disabled'
} as const

// Form Validation
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 6,
  OTP_LENGTH: 6,
  USERNAME_MIN_LENGTH: 3,
  NAME_MIN_LENGTH: 2,
  PIN_LENGTH: 4,
  PIN_REGEX: /^\d{4}$/,
  USERNAME_REGEX: /^[a-zA-Z0-9_-]+$/,
  NAME_REGEX: /^[a-zA-Z\s'-]+$/,
  
  // New validation rules for the new entities
  CATEGORY_NAME_MIN_LENGTH: 2,
  CATEGORY_NAME_MAX_LENGTH: 100,
  PRODUCT_NAME_MIN_LENGTH: 2,
  PRODUCT_NAME_MAX_LENGTH: 50,
  PRODUCT_PRICE_MIN: 0.01,
  PRODUCT_PRICE_MAX: 999999.99,
  PRODUCT_QUANTITY_MIN: 0.00,
  PRODUCT_QUANTITY_MAX: 999999.99,
  SUPPLIER_NAME_MIN_LENGTH: 2,
  SUPPLIER_NAME_MAX_LENGTH: 50,
  SUPPLIER_CONTACT_MIN_LENGTH: 10,
  SUPPLIER_CONTACT_MAX_LENGTH: 15,
  SUPPLIER_EMAIL_MAX_LENGTH: 50,
  SUPPLIER_ADDRESS_MIN_LENGTH: 5,
  SUPPLIER_ADDRESS_MAX_LENGTH: 50,
  STOCK_PIECE_MIN: 1,
  STOCK_PIECE_MAX: 999999,
  BATCH_NUMBER_REGEX: /^batch-\d{6}$/,
  PROCESS_BATCH_NUMBER_REGEX: /^process-\d{6}$/,
  PHONE_REGEX: /^[\+]?[1-9][\d]{0,15}$/,
  PRICE_REGEX: /^\d+(\.\d{1,2})?$/,
  QUANTITY_REGEX: /^\d+(\.\d{1,2})?$/
} as const

// Error Messages
export const ERROR_MESSAGES = {
  // Network Errors
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  
  // Authentication Errors
  INVALID_CREDENTIALS: 'Invalid username/email or password.',
  ACCOUNT_DISABLED: 'Account is disabled. Contact administrator.',
  ACCOUNT_LOCKED: 'Account locked due to too many failed attempts.',
  TOKEN_EXPIRED: 'Session expired. Please login again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  
  // Password Reset Errors
  EMAIL_NOT_FOUND: 'Email address not found.',
  INVALID_OTP: 'Invalid or expired OTP.',
  PASSWORD_MISMATCH: 'Passwords do not match.',
  WEAK_PASSWORD: 'Password must be at least 6 characters long.',
  
  // User Management Errors
  USER_NOT_FOUND: 'User not found.',
  USERNAME_EXISTS: 'Username already exists.',
  EMAIL_EXISTS: 'Email already exists.',
  INVALID_USER_DATA: 'Invalid user data provided.',
  CANNOT_DELETE_SELF: 'You cannot delete your own account.',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action.',
  
  // Category Errors
  CATEGORY_NOT_FOUND: 'Category not found.',
  CATEGORY_NAME_EXISTS: 'Category name already exists.',
  CATEGORY_NAME_REQUIRED: 'Category name is required.',
  CATEGORY_NAME_TOO_SHORT: 'Category name must be at least 2 characters long.',
  CATEGORY_NAME_TOO_LONG: 'Category name must be less than 100 characters.',
  
  // Product Errors
  PRODUCT_NOT_FOUND: 'Product not found.',
  PRODUCT_ID_EXISTS: 'Product ID already exists.',
  PRODUCT_NAME_EXISTS: 'Product name already exists.',
  PRODUCT_NAME_REQUIRED: 'Product name is required.',
  PRODUCT_NAME_TOO_SHORT: 'Product name must be at least 2 characters long.',
  PRODUCT_NAME_TOO_LONG: 'Product name must be less than 50 characters.',
  PRODUCT_PRICE_REQUIRED: 'Product price is required.',
  PRODUCT_PRICE_INVALID: 'Product price must be a valid amount.',
  PRODUCT_PRICE_TOO_LOW: 'Product price must be greater than 0.',
  PRODUCT_PRICE_TOO_HIGH: 'Product price cannot exceed 999,999.99.',
  
  // Supplier Errors
  SUPPLIER_NOT_FOUND: 'Supplier not found.',
  SUPPLIER_ID_EXISTS: 'Supplier ID already exists.',
  SUPPLIER_NAME_EXISTS: 'Supplier name already exists.',
  SUPPLIER_EMAIL_EXISTS: 'Supplier email already exists.',
  SUPPLIER_NAME_REQUIRED: 'Supplier name is required.',
  SUPPLIER_NAME_TOO_SHORT: 'Supplier name must be at least 2 characters long.',
  SUPPLIER_NAME_TOO_LONG: 'Supplier name must be less than 50 characters.',
  SUPPLIER_CONTACT_REQUIRED: 'Supplier contact number is required.',
  SUPPLIER_CONTACT_INVALID: 'Please enter a valid contact number.',
  SUPPLIER_EMAIL_REQUIRED: 'Supplier email is required.',
  SUPPLIER_EMAIL_INVALID: 'Please enter a valid email address.',
  SUPPLIER_ADDRESS_REQUIRED: 'Supplier address is required.',
  SUPPLIER_ADDRESS_TOO_SHORT: 'Supplier address must be at least 5 characters long.',
  SUPPLIER_ADDRESS_TOO_LONG: 'Supplier address must be less than 50 characters.',

  // Stock Errors
  STOCK_NOT_FOUND: 'Stock item not found.',
  STOCK_BATCH_REQUIRED: 'Stock batch is required.',
  STOCK_PIECE_REQUIRED: 'Piece count is required.',
  STOCK_PIECE_INVALID: 'Piece count must be a valid number.',
  STOCK_PIECE_TOO_LOW: 'Piece count must be greater than 0.',
  STOCK_CATEGORY_REQUIRED: 'Stock category is required.',
  STOCK_PRODUCT_REQUIRED: 'Product is required.',
  STOCK_SUPPLIER_REQUIRED: 'Supplier is required.',
  STOCK_USER_REQUIRED: 'User is required.',

  // Process Management Errors
  PROCESS_NOT_FOUND: 'Process not found.',
  PROCESS_BATCH_NOT_FOUND: 'Process batch not found.',
  PROCESS_STOCK_REQUIRED: 'Stock item is required.',
  PROCESS_PRODUCT_REQUIRED: 'Finished product is required.',
  PROCESS_USER_REQUIRED: 'User is required.',
  PROCESS_BATCH_ITEMS_REQUIRED: 'At least one item is required for batch creation.',
  
  // Validation Errors
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_USERNAME: 'Username must be at least 3 characters long.',
  INVALID_PASSWORD: 'Password must be at least 6 characters long.',
  INVALID_PIN: 'PIN must be 4 digits.',
  INVALID_PHONE: 'Please enter a valid phone number.',
  INVALID_PRICE: 'Please enter a valid price (e.g., 10.99).',
  INVALID_QUANTITY: 'Please enter a valid quantity.',
  INVALID_BATCH_NUMBER: 'Invalid batch number format.',
  
  // General Errors
  UNKNOWN_ERROR: 'An unknown error occurred.',
  VALIDATION_ERROR: 'Validation error. Please check your input.',
  DATABASE_ERROR: 'Database error. Please try again later.',
  EMAIL_SERVICE_ERROR: 'Email service is unavailable. Please try again later.'
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  // Authentication
  LOGIN_SUCCESS: 'Login successful!',
  LOGOUT_SUCCESS: 'Logged out successfully.',
  PASSWORD_RESET_EMAIL_SENT: 'Password reset email has been sent.',
  PASSWORD_RESET_SUCCESS: 'Password reset successful!',
  PASSWORD_CHANGED: 'Password changed successfully!',
  
  // User Management
  USER_CREATED: 'User created successfully.',
  USER_UPDATED: 'User updated successfully.',
  USER_DELETED: 'User deleted successfully.',
  USER_STATUS_UPDATED: 'User status updated successfully.',
  LOGIN_ATTEMPTS_RESET: 'Login attempts reset successfully.',
  
  // Category Management
  CATEGORY_CREATED: 'Category created successfully.',
  CATEGORY_UPDATED: 'Category updated successfully.',
  CATEGORY_DELETED: 'Category deleted successfully.',
  
  // Product Management
  PRODUCT_CREATED: 'Product created successfully.',
  PRODUCT_UPDATED: 'Product updated successfully.',
  PRODUCT_DELETED: 'Product deleted successfully.',
  
  // Supplier Management
  SUPPLIER_CREATED: 'Supplier created successfully.',
  SUPPLIER_UPDATED: 'Supplier updated successfully.',
  SUPPLIER_DELETED: 'Supplier deleted successfully.',

  // Stock Management
  STOCK_CREATED: 'Stock item created successfully.',
  STOCK_UPDATED: 'Stock item updated successfully.',
  STOCK_DELETED: 'Stock item deleted successfully.',
  STOCK_ARCHIVED: 'Stock item archived successfully.',
  STOCK_UNARCHIVED: 'Stock item unarchived successfully.',
  STOCK_USED: 'Stock item marked as used successfully.',
  STOCK_UNUSED: 'Stock item marked as unused successfully.',
  BATCH_CREATED: 'Stock batch created successfully.',
  BATCH_DELETED: 'Stock batch deleted successfully.',
  BATCH_ARCHIVED: 'Stock batch archived successfully.',
  BATCH_UNARCHIVED: 'Stock batch unarchived successfully.',

  // Process Management
  PROCESS_CREATED: 'Process created successfully.',
  PROCESS_UPDATED: 'Process updated successfully.',
  PROCESS_DELETED: 'Process deleted successfully.',
  PROCESS_BATCH_CREATED: 'Process batch created successfully.',
  PROCESS_BATCH_DELETED: 'Process batch deleted successfully.',
  PROCESS_BATCH_ARCHIVED: 'Process batch archived successfully.',
  PROCESS_BATCH_UNARCHIVED: 'Process batch unarchived successfully.',
  
  // General
  DATA_SAVED: 'Data saved successfully.',
  DATA_UPDATED: 'Data updated successfully.',
  ACTION_COMPLETED: 'Action completed successfully.'
} as const

// App Configuration
export const APP_CONFIG = {
  APP_NAME: 'Stock Inventory Management',
  COMPANY_NAME: 'Stock Inventory System',
  VERSION: '1.0.0',
  DESCRIPTION: 'Stock Inventory Management System with User Authentication',
  SUPPORT_EMAIL: 'support@yourcompany.com'
} as const

// Default Values
export const DEFAULT_VALUES = {
  // User Creation
  DEFAULT_PASSWORD_SUFFIX: '123',
  DEFAULT_PIN: '1234',
  
  // New Entity Defaults
  DEFAULT_PRODUCT_PRICE: 0.00,
  DEFAULT_PRODUCT_QUANTITY: 0.00,
  DEFAULT_CATEGORY_NAME: '',
  DEFAULT_SUPPLIER_CONTACT: '',
  DEFAULT_STOCK_PIECE: 1,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
  
  // Search
  MIN_SEARCH_LENGTH: 2,
  SEARCH_DEBOUNCE: 300,
  
  // Date Formats
  DATE_FORMAT: 'MM/DD/YYYY',
  TIME_FORMAT: 'HH:mm',
  DATETIME_FORMAT: 'MM/DD/YYYY HH:mm',
  
  // Currency
  CURRENCY_SYMBOL: '$',
  CURRENCY_DECIMAL_PLACES: 2
} as const

// Request Configuration
export const REQUEST_CONFIG = {
  DEFAULT_TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  RATE_LIMIT_DELAY: 1000,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  CHUNK_SIZE: 1024 * 1024, // 1MB for file uploads
  
  // Default headers for different content types
  HEADERS: {
    JSON: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    FORM_DATA: {
      'Accept': 'application/json',
      // Don't set Content-Type for FormData - browser will set it automatically
    },
    FILE_UPLOAD: {
      'Accept': 'application/json',
    },
    CSV: {
      'Content-Type': 'text/csv',
      'Accept': 'text/csv',
    },
    XML: {
      'Content-Type': 'application/xml',
      'Accept': 'application/xml',
    }
  }
} as const

// API Response Status Types
export const API_RESPONSE_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  LOADING: 'loading',
  IDLE: 'idle'
} as const

// Pagination Configuration
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 25,
  MAX_LIMIT: 100,
  LIMITS: [10, 25, 50, 100] as const,
  
  // Query parameter names
  PARAMS: {
    PAGE: 'page',
    LIMIT: 'limit',
    SORT: 'sort',
    ORDER: 'order',
    SEARCH: 'search',
    FILTER: 'filter'
  }
} as const

// API Rate Limiting
export const RATE_LIMIT_CONFIG = {
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_HOUR: 1000,
  RETRY_AFTER_HEADER: 'Retry-After',
  RATE_LIMIT_HEADER: 'X-RateLimit-Remaining',
  RATE_LIMIT_RESET_HEADER: 'X-RateLimit-Reset'
} as const

// WebSocket Configuration (for future real-time features)
export const WEBSOCKET_CONFIG = {
  BASE_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:4567/ws',
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  
  EVENTS: {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    ERROR: 'error',
    INVENTORY_UPDATE: 'inventory_update',
    USER_STATUS_CHANGE: 'user_status_change',
    PROCESS_UPDATE: 'process_update',
    ORDER_UPDATE: 'order_update'
  }
} as const

// File Upload Configuration
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: {
    IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    SPREADSHEETS: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
    ARCHIVES: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed']
  },
  
  ENDPOINTS: {
    PROFILE_PICTURE: '/upload/profile-picture',
    PRODUCT_IMAGE: '/upload/product-image',
    DOCUMENT: '/upload/document',
    BULK_IMPORT: '/upload/bulk-import',
    EXPORT_DOWNLOAD: '/download/export'
  }
} as const

// Environment-specific API Configuration
export const ENV_CONFIG = {
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  
  // API URLs
  apiUrl: import.meta.env.VITE_API_URL,
  wsUrl: import.meta.env.VITE_WS_URL,
  
  // Feature flags
  enableLogging: import.meta.env.VITE_ENABLE_LOGGING === 'true',
  enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
  enableMocking: import.meta.env.VITE_ENABLE_MOCKING === 'true',
  enableRealtime: import.meta.env.VITE_ENABLE_REALTIME === 'true',
  
  // Third-party services
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  stripePublicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN
} as const

// API Error Codes (for consistent error handling)
export const API_ERROR_CODES = {
  // Authentication
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  
  // Authorization
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  FORBIDDEN_ACTION: 'FORBIDDEN_ACTION',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  DEPENDENCY_ERROR: 'DEPENDENCY_ERROR',
  
  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // File Upload
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED'
} as const

// Entity Types for the new tables
export const ENTITY_TYPES = {
  CATEGORY: 'category',
  PRODUCT: 'product',
  SUPPLIER: 'supplier',
  STOCK: 'stock',
  PROCESS: 'process_management',
  USER: 'user'
} as const

// Table Headers for the new entities
export const TABLE_HEADERS = {
  CATEGORIES: [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'name', label: 'Category Name', sortable: true },
    { key: 'actions', label: 'Actions', sortable: false }
  ],
  PRODUCTS: [
    { key: 'id', label: 'Product ID', sortable: true },
    { key: 'name', label: 'Product Name', sortable: true },
    { key: 'price', label: 'Price', sortable: true },
    { key: 'unit', label: 'Unit', sortable: true },
    { key: 'quantity', label: 'Quantity', sortable: true },
    { key: 'actions', label: 'Actions', sortable: false }
  ],
  SUPPLIERS: [
    { key: 'id', label: 'Supplier ID', sortable: true },
    { key: 'name', label: 'Company Name', sortable: true },
    { key: 'contact_num', label: 'Contact Number', sortable: false },
    { key: 'email_add', label: 'Email Address', sortable: true },
    { key: 'address', label: 'Address', sortable: false },
    { key: 'actions', label: 'Actions', sortable: false }
  ],
  STOCKS: [
    { key: 'id', label: 'Stock ID', sortable: true },
    { key: 'batch', label: 'Batch', sortable: true },
    { key: 'piece', label: 'Pieces', sortable: true },
    { key: 'product_name', label: 'Product', sortable: true },
    { key: 'product_unit', label: 'Unit', sortable: true },
    { key: 'product_quantity', label: 'Quantity', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'supplier_name', label: 'Supplier', sortable: true },
    { key: 'user_name', label: 'User', sortable: true },
    { key: 'archive', label: 'Status', sortable: true },
    { key: 'actions', label: 'Actions', sortable: false }
  ],
  PROCESS_MANAGEMENT: [
    { key: 'id', label: 'Process ID', sortable: true },
    { key: 'process_id_batch', label: 'Batch', sortable: true },
    { key: 'stock_batch', label: 'Stock Batch', sortable: true },
    { key: 'finished_product_name', label: 'Finished Product', sortable: true },
    { key: 'user_name', label: 'Operator', sortable: true },
    { key: 'manufactured_date', label: 'Manufactured', sortable: true },
    { key: 'archive', label: 'Status', sortable: true },
    { key: 'actions', label: 'Actions', sortable: false }
  ]
} as const

// Form Field Labels
export const FORM_LABELS = {
  // Category Form
  CATEGORY_NAME: 'Category Name',
  
  // Product Form
  PRODUCT_ID: 'Product ID',
  PRODUCT_NAME: 'Product Name',
  PRODUCT_PRICE: 'Price',
  PRODUCT_UNIT: 'Unit',
  PRODUCT_QUANTITY: 'Quantity',
  
  // Supplier Form
  SUPPLIER_ID: 'Supplier ID',
  SUPPLIER_NAME: 'Company Name',
  SUPPLIER_CONTACT: 'Contact Number',
  SUPPLIER_EMAIL: 'Email Address',
  SUPPLIER_ADDRESS: 'Address',

  // Stock Form
  STOCK_BATCH: 'Batch Number',
  STOCK_PIECE: 'Piece Count',
  STOCK_CATEGORY: 'Category',
  STOCK_PRODUCT: 'Product',
  STOCK_SUPPLIER: 'Supplier',
  STOCK_USER: 'User',

  // Process Management Form
  PROCESS_STOCK: 'Stock Item',
  PROCESS_FINISHED_PRODUCT: 'Finished Product',
  PROCESS_USER: 'Operator',
  PROCESS_BATCH: 'Process Batch'
} as const

// Location and Filtering Constants (for other features)
export const FILTER_CONFIG = {
  filterCategoryIds: [] as number[],
  filterDistance: 10, // Default distance in km
  filterSortBy: 'distance',
  initializeDelay: 1000, // Delay in milliseconds
} as const

// Utility functions for API endpoint construction
export const ApiUtils = {
  // Build query string from object
  buildQueryString: (params: Record<string, any>): string => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value))
      }
    })
    const queryString = searchParams.toString()
    return queryString ? `?${queryString}` : ''
  },

  // Build full URL with query params
  buildUrl: (endpoint: string, params?: Record<string, any>): string => {
    const baseUrl = `${API_CONFIG.BASE_URL}${endpoint}`
    if (params) {
      return `${baseUrl}${ApiUtils.buildQueryString(params)}`
    }
    return baseUrl
  },

  // Get auth headers
  getAuthHeaders: (): HeadersInit => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    return {
      ...API_CONFIG.HEADERS,
      ...(token && { [AUTH_CONFIG.TOKEN_HEADER]: `${AUTH_CONFIG.TOKEN_PREFIX} ${token}` })
    }
  },

  // Check if response is ok
  isResponseOk: (status: number): boolean => {
    return status >= 200 && status < 300
  },

  // Get error message from status code
  getErrorMessage: (status: number): string => {
    switch (status) {
      case HTTP_STATUS.UNAUTHORIZED:
        return ERROR_MESSAGES.UNAUTHORIZED
      case HTTP_STATUS.FORBIDDEN:
        return ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS
      case HTTP_STATUS.NOT_FOUND:
        return 'Resource not found'
      case HTTP_STATUS.CONFLICT:
        return 'Resource conflict'
      case HTTP_STATUS.UNPROCESSABLE_ENTITY:
        return ERROR_MESSAGES.VALIDATION_ERROR
      case HTTP_STATUS.TOO_MANY_REQUESTS:
        return 'Too many requests'
      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
        return ERROR_MESSAGES.SERVER_ERROR
      case HTTP_STATUS.SERVICE_UNAVAILABLE:
        return 'Service unavailable'
      default:
        return ERROR_MESSAGES.UNKNOWN_ERROR
    }
  }
} as const

// Export all configurations as a single object for easy importing
export const API = {
  CONFIG: API_CONFIG,
  ENDPOINTS: API_ENDPOINTS,
  LEGACY_ENDPOINTS,
  HTTP_METHODS,
  HTTP_STATUS,
  AUTH_CONFIG,
  REQUEST_CONFIG,
  API_RESPONSE_STATUS,
  PAGINATION_CONFIG,
  RATE_LIMIT_CONFIG,
  WEBSOCKET_CONFIG,
  UPLOAD_CONFIG,
  ENV_CONFIG,
  API_ERROR_CODES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  STORAGE_KEYS,
  USER_POSITIONS,
  USER_POSITIONS_DISPLAY,
  USER_STATUS,
  USER_STATUS_DISPLAY,
  STOCK_UNITS,
  STOCK_CATEGORIES,
  VALIDATION,
  DEFAULT_VALUES,
  APP_CONFIG,
  ENTITY_TYPES,
  TABLE_HEADERS,
  FORM_LABELS,
  FILTER_CONFIG
} as const

export default API