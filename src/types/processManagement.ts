// types/processManagement.ts

// =============================================================================
// CORE PROCESS MANAGEMENT TYPES (Based on actual DB table structure)
// =============================================================================

/**
 * Process Management table structure:
 * - id: int, NOT NULL, PRIMARY KEY, auto_increment
 * - process_id_batch: varchar(50), nullable
 * - stock_id: int, NOT NULL
 * - users_id: int, NOT NULL  
 * - finished_product_id: int, NOT NULL
 * - archive: tinyint(1), nullable, default 0
 * - manufactured_date: timestamp, NOT NULL, default CURRENT_TIMESTAMP
 * - updated_at: timestamp, nullable, default CURRENT_TIMESTAMP on update
 */

export interface ProcessManagementItem {
  id: number;                           // Primary key, auto-increment
  process_id_batch: string | null;      // varchar(50), nullable - batch identifier
  stock_id: number;                     // int, NOT NULL - FK to stock table
  users_id: number;                     // int, NOT NULL - FK to users table
  finished_product_id: number;          // int, NOT NULL - FK to product table
  archive: number | null;               // tinyint(1), nullable, default 0 (0=active, 1=archived)
  manufactured_date: string;            // timestamp, NOT NULL - ISO date string
  updated_at: string | null;            // timestamp, nullable - ISO date string
  
  // Additional fields from API joins (not in base table)
  stock_batch?: string | null;          // From stock table join
  finished_product_name?: string | null; // From product table join
  user_name?: string | null;            // From users table join
}

// For API responses with boolean conversion
export interface ProcessManagementResponse {
  id: number;
  process_id_batch: string | null;
  stock_id: number;
  users_id: number;
  finished_product_id: number;
  archive: boolean;                     // API converts tinyint to boolean
  manufactured_date: string;
  updated_at: string;
  
  // Related data from joins
  stock_batch?: string | null;
  finished_product_name?: string | null;
  user_name?: string | null;
}

// For creating new process management items
export interface ProcessManagementCreate {
  stock_id: number;                     // Required
  users_id: number;                     // Required
  finished_product_id: number;          // Required
  // Note: process_id_batch is auto-generated for batch operations
  // archive defaults to 0, manufactured_date defaults to CURRENT_TIMESTAMP
}

// For updating existing process management items
export interface ProcessManagementUpdate {
  stock_id?: number;
  users_id?: number;
  finished_product_id?: number;
  archive?: boolean;                    // API accepts boolean, converts to tinyint
  // Note: process_id_batch typically shouldn't be updated after creation
  // manufactured_date and updated_at are managed by database
}

// =============================================================================
// BATCH PROCESS TYPES
// =============================================================================

export interface BatchProcessItem {
  stock_id: number;
  finished_product_id: number;
}

export interface BatchProcessCreate {
  items: BatchProcessItem[];
  users_id?: number; // Optional - will use current user if not provided
}

export interface ProcessBatchResponse {
  process_batch_number: string;         // The generated batch number (e.g., "process-000001")
  items_created: number;
  items: ProcessManagementResponse[];
}

export interface ProcessBatchSummary {
  process_batch_number: string;
  total_items: number;
  manufactured_date: string;            // From first item in batch
  user_name: string;
  items: ProcessManagementResponse[];
}

export interface ProcessBatchSummaryResponse {
  process_batch_number: string;
  total_items: number;
  manufactured_date: string;
  user_name: string;
}

export interface ProcessBatchArchiveRequest {
  archive: boolean;
}

// =============================================================================
// STATISTICS & UTILITY TYPES
// =============================================================================

export interface ProcessManagementStats {
  total_processes: number;
  active_processes: number;             // archive = 0
  archived_processes: number;           // archive = 1
  total_batches: number;                // Distinct process_id_batch count
}

