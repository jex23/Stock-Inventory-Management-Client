import { 
  API_CONFIG, 
  HTTP_METHODS, 
  HTTP_STATUS, 
  STORAGE_KEYS,
  AUTH_CONFIG,
  ERROR_MESSAGES 
} from '../constants/api';

import { stockService } from './stockService';
import { processManagementService } from './processManagementService';

import type {
  BatchInfo,
  BatchSummary,
  BatchArchiveResponse,
  BatchOperationResult
} from '../types/stock';

import type {
  ProcessBatchSummaryResponse,
  ProcessManagementResponse,
  ProcessBatchArchiveRequest
} from '../types/processManagement';

// Import archive-specific types from separate file
import type {
  ArchiveStats,
  ArchiveFilter,
  ArchiveBatchItem,
  ArchiveBulkOperation,
  ArchiveBulkResult,
  ArchiveStatus,
  ArchiveType,
  ArchiveOperation
} from '../types/archive';

// Cache interface
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // milliseconds
}

interface ArchiveCache {
  stats?: CacheItem<ArchiveStats>;
  stockBatches?: CacheItem<BatchInfo[]>;
  processBatches?: CacheItem<any[]>;
  archivedBatches?: CacheItem<ArchiveBatchItem[]>;
  processBatchDetails?: Map<string, CacheItem<any>>;
}

class ArchiveService {
  private baseURL: string;
  private defaultHeaders: HeadersInit;
  private cache: ArchiveCache = {
    processBatchDetails: new Map()
  };
  
  // Cache durations (in milliseconds)
  private readonly CACHE_DURATIONS = {
    STATS: 5 * 60 * 1000, // 5 minutes
    BATCHES: 3 * 60 * 1000, // 3 minutes
    BATCH_DETAILS: 10 * 60 * 1000, // 10 minutes
    ARCHIVED_BATCHES: 2 * 60 * 1000 // 2 minutes
  };

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.defaultHeaders = {
      ...API_CONFIG.HEADERS,
    };
    console.log('🗄️ ArchiveService initialized with caching');
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const headers = {
      ...this.defaultHeaders,
      ...(token && { [AUTH_CONFIG.TOKEN_HEADER]: `${AUTH_CONFIG.TOKEN_PREFIX} ${token}` })
    };
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage: string;
      
