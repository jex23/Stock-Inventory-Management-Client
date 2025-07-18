// types/processManagement.ts

export interface ProcessManagementItem {
  id: number;                           // Primary key, auto-increment
  process_id_batch: string | null;      // varchar(50), nullable - batch identifier
  stock_id: number;                     // int, NOT NULL - FK to stock table
  users_id: number;                     // int, NOT NULL - FK to users table
  finished_product_id: number;          // int, NOT NULL - FK to finished_product_category table
  pieces_used: number;                  // 🆕 int, NOT NULL - pieces consumed from stock
  archive: number | null;               // tinyint(1), nullable, default 0 (0=active, 1=archived)
  manufactured_date: string;            // timestamp, NOT NULL - ISO date string
  updated_at: string | null;            // timestamp, nullable - ISO date string
  
  // Additional fields from API joins (not in base table)
  stock_batch?: string | null;          // From stock table join
  finished_product_name?: string | null; // From finished_product_category table join
  user_name?: string | null;            // From users table join
  stock_original_pieces?: number | null; // 🆕 Original pieces before processing
  stock_remaining_pieces?: number | null; // 🆕 Remaining pieces after processing
}

// For API responses with boolean conversion
export interface ProcessManagementResponse {
  id: number;
  process_id_batch: string | null;
  stock_id: number;
  users_id: number;
  finished_product_id: number;
  pieces_used: number;                  // 🆕 Pieces consumed from stock
  archive: boolean;                     // API converts tinyint to boolean
  manufactured_date: string;
  updated_at: string;
  
  // Related data from joins
  stock_batch?: string | null;
  finished_product_name?: string | null;
  user_name?: string | null;
  stock_original_pieces?: number | null; // 🆕 Original pieces before processing
  stock_remaining_pieces?: number | null; // 🆕 Remaining pieces after processing
}

// For creating new process management items
export interface ProcessManagementCreate {
  stock_id: number;                     // Required
  users_id: number;                     // Required
  finished_product_id: number;          // Required
  pieces_used?: number;                 // 🆕 Optional, defaults to 100 in backend
  // Note: process_id_batch is auto-generated for batch operations
  // archive defaults to 0, manufactured_date defaults to CURRENT_TIMESTAMP
}

// For updating existing process management items
export interface ProcessManagementUpdate {
  stock_id?: number;
  users_id?: number;
  finished_product_id?: number;
  pieces_used?: number;                 // 🆕 Allow updating piece consumption
  archive?: boolean;                    // API accepts boolean, converts to tinyint
  // Note: process_id_batch typically shouldn't be updated after creation
  // manufactured_date and updated_at are managed by database
}

// =============================================================================
// BATCH PROCESS TYPES (UPDATED)
// =============================================================================