export interface NextProcessBatchNumber {
  next_process_batch_number: string;    // Format: "process-XXXXXX"
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface DeleteBatchResponse {
  message: string;
}

export interface ArchiveBatchResponse {
  message: string;
}

export interface SetArchiveBatchResponse {
  message: string;
  process_batch_number: string;
  items_updated: number;
  archive_status: boolean;
}

export interface DeleteProcessResponse {
  message: string;
}

export interface ArchiveProcessResponse {
  message: string;
}

// =============================================================================
// FILTERING & QUERY TYPES
// =============================================================================

export interface ProcessManagementFilters {
  archive?: boolean;                    // Filter by archive status
  process_batch?: string;               // Filter by specific batch
  stock_id?: number;                    // Filter by stock item
  users_id?: number;                    // Filter by user/operator
  finished_product_id?: number;         // Filter by finished product
  dateFrom?: string;                    // Filter manufactured_date >= dateFrom
  dateTo?: string;                      // Filter manufactured_date <= dateTo
}

export interface ProcessManagementQuery {
  archive?: boolean;                    // API query parameter
}

// =============================================================================
// FORM TYPES
// =============================================================================

export interface CreateProcessForm {
  stock_id: string;                     // Form inputs are strings
  finished_product_id: string;
  users_id?: string;                    // Optional, defaults to current user
}

export interface CreateBatchProcessForm {
  items: {
    stock_id: string;
    finished_product_id: string;
  }[];
  users_id?: string;
}

export interface ProcessFormErrors {
  stock_id?: string;
  finished_product_id?: string;
  users_id?: string;
  items?: string;
  general?: string;
  [key: string]: string | undefined; // Allow dynamic field keys like stock_0, product_1, etc.
}

// =============================================================================
// DATABASE FIELD MAPPINGS
// =============================================================================

// Archive status mappings (database uses tinyint)
export const ARCHIVE_STATUS = {
  ACTIVE: 0,
  ARCHIVED: 1
} as const;

export type ArchiveStatusValue = typeof ARCHIVE_STATUS[keyof typeof ARCHIVE_STATUS];

// Field constraints from database
export const FIELD_CONSTRAINTS = {
  PROCESS_ID_BATCH_MAX_LENGTH: 50,      // varchar(50)
  BATCH_NUMBER_FORMAT: /^process-\d{6}$/ // e.g., "process-000001"
} as const;

// =============================================================================
// UI-SPECIFIC TYPES
// =============================================================================

export interface ProcessStage {
  id: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
}

export interface ProcessTableColumn {
  key: keyof ProcessManagementResponse | 'actions';
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
}

export type ProcessStatus = 'active' | 'archived';
export type SortDirection = 'asc' | 'desc';
export type ProcessViewMode = 'table' | 'cards' | 'flow';

export interface SortConfig {
  key: keyof ProcessManagementResponse;
  direction: SortDirection;
}

export interface PaginationConfig {
  page: number;
  limit: number;
  total: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const PROCESS_STAGES: ProcessStage[] = [
  { 
    id: 'material_preparation', 
    name: 'Material Preparation', 
    color: '#f59e0b', 
    icon: '📦',
    description: 'Gathering and preparing raw materials'
  },
  { 
    id: 'processing', 
    name: 'Processing', 
    color: '#3b82f6', 
    icon: '⚙️',
    description: 'Manufacturing and processing stage'
  },
  { 
    id: 'quality_control', 
    name: 'Quality Control', 
    color: '#10b981', 
    icon: '🔍',
    description: 'Quality inspection and testing'
  },
  { 
    id: 'finishing', 
    name: 'Finishing', 
    color: '#8b5cf6', 
    icon: '✨',
    description: 'Final touches and refinements'
  },
  { 
    id: 'packaging', 
    name: 'Packaging', 
    color: '#f97316', 
    icon: '📦',
    description: 'Product packaging and labeling'
  },
  { 
    id: 'dispatch', 
    name: 'Dispatch', 
    color: '#ef4444', 
    icon: '🚚',
    description: 'Ready for shipment'
  }
];

export const PROCESS_TABLE_COLUMNS: ProcessTableColumn[] = [
  { key: 'id', label: 'ID', sortable: true, width: '80px' },
  { key: 'process_id_batch', label: 'Batch', sortable: true, filterable: true },
  { key: 'stock_batch', label: 'Stock Batch', sortable: true, filterable: true },
  { key: 'finished_product_name', label: 'Product', sortable: true, filterable: true },
  { key: 'user_name', label: 'Operator', sortable: true, filterable: true },
  { key: 'manufactured_date', label: 'Manufactured', sortable: true },
  { key: 'archive', label: 'Status', sortable: true, filterable: true },
  { key: 'actions', label: 'Actions', width: '120px' }
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export const isArchived = (item: ProcessManagementItem | ProcessManagementResponse): boolean => {
  return typeof item.archive === 'boolean' ? item.archive : item.archive === 1;
};

export const formatProcessStatus = (archive: number | boolean | null): ProcessStatus => {
  if (typeof archive === 'boolean') return archive ? 'archived' : 'active';
  return archive === 1 ? 'archived' : 'active';
};

export const validateBatchNumber = (batchNumber: string): boolean => {
  return FIELD_CONSTRAINTS.BATCH_NUMBER_FORMAT.test(batchNumber);
};

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface ProcessManagementError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
}

// =============================================================================
// LOADING STATES
// =============================================================================

export interface ProcessManagementLoadingState {
  items: boolean;
  stats: boolean;
  batches: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  archiving: boolean;
}

// Export only constants and values (not types/interfaces)
export default {
  PROCESS_STAGES,
  PROCESS_TABLE_COLUMNS,
  ARCHIVE_STATUS,
  FIELD_CONSTRAINTS
};