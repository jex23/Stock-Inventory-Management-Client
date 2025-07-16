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
  ProcessManagementLoadingState
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
  loading: ProcessManagementLoadingState;
  error: ProcessManagementError | null;
  filters: ProcessManagementFilters;
}

class ProcessManagementService {
  private state: ProcessManagementState = {
    items: [],
    batches: [],
    stats: null,
    loading: {
      items: false,
      stats: false,
      batches: false,
      creating: false,
      updating: false,
      deleting: false,
      archiving: false,
    },
    error: null,
    filters: {}
  };

  private listeners: Set<(state: ProcessManagementState) => void> = new Set();

  constructor() {
    // Initialize service
  }

  // Event listener management
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

  public clearError(): void {
    this.state.error = null;
    this.notifyListeners();
  }

  // Getters
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

  public getLoading(): ProcessManagementLoadingState {
    return { ...this.state.loading };
  }

  public getError(): ProcessManagementError | null {
    return this.state.error ? { ...this.state.error } : null;
  }

  public getFilters(): ProcessManagementFilters {
    return { ...this.state.filters };
  }

  // HTTP Client with auth headers
  private async apiCall<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    const defaultHeaders = ApiUtils.getAuthHeaders();

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

  // =============================================================================
  // PROCESS MANAGEMENT CRUD OPERATIONS
  // =============================================================================

  public async fetchItems(filters?: ProcessManagementFilters): Promise<ProcessManagementResponse[]> {
    try {
      this.setLoading('items', true);
      this.clearError();

      // Update filters if provided
      if (filters) {
        this.state.filters = { ...this.state.filters, ...filters };
      }

      // Build query parameters
      const queryParams: ProcessManagementQuery = {};
      if (this.state.filters.archive !== undefined) {
        queryParams.archive = this.state.filters.archive;
      }

      const endpoint = ApiUtils.buildUrl(API_ENDPOINTS.PROCESS_MANAGEMENT.BASE, queryParams);
      const items = await this.apiCall<ProcessManagementResponse[]>(endpoint);

      this.state.items = items;
      this.notifyListeners();
      return items;
    } catch (error) {
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('items', false);
    }
  }