export interface BatchProcessItem {
  stock_id: number;
  finished_product_id: number;
  pieces_to_use: number;                // 🆕 Required field for smart consolidation
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
// NEW CONSOLIDATION & SMART ALLOCATION TYPES
// =============================================================================

export interface StockGroupInfo {
  product_id: number;
  supplier_id: number;
  category: string;
  product_name: string;
  supplier_name: string;
  stocks: StockItem[];
  total_available_pieces: number;
}

export interface StockItem {
  id: number;
  batch: string;
  pieces: number;
  created_at: string;
}

export interface ConsolidationSuggestion {
  can_fulfill: boolean;
  total_available: number;
  required_stocks: number;
  stock_allocations: StockAllocation[];
  shortage: number;
}

export interface StockAllocation {
  stock_id: number;
  stock_batch: string;
  pieces_from_this_stock: number;
  stock_total_pieces: number;
  stock_remaining_after: number;
}

export interface SmartAllocationRequest {
  product_id: number;
  supplier_id: number;
  category: 'finished_product' | 'raw_material';
  requested_pieces: number;
}

export interface StockGroupsResponse {
  total_groups: number;
  groups: StockGroupInfo[];
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
  min_pieces_used?: number;             // 🆕 Filter by minimum pieces used
  max_pieces_used?: number;             // 🆕 Filter by maximum pieces used
}

export interface ProcessManagementQuery {
  archive?: boolean;                    // API query parameter
}

// =============================================================================
// FORM TYPES (UPDATED)
// =============================================================================

export interface CreateProcessForm {
  stock_id: string;                     // Form inputs are strings
  finished_product_id: string;
  pieces_used?: string;                 // 🆕 Optional pieces input
  users_id?: string;                    // Optional, defaults to current user
}

export interface CreateBatchProcessForm {
  items: {
    stock_id: string;
    finished_product_id: string;
    pieces_to_use: string;              // 🆕 Required pieces input
  }[];
  users_id?: string;
}

export interface ProcessFormErrors {
  stock_id?: string;
  finished_product_id?: string;
  pieces_used?: string;                 // 🆕 Pieces validation error
  pieces_to_use?: string;               // 🆕 Batch pieces validation error
  users_id?: string;
  items?: string;
  general?: string;
  [key: string]: string | undefined; // Allow dynamic field keys like stock_0, product_1, etc.
}

// =============================================================================
// ENHANCED VALIDATION TYPES
// =============================================================================

export interface PieceValidation {
  stock_id: number;
  available_pieces: number;
  requested_pieces: number;
  is_sufficient: boolean;
  shortage?: number;
}

export interface BatchValidationResult {
  is_valid: boolean;
  total_items: number;
  stock_validations: PieceValidation[];
  total_shortage: number;
  errors: string[];
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
  BATCH_NUMBER_FORMAT: /^process-\d{6}$/, // e.g., "process-000001"
  MIN_PIECES_USED: 1,                   // 🆕 Minimum pieces that can be used
  MAX_PIECES_USED: 99999,               // 🆕 Maximum pieces that can be used
  DEFAULT_PIECES_USED: 100              // 🆕 Default pieces if not specified
} as const;

// =============================================================================
// UI-SPECIFIC TYPES (ENHANCED)
// =============================================================================

export interface ProcessStage {
  id: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
  pieces_threshold?: number;            // 🆕 Minimum pieces for this stage
}

export interface ProcessTableColumn {
  key: keyof ProcessManagementResponse | 'actions' | 'piece_efficiency';
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
}

export type ProcessStatus = 'active' | 'archived';
export type SortDirection = 'asc' | 'desc';
export type ProcessViewMode = 'table' | 'cards' | 'flow' | 'analytics'; // 🆕 Added analytics view

export interface SortConfig {
  key: keyof ProcessManagementResponse;
  direction: SortDirection;
}

export interface PaginationConfig {
  page: number;
  limit: number;
  total: number;
}

// 🆕 Analytics types for piece tracking
export interface PieceAnalytics {
  total_pieces_consumed: number;
  average_pieces_per_process: number;
  most_efficient_stock: {
    stock_id: number;
    stock_batch: string;
    efficiency_ratio: number;
  };
  piece_consumption_by_product: {
    product_name: string;
    total_pieces: number;
    process_count: number;
  }[];
}

// =============================================================================
// CONSTANTS (UPDATED)
// =============================================================================

export const PROCESS_STAGES: ProcessStage[] = [
  { 
    id: 'material_preparation', 
    name: 'Material Preparation', 
    color: '#f59e0b', 
    icon: '📦',
    description: 'Gathering and preparing raw materials',
    pieces_threshold: 50
  },
  { 
    id: 'processing', 
    name: 'Processing', 
    color: '#3b82f6', 
    icon: '⚙️',
    description: 'Manufacturing and processing stage',
    pieces_threshold: 100
  },
  { 
    id: 'quality_control', 
    name: 'Quality Control', 
    color: '#10b981', 
    icon: '🔍',
    description: 'Quality inspection and testing',
    pieces_threshold: 25
  },
  { 
    id: 'finishing', 
    name: 'Finishing', 
    color: '#8b5cf6', 
    icon: '✨',
    description: 'Final touches and refinements',
    pieces_threshold: 75
  },
  { 
    id: 'packaging', 
    name: 'Packaging', 
    color: '#f97316', 
    icon: '📦',
    description: 'Product packaging and labeling',
    pieces_threshold: 150
  },
  { 
    id: 'dispatch', 
    name: 'Dispatch', 
    color: '#ef4444', 
    icon: '🚚',
    description: 'Ready for shipment',
    pieces_threshold: 200
  }
];

export const PROCESS_TABLE_COLUMNS: ProcessTableColumn[] = [
  { key: 'id', label: 'ID', sortable: true, width: '80px' },
  { key: 'process_id_batch', label: 'Batch', sortable: true, filterable: true },
  { key: 'stock_batch', label: 'Stock Batch', sortable: true, filterable: true },
  { key: 'finished_product_name', label: 'Product', sortable: true, filterable: true },
  { key: 'pieces_used', label: 'Pieces Used', sortable: true, width: '120px' }, // 🆕
  { key: 'stock_remaining_pieces', label: 'Remaining', sortable: true, width: '100px' }, // 🆕
  { key: 'user_name', label: 'Operator', sortable: true, filterable: true },
  { key: 'manufactured_date', label: 'Manufactured', sortable: true },
  { key: 'archive', label: 'Status', sortable: true, filterable: true },
  { key: 'actions', label: 'Actions', width: '120px' }
];

// =============================================================================
// UTILITY FUNCTIONS (ENHANCED)
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

// 🆕 Piece validation utilities
export const validatePiecesUsed = (pieces: number): boolean => {
  return pieces >= FIELD_CONSTRAINTS.MIN_PIECES_USED && pieces <= FIELD_CONSTRAINTS.MAX_PIECES_USED;
};

export const calculatePieceEfficiency = (piecesUsed: number, originalPieces: number): number => {
  if (originalPieces === 0) return 0;
  return (piecesUsed / originalPieces) * 100;
};

export const formatPieceCount = (pieces: number | null | undefined): string => {
  if (pieces === null || pieces === undefined) return 'N/A';
  return pieces.toLocaleString();
};

// 🆕 Stock depletion utilities
export const isStockDepleted = (remainingPieces: number | null | undefined): boolean => {
  return (remainingPieces ?? 0) <= 0;
};

export const getStockStatus = (remainingPieces: number | null | undefined): 'depleted' | 'low' | 'adequate' | 'high' => {
  const pieces = remainingPieces ?? 0;
  if (pieces <= 0) return 'depleted';
  if (pieces <= 10) return 'low';
  if (pieces <= 50) return 'adequate';
  return 'high';
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

export interface PieceValidationError extends ValidationError {
  available_pieces?: number;
  requested_pieces?: number;
  shortage?: number;
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
  validating: boolean;                  // 🆕 For piece validation
  consolidation: boolean;               // 🆕 For consolidation suggestions
}

// Export only constants and values (not types/interfaces)
export default {
  PROCESS_STAGES,
  PROCESS_TABLE_COLUMNS,
  ARCHIVE_STATUS,
  FIELD_CONSTRAINTS
};