// =============================================================================
// ARCHIVE MANAGEMENT TYPE DEFINITIONS
// =============================================================================

import type { BatchOperationResult } from '../types/stock';

export interface ArchiveStats {
  stock_batches: {
    total: number;
    archived: number;
    active: number;
    partial: number;
  };
  process_batches: {
    total: number;
    archived: number;
    active: number;
  };
  items: {
    total_stock_items: number;
    archived_stock_items: number;
    total_process_items: number;
    archived_process_items: number;
  };
}

export interface ArchiveFilter {
  type: 'all' | 'stock' | 'process';
  status: 'all' | 'archived' | 'active' | 'partial';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy: 'date' | 'name' | 'items' | 'status';
  sortOrder: 'asc' | 'desc';
}

export interface ArchiveBatchItem {
  id: string;
  batch_number: string;
  type: 'stock' | 'process';
  total_items: number;
  archived_items: number;
  is_archived: boolean;
  archive_percentage: number;
  created_at: string;
  user_name: string;
  status: 'active' | 'archived' | 'partial';
  total_quantity?: number; // For stock batches
  categories?: Record<string, number>;
  finished_product_name?: string; // For process batches
}

export interface ArchiveBulkOperation {
  batch_numbers: string[];
  type: 'stock' | 'process';
  operation: 'archive' | 'unarchive' | 'delete';
}

export interface ArchiveBulkResult {
  success: boolean;
  total_batches: number;
  successful_operations: number;
  failed_operations: number;
  results: BatchOperationResult[];
  errors: string[];
}

export interface ArchivePermissions {
  canView: boolean;
  canArchive: boolean;
  canDelete: boolean;
  canBulkOperation: boolean;
}

export interface ArchiveActivityItem {
  id: string;
  batch_number: string;
  type: 'stock' | 'process';
  action: 'archived' | 'unarchived' | 'deleted';
  user_name: string;
  timestamp: string;
}

export interface ArchiveSearchResult {
  batches: ArchiveBatchItem[];
  total_count: number;
  search_term: string;
  filters_applied: ArchiveFilter;
}

// Status type for easier type checking
export type ArchiveStatus = 'active' | 'archived' | 'partial';
export type ArchiveType = 'stock' | 'process';
export type ArchiveOperation = 'archive' | 'unarchive' | 'delete';

// Helper type for archive status calculations
export interface ArchiveStatusSummary {
  total_items: number;
  archived_items: number;
  archive_percentage: number;
  status: ArchiveStatus;
}

// Export validation constants
export const ARCHIVE_TYPES: ArchiveType[] = ['stock', 'process'];
export const ARCHIVE_STATUSES: ArchiveStatus[] = ['active', 'archived', 'partial'];
export const ARCHIVE_OPERATIONS: ArchiveOperation[] = ['archive', 'unarchive', 'delete'];

// Helper functions for type validation
export const isValidArchiveType = (type: string): type is ArchiveType => {
  return ARCHIVE_TYPES.includes(type as ArchiveType);
};

export const isValidArchiveStatus = (status: string): status is ArchiveStatus => {
  return ARCHIVE_STATUSES.includes(status as ArchiveStatus);
};

export const isValidArchiveOperation = (operation: string): operation is ArchiveOperation => {
  return ARCHIVE_OPERATIONS.includes(operation as ArchiveOperation);
};