  public async createItem(data: ProcessManagementCreate): Promise<ProcessManagementResponse> {
    try {
      this.setLoading('creating', true);
      this.clearError();

      const response = await this.apiCall<ProcessManagementResponse>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.BASE,
        {
          method: 'POST',
          body: JSON.stringify(data)
        }
      );

      // Add to local state
      this.state.items.unshift(response);
      this.notifyListeners();

      return response;
    } catch (error) {
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('creating', false);
    }
  }

  public async updateItem(id: number, data: ProcessManagementUpdate): Promise<ProcessManagementResponse> {
    try {
      this.setLoading('updating', true);
      this.clearError();

      const response = await this.apiCall<ProcessManagementResponse>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.BY_ID(id),
        {
          method: 'PUT',
          body: JSON.stringify(data)
        }
      );

      // Update local state
      const index = this.state.items.findIndex(item => item.id === id);
      if (index !== -1) {
        this.state.items[index] = response;
        this.notifyListeners();
      }

      return response;
    } catch (error) {
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('updating', false);
    }
  }

  public async deleteItem(id: number): Promise<void> {
    try {
      this.setLoading('deleting', true);
      this.clearError();

      await this.apiCall<{ message: string }>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.BY_ID(id),
        {
          method: 'DELETE'
        }
      );

      // Remove from local state
      this.state.items = this.state.items.filter(item => item.id !== id);
      this.notifyListeners();
    } catch (error) {
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
      this.setLoading('batches', true);
      this.clearError();

      const batches = await this.apiCall<ProcessBatchSummaryResponse[]>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.BATCHES
      );

      this.state.batches = batches;
      this.notifyListeners();
      return batches;
    } catch (error) {
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('batches', false);
    }
  }

  public async fetchBatchDetails(batchNumber: string): Promise<ProcessBatchSummary> {
    try {
      this.setLoading('items', true);
      this.clearError();

      const batchDetails = await this.apiCall<ProcessBatchSummary>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.BATCH_DETAILS(batchNumber)
      );

      return batchDetails;
    } catch (error) {
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('items', false);
    }
  }

  public async getNextBatchNumber(): Promise<string> {
    try {
      const response = await this.apiCall<NextProcessBatchNumber>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.NEXT_BATCH_NUMBER
      );

      return response.next_process_batch_number;
    } catch (error) {
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    }
  }

  public async createBatch(data: BatchProcessCreate): Promise<ProcessBatchResponse> {
    try {
      this.setLoading('creating', true);
      this.clearError();

      const response = await this.apiCall<ProcessBatchResponse>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.CREATE_BATCH,
        {
          method: 'POST',
          body: JSON.stringify(data)
        }
      );

      // Add items to local state
      this.state.items.unshift(...response.items);
      this.notifyListeners();

      return response;
    } catch (error) {
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('creating', false);
    }
  }

  public async deleteBatch(batchNumber: string): Promise<void> {
    try {
      this.setLoading('deleting', true);
      this.clearError();

      await this.apiCall<{ message: string }>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.DELETE_BATCH(batchNumber),
        {
          method: 'DELETE'
        }
      );

      // Remove batch items from local state
      this.state.items = this.state.items.filter(
        item => item.process_id_batch !== batchNumber
      );
      this.state.batches = this.state.batches.filter(
        batch => batch.process_batch_number !== batchNumber
      );
      this.notifyListeners();
    } catch (error) {
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('deleting', false);
    }
  }

  public async archiveBatch(batchNumber: string): Promise<void> {
    try {
      this.setLoading('archiving', true);
      this.clearError();

      await this.apiCall<{ message: string }>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.ARCHIVE_BATCH(batchNumber),
        {
          method: 'PUT'
        }
      );

      // Toggle archive status for batch items in local state
      this.state.items = this.state.items.map(item => {
        if (item.process_id_batch === batchNumber) {
          return { ...item, archive: !item.archive };
        }
        return item;
      });
      this.notifyListeners();
    } catch (error) {
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('archiving', false);
    }
  }

  public async setBatchArchiveStatus(batchNumber: string, archive: boolean): Promise<void> {
    try {
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

      // Update archive status for batch items in local state
      this.state.items = this.state.items.map(item => {
        if (item.process_id_batch === batchNumber) {
          return { ...item, archive };
        }
        return item;
      });
      this.notifyListeners();
    } catch (error) {
      const processError = this.handleError(error);
      this.setError(processError);
      throw new Error(processError.message);
    } finally {
      this.setLoading('archiving', false);
    }
  }

  // =============================================================================
  // STATISTICS
  // =============================================================================

  public async fetchStats(): Promise<ProcessManagementStats> {
    try {
      this.setLoading('stats', true);
      this.clearError();

      const stats = await this.apiCall<ProcessManagementStats>(
        API_ENDPOINTS.PROCESS_MANAGEMENT.STATS
      );

      this.state.stats = stats;
      this.notifyListeners();
      return stats;
    } catch (error) {
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
    this.state.filters = { ...this.state.filters, ...filters };
    this.notifyListeners();
  }

  public clearFilters(): void {
    this.state.filters = {};
    this.notifyListeners();
  }

  public async applyFilters(filters: ProcessManagementFilters): Promise<void> {
    this.setFilters(filters);
    await this.fetchItems();
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  public async refreshData(): Promise<void> {
    try {
      await Promise.all([
        this.fetchItems(),
        this.fetchBatches(),
        this.fetchStats()
      ]);
    } catch (error) {
      // Individual errors are already handled by each method
      console.error('Error refreshing process management data:', error);
    }
  }

  public clearData(): void {
    this.state = {
      items: [],
      batches: [],
      stats: null,
      loading: {
        items: false,
        stats: false,
        batches: false,
        creating: false,
        updating: false,
        deleting: false,
        archiving: false,
      },
      error: null,
      filters: {}
    };
    this.notifyListeners();
  }

  // Handle process management errors
  private handleError(error: unknown): ProcessManagementError {
    if (error instanceof APIError) {
      switch (error.status_code) {
        case HTTP_STATUS.UNAUTHORIZED:
          return {
            code: 'UNAUTHORIZED',
            message: ERROR_MESSAGES.UNAUTHORIZED
          };
        case HTTP_STATUS.FORBIDDEN:
          return {
            code: 'FORBIDDEN',
            message: ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS
          };
        case HTTP_STATUS.NOT_FOUND:
          return {
            code: 'NOT_FOUND',
            message: ERROR_MESSAGES.PROCESS_NOT_FOUND
          };
        case HTTP_STATUS.CONFLICT:
          return {
            code: 'CONFLICT',
            message: 'Process management conflict occurred'
          };
        case HTTP_STATUS.UNPROCESSABLE_ENTITY:
          return {
            code: 'VALIDATION_ERROR',
            message: ERROR_MESSAGES.VALIDATION_ERROR
          };
        case HTTP_STATUS.SERVICE_UNAVAILABLE:
          return {
            code: 'SERVICE_UNAVAILABLE',
            message: ERROR_MESSAGES.SERVER_ERROR
          };
        default:
          return {
            code: 'API_ERROR',
            message: error.message || ERROR_MESSAGES.SERVER_ERROR
          };
      }
    }

    if (error instanceof Error) {
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: ERROR_MESSAGES.UNKNOWN_ERROR
    };
  }

  // Check if user has permission to perform action
  public hasPermission(action: 'create' | 'update' | 'delete' | 'archive'): boolean {
    // This could be enhanced with actual role-based permissions
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    return !!token; // Basic check - user is authenticated
  }

  // Get formatted error message for UI
  public getErrorMessage(error?: ProcessManagementError | null): string {
    const currentError = error || this.state.error;
    if (!currentError) return '';

    switch (currentError.code) {
      case 'UNAUTHORIZED':
        return ERROR_MESSAGES.UNAUTHORIZED;
      case 'FORBIDDEN':
        return ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS;
      case 'NOT_FOUND':
        return ERROR_MESSAGES.PROCESS_NOT_FOUND;
      case 'VALIDATION_ERROR':
        return ERROR_MESSAGES.VALIDATION_ERROR;
      default:
        return currentError.message || ERROR_MESSAGES.UNKNOWN_ERROR;
    }
  }

  // Get success message for UI
  public getSuccessMessage(action: string): string {
    switch (action) {
      case 'create':
        return SUCCESS_MESSAGES.PROCESS_CREATED;
      case 'update':
        return SUCCESS_MESSAGES.PROCESS_UPDATED;
      case 'delete':
        return SUCCESS_MESSAGES.PROCESS_DELETED;
      case 'batch_create':
        return SUCCESS_MESSAGES.PROCESS_BATCH_CREATED;
      case 'batch_delete':
        return SUCCESS_MESSAGES.PROCESS_BATCH_DELETED;
      case 'batch_archive':
        return SUCCESS_MESSAGES.PROCESS_BATCH_ARCHIVED;
      case 'batch_unarchive':
        return SUCCESS_MESSAGES.PROCESS_BATCH_UNARCHIVED;
      default:
        return SUCCESS_MESSAGES.ACTION_COMPLETED;
    }
  }
}

// Export singleton instance
export const processManagementService = new ProcessManagementService();
export default processManagementService;