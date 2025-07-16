// services/productService.ts

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
  Product, 
  ProductCreate, 
  ProductUpdate, 
  ProductResponse,
  ProductStats,
  ProductFilters,
  StockUnit
} from '../types/product'

class ProductService {
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

  // Transform API response to ensure proper types
  private transformProduct(rawProduct: any): Product {
    return {
      id: Number(rawProduct.id),
      name: String(rawProduct.name),
      price: Number(rawProduct.price),
      unit: rawProduct.unit,
      quantity: Number(rawProduct.quantity || 0)
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
          errorMessage = ERROR_MESSAGES.PRODUCT_NOT_FOUND || 'Product not found'
          break
        case HTTP_STATUS.CONFLICT:
          try {
            const errorData = await response.json()
            errorMessage = errorData.detail || ERROR_MESSAGES.VALIDATION_ERROR || 'Validation error'
          } catch {
            errorMessage = ERROR_MESSAGES.VALIDATION_ERROR || 'Validation error'
          }
          break
        case HTTP_STATUS.UNPROCESSABLE_ENTITY:
          try {
            const errorData = await response.json()
            errorMessage = errorData.detail || ERROR_MESSAGES.VALIDATION_ERROR || 'Validation error'
          } catch {
            errorMessage = ERROR_MESSAGES.VALIDATION_ERROR || 'Validation error'
          }
          break
        case HTTP_STATUS.SERVICE_UNAVAILABLE:
          errorMessage = ERROR_MESSAGES.DATABASE_ERROR || 'Database error'
          break
        default:
          errorMessage = ERROR_MESSAGES.SERVER_ERROR || 'Server error'
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
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT || 30000),
    }

    try {
      console.log(`🌐 Making request to: ${url}`, config)
      const response = await fetch(url, config)
      const result = await this.handleResponse<T>(response)
      console.log(`✅ Request successful:`, result)
      return result
    } catch (error) {
      console.error(`❌ Request failed to ${url}:`, error)
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          throw new Error(ERROR_MESSAGES.NETWORK_ERROR || 'Network timeout')
        }
        throw error
      }
      throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR || 'Unknown error')
    }
  }

  // Get all products
  async getAllProducts(): Promise<Product[]> {
    const rawProducts = await this.makeRequest<any[]>(API_ENDPOINTS.PRODUCTS.BASE, {
      method: HTTP_METHODS.GET,
    })
    
    // Transform the raw products to ensure proper types
    return rawProducts.map(product => this.transformProduct(product))
  }

  // Get product by ID
  async getProductById(id: number): Promise<Product> {
    const rawProduct = await this.makeRequest<any>(API_ENDPOINTS.PRODUCTS.BY_ID(id), {
      method: HTTP_METHODS.GET,
    })
    
    return this.transformProduct(rawProduct)
  }

  // Create new product (ID is auto-increment)
  async createProduct(productData: ProductCreate): Promise<ProductResponse> {
    console.log('📤 Creating product with data:', productData)
    const rawProduct = await this.makeRequest<any>(API_ENDPOINTS.PRODUCTS.BASE, {
      method: HTTP_METHODS.POST,
      body: JSON.stringify(productData),
    })
    
    return this.transformProduct(rawProduct)
  }

  // Update existing product
  async updateProduct(id: number, productData: ProductUpdate): Promise<ProductResponse> {
    console.log(`📤 Updating product ${id} with data:`, productData)
    const rawProduct = await this.makeRequest<any>(API_ENDPOINTS.PRODUCTS.BY_ID(id), {
      method: HTTP_METHODS.PUT,
      body: JSON.stringify(productData),
    })
    
    return this.transformProduct(rawProduct)
  }

  // Delete product
  async deleteProduct(id: number): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(API_ENDPOINTS.PRODUCTS.BY_ID(id), {
      method: HTTP_METHODS.DELETE,
    })
  }

  // Bulk delete products
  async bulkDeleteProducts(ids: number[]): Promise<{ message: string; deleted: number }> {
    const deletePromises = ids.map(id => this.deleteProduct(id))
    await Promise.all(deletePromises)
    
    return {
      message: `${ids.length} products deleted successfully`,
      deleted: ids.length
    }
  }

  // Get product statistics including quantity metrics
  async getProductStats(): Promise<ProductStats> {
    const products = await this.getAllProducts()
    
    const total = products.length
    const totalValue = products.reduce((sum, product) => sum + (product.price * product.quantity), 0)
    const totalQuantity = products.reduce((sum, product) => sum + product.quantity, 0)
    const averagePrice = total > 0 ? products.reduce((sum, product) => sum + product.price, 0) / total : 0
    const averageQuantity = total > 0 ? totalQuantity / total : 0
    const prices = products.map(p => p.price)
    const highestPrice = prices.length > 0 ? Math.max(...prices) : 0
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0
    
    return {
      total,
      totalValue,
      averagePrice,
      highestPrice,
      lowestPrice,
      totalQuantity,
      averageQuantity
    }
  }

  // Search products by name or ID
  async searchProducts(query: string): Promise<Product[]> {
    if (!query.trim()) {
      return this.getAllProducts()
    }
    
    const products = await this.getAllProducts()
    const searchTerm = query.toLowerCase()
    
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm) ||
      product.id.toString().includes(searchTerm)
    )
  }

  // Enhanced filter products with unit and quantity filters
  async filterProducts(filters: ProductFilters): Promise<Product[]> {
    const products = await this.getAllProducts()
    
    return products.filter(product => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const matchesSearch = 
          product.name.toLowerCase().includes(searchTerm) ||
          product.id.toString().includes(searchTerm)
        if (!matchesSearch) return false
      }

      // Price range filter
      if (filters.minPrice !== undefined && product.price < filters.minPrice) return false
      if (filters.maxPrice !== undefined && product.price > filters.maxPrice) return false

      // Unit filter
      if (filters.unit && product.unit !== filters.unit) return false

      // Quantity range filter
      if (filters.minQuantity !== undefined && product.quantity < filters.minQuantity) return false
      if (filters.maxQuantity !== undefined && product.quantity > filters.maxQuantity) return false

      return true
    })
  }

  // Enhanced validation including quantity
  validateProductData(data: Partial<ProductCreate>): string[] {
    const errors: string[] = []

    // Name validation
    if (!data.name || data.name.trim().length < 2) {
      errors.push('Product name must be at least 2 characters long')
    }
    if (data.name && data.name.length > 50) {
      errors.push('Product name cannot exceed 50 characters')
    }

    // Price validation
    if (!data.price || data.price <= 0) {
      errors.push('Product price must be greater than 0')
    }
    if (data.price && data.price > 99999999.99) {
      errors.push('Product price cannot exceed 99,999,999.99')
    }

    // Quantity validation
    if (data.quantity !== undefined && data.quantity < 0) {
      errors.push('Product quantity cannot be negative')
    }

    return errors
  }

  // Check if product name exists
  async checkNameExists(name: string, excludeId?: number): Promise<boolean> {
    try {
      const products = await this.getAllProducts()
      return products.some(product => 
        product.name.toLowerCase() === name.toLowerCase() && 
        product.id !== excludeId
      )
    } catch {
      return false
    }
  }

  // Enhanced export with unit and quantity
  async exportProducts(format: 'csv' | 'json' = 'csv'): Promise<string> {
    const products = await this.getAllProducts()

    if (format === 'json') {
      return JSON.stringify(products, null, 2)
    }

    // CSV export with new fields
    const headers = ['ID', 'Name', 'Price', 'Unit', 'Quantity']
    const csvContent = [
      headers.join(','),
      ...products.map(product => [
        product.id,
        `"${product.name.replace(/"/g, '""')}"`, // Escape quotes in name
        product.price,
        product.unit || 'pcs',
        product.quantity || 0
      ].join(','))
    ].join('\n')

    return csvContent
  }

  // Get products sorted by price
  async getProductsSortedByPrice(ascending: boolean = true): Promise<Product[]> {
    const products = await this.getAllProducts()
    return products.sort((a, b) => 
      ascending ? a.price - b.price : b.price - a.price
    )
  }

  // Get products sorted by quantity
  async getProductsSortedByQuantity(ascending: boolean = true): Promise<Product[]> {
    const products = await this.getAllProducts()
    return products.sort((a, b) => 
      ascending ? a.quantity - b.quantity : b.quantity - a.quantity
    )
  }

  // Get products by price range
  async getProductsByPriceRange(min: number, max: number): Promise<Product[]> {
    const products = await this.getAllProducts()
    return products.filter(product => 
      product.price >= min && product.price <= max
    )
  }

  // Get products by quantity range
  async getProductsByQuantityRange(min: number, max: number): Promise<Product[]> {
    const products = await this.getAllProducts()
    return products.filter(product => 
      product.quantity >= min && product.quantity <= max
    )
  }

  // Get products by unit
  async getProductsByUnit(unit: StockUnit): Promise<Product[]> {
    const products = await this.getAllProducts()
    return products.filter(product => product.unit === unit)
  }

  // Get top N most expensive products
  async getTopExpensiveProducts(limit: number = 10): Promise<Product[]> {
    const products = await this.getProductsSortedByPrice(false)
    return products.slice(0, limit)
  }

  // Get top N cheapest products
  async getTopCheapestProducts(limit: number = 10): Promise<Product[]> {
    const products = await this.getProductsSortedByPrice(true)
    return products.slice(0, limit)
  }

  // Get products with highest quantities
  async getTopQuantityProducts(limit: number = 10): Promise<Product[]> {
    const products = await this.getProductsSortedByQuantity(false)
    return products.slice(0, limit)
  }

  // Get products with lowest quantities (low stock)
  async getLowStockProducts(limit: number = 10): Promise<Product[]> {
    const products = await this.getProductsSortedByQuantity(true)
    return products.slice(0, limit)
  }
}

// Create and export a singleton instance
export const productService = new ProductService()

// Export the class for testing or custom instances
export { ProductService }