      switch (response.status) {
        case HTTP_STATUS.UNAUTHORIZED:
          errorMessage = ERROR_MESSAGES.UNAUTHORIZED;
          break;
        case HTTP_STATUS.FORBIDDEN:
          errorMessage = ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS;
          break;
        case HTTP_STATUS.NOT_FOUND:
          errorMessage = 'Archive not found';
          break;
        default:
          errorMessage = ERROR_MESSAGES.SERVER_ERROR;
      }
      
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text() as unknown as T;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
    };

    console.log('🌐 Archive API Request:', options.method || 'GET', url);

    try {
      const response = await fetch(url, config);
      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('❌ Archive API Request failed:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
    }
  }

  // =============================================================================
  // CACHE MANAGEMENT
  // =============================================================================

  private isCacheValid<T>(cacheItem?: CacheItem<T>): cacheItem is CacheItem<T> {
    if (!cacheItem) return false;
    const now = Date.now();
    return now - cacheItem.timestamp < cacheItem.expiresIn;
  }

  private setCacheItem<T>(key: keyof ArchiveCache, data: T, expiresIn: number): void {
    if (key === 'processBatchDetails') return; // Handle Map separately
    
    (this.cache as any)[key] = {
      data,
      timestamp: Date.now(),
      expiresIn
    };
    console.log(`📦 Cached ${key} for ${expiresIn / 1000}s`);
  }

  private getCacheItem<T>(key: keyof ArchiveCache): T | null {
    if (key === 'processBatchDetails') return null; // Handle Map separately
    
    const item = (this.cache as any)[key] as CacheItem<T> | undefined;
    if (this.isCacheValid(item)) {
      console.log(`✅ Cache hit for ${key}`);
      return item!.data;
    }
    console.log(`❌ Cache miss for ${key}`);
    return null;
  }

  private invalidateCache(keys?: (keyof ArchiveCache)[]): void {
    if (keys) {
      keys.forEach(key => {
        if (key === 'processBatchDetails') {
          this.cache.processBatchDetails?.clear();
        } else {
          delete (this.cache as any)[key];
        }
      });
      console.log(`🧹 Invalidated cache keys: ${keys.join(', ')}`);
    } else {
      this.cache = { processBatchDetails: new Map() };
      console.log('🧹 Cleared all cache');
    }
  }

  // =============================================================================
  // OPTIMIZED DATA LOADING
  // =============================================================================

  async getArchiveStats(useCache: boolean = true): Promise<ArchiveStats> {
    console.log('📊 Getting archive statistics...');
    
    // Check cache first
    if (useCache) {
      const cachedStats = this.getCacheItem<ArchiveStats>('stats');
      if (cachedStats) return cachedStats;
    }
    
    try {
      // Use Promise.allSettled to handle partial failures gracefully
      const results = await Promise.allSettled([
        this.getStockBatchesData(),
        this.getProcessBatchesData()
      ]);

      const stockData = results[0].status === 'fulfilled' ? results[0].value : { batches: [], stats: null };
      const processData = results[1].status === 'fulfilled' ? results[1].value : { batches: [], stats: null };

      // Calculate statistics
      const stockBatchStats = {
        total: stockData.batches.length,
        archived: stockData.batches.filter(b => b.is_archived).length,
        active: stockData.batches.filter(b => !b.is_archived && b.archived_items === 0).length,
        partial: stockData.batches.filter(b => !b.is_archived && b.archived_items > 0).length
      };

      const processBatchStats = {
        total: processData.batches.length,
        archived: 0, // Will be calculated dynamically
        active: processData.batches.length
      };

      const itemStats = {
        total_stock_items: stockData.stats?.total_stocks || 0,
        archived_stock_items: stockData.stats?.archived_stocks || 0,
        total_process_items: processData.stats?.total_processes || 0,
        archived_process_items: processData.stats?.archived_processes || 0
      };

      const stats: ArchiveStats = {
        stock_batches: stockBatchStats,
        process_batches: processBatchStats,
        items: itemStats
      };

      // Cache the result
      this.setCacheItem('stats', stats, this.CACHE_DURATIONS.STATS);
      
      console.log('✅ Archive stats calculated and cached:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Failed to get archive stats:', error);
      // Return default stats
      return {
        stock_batches: { total: 0, archived: 0, active: 0, partial: 0 },
        process_batches: { total: 0, archived: 0, active: 0 },
        items: { total_stock_items: 0, archived_stock_items: 0, total_process_items: 0, archived_process_items: 0 }
      };
    }
  }

  private async getStockBatchesData() {
    const cachedBatches = this.getCacheItem<BatchInfo[]>('stockBatches');
    if (cachedBatches) {
      const stats = await stockService.getStockStats().catch(() => null);
      return { batches: cachedBatches, stats };
    }

    const [batches, stats] = await Promise.all([
      stockService.getAllBatches(),
      stockService.getStockStats().catch(() => null)
    ]);

    this.setCacheItem('stockBatches', batches, this.CACHE_DURATIONS.BATCHES);
    return { batches, stats };
  }

  private async getProcessBatchesData() {
    const cachedBatches = this.getCacheItem<any[]>('processBatches');
    if (cachedBatches) {
      const stats = await processManagementService.fetchStats().catch(() => null);
      return { batches: cachedBatches, stats };
    }

    const [batches, stats] = await Promise.all([
      processManagementService.fetchBatches(),
      processManagementService.fetchStats().catch(() => null)
    ]);

    this.setCacheItem('processBatches', batches, this.CACHE_DURATIONS.BATCHES);
    return { batches, stats };
  }

  // =============================================================================
  // OPTIMIZED ARCHIVE DATA
  // =============================================================================

  async getAllArchivedBatches(filters?: ArchiveFilter, useCache: boolean = true): Promise<ArchiveBatchItem[]> {
    console.log('🗄️ Getting all archived batches with filters:', filters);

    // Check cache for unfiltered data
    if (useCache && !filters) {
      const cachedBatches = this.getCacheItem<ArchiveBatchItem[]>('archivedBatches');
      if (cachedBatches) return cachedBatches;
    }

    try {
      const allBatches: ArchiveBatchItem[] = [];

      // Get data in parallel
      const [stockData, processData] = await Promise.allSettled([
        this.getStockBatchesData(),
        this.getProcessBatchesData()
      ]);

      // Process stock batches
      if ((!filters?.type || filters.type === 'all' || filters.type === 'stock') && 
          stockData.status === 'fulfilled') {
        for (const batch of stockData.value.batches) {
          const status = this.getBatchStatus(batch.archived_items, batch.total_items);
          
          if (filters?.status && filters.status !== 'all' && filters.status !== status) {
            continue;
          }

          allBatches.push({
            id: `stock-${batch.batch_number}`,
            batch_number: batch.batch_number,
            type: 'stock',
            total_items: batch.total_items,
            archived_items: batch.archived_items,
            is_archived: batch.is_archived,
            archive_percentage: Math.round((batch.archived_items / batch.total_items) * 100),
            created_at: batch.created_at,
            user_name: batch.user_name,
            status,
            total_quantity: batch.total_product_quantity,
            categories: batch.categories
          });
        }
      }

      // Process process batches (with optimized detail fetching)
      if ((!filters?.type || filters.type === 'all' || filters.type === 'process') && 
          processData.status === 'fulfilled') {
        
        // Fetch batch details in parallel with limited concurrency
        const batchDetailPromises = processData.value.batches.map(batch => 
          this.getProcessBatchArchiveStatusOptimized(batch.process_batch_number)
        );
        
        const batchDetails = await Promise.allSettled(batchDetailPromises);
        
        for (let i = 0; i < processData.value.batches.length; i++) {
          const batch = processData.value.batches[i];
          const detailResult = batchDetails[i];
          
          if (detailResult.status === 'rejected') continue;
          
          const details = detailResult.value;
          const status = this.getBatchStatus(details.archived_items, details.total_items);
          
          if (filters?.status && filters.status !== 'all' && filters.status !== status) {
            continue;
          }

          allBatches.push({
            id: `process-${batch.process_batch_number}`,
            batch_number: batch.process_batch_number,
            type: 'process',
            total_items: batch.total_items,
            archived_items: details.archived_items,
            is_archived: details.is_archived,
            archive_percentage: details.archive_percentage,
            created_at: batch.manufactured_date,
            user_name: batch.user_name,
            status,
            finished_product_name: batch.finished_product_name || 'N/A'
          });
        }
      }

      // Apply filters
      const filteredBatches = this.applyFilters(allBatches, filters);

      // Cache unfiltered results
      if (!filters) {
        this.setCacheItem('archivedBatches', allBatches, this.CACHE_DURATIONS.ARCHIVED_BATCHES);
      }

      console.log(`✅ Retrieved ${filteredBatches.length} archived batches`);
      return filteredBatches;
    } catch (error) {
      console.error('❌ Failed to get archived batches:', error);
      return [];
    }
  }

  private applyFilters(batches: ArchiveBatchItem[], filters?: ArchiveFilter): ArchiveBatchItem[] {
    let filteredBatches = [...batches];

    // Apply search filter
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredBatches = filteredBatches.filter(batch =>
        batch.batch_number.toLowerCase().includes(searchTerm) ||
        batch.user_name.toLowerCase().includes(searchTerm)
      );
    }

    // Apply date filters
    if (filters?.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filteredBatches = filteredBatches.filter(batch => 
        new Date(batch.created_at) >= fromDate
      );
    }

    if (filters?.dateTo) {
      const toDate = new Date(filters.dateTo);
      filteredBatches = filteredBatches.filter(batch => 
        new Date(batch.created_at) <= toDate
      );
    }

    // Apply sorting
    if (filters?.sortBy) {
      filteredBatches.sort((a, b) => {
        let comparison = 0;
        
        switch (filters.sortBy) {
          case 'date':
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
          case 'name':
            comparison = a.batch_number.localeCompare(b.batch_number);
            break;
          case 'items':
            comparison = a.total_items - b.total_items;
            break;
          case 'status':
            comparison = a.archive_percentage - b.archive_percentage;
            break;
        }
        
        return filters.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return filteredBatches;
  }

  // =============================================================================
  // ARCHIVE OPERATIONS (with cache invalidation)
  // =============================================================================

  async archiveStockBatch(batchNumber: string, archive: boolean): Promise<BatchOperationResult> {
    console.log(`🗄️ ${archive ? 'Archiving' : 'Unarchiving'} stock batch:`, batchNumber);
    
    try {
      const response = await stockService.setBatchArchiveStatus(batchNumber, archive);
      
      // Invalidate relevant cache
      this.invalidateCache(['stats', 'stockBatches', 'archivedBatches']);
      
      return {
        success: true,
        message: response.message,
        batch_number: batchNumber,
        items_affected: response.items_updated,
        new_status: archive
      };
    } catch (error) {
      console.error(`❌ Failed to ${archive ? 'archive' : 'unarchive'} stock batch:`, error);
      return {
        success: false,
        message: `Failed to ${archive ? 'archive' : 'unarchive'} batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        batch_number: batchNumber,
        items_affected: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async archiveProcessBatch(batchNumber: string, archive: boolean): Promise<BatchOperationResult> {
    console.log(`🗄️ ${archive ? 'Archiving' : 'Unarchiving'} process batch:`, batchNumber);
    
    try {
      await processManagementService.setBatchArchiveStatus(batchNumber, archive);
      
      // Invalidate relevant cache
      this.invalidateCache(['stats', 'processBatches', 'archivedBatches']);
      this.cache.processBatchDetails?.delete(batchNumber);
      
      return {
        success: true,
        message: `Process batch ${archive ? 'archived' : 'unarchived'} successfully`,
        batch_number: batchNumber,
        items_affected: 1,
        new_status: archive
      };
    } catch (error) {
      console.error(`❌ Failed to ${archive ? 'archive' : 'unarchive'} process batch:`, error);
      return {
        success: false,
        message: `Failed to ${archive ? 'archive' : 'unarchive'} batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        batch_number: batchNumber,
        items_affected: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteBatch(batchNumber: string, type: 'stock' | 'process'): Promise<BatchOperationResult> {
    console.log(`🗑️ Deleting ${type} batch:`, batchNumber);
    
    try {
      if (type === 'stock') {
        await stockService.deleteBatch(batchNumber);
      } else {
        await processManagementService.deleteBatch(batchNumber);
      }
      
      // Invalidate all cache since deletion affects counts
      this.invalidateCache();
      
      return {
        success: true,
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} batch deleted successfully`,
        batch_number: batchNumber,
        items_affected: 1
      };
    } catch (error) {
      console.error(`❌ Failed to delete ${type} batch:`, error);
      return {
        success: false,
        message: `Failed to delete batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        batch_number: batchNumber,
        items_affected: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =============================================================================
  // BULK OPERATIONS
  // =============================================================================

  async performBulkOperation(operation: ArchiveBulkOperation): Promise<ArchiveBulkResult> {
    console.log('🔄 Performing bulk archive operation:', operation);
    
    const results: BatchOperationResult[] = [];
    const errors: string[] = [];
    let successfulOperations = 0;

    for (const batchNumber of operation.batch_numbers) {
      try {
        let result: BatchOperationResult;

        switch (operation.operation) {
          case 'archive':
            result = operation.type === 'stock' 
              ? await this.archiveStockBatch(batchNumber, true)
              : await this.archiveProcessBatch(batchNumber, true);
            break;
          case 'unarchive':
            result = operation.type === 'stock'
              ? await this.archiveStockBatch(batchNumber, false)
              : await this.archiveProcessBatch(batchNumber, false);
            break;
          case 'delete':
            result = await this.deleteBatch(batchNumber, operation.type);
            break;
          default:
            throw new Error(`Unknown operation: ${operation.operation}`);
        }

        results.push(result);
        if (result.success) {
          successfulOperations++;
        } else {
          errors.push(`${batchNumber}: ${result.message}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${batchNumber}: ${errorMessage}`);
        results.push({
          success: false,
          message: errorMessage,
          batch_number: batchNumber,
          items_affected: 0,
          error: errorMessage
        });
      }
    }

    const bulkResult: ArchiveBulkResult = {
      success: successfulOperations === operation.batch_numbers.length,
      total_batches: operation.batch_numbers.length,
      successful_operations: successfulOperations,
      failed_operations: operation.batch_numbers.length - successfulOperations,
      results,
      errors
    };

    console.log('✅ Bulk operation completed:', bulkResult);
    return bulkResult;
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private getBatchStatus(archivedItems: number, totalItems: number): ArchiveStatus {
    if (archivedItems === 0) return 'active';
    if (archivedItems === totalItems) return 'archived';
    return 'partial';
  }

  private async getProcessBatchArchiveStatusOptimized(batchNumber: string): Promise<{
    is_archived: boolean;
    archived_items: number;
    total_items: number;
    archive_percentage: number;
  }> {
    // Check cache first
    const cacheKey = batchNumber;
    const cached = this.cache.processBatchDetails?.get(cacheKey);
    
    if (cached && this.isCacheValid(cached)) {
      console.log(`✅ Process batch cache hit for ${batchNumber}`);
      return cached.data;
    }

    try {
      const items = await processManagementService.getItems({ batch_number: batchNumber });
      const totalItems = items.length;
      const archivedItems = items.filter(item => item.archive).length;
      
      const result = {
        is_archived: archivedItems === totalItems && totalItems > 0,
        archived_items: archivedItems,
        total_items: totalItems,
        archive_percentage: totalItems > 0 ? Math.round((archivedItems / totalItems) * 100) : 0
      };

      // Cache the result
      this.cache.processBatchDetails?.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        expiresIn: this.CACHE_DURATIONS.BATCH_DETAILS
      });

      return result;
    } catch (error) {
      console.error('❌ Failed to get process batch archive status:', error);
      return {
        is_archived: false,
        archived_items: 0,
        total_items: 0,
        archive_percentage: 0
      };
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  clearCache(): void {
    console.log('🧹 Clearing archive cache...');
    this.invalidateCache();
  }

  getCacheStatus(): { [key: string]: { valid: boolean; age: number } } {
    const status: { [key: string]: { valid: boolean; age: number } } = {};
    const now = Date.now();

    Object.entries(this.cache).forEach(([key, value]) => {
      if (key === 'processBatchDetails') {
        const mapValue = value as Map<string, CacheItem<any>>;
        status[key] = { 
          valid: mapValue.size > 0, 
          age: 0 
        };
      } else if (value) {
        const item = value as CacheItem<any>;
        status[key] = {
          valid: this.isCacheValid(item),
          age: now - item.timestamp
        };
      } else {
        status[key] = {
          valid: false,
          age: 0
        };
      }
    });

    return status;
  }

  getDefaultFilter(): ArchiveFilter {
    return {
      type: 'all',
      status: 'all',
      sortBy: 'date',
      sortOrder: 'desc'
    };
  }

  // Preload data method for initialization
  async preloadData(): Promise<void> {
    console.log('🚀 Preloading archive data...');
    try {
      await Promise.all([
        this.getArchiveStats(false), // Force fresh data
        this.getAllArchivedBatches(undefined, false) // Force fresh data
      ]);
      console.log('✅ Archive data preloaded successfully');
    } catch (error) {
      console.error('❌ Failed to preload archive data:', error);
    }
  }
}

// Create and export singleton instance
export const archiveService = new ArchiveService();

// Export the class for testing
export { ArchiveService };

// Re-export archive types for convenience
export type {
  ArchiveStats,
  ArchiveFilter, 
  ArchiveBatchItem,
  ArchiveBulkOperation,
  ArchiveBulkResult,
  ArchiveStatus,
  ArchiveType,
  ArchiveOperation
} from '../types/archive';