import { 
  API_CONFIG, 
  API_ENDPOINTS, 
  HTTP_METHODS, 
  HTTP_STATUS, 
  STORAGE_KEYS,
  AUTH_CONFIG,
  ERROR_MESSAGES 
} from '../constants/api'
import type { 
  Supplier, 
  SupplierCreate, 
  SupplierUpdate, 
  SupplierResponse 
} from '../types/supplier'

class SupplierService {
  private baseURL: string
  private defaultHeaders: HeadersInit

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL
    this.defaultHeaders = {
      ...API_CONFIG.HEADERS,
    }
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    return {
      ...this.defaultHeaders,
      ...(token && { [AUTH_CONFIG.TOKEN_HEADER]: `${AUTH_CONFIG.TOKEN_PREFIX} ${token}` })
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage: string

      switch (response.status) {
        case HTTP_STATUS.UNAUTHORIZED:
          errorMessage = ERROR_MESSAGES.UNAUTHORIZED
          // Optionally redirect to login or refresh token
          break
        case HTTP_STATUS.FORBIDDEN:
          errorMessage = ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS
          break
        case HTTP_STATUS.NOT_FOUND:
          errorMessage = ERROR_MESSAGES.SUPPLIER_NOT_FOUND
          break
        case HTTP_STATUS.CONFLICT:
          // Try to get specific error message from response
          try {
            const errorData = await response.json()
            errorMessage = errorData.detail || ERROR_MESSAGES.VALIDATION_ERROR
          } catch {
            errorMessage = ERROR_MESSAGES.VALIDATION_ERROR
          }
          break
        case HTTP_STATUS.UNPROCESSABLE_ENTITY:
          try {
            const errorData = await response.json()
            errorMessage = errorData.detail || ERROR_MESSAGES.VALIDATION_ERROR
          } catch {
            errorMessage = ERROR_MESSAGES.VALIDATION_ERROR
          }
          break
        case HTTP_STATUS.SERVICE_UNAVAILABLE:
          errorMessage = ERROR_MESSAGES.DATABASE_ERROR
          break
        default:
          errorMessage = ERROR_MESSAGES.SERVER_ERROR
      }

      throw new Error(errorMessage)
    }

    // Handle different content types
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return response.json()
    }
    
    return response.text() as unknown as T
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      // Add timeout
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
    }

    try {
      const response = await fetch(url, config)
      return this.handleResponse<T>(response)
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          throw new Error(ERROR_MESSAGES.NETWORK_ERROR)
        }
        throw error
      }
      throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR)
    }
  }

  // Get all suppliers
  async getAllSuppliers(): Promise<Supplier[]> {
    return this.makeRequest<Supplier[]>(API_ENDPOINTS.SUPPLIERS.BASE, {
      method: HTTP_METHODS.GET,
    })
  }

  // Get supplier by ID
  async getSupplierById(id: number): Promise<Supplier> {
    return this.makeRequest<Supplier>(API_ENDPOINTS.SUPPLIERS.BY_ID(id), {
      method: HTTP_METHODS.GET,
    })
  }

  // Create new supplier
  async createSupplier(supplierData: SupplierCreate): Promise<SupplierResponse> {
    return this.makeRequest<SupplierResponse>(API_ENDPOINTS.SUPPLIERS.BASE, {
      method: HTTP_METHODS.POST,
      body: JSON.stringify(supplierData),
    })
  }

  // Update existing supplier
  async updateSupplier(id: number, supplierData: SupplierUpdate): Promise<SupplierResponse> {
    return this.makeRequest<SupplierResponse>(API_ENDPOINTS.SUPPLIERS.BY_ID(id), {
      method: HTTP_METHODS.PUT,
      body: JSON.stringify(supplierData),
    })
  }

  // Delete supplier
  async deleteSupplier(id: number): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(API_ENDPOINTS.SUPPLIERS.BY_ID(id), {
      method: HTTP_METHODS.DELETE,
    })
  }

  // Bulk delete suppliers
  async bulkDeleteSuppliers(ids: number[]): Promise<{ message: string; deleted: number }> {
    // Since the API doesn't have a bulk delete endpoint, we'll delete one by one
    const deletePromises = ids.map(id => this.deleteSupplier(id))
    await Promise.all(deletePromises)
    
    return {
      message: `${ids.length} suppliers deleted successfully`,
      deleted: ids.length
    }
  }

  // Search suppliers (client-side filtering for now)
  async searchSuppliers(searchTerm: string): Promise<Supplier[]> {
    const allSuppliers = await this.getAllSuppliers()
    
    if (!searchTerm.trim()) {
      return allSuppliers
    }

    const term = searchTerm.toLowerCase()
    return allSuppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(term) ||
      supplier.email_add.toLowerCase().includes(term) ||
      supplier.contact_num.includes(term) ||
      supplier.address.toLowerCase().includes(term)
    )
  }

  // Validate supplier data (client-side validation) - Updated for auto-increment IDs
  validateSupplierData(data: Partial<SupplierCreate>): string[] {
    const errors: string[] = []

    // Name validation
    if (!data.name || data.name.trim().length < 2) {
      errors.push(ERROR_MESSAGES.SUPPLIER_NAME_TOO_SHORT)
    }
    if (data.name && data.name.length > 50) {
      errors.push(ERROR_MESSAGES.SUPPLIER_NAME_TOO_LONG)
    }

    // Contact number validation
    if (!data.contact_num) {
      errors.push(ERROR_MESSAGES.SUPPLIER_CONTACT_REQUIRED)
    } else if (data.contact_num.length < 10 || data.contact_num.length > 15) {
      errors.push(ERROR_MESSAGES.SUPPLIER_CONTACT_INVALID)
    }

    // Email validation
    if (!data.email_add) {
      errors.push(ERROR_MESSAGES.SUPPLIER_EMAIL_REQUIRED)
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email_add)) {
        errors.push(ERROR_MESSAGES.SUPPLIER_EMAIL_INVALID)
      }
      if (data.email_add.length > 50) {
        errors.push('Email address must be less than 50 characters')
      }
    }

    // Address validation
    if (!data.address || data.address.trim().length < 5) {
      errors.push(ERROR_MESSAGES.SUPPLIER_ADDRESS_TOO_SHORT)
    }
    if (data.address && data.address.length > 50) {
      errors.push(ERROR_MESSAGES.SUPPLIER_ADDRESS_TOO_LONG)
    }

    return errors
  }

  // Get supplier statistics
  async getSupplierStats(): Promise<{
    total: number
    active: number
    topRated: number
    performanceScore: number
  }> {
    const suppliers = await this.getAllSuppliers()
    const total = suppliers.length
    const active = suppliers.length // All suppliers are considered active
    const topRated = Math.floor(suppliers.length * 0.8) // 80% are top rated (example logic)
    const performanceScore = suppliers.length > 0 ? Math.floor(85 + Math.random() * 15) : 0

    return {
      total,
      active,
      topRated,
      performanceScore
    }
  }

  // Export suppliers data (for future use)
  async exportSuppliers(format: 'csv' | 'json' = 'csv'): Promise<string> {
    const suppliers = await this.getAllSuppliers()

    if (format === 'json') {
      return JSON.stringify(suppliers, null, 2)
    }

    // CSV export
    const headers = ['ID', 'Company Name', 'Contact Number', 'Email Address', 'Address']
    const csvContent = [
      headers.join(','),
      ...suppliers.map(supplier => [
        supplier.id,
        `"${supplier.name}"`,
        supplier.contact_num,
        supplier.email_add,
        `"${supplier.address}"`
      ].join(','))
    ].join('\n')

    return csvContent
  }

  // Check if supplier email exists (for validation)
  async checkEmailExists(email: string, excludeId?: number): Promise<boolean> {
    try {
      const suppliers = await this.getAllSuppliers()
      return suppliers.some(supplier => 
        supplier.email_add.toLowerCase() === email.toLowerCase() && 
        supplier.id !== excludeId
      )
    } catch {
      return false
    }
  }

  // Check if supplier name exists (for validation)
  async checkNameExists(name: string, excludeId?: number): Promise<boolean> {
    try {
      const suppliers = await this.getAllSuppliers()
      return suppliers.some(supplier => 
        supplier.name.toLowerCase() === name.toLowerCase() && 
        supplier.id !== excludeId
      )
    } catch {
      return false
    }
  }

  // Validate supplier for creation (comprehensive validation)
  async validateForCreation(data: SupplierCreate): Promise<string[]> {
    const errors = this.validateSupplierData(data)

    // Check for duplicate email
    const emailExists = await this.checkEmailExists(data.email_add)
    if (emailExists) {
      errors.push('A supplier with this email address already exists')
    }

    // Check for duplicate name
    const nameExists = await this.checkNameExists(data.name)
    if (nameExists) {
      errors.push('A supplier with this name already exists')
    }

    return errors
  }

  // Validate supplier for update (comprehensive validation)
  async validateForUpdate(id: number, data: SupplierUpdate): Promise<string[]> {
    const errors = this.validateSupplierData(data)

    // Check for duplicate email (excluding current supplier)
    if (data.email_add) {
      const emailExists = await this.checkEmailExists(data.email_add, id)
      if (emailExists) {
        errors.push('A supplier with this email address already exists')
      }
    }

    // Check for duplicate name (excluding current supplier)
    if (data.name) {
      const nameExists = await this.checkNameExists(data.name, id)
      if (nameExists) {
        errors.push('A supplier with this name already exists')
      }
    }

    return errors
  }
}

// Create and export a singleton instance
export const supplierService = new SupplierService()

// Export the class for testing or custom instances
export { SupplierService }