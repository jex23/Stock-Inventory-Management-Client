import type { 
  ProcessManagementItem,
  ProcessManagementResponse,
  ProcessManagementCreate,
  ProcessManagementUpdate,
  BatchProcessCreate,
  ProcessBatchResponse,
  ProcessBatchSummary,
  ProcessBatchSummaryResponse,
  ProcessBatchArchiveRequest,
  ProcessManagementStats,
  NextProcessBatchNumber,
  ProcessManagementFilters,
  ProcessManagementQuery,
  ProcessManagementError,
  ProcessManagementLoadingState,
  StockGroupsResponse,
  StockGroupInfo,
  ConsolidationSuggestion,
  SmartAllocationRequest,
  PieceValidation,
  BatchValidationResult,
  PieceAnalytics,
  QualityControlUpdate,
  BatchQualityControlUpdate,
  QualityControlResponse
} from '../types/processManagement';

import { 
  API_CONFIG, 
  API_ENDPOINTS, 
  STORAGE_KEYS, 
  AUTH_CONFIG,
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ApiUtils
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

// Process Management State Interface
export interface ProcessManagementState {
  items: ProcessManagementResponse[];
  batches: ProcessBatchSummaryResponse[];
  stats: ProcessManagementStats | null;
  stockGroups: StockGroupInfo[];
  consolidationSuggestion: ConsolidationSuggestion | null;
  analytics: PieceAnalytics | null;
  loading: ProcessManagementLoadingState;
  error: ProcessManagementError | null;
  filters: ProcessManagementFilters;
}

class ProcessManagementService {
  private state: ProcessManagementState = {
    items: [],
    batches: [],
    stats: null,
    stockGroups: [],
    consolidationSuggestion: null,
    analytics: null,
    loading: {
      items: false,
      stats: false,
      batches: false,
      creating: false,
      updating: false,
      deleting: false,
      archiving: false,
      validating: false,
      consolidation: false,
    },
    error: null,
    filters: {}
  };

  private listeners: Set<(state: ProcessManagementState) => void> = new Set();

  constructor() {
    console.log('🚀 ProcessManagementService initialized with enhanced piece tracking');
  }

  // =============================================================================
  // EVENT MANAGEMENT
  // =============================================================================

  public subscribe(listener: (state: ProcessManagementState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  private setLoading(key: keyof ProcessManagementLoadingState, value: boolean) {
    this.state.loading[key] = value;
    this.notifyListeners();
  }

  private setError(error: ProcessManagementError | null) {
    this.state.error = error;
    this.notifyListeners();
  }

  public setPublicError(error: ProcessManagementError | null): void {
    this.setError(error);
  }

  public clearError(): void {
    this.state.error = null;
    this.notifyListeners();
  }

  // =============================================================================
  // CONFIGURATION HELPERS
  // =============================================================================

  private getHttpStatus() {
    const defaultStatus = {
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      UNPROCESSABLE_ENTITY: 422,
      SERVICE_UNAVAILABLE: 503,
    };
    
    return HTTP_STATUS || defaultStatus;
  }

  private getErrorMessages() {
    const defaultMessages = {
      NETWORK_ERROR: 'Network error. Please check your internet connection.',
      UNAUTHORIZED: 'You are not authorized to perform this action.',
      INSUFFICIENT_PERMISSIONS: 'You do not have sufficient permissions.',
      VALIDATION_ERROR: 'Please check your input and try again.',
      SERVER_ERROR: 'Server error occurred. Please try again later.',
      UNKNOWN_ERROR: 'An unknown error occurred.',
      PROCESS_NOT_FOUND: 'Process not found.',
      INSUFFICIENT_PIECES: 'Insufficient pieces available in stock.',
      STOCK_DEPLETED: 'Stock has been depleted.',
      PIECE_VALIDATION_FAILED: 'Piece validation failed.',
    };
    
    return { ...defaultMessages, ...(ERROR_MESSAGES || {}) };
  }

  private getSuccessMessages() {
    const defaultMessages = {
      PROCESS_CREATED: 'Process created successfully.',
      PROCESS_UPDATED: 'Process updated successfully.',
      PROCESS_DELETED: 'Process deleted successfully.',
      PROCESS_BATCH_CREATED: 'Process batch created successfully.',
      PROCESS_BATCH_DELETED: 'Process batch deleted successfully.',
      PROCESS_BATCH_ARCHIVED: 'Process batch archived successfully.',
      PROCESS_BATCH_UNARCHIVED: 'Process batch unarchived successfully.',
      ACTION_COMPLETED: 'Action completed successfully.',
      PIECES_ALLOCATED: 'Pieces allocated successfully.',
      CONSOLIDATION_COMPLETE: 'Stock consolidation completed.',
    };
    
    return { ...defaultMessages, ...(SUCCESS_MESSAGES || {}) };
  }

  // =============================================================================
  // GETTERS
  // =============================================================================

  public getState(): ProcessManagementState {
    return { ...this.state };
  }

  public getItems(): ProcessManagementResponse[] {
    return [...this.state.items];
  }

  public getBatches(): ProcessBatchSummaryResponse[] {
    return [...this.state.batches];
  }

  public getStats(): ProcessManagementStats | null {
    return this.state.stats ? { ...this.state.stats } : null;
  }

  public getStockGroups(): StockGroupInfo[] {
    return [...this.state.stockGroups];
  }


  public getAnalytics(): PieceAnalytics | null {
    return this.state.analytics ? { ...this.state.analytics } : null;
  }

  public getLoading(): ProcessManagementLoadingState {
    return { ...this.state.loading };
  }

  public getError(): ProcessManagementError | null {
    return this.state.error ? { ...this.state.error } : null;
  }

  public getFilters(): ProcessManagementFilters {
    return { ...this.state.filters };
  }

  // =============================================================================
  // HTTP CLIENT
  // =============================================================================

  private async apiCall<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    console.log('🌐 Making API call to:', url);
    console.log('⚙️ Request options:', options);
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...ApiUtils.getAuthHeaders()
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    console.log('📋 Final request config:', {
      url,
      method: config.method || 'GET',
      headers: config.headers
    });

    try {
      const response = await fetch(url, config);
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response text:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText || 'Unknown error' };
        }
        
        throw new APIError(errorData.detail || `HTTP ${response.status}`, response.status);
      }

      if (response.status === 204) {
        console.log('✅ No content response (204)');
        return {} as T;
      }

      const data = await response.json();
      console.log('✅ Response data:', data);
      return data;
    } catch (error) {
      console.error('❌ Network/Fetch error:', error);
      
      if (error instanceof APIError) {
        throw error;
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new APIError('Network error. Please check your internet connection and API server.');
      }
      
      throw new APIError(this.getErrorMessages().NETWORK_ERROR);
    }
  }

  // =============================================================================
  // DEBUGGING & TESTING
  // =============================================================================

  public async testApiConnectivity(): Promise<boolean> {
    try {
      console.log('🧪 Testing API connectivity with enhanced features...');
      
      const stats = await this.apiCall<ProcessManagementStats>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.STATS
      );
      console.log('✅ Stats test successful:', stats);
      
      const items = await this.apiCall<ProcessManagementResponse[]>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.BASE
      );
      console.log('✅ Items test successful:', items);
      
      const nextBatch = await this.apiCall<NextProcessBatchNumber>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.NEXT_BATCH_NUMBER
      );
      console.log('✅ Next batch number test successful:', nextBatch);
      
      return true;
    } catch (error) {
      console.error('❌ API connectivity test failed:', error);
      return false;
    }
  }

  public debugConfiguration(): void {
    console.log('🔍 API Configuration Debug:');
    console.log('- Base URL:', API_CONFIG.BASE_URL);
    console.log('- Process endpoints:', API_ENDPOINTS.PROCESS_MANAGEMENT);
    console.log('- Auth headers:', ApiUtils.getAuthHeaders());
    console.log('- Storage keys:', STORAGE_KEYS);
  }

  // =============================================================================
  // PROCESS MANAGEMENT CRUD OPERATIONS
  // =============================================================================

  public async fetchItems(filters?: ProcessManagementFilters): Promise<ProcessManagementResponse[]> {
    try {
      console.log('🔍 Starting fetchItems with filters:', filters);
      this.setLoading('items', true);
      this.clearError();

      if (filters) {
        this.state.filters = { ...this.state.filters, ...filters };
      }

      const queryParams: Record<string, string> = {};
      if (this.state.filters.archive !== undefined) {
        queryParams.archive = this.state.filters.archive.toString();
      }

      let endpoint = API_ENDPOINTS.PROCESS_MANAGEMENT.BASE;
      const params = new URLSearchParams(queryParams);
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }

      console.log('🌐 Final endpoint URL:', `${API_CONFIG.BASE_URL}${endpoint}`);
      console.log('🔑 Auth headers:', ApiUtils.getAuthHeaders());

      const items = await this.apiCall<ProcessManagementResponse[]>(endpoint);

      console.log('✅ fetchItems success with piece data:', items);
      this.state.items = items || [];
      this.notifyListeners();
      return items || [];
    } catch (error) {
      console.error('❌ fetchItems error details:', error);
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('items', false);
    }
  }

  public async createItem(data: ProcessManagementCreate): Promise<ProcessManagementResponse> {
    try {
      console.log('🚀 Creating process management item with pieces:', data);
      this.setLoading('creating', true);
      this.clearError();

      if (data.pieces_used !== undefined && data.pieces_used <= 0) {
        throw new Error('Pieces used must be greater than 0');
      }

      const response = await this.apiCall<ProcessManagementResponse>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.BASE,
        {
          method: 'POST',
          body: JSON.stringify(data)
        }
      );

      this.state.items.unshift(response);
      this.notifyListeners();

      console.log('✅ Process management item created with piece tracking:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to create process management item:', error);
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('creating', false);
    }
  }

  public async updateItem(id: number, data: ProcessManagementUpdate): Promise<ProcessManagementResponse> {
    try {
      console.log('🔄 Updating process management item with pieces:', id, data);
      this.setLoading('updating', true);
      this.clearError();

      if (data.pieces_used !== undefined && data.pieces_used <= 0) {
        throw new Error('Pieces used must be greater than 0');
      }

      const response = await this.apiCall<ProcessManagementResponse>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.BY_ID(id),
        {
          method: 'PUT',
          body: JSON.stringify(data)
        }
      );

      const index = this.state.items.findIndex(item => item.id === id);
      if (index !== -1) {
        this.state.items[index] = response;
        this.notifyListeners();
      }

      console.log('✅ Process management item updated with piece tracking:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to update process management item:', error);
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('updating', false);
    }
  }

  public async deleteItem(id: number): Promise<void> {
    try {
      console.log('🗑️ Deleting process management item:', id);
      this.setLoading('deleting', true);
      this.clearError();

      await this.apiCall<{ message: string }>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.BY_ID(id),
        {
          method: 'DELETE'
        }
      );

      this.state.items = this.state.items.filter(item => item.id !== id);
      this.notifyListeners();

      console.log('✅ Process management item deleted:', id);
    } catch (error) {
      console.error('❌ Failed to delete process management item:', error);
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('deleting', false);
    }
  }

  // =============================================================================
  // BATCH OPERATIONS
  // =============================================================================

  public async fetchBatches(): Promise<ProcessBatchSummaryResponse[]> {
    try {
      console.log('📦 Fetching process batches...');
      this.setLoading('batches', true);
      this.clearError();

      const batches = await this.apiCall<ProcessBatchSummaryResponse[]>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.BATCHES
      );

      this.state.batches = batches || [];
      this.notifyListeners();
      
      console.log('✅ Process batches fetched:', batches);
      return batches || [];
    } catch (error) {
      console.error('❌ Failed to fetch process batches:', error);
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('batches', false);
    }
  }

  public async fetchBatchDetails(batchNumber: string): Promise<ProcessBatchSummary> {
    try {
      console.log('🔍 Fetching batch details for:', batchNumber);
      this.setLoading('items', true);
      this.clearError();

      const batchDetails = await this.apiCall<ProcessBatchSummary>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.BATCH_DETAILS(batchNumber)
      );

      console.log('✅ Batch details fetched with piece tracking:', batchDetails);
      return batchDetails;
    } catch (error) {
      console.error('❌ Failed to fetch batch details:', error);
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('items', false);
    }
  }

  public async getNextBatchNumber(): Promise<string> {
    try {
      console.log('🔢 Getting next batch number...');
      
      const response = await this.apiCall<NextProcessBatchNumber>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.NEXT_BATCH_NUMBER
      );

      console.log('✅ Next batch number:', response.next_process_batch_number);
      return response.next_process_batch_number;
    } catch (error) {
      console.error('❌ Failed to get next batch number:', error);
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    }
  }

  public async createBatch(data: BatchProcessCreate): Promise<ProcessBatchResponse> {
    try {
      console.log('🚀 Creating process batch with smart allocation:', data);
      this.setLoading('creating', true);
      this.clearError();

      for (const item of data.items) {
        if (item.pieces_to_use <= 0) {
          throw new Error(`Invalid pieces_to_use for stock ${item.stock_id}: must be greater than 0`);
        }
      }

      const response = await this.apiCall<ProcessBatchResponse>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.CREATE_BATCH,
        {
          method: 'POST',
          body: JSON.stringify(data)
        }
      );

      this.state.items.unshift(...response.items);
      this.notifyListeners();

      console.log('✅ Process batch created with smart piece allocation:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to create process batch:', error);
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('creating', false);
    }
  }

  public async deleteBatch(batchNumber: string): Promise<void> {
    try {
      console.log('🗑️ Deleting process batch:', batchNumber);
      this.setLoading('deleting', true);
      this.clearError();

      await this.apiCall<{ message: string }>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.DELETE_BATCH(batchNumber),
        {
          method: 'DELETE'
        }
      );

      this.state.items = this.state.items.filter(
        item => item.process_id_batch !== batchNumber
      );
      this.state.batches = this.state.batches.filter(
        batch => batch.process_batch_number !== batchNumber
      );
      this.notifyListeners();

      console.log('✅ Process batch deleted:', batchNumber);
    } catch (error) {
      console.error('❌ Failed to delete process batch:', error);
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('deleting', false);
    }
  }

  public async archiveBatch(batchNumber: string): Promise<void> {
    try {
      console.log('📥 Archiving process batch:', batchNumber);
      this.setLoading('archiving', true);
      this.clearError();

      await this.apiCall<{ message: string }>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.ARCHIVE_BATCH(batchNumber),
        {
          method: 'PUT'
        }
      );

      this.state.items = this.state.items.map(item => {
        if (item.process_id_batch === batchNumber) {
          return { ...item, archive: !item.archive };
        }
        return item;
      });
      this.notifyListeners();

      console.log('✅ Process batch archived:', batchNumber);
    } catch (error) {
      console.error('❌ Failed to archive process batch:', error);
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('archiving', false);
    }
  }

  public async setBatchArchiveStatus(batchNumber: string, archive: boolean): Promise<void> {
    try {
      console.log('📥 Setting batch archive status:', batchNumber, archive);
      this.setLoading('archiving', true);
      this.clearError();

      const request: ProcessBatchArchiveRequest = { archive };

      await this.apiCall<{
        message: string;
        process_batch_number: string;
        items_updated: number;
        archive_status: boolean;
      }>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.SET_ARCHIVE_BATCH(batchNumber),
        {
          method: 'PUT',
          body: JSON.stringify(request)
        }
      );

      this.state.items = this.state.items.map(item => {
        if (item.process_id_batch === batchNumber) {
          return { ...item, archive };
        }
        return item;
      });
      this.notifyListeners();

      console.log('✅ Batch archive status set:', batchNumber, archive);
    } catch (error) {
      console.error('❌ Failed to set batch archive status:', error);
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('archiving', false);
    }
  }

  // =============================================================================
  // CONSOLIDATION & SMART ALLOCATION
  // =============================================================================

  public async fetchStockGroups(minPieces: number = 1): Promise<StockGroupsResponse> {
    try {
      console.log('📦 Fetching stock groups for consolidation with min pieces:', minPieces);
      this.setLoading('consolidation', true);
      this.clearError();

      const response = await this.apiCall<StockGroupsResponse>(
        `/stocks/groups?min_pieces=${minPieces}`
      );

      this.state.stockGroups = response.groups || [];
      this.notifyListeners();

      console.log('✅ Stock groups fetched:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch stock groups:', error);
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('consolidation', false);
    }
  }

  public async getConsolidationSuggestion(request: SmartAllocationRequest): Promise<ConsolidationSuggestion> {
    try {
      console.log('🧠 Getting consolidation suggestion:', request);
      this.setLoading('consolidation', true);
      this.clearError();

      const suggestion = await this.apiCall<ConsolidationSuggestion>(
        '/stocks/consolidation-suggestion',
        {
          method: 'POST',
          body: JSON.stringify(request)
        }
      );

      this.state.consolidationSuggestion = suggestion;
      this.notifyListeners();

      console.log('✅ Consolidation suggestion received:', suggestion);
      return suggestion;
    } catch (error) {
      console.error('❌ Failed to get consolidation suggestion:', error);
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('consolidation', false);
    }
  }

  // =============================================================================
  // PIECE VALIDATION
  // =============================================================================

  public validateBatchPieces(items: BatchProcessCreate['items']): BatchValidationResult {
    console.log('🔍 Validating batch pieces:', items);

    const validations: PieceValidation[] = [];
    let totalShortage = 0;
    const errors: string[] = [];

    const stockUsage = new Map<number, number>();
    
    for (const item of items) {
      const currentUsage = stockUsage.get(item.stock_id) || 0;
      stockUsage.set(item.stock_id, currentUsage + item.pieces_to_use);
    }

    for (const [stockId, totalPieces] of stockUsage) {
      const stockItem = this.findStockInGroups(stockId);
      
      if (stockItem) {
        const availablePieces = stockItem.pieces;
        const isValid = totalPieces <= availablePieces;
        const shortage = isValid ? 0 : totalPieces - availablePieces;

        validations.push({
          stock_id: stockId,
          available_pieces: availablePieces,
          requested_pieces: totalPieces,
          is_sufficient: isValid,
          shortage
        });

        if (!isValid) {
          totalShortage += shortage;
          errors.push(`Stock ${stockId}: Need ${totalPieces} pieces, only ${availablePieces} available`);
        }
      } else {
        errors.push(`Stock ${stockId}: Not found in available stock groups`);
      }
    }

    const result: BatchValidationResult = {
      is_valid: errors.length === 0,
      total_items: items.length,
      stock_validations: validations,
      total_shortage: totalShortage,
      errors
    };

    console.log('✅ Batch validation result:', result);
    return result;
  }

  private findStockInGroups(stockId: number): { pieces: number } | null {
    for (const group of this.state.stockGroups) {
      const stock = group.stocks.find(s => s.id === stockId);
      if (stock) {
        return { pieces: stock.pieces };
      }
    }
    return null;
  }

  // =============================================================================
  // ANALYTICS
  // =============================================================================

  public calculatePieceAnalytics(): PieceAnalytics | null {
    try {
      const items = this.state.items;
      if (items.length === 0) return null;

      const totalPiecesConsumed = items.reduce((sum, item) => sum + item.pieces_used, 0);
      const averagePiecesPerProcess = totalPiecesConsumed / items.length;

      const stockEfficiency = new Map<number, { total: number; count: number; batch: string }>();
      
      for (const item of items) {
        const current = stockEfficiency.get(item.stock_id) || { total: 0, count: 0, batch: item.stock_batch || 'Unknown' };
        current.total += item.pieces_used;
        current.count += 1;
        stockEfficiency.set(item.stock_id, current);
      }

      let mostEfficientStock = { stock_id: 0, stock_batch: 'None', efficiency_ratio: 0 };
      for (const [stockId, data] of stockEfficiency) {
        const efficiency = data.total / data.count;
        if (efficiency > mostEfficientStock.efficiency_ratio) {
          mostEfficientStock = {
            stock_id: stockId,
            stock_batch: data.batch,
            efficiency_ratio: efficiency
          };
        }
      }

      const productConsumption = new Map<string, { total: number; count: number }>();
      
      for (const item of items) {
        const productName = item.finished_product_name || 'Unknown Product';
        const current = productConsumption.get(productName) || { total: 0, count: 0 };
        current.total += item.pieces_used;
        current.count += 1;
        productConsumption.set(productName, current);
      }

      const pieceConsumptionByProduct = Array.from(productConsumption.entries()).map(([name, data]) => ({
        product_name: name,
        total_pieces: data.total,
        process_count: data.count
      }));

      const analytics: PieceAnalytics = {
        total_pieces_consumed: totalPiecesConsumed,
        average_pieces_per_process: Math.round(averagePiecesPerProcess * 100) / 100,
        most_efficient_stock: mostEfficientStock,
        piece_consumption_by_product: pieceConsumptionByProduct
      };

      this.state.analytics = analytics;
      this.notifyListeners();

      console.log('📊 Piece analytics calculated:', analytics);
      return analytics;
    } catch (error) {
      console.error('❌ Error calculating piece analytics:', error);
      return null;
    }
  }

  // =============================================================================
  // STATISTICS
  // =============================================================================

  public async fetchStats(): Promise<ProcessManagementStats> {
    try {
      console.log('📊 Fetching process management stats...');
      this.setLoading('stats', true);
      this.clearError();

      const stats = await this.apiCall<ProcessManagementStats>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.STATS
      );

      this.state.stats = stats;
      this.notifyListeners();
      
      console.log('✅ Process management stats fetched:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Failed to fetch process management stats:', error);
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('stats', false);
    }
  }

  // =============================================================================
  // FILTER MANAGEMENT
  // =============================================================================

  public setFilters(filters: Partial<ProcessManagementFilters>): void {
    console.log('🔍 Setting enhanced filters:', filters);
    this.state.filters = { ...this.state.filters, ...filters };
    this.notifyListeners();
  }

  public clearFilters(): void {
    console.log('🔍 Clearing filters');
    this.state.filters = {};
    this.notifyListeners();
  }

  public async applyFilters(filters: ProcessManagementFilters): Promise<void> {
    console.log('🔍 Applying enhanced filters:', filters);
    this.setFilters(filters);
    await this.fetchItems();
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  public async refreshData(): Promise<void> {
    try {
      console.log('🔄 Refreshing all process management data with enhanced features...');
      await Promise.all([
        this.fetchItems(),
        this.fetchBatches(),
        this.fetchStats(),
        this.fetchStockGroups()
      ]);
      
      this.calculatePieceAnalytics();
      
      console.log('✅ All process management data refreshed');
    } catch (error) {
      console.error('❌ Error refreshing process management data:', error);
    }
  }

  public clearData(): void {
    console.log('🧹 Clearing all process management data');
    this.state = {
      items: [],
      batches: [],
      stats: null,
      stockGroups: [],
      consolidationSuggestion: null,
      analytics: null,
      loading: {
        items: false,
        stats: false,
        batches: false,
        creating: false,
        updating: false,
        deleting: false,
        archiving: false,
        validating: false,
        consolidation: false,
      },
      error: null,
      filters: {}
    };
    this.notifyListeners();
  }

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================

  private handleError(error: unknown): ProcessManagementError {
    console.log('🔍 Handling error:', error);
    
    const httpStatus = this.getHttpStatus();
    const errorMessages = this.getErrorMessages();
    
    if (error instanceof APIError) {
      if (error.message.toLowerCase().includes('pieces') || 
          error.message.toLowerCase().includes('insufficient') ||
          error.message.toLowerCase().includes('exceed')) {
        return {
          code: 'INSUFFICIENT_PIECES',
          message: error.message,
          details: { status: error.status_code }
        };
      }

      switch (error.status_code) {
        case httpStatus.UNAUTHORIZED:
          return {
            code: 'UNAUTHORIZED',
            message: errorMessages.UNAUTHORIZED,
            details: { status: error.status_code }
          };
        case httpStatus.FORBIDDEN:
          return {
            code: 'FORBIDDEN',
            message: errorMessages.INSUFFICIENT_PERMISSIONS,
            details: { status: error.status_code }
          };
        case httpStatus.NOT_FOUND:
          return {
            code: 'NOT_FOUND',
            message: 'Process management endpoint not found. Please check API configuration.',
            details: { status: error.status_code }
          };
        case httpStatus.CONFLICT:
          return {
            code: 'CONFLICT',
            message: 'Process management conflict occurred',
            details: { status: error.status_code }
          };
        case httpStatus.UNPROCESSABLE_ENTITY:
          return {
            code: 'VALIDATION_ERROR',
            message: errorMessages.VALIDATION_ERROR,
            details: { status: error.status_code }
          };
        case httpStatus.SERVICE_UNAVAILABLE:
          return {
            code: 'SERVICE_UNAVAILABLE',
            message: errorMessages.SERVER_ERROR,
            details: { status: error.status_code }
          };
        default:
          return {
            code: 'API_ERROR',
            message: error.message || errorMessages.SERVER_ERROR,
            details: { status: error.status_code }
          };
      }
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed. Please check if the API server is running and accessible.',
        details: { originalError: error.message }
      };
    }

    if (error instanceof Error) {
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message,
        details: { originalError: error.message }
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: errorMessages.UNKNOWN_ERROR,
      details: { originalError: String(error) }
    };
  }

  // =============================================================================
  // QUALITY CONTROL OPERATIONS
  // =============================================================================

  public async updateQualityControl(processId: number, data: QualityControlUpdate): Promise<ProcessManagementResponse> {
    try {
      console.log('🔄 Updating quality control for process:', processId, data);
      this.setLoading('updating', true);
      this.clearError();

      if (data.good !== undefined && data.good !== null && data.good < 0) {
        throw new Error('Good count cannot be negative');
      }
      if (data.defect !== undefined && data.defect !== null && data.defect < 0) {
        throw new Error('Defect count cannot be negative');
      }
      if (data.price_output !== undefined && data.price_output !== null && data.price_output < 0) {
        throw new Error('Output price cannot be negative');
      }

      const response = await this.apiCall<ProcessManagementResponse>(
        `/process-management/${processId}/quality-control`,
        {
          method: 'PUT',
          body: JSON.stringify(data)
        }
      );

      // Update the item in state
      const index = this.state.items.findIndex(item => item.id === processId);
      if (index !== -1) {
        this.state.items[index] = response;
        this.notifyListeners();
      }

      console.log('✅ Quality control updated:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to update quality control:', error);
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('updating', false);
    }
  }

  public async updateBatchQualityControl(batchNumber: string, data: BatchQualityControlUpdate): Promise<{ message: string; batch_number: string; items_updated: number; quality_data: QualityControlUpdate }> {
    try {
      console.log('🔄 Updating batch quality control:', batchNumber, data);
      this.setLoading('updating', true);
      this.clearError();

      if (data.good !== undefined && data.good !== null && data.good < 0) {
        throw new Error('Good count cannot be negative');
      }
      if (data.defect !== undefined && data.defect !== null && data.defect < 0) {
        throw new Error('Defect count cannot be negative');
      }
      if (data.price_output !== undefined && data.price_output !== null && data.price_output < 0) {
        throw new Error('Output price cannot be negative');
      }

      const response = await this.apiCall<{ message: string; batch_number: string; items_updated: number; quality_data: QualityControlUpdate }>(
        `/process-management/batches/${batchNumber}/quality-control`,
        {
          method: 'PUT',
          body: JSON.stringify(data)
        }
      );

      // Update all items in this batch in state
      this.state.items = this.state.items.map(item => {
        if (item.process_id_batch === batchNumber) {
          return {
            ...item,
            good: data.good !== undefined ? data.good : item.good,
            defect: data.defect !== undefined ? data.defect : item.defect,
            price_output: data.price_output !== undefined ? data.price_output : item.price_output
          };
        }
        return item;
      });
      this.notifyListeners();

      console.log('✅ Batch quality control updated:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to update batch quality control:', error);
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('updating', false);
    }
  }

  public async getQualityControl(processId: number): Promise<QualityControlResponse> {
    try {
      console.log('🔍 Getting quality control for process:', processId);
      this.setLoading('items', true);
      this.clearError();

      const response = await this.apiCall<QualityControlResponse>(
        `/process-management/${processId}/quality-control`
      );

      console.log('✅ Quality control data retrieved:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to get quality control:', error);
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('items', false);
    }
  }

  public async completeQualityControl(processId: number, data: QualityControlUpdate): Promise<ProcessManagementResponse> {
    try {
      console.log('🎯 Completing quality control for process:', processId, data);
      this.setLoading('updating', true);
      this.clearError();

      const response = await this.apiCall<ProcessManagementResponse>(
        `/process-management/${processId}/complete-quality-control`,
        {
          method: 'POST',
          body: JSON.stringify(data)
        }
      );

      // Update the item in state
      const index = this.state.items.findIndex(item => item.id === processId);
      if (index !== -1) {
        this.state.items[index] = response;
        this.notifyListeners();
      }

      console.log('✅ Quality control completed:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to complete quality control:', error);
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('updating', false);
    }
  }

  // =============================================================================
  // PERMISSION & MESSAGE HELPERS
  // =============================================================================

  public hasPermission(action: 'create' | 'update' | 'delete' | 'archive' | 'consolidate'): boolean {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    return !!token;
  }

  public getErrorMessage(error?: ProcessManagementError | null): string {
    const currentError = error || this.state.error;
    if (!currentError) return '';

    const errorMessages = this.getErrorMessages();

    switch (currentError.code) {
      case 'UNAUTHORIZED':
        return errorMessages.UNAUTHORIZED;
      case 'FORBIDDEN':
        return errorMessages.INSUFFICIENT_PERMISSIONS;
      case 'NOT_FOUND':
        return 'Process management endpoint not found';
      case 'VALIDATION_ERROR':
        return errorMessages.VALIDATION_ERROR;
      case 'NETWORK_ERROR':
        return 'Network connection failed. Please check your internet connection.';
      case 'INSUFFICIENT_PIECES':
        return errorMessages.INSUFFICIENT_PIECES;
      case 'STOCK_DEPLETED':
        return errorMessages.STOCK_DEPLETED;
      case 'PIECE_VALIDATION_FAILED':
        return errorMessages.PIECE_VALIDATION_FAILED;
      default:
        return currentError.message || errorMessages.UNKNOWN_ERROR;
    }
  }

  public getSuccessMessage(action: string): string {
    const successMessages = this.getSuccessMessages();
    
    switch (action) {
      case 'create':
        return successMessages.PROCESS_CREATED;
      case 'update':
        return successMessages.PROCESS_UPDATED;
      case 'delete':
        return successMessages.PROCESS_DELETED;
      case 'batch_create':
        return successMessages.PROCESS_BATCH_CREATED;
      case 'batch_delete':
        return successMessages.PROCESS_BATCH_DELETED;
      case 'batch_archive':
        return successMessages.PROCESS_BATCH_ARCHIVED;
      case 'batch_unarchive':
        return successMessages.PROCESS_BATCH_UNARCHIVED;
      case 'consolidate':
        return successMessages.CONSOLIDATION_COMPLETE;
      case 'allocate':
        return successMessages.PIECES_ALLOCATED;
      default:
        return successMessages.ACTION_COMPLETED;
    }
  }
}

// Export singleton instance
export const processManagementService = new ProcessManagementService();
export default processManagementService;