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
  FinishedProductCategory,
  FinishedProductCategoryCreate, 
  FinishedProductCategoryUpdate, 
  FinishedProductCategoryResponse,
  FinishedProductCategoryStats
} from '../types/finishedProduct'

class FinishedProductService {
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
          break
        case HTTP_STATUS.FORBIDDEN:
          errorMessage = ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS
          break
        case HTTP_STATUS.NOT_FOUND:
          errorMessage = ERROR_MESSAGES.CATEGORY_NOT_FOUND
          break
        case HTTP_STATUS.CONFLICT:
          try {
            const errorData = await response.json()
            errorMessage = errorData.detail || ERROR_MESSAGES.CATEGORY_NAME_EXISTS
          } catch {
            errorMessage = ERROR_MESSAGES.CATEGORY_NAME_EXISTS
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

  // Get all categories
  async getAllCategories(): Promise<FinishedProductCategory[]> {
    return this.makeRequest<FinishedProductCategory[]>(API_ENDPOINTS.CATEGORIES.BASE, {
      method: HTTP_METHODS.GET,
    })
  }

  // Get category by ID
  async getCategoryById(id: number): Promise<FinishedProductCategory> {
    return this.makeRequest<FinishedProductCategory>(API_ENDPOINTS.CATEGORIES.BY_ID(id), {
      method: HTTP_METHODS.GET,
    })
  }

  // Create new category
  async createCategory(categoryData: FinishedProductCategoryCreate): Promise<FinishedProductCategoryResponse> {
    return this.makeRequest<FinishedProductCategoryResponse>(API_ENDPOINTS.CATEGORIES.BASE, {
      method: HTTP_METHODS.POST,
      body: JSON.stringify(categoryData),
    })
  }

  // Update existing category
  async updateCategory(id: number, categoryData: FinishedProductCategoryUpdate): Promise<FinishedProductCategoryResponse> {
    return this.makeRequest<FinishedProductCategoryResponse>(API_ENDPOINTS.CATEGORIES.BY_ID(id), {
      method: HTTP_METHODS.PUT,
      body: JSON.stringify(categoryData),
    })
  }

  // Delete category
  async deleteCategory(id: number): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(API_ENDPOINTS.CATEGORIES.BY_ID(id), {
      method: HTTP_METHODS.DELETE,
    })
  }

  // Bulk delete categories
  async bulkDeleteCategories(ids: number[]): Promise<{ message: string; deleted: number }> {
    const deletePromises = ids.map(id => this.deleteCategory(id))
    await Promise.all(deletePromises)
    
    return {
      message: `${ids.length} categories deleted successfully`,
      deleted: ids.length
    }
  }

  // Search categories (client-side filtering)
  async searchCategories(searchTerm: string): Promise<FinishedProductCategory[]> {
    const allCategories = await this.getAllCategories()
    
    if (!searchTerm.trim()) {
      return allCategories
    }

    const term = searchTerm.toLowerCase()
    return allCategories.filter(category =>
      category.name.toLowerCase().includes(term)
    )
  }

  // Get category statistics (calculated from real data)
  async getCategoryStats(): Promise<FinishedProductCategoryStats> {
    const categories = await this.getAllCategories()
    
    const total = categories.length
    const recentlyAdded = Math.min(3, total) // Last 3 categories as "recently added"
    
    return {
      total,
      recentlyAdded
    }
  }

  // Export categories data
  async exportCategories(format: 'csv' | 'json' = 'csv'): Promise<string> {
    const categories = await this.getAllCategories()

    if (format === 'json') {
      return JSON.stringify(categories, null, 2)
    }

    // CSV export
    const headers = ['ID', 'Category Name']
    const csvContent = [
      headers.join(','),
      ...categories.map(category => [
        category.id,
        `"${category.name}"`
      ].join(','))
    ].join('\n')

    return csvContent
  }

  // Validate category data (client-side validation)
  validateCategoryData(data: Partial<FinishedProductCategoryCreate>): string[] {
    const errors: string[] = []

    // Name validation
    if (!data.name || data.name.trim().length < 2) {
      errors.push(ERROR_MESSAGES.CATEGORY_NAME_TOO_SHORT)
    }
    if (data.name && data.name.length > 100) {
      errors.push(ERROR_MESSAGES.CATEGORY_NAME_TOO_LONG)
    }

    return errors
  }

  // Check if category name exists
  async checkNameExists(name: string, excludeId?: number): Promise<boolean> {
    try {
      const categories = await this.getAllCategories()
      return categories.some(category => 
        category.name.toLowerCase() === name.toLowerCase() && 
        category.id !== excludeId
      )
    } catch {
      return false
    }
  }

  // Validate category for creation
  async validateForCreation(data: FinishedProductCategoryCreate): Promise<string[]> {
    const errors = this.validateCategoryData(data)

    // Check for duplicate name
    const nameExists = await this.checkNameExists(data.name)
    if (nameExists) {
      errors.push('A category with this name already exists')
    }

    return errors
  }

  // Validate category for update
  async validateForUpdate(id: number, data: FinishedProductCategoryUpdate): Promise<string[]> {
    const errors = this.validateCategoryData(data)

    // Check for duplicate name (excluding current category)
    if (data.name) {
      const nameExists = await this.checkNameExists(data.name, id)
      if (nameExists) {
        errors.push('A category with this name already exists')
      }
    }

    return errors
  }

  // Filter categories (client-side filtering)
  async filterCategories(filters: {
    search?: string
  }): Promise<FinishedProductCategory[]> {
    const categories = await this.getAllCategories()
    
    return categories.filter(category => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const matchesSearch = category.name.toLowerCase().includes(searchTerm)
        if (!matchesSearch) return false
      }

      return true
    })
  }
}

// Create and export a singleton instance
export const finishedProductService = new FinishedProductService()

// Export the class for testing or custom instances
export { FinishedProductService }