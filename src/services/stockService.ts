import { 
  API_CONFIG, 
  HTTP_METHODS, 
  HTTP_STATUS, 
  STORAGE_KEYS,
  AUTH_CONFIG,
  ERROR_MESSAGES 
} from '../constants/api'
import type { 
  Stock,
  StockCreate, 
  StockUpdate, 
  StockResponse,
  StockStats,
  ProductOption,
  SupplierOption,
  BatchStockItem,
  BatchStockCreate,
  BatchResponse,
  BatchSummary,
  BatchInfo,
  BatchArchiveRequest,
  BatchArchiveResponse
} from '../types/stock'

// UPDATED: Database-matched types - quantity and unit removed from Stock
type StockCategory = 'finished product' | 'raw material'  // Note: spaces not underscores

// UPDATED: BatchStockItem without quantity and unit (these come from Product table)
interface ApiBatchStockItem {
  piece: number
  // REMOVED: quantity and unit (now in Product table)
  category: StockCategory
  product_id: number
  supplier_id: number
}

interface ApiBatchStockCreate {
  items: ApiBatchStockItem[]
  users_id?: number
}

// Validation constants - UPDATED: removed stock unit validation since it's now in Product table
const VALID_STOCK_CATEGORIES: StockCategory[] = [
  'finished product',  // CRITICAL: space, not underscore
  'raw material'       // CRITICAL: space, not underscore
]

// Validation helper functions - UPDATED: removed unit validation for stock
const isValidStockCategory = (category: string): category is StockCategory => {
  return VALID_STOCK_CATEGORIES.includes(category as StockCategory)
}

class StockService {
  private baseURL: string
  private defaultHeaders: HeadersInit

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL
    this.defaultHeaders = {
      ...API_CONFIG.HEADERS,
    }
    console.log('🏗️ StockService initialized with baseURL:', this.baseURL)
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    const headers = {
      ...this.defaultHeaders,
      ...(token && { [AUTH_CONFIG.TOKEN_HEADER]: `${AUTH_CONFIG.TOKEN_PREFIX} ${token}` })
    }
    
    console.log('🔑 Auth headers prepared:')
    console.log('  - Token exists:', !!token)
    if (token) {
      console.log('  - Bearer token:', `${AUTH_CONFIG.TOKEN_PREFIX} ${token.substring(0, 20)}...${token.substring(token.length - 10)}`)
    }
    
    return headers
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    console.log('📥 Response received:')
    console.log('  - Status:', response.status, response.statusText)
    console.log('  - Headers:', Object.fromEntries(response.headers.entries()))
    
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
          errorMessage = 'Resource not found'
          break
        case HTTP_STATUS.CONFLICT:
          try {
            const errorData = await response.json()
            console.log('❌ 409 Conflict Error Data:', errorData)
            errorMessage = errorData.detail || ERROR_MESSAGES.VALIDATION_ERROR
          } catch {
            errorMessage = ERROR_MESSAGES.VALIDATION_ERROR
          }
          break
        case HTTP_STATUS.UNPROCESSABLE_ENTITY:
          try {
            const errorData = await response.json()
            console.log('❌ 422 Unprocessable Entity Error Data:', errorData)
            // Handle Pydantic validation errors
            if (errorData.detail && Array.isArray(errorData.detail)) {
              const validationErrors = errorData.detail.map((error: any) => 
                `${error.loc?.join('.') || 'Field'}: ${error.msg || 'Validation error'}`
              ).join(', ')
              errorMessage = `Validation error: ${validationErrors}`
            } else {
              errorMessage = errorData.detail || ERROR_MESSAGES.VALIDATION_ERROR
            }
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

      console.log('❌ Request failed with error:', errorMessage)
      throw new Error(errorMessage)
    }

    const contentType = response.headers.get('content-type')
    console.log('  - Content-Type:', contentType)
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json()
      console.log('✅ Response data:', data)
      return data
    }
    
    const textData = await response.text()
    console.log('✅ Response text:', textData)
    return textData as unknown as T
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

    console.log('🚀 Making API request:')
    console.log('  - Method:', options.method || 'GET')
    console.log('  - URL:', url)
    console.log('  - Headers:', config.headers)
    
    if (options.body) {
      console.log('  - Body:', options.body)
      try {
        const parsedBody = JSON.parse(options.body as string)
        console.log('  - Parsed Body:', parsedBody)
        
        // Additional validation logging for batch requests
        if (endpoint.includes('/stocks/batch')) {
          console.log('🔍 Batch validation details:')
          if (parsedBody.items && Array.isArray(parsedBody.items)) {
            parsedBody.items.forEach((item: any, index: number) => {
              console.log(`  Item ${index + 1}:`)
              console.log(`    - category: "${item.category}" (type: ${typeof item.category}) [valid: ${isValidStockCategory(item.category)}]`)
              console.log(`    - piece: ${item.piece} (type: ${typeof item.piece}) [integer: ${Number.isInteger(item.piece)}]`)
              console.log(`    - product_id: ${item.product_id} (type: ${typeof item.product_id})`)
              console.log(`    - supplier_id: ${item.supplier_id} (type: ${typeof item.supplier_id})`)
              // REMOVED: quantity and unit validation (now in Product table)
            })
          }
        }
      } catch (e) {
        console.log('  - Body (not JSON):', options.body)
      }
    }

    try {
      const response = await fetch(url, config)
      return this.handleResponse<T>(response)
    } catch (error) {
      console.log('❌ Request failed with error:', error)
      
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          console.log('⏰ Request timed out')
          throw new Error(ERROR_MESSAGES.NETWORK_ERROR)
        }
        throw error
      }
      throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR)
    }
  }

  // =============================================================================
  // STATISTICS
  // =============================================================================

  // UPDATED: Get stock statistics (now includes total_product_quantity)
  async getStockStats(): Promise<StockStats> {
    console.log('📊 Getting stock statistics...')
    try {
      const response = await this.makeRequest<StockStats>('/stocks/stats', {
        method: HTTP_METHODS.GET,
      })
      console.log('✅ Stock stats received:', response)
      return response
    } catch (error) {
      console.error('❌ Failed to get stock stats:', error)
      // Return default stats instead of throwing error for better UX
      const defaultStats: StockStats = {
        total_stocks: 0,
        active_stocks: 0,
        archived_stocks: 0,
        used_stocks: 0,
        finished_products: 0,
        raw_materials: 0,
        total_product_quantity: 0  // ADDED
      }
      console.log('🔄 Returning default stats due to error')
      return defaultStats
    }
  }

  // =============================================================================
  // BATCH OPERATIONS
  // =============================================================================

  // Get next batch number
  async getNextBatchNumber(): Promise<string> {
    console.log('📦 Getting next batch number...')
    try {
      const response = await this.makeRequest<{ next_batch_number: string }>('/stocks/next-batch-number', {
        method: HTTP_METHODS.GET,
      })
      console.log('✅ Next batch number received:', response.next_batch_number)
      return response.next_batch_number
    } catch (error) {
      console.error('❌ Failed to get next batch number:', error)
      // Return fallback batch number
      const fallback = `batch-${Date.now()}`
      console.log('🔄 Using fallback batch number:', fallback)
      return fallback
    }
  }

  // UPDATED: Enhanced batch validation (removed quantity and unit validation)
  validateBatchData(batchData: BatchStockCreate): string[] {
    console.log('✅ Validating batch data:', batchData)
    const errors: string[] = []

    if (!batchData.items || batchData.items.length === 0) {
      errors.push('At least one item is required for batch creation')
      console.log('❌ Validation error: No items provided')
      return errors
    }

    console.log('🔍 Valid categories for validation:', VALID_STOCK_CATEGORIES)

    batchData.items.forEach((item, index) => {
      const itemNum = index + 1

      // Piece validation
      if (!item.piece || item.piece <= 0 || !Number.isInteger(item.piece)) {
        errors.push(`Item ${itemNum}: Piece count must be a positive whole number`)
      }

      // REMOVED: Quantity and unit validation (now in Product table)

      // Category validation - CRITICAL CHECK
      if (!item.category || item.category.trim() === '') {
        errors.push(`Item ${itemNum}: Category is required`)
      } else if (!isValidStockCategory(item.category)) {
        errors.push(`Item ${itemNum}: Invalid category "${item.category}". Valid categories: ${VALID_STOCK_CATEGORIES.join(', ')}`)
        console.log(`❌ Category validation failed for item ${itemNum}: "${item.category}" not in [${VALID_STOCK_CATEGORIES.join(', ')}]`)
      } else {
        console.log(`✅ Category validation passed for item ${itemNum}: "${item.category}"`)
      }

      // Product validation
      if (!item.product_id || item.product_id <= 0) {
        errors.push(`Item ${itemNum}: Product is required`)
      }

      // Supplier validation
      if (!item.supplier_id || item.supplier_id <= 0) {
        errors.push(`Item ${itemNum}: Supplier is required`)
      }

      // Additional logging for debugging
      console.log(`🔍 Item ${itemNum} validation details:`)
      console.log(`  - category: "${item.category}" (type: ${typeof item.category})`)
      console.log(`  - piece: ${item.piece} (type: ${typeof item.piece})`)
      console.log(`  - product_id: ${item.product_id} (type: ${typeof item.product_id})`)
      console.log(`  - supplier_id: ${item.supplier_id} (type: ${typeof item.supplier_id})`)
      // REMOVED: quantity and unit logging
    })

    if (errors.length > 0) {
      console.log('❌ Validation errors found:', errors)
    } else {
      console.log('✅ Batch data validation passed')
    }

    return errors
  }

  // UPDATED: Create batch stocks (removed quantity and unit from items)
  async createBatchStocks(batchData: BatchStockCreate): Promise<BatchResponse> {
    console.log('📦 Creating batch stocks with data:', batchData)
    
    // Enhanced validation before sending
    const validationErrors = this.validateBatchData(batchData)
    if (validationErrors.length > 0) {
      const errorMessage = `Validation failed: ${validationErrors.join(', ')}`
      console.log('❌ Batch validation failed:', errorMessage)
      throw new Error(errorMessage)
    }

    // Additional type checking and debugging
    console.log('🔍 Pre-send type validation and final data check:')
    batchData.items.forEach((item, index) => {
      console.log(`  Item ${index + 1}:`)
      console.log(`    - category: "${item.category}" (valid: ${VALID_STOCK_CATEGORIES.includes(item.category)})`)
      console.log(`    - piece: ${item.piece} (integer: ${Number.isInteger(item.piece)}, positive: ${item.piece > 0})`)
      console.log(`    - product_id: ${item.product_id} (positive: ${item.product_id > 0})`)
      console.log(`    - supplier_id: ${item.supplier_id} (positive: ${item.supplier_id > 0})`)
      // REMOVED: quantity and unit logging
    })

    // Final validation checks before API call
    const invalidCategories = batchData.items.filter(item => 
      !VALID_STOCK_CATEGORIES.includes(item.category)
    )
    
    if (invalidCategories.length > 0) {
      const errorMessage = `Invalid categories found: ${invalidCategories.map(item => `"${item.category}"`).join(', ')}. Valid categories: [${VALID_STOCK_CATEGORIES.join(', ')}]`
      console.error('❌ Final category validation failed:', errorMessage)
      throw new Error(errorMessage)
    }

    // REMOVED: unit validation since it's no longer in Stock table

    // Log the exact JSON that will be sent
    const jsonPayload = JSON.stringify(batchData, null, 2)
    console.log('📤 Exact JSON payload being sent to API:')
    console.log(jsonPayload)

    try {
      const response = await this.makeRequest<BatchResponse>('/stocks/batch', {
        method: HTTP_METHODS.POST,
        body: jsonPayload,
      })
      
      console.log('✅ Batch stocks created successfully:', response)
      return response
    } catch (error) {
      console.error('❌ Batch creation failed:', error)
      throw error
    }
  }

  // Get all batches
  async getAllBatches(): Promise<BatchInfo[]> {
    console.log('📦 Getting all batches...')
    try {
      const response = await this.makeRequest<BatchInfo[]>('/stocks/batches', {
        method: HTTP_METHODS.GET,
      })
      console.log('✅ All batches received:', response.length, 'batches')
      console.log('📋 Batches data:', response)
      return response
    } catch (error) {
      console.error('❌ Failed to get batches:', error)
      // Return empty array instead of throwing error for better UX
      console.log('🔄 Returning empty array due to error')
      return []
    }
  }

  // Get batch details
  async getBatchDetails(batchNumber: string): Promise<BatchSummary> {
    console.log('📦 Getting batch details for:', batchNumber)
    try {
      const response = await this.makeRequest<BatchSummary>(`/stocks/batches/${encodeURIComponent(batchNumber)}`, {
        method: HTTP_METHODS.GET,
      })
      console.log('✅ Batch details received:', response)
      return response
    } catch (error) {
      console.error('❌ Failed to get batch details:', error)
      throw error
    }
  }

  // Delete batch
  async deleteBatch(batchNumber: string): Promise<{ message: string }> {
    console.log('🗑️ Deleting batch:', batchNumber)
    try {
      const response = await this.makeRequest<{ message: string }>(`/stocks/batches/${encodeURIComponent(batchNumber)}`, {
        method: HTTP_METHODS.DELETE,
      })
      console.log('✅ Batch deleted:', response)
      return response
    } catch (error) {
      console.error('❌ Failed to delete batch:', error)
      throw error
    }
  }

  // Set explicit archive status for batch using request body
  async setBatchArchiveStatus(batchNumber: string, archive: boolean): Promise<BatchArchiveResponse> {
    console.log(`📥 Setting batch ${batchNumber} archive status to:`, archive)
    try {
      const requestData: BatchArchiveRequest = { archive }
      
      const response = await this.makeRequest<BatchArchiveResponse>(`/stocks/batches/${encodeURIComponent(batchNumber)}/set-archive`, {
        method: HTTP_METHODS.PUT,
        body: JSON.stringify(requestData),
      })
      
      console.log('✅ Batch archive status set:', response)
      return response
    } catch (error) {
      console.error('❌ Failed to set batch archive status:', error)
      throw error
    }
  }

  // Archive/unarchive batch with improved explicit control
  async archiveBatch(batchNumber: string): Promise<{ message: string }> {
    console.log('📥 Archiving/unarchiving batch (toggle):', batchNumber)
    try {
      // First get batch details to understand current state
      const batchDetails = await this.getBatchDetails(batchNumber)
      console.log('📋 Current batch details:', batchDetails)
      
      // Determine if we should archive or unarchive based on current state
      const allItemsArchived = batchDetails.items.every(item => item.archive)
      const shouldArchive = !allItemsArchived
      
      console.log(`🔄 Batch ${batchNumber}: All items archived: ${allItemsArchived}, Will ${shouldArchive ? 'archive' : 'unarchive'} items`)
      
      // Use the new explicit boolean method
      const response = await this.setBatchArchiveStatus(batchNumber, shouldArchive)
      
      console.log('✅ Batch archive operation completed:', response)
      return { message: response.message }
    } catch (error) {
      console.error('❌ Failed to archive/unarchive batch:', error)
      throw error
    }
  }

  // Batch archive with explicit boolean (wrapper for consistency)
  async archiveBatchExplicit(batchNumber: string, archive: boolean): Promise<BatchArchiveResponse> {
    console.log(`📥 ${archive ? 'Archiving' : 'Unarchiving'} batch explicitly:`, batchNumber)
    return this.setBatchArchiveStatus(batchNumber, archive)
  }

  // =============================================================================
  // INDIVIDUAL STOCK OPERATIONS
  // =============================================================================

  // Get all stocks
  async getAllStocks(filters?: {
    category?: StockCategory
    archive?: boolean
    used?: boolean
  }): Promise<Stock[]> {
    console.log('📋 Getting all stocks with filters:', filters)
    
    try {
      const queryParams = new URLSearchParams()
      
      if (filters?.category) {
        queryParams.append('category', filters.category)
      }
      if (filters?.archive !== undefined) {
        queryParams.append('archive', filters.archive.toString())
      }
      if (filters?.used !== undefined) {
        queryParams.append('used', filters.used.toString())
      }

      const endpoint = queryParams.toString() 
        ? `/stocks?${queryParams.toString()}`
        : '/stocks'

      console.log('📋 Final endpoint:', endpoint)

      const response = await this.makeRequest<Stock[]>(endpoint, {
        method: HTTP_METHODS.GET,
      })
      
      console.log('✅ Stocks received:', response.length, 'items')
      return response
    } catch (error) {
      console.error('❌ Failed to get stocks:', error)
      // Return empty array instead of throwing error for better UX
      console.log('🔄 Returning empty array due to error')
      return []
    }
  }

  // Get stock by ID
  async getStockById(id: number): Promise<Stock> {
    console.log('📋 Getting stock by ID:', id)
    try {
      const response = await this.makeRequest<Stock>(`/stocks/${id}`, {
        method: HTTP_METHODS.GET,
      })
      console.log('✅ Stock received:', response)
      return response
    } catch (error) {
      console.error('❌ Failed to get stock by ID:', error)
      throw error
    }
  }

  // UPDATED: Create new stock (removed quantity and unit)
  async createStock(stockData: StockCreate): Promise<StockResponse> {
    console.log('📝 Creating new stock with data:', stockData)
    
    // Validate the stock data before sending
    if (!isValidStockCategory(stockData.category)) {
      throw new Error(`Invalid category: ${stockData.category}. Valid categories: [${VALID_STOCK_CATEGORIES.join(', ')}]`)
    }
    
    // REMOVED: unit validation since it's no longer in Stock table
    
    try {
      const response = await this.makeRequest<StockResponse>('/stocks', {
        method: HTTP_METHODS.POST,
        body: JSON.stringify(stockData),
      })
      console.log('✅ Stock created:', response)
      return response
    } catch (error) {
      console.error('❌ Failed to create stock:', error)
      throw error
    }
  }

  // UPDATED: Update existing stock (removed quantity and unit)
  async updateStock(id: number, stockData: StockUpdate): Promise<StockResponse> {
    console.log('📝 Updating stock ID:', id, 'with data:', stockData)
    
    // Validate the stock data before sending
    if (stockData.category && !isValidStockCategory(stockData.category)) {
      throw new Error(`Invalid category: ${stockData.category}. Valid categories: [${VALID_STOCK_CATEGORIES.join(', ')}]`)
    }
    
    // REMOVED: unit validation since it's no longer in Stock table
    
    try {
      const response = await this.makeRequest<StockResponse>(`/stocks/${id}`, {
        method: HTTP_METHODS.PUT,
        body: JSON.stringify(stockData),
      })
      console.log('✅ Stock updated:', response)
      return response
    } catch (error) {
      console.error('❌ Failed to update stock:', error)
      throw error
    }
  }

  // Delete stock
  async deleteStock(id: number): Promise<{ message: string }> {
    console.log('🗑️ Deleting stock ID:', id)
    try {
      const response = await this.makeRequest<{ message: string }>(`/stocks/${id}`, {
        method: HTTP_METHODS.DELETE,
      })
      console.log('✅ Stock deleted:', response)
      return response
    } catch (error) {
      console.error('❌ Failed to delete stock:', error)
      throw error
    }
  }

  // Archive/Unarchive stock
  async archiveStock(id: number): Promise<{ message: string }> {
    console.log('📥 Archiving/unarchiving stock ID:', id)
    try {
      const response = await this.makeRequest<{ message: string }>(`/stocks/${id}/archive`, {
        method: HTTP_METHODS.PUT,
      })
      console.log('✅ Stock archive status changed:', response)
      return response
    } catch (error) {
      console.error('❌ Failed to archive stock:', error)
      throw error
    }
  }

  // Mark stock as used/unused
  async markStockUsed(id: number): Promise<{ message: string }> {
    console.log('✅ Marking stock as used/unused ID:', id)
    try {
      const response = await this.makeRequest<{ message: string }>(`/stocks/${id}/use`, {
        method: HTTP_METHODS.PUT,
      })
      console.log('✅ Stock usage status changed:', response)
      return response
    } catch (error) {
      console.error('❌ Failed to mark stock as used:', error)
      throw error
    }
  }

  // =============================================================================
  // SUPPORTING DATA OPERATIONS
  // =============================================================================

  // UPDATED: Get product options for dropdowns (now includes unit and quantity)
  async getProductOptions(): Promise<ProductOption[]> {
    console.log('📦 Getting product options...')
    try {
      const response = await this.makeRequest<ProductOption[]>('/products', {
        method: HTTP_METHODS.GET,
      })
      console.log('✅ Product options received:', response.length, 'products')
      return response
    } catch (error) {
      console.error('❌ Failed to get product options:', error)
      console.log('🔄 Returning empty array due to error')
      return []
    }
  }

  // Get supplier options for dropdowns
  async getSupplierOptions(): Promise<SupplierOption[]> {
    console.log('🏢 Getting supplier options...')
    try {
      const response = await this.makeRequest<SupplierOption[]>('/suppliers', {
        method: HTTP_METHODS.GET,
      })
      console.log('✅ Supplier options received:', response.length, 'suppliers')
      return response
    } catch (error) {
      console.error('❌ Failed to get supplier options:', error)
      console.log('🔄 Returning empty array due to error')
      return []
    }
  }

  // =============================================================================
  // SEARCH AND FILTER OPERATIONS
  // =============================================================================

  // UPDATED: Search stocks (removed quantity from search fields)
  async searchStocks(searchTerm: string): Promise<Stock[]> {
    console.log('🔍 Searching stocks with term:', searchTerm)
    try {
      const allStocks = await this.getAllStocks()
      
      if (!searchTerm.trim()) {
        console.log('✅ Empty search term, returning all stocks')
        return allStocks
      }

      const term = searchTerm.toLowerCase()
      const results = allStocks.filter(stock =>
        stock.batch.toLowerCase().includes(term) ||
        stock.product_name?.toLowerCase().includes(term) ||
        stock.supplier_name?.toLowerCase().includes(term) ||
        stock.user_name?.toLowerCase().includes(term) ||
        stock.category.toLowerCase().includes(term) ||
        stock.product_unit?.toLowerCase().includes(term)  // UPDATED: search product unit instead
      )
      
      console.log('✅ Search completed:', results.length, 'results found')
      return results
    } catch (error) {
      console.error('❌ Stock search failed:', error)
      return []
    }
  }

  // =============================================================================
  // EXPORT OPERATIONS
  // =============================================================================

  // UPDATED: Export stocks data (updated to use product_quantity and product_unit)
  async exportStocks(format: 'csv' | 'json' = 'csv'): Promise<string> {
    console.log('📤 Exporting stocks in format:', format)
    try {
      const stocks = await this.getAllStocks()

      if (format === 'json') {
        const jsonData = JSON.stringify(stocks, null, 2)
        console.log('✅ JSON export completed, size:', jsonData.length, 'characters')
        return jsonData
      }

      // CSV export - UPDATED: use product_quantity and product_unit
      const headers = [
        'ID', 'Batch', 'Piece', 'Product Quantity', 'Product Unit', 'Category', 
        'Product', 'Supplier', 'User', 'Archive', 'Used', 'Created'
      ]
      const csvContent = [
        headers.join(','),
        ...stocks.map(stock => [
          stock.id,
          `"${stock.batch}"`,
          stock.piece,
          stock.product_quantity || 0,        // UPDATED: use product_quantity
          stock.product_unit || 'pcs',        // UPDATED: use product_unit
          `"${stock.category}"`,
          `"${stock.product_name || ''}"`,
          `"${stock.supplier_name || ''}"`,
          `"${stock.user_name || ''}"`,
          stock.archive ? 'Yes' : 'No',
          stock.used ? 'Yes' : 'No',
          new Date(stock.created_at).toLocaleDateString()
        ].join(','))
      ].join('\n')

      console.log('✅ CSV export completed, size:', csvContent.length, 'characters')
      return csvContent
    } catch (error) {
      console.error('❌ Export stocks failed:', error)
      throw error
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  // UPDATED: Get validation constants (removed unit validation)
  getValidationConstants() {
    return {
      VALID_STOCK_CATEGORIES,
      isValidStockCategory
    }
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; message: string }> {
    console.log('🏥 Performing health check...')
    try {
      const response = await this.makeRequest<{ message: string }>('/', {
        method: HTTP_METHODS.GET,
      })
      console.log('✅ Health check passed:', response)
      return { status: 'healthy', message: response.message }
    } catch (error) {
      console.error('❌ Health check failed:', error)
      return { status: 'unhealthy', message: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Clear cache (if needed)
  clearCache(): void {
    console.log('🧹 Clearing service cache...')
    // Add any cache clearing logic here if you implement caching
    console.log('✅ Cache cleared')
  }

  // Get batch archive status (helper method)
  async getBatchArchiveStatus(batchNumber: string): Promise<boolean> {
    console.log('🔍 Getting batch archive status for:', batchNumber)
    try {
      const batchDetails = await this.getBatchDetails(batchNumber)
      const allItemsArchived = batchDetails.items.every(item => item.archive)
      console.log(`✅ Batch ${batchNumber} archive status: ${allItemsArchived ? 'archived' : 'active'}`)
      return allItemsArchived
    } catch (error) {
      console.error('❌ Failed to get batch archive status:', error)
      return false
    }
  }

  // Validate batch archive operation
  validateBatchArchiveOperation(batchNumber: string, archive: boolean): string[] {
    const errors: string[] = []
    
    if (!batchNumber || batchNumber.trim() === '') {
      errors.push('Batch number is required')
    }
    
    if (typeof archive !== 'boolean') {
      errors.push('Archive status must be a boolean value')
    }
    
    return errors
  }
}

// Create and export a singleton instance
export const stockService = new StockService()

// Export the class for testing or custom instances
export { StockService }

// UPDATED: Export validation utilities (removed unit validation)
export { VALID_STOCK_CATEGORIES, isValidStockCategory }

// Export types for use in components
export type { 
  BatchInfo, 
  BatchSummary, 
  BatchStockCreate, 
  BatchResponse, 
  BatchArchiveRequest, 
  BatchArchiveResponse 
}