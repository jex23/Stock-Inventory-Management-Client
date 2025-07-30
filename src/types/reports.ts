// =============================================================================
// SALES REPORT TYPES
// =============================================================================

export interface SalesReportSummary {
  total_production_batches: number;
  total_pieces_produced: number;
  total_pieces_good: number;
  total_pieces_defect: number;
  total_revenue: number;
  quality_rate: number;
  defect_rate: number;
  average_output_price: number;
  top_performing_products: TopPerformingProduct[];
  production_by_user: ProductionByUser[];
  production_by_date: ProductionByDate[];
}

export interface TopPerformingProduct {
  product_id: number;
  product_name: string;
  total_pieces_used: number;
  total_good: number;
  total_defect: number;
  total_revenue: number;
  batch_count: number;
}

export interface ProductionByUser {
  user_name: string;
  total_pieces_used: number;
  total_good: number;
  total_defect: number;
  total_revenue: number;
  batch_count: number;
}

export interface ProductionByDate {
  date: string; // YYYY-MM-DD format
  total_pieces_used: number;
  total_good: number;
  total_defect: number;
  total_revenue: number;
  batch_count: number;
}

export interface SalesDetailItem {
  process_id: number;
  process_batch_number: string;
  product_name: string;
  supplier_name: string;
  user_name: string;
  pieces_used: number;
  pieces_good?: number | null;
  pieces_defect?: number | null;
  price_output?: number | null;
  revenue?: number | null;
  manufactured_date: string; // ISO datetime string
  quality_rate?: number | null;
}

export interface SalesReport {
  summary: SalesReportSummary;
  details: SalesDetailItem[];
  date_range: {
    start: string;
    end: string;
  };
  generated_at: string; // ISO datetime string
}

// Sales Summary Response (for dashboard)
export interface SalesSummaryResponse {
  total_processes: number;
  total_revenue: number;
  total_good_pieces: number;
  total_defect_pieces: number;
  quality_rate: number;
  recent_activity_30_days: number;
  generated_at: string; // ISO datetime string
}

// =============================================================================
// INVENTORY REPORT TYPES
// =============================================================================

export interface InventoryStockItem {
  stock_id: number;
  batch: string;
  product_name: string;
  supplier_name: string;
  category: string;
  available_pieces: number;
  product_price: number;
  product_unit: string;
  product_quantity: number;
  total_value: number;
  is_low_stock: boolean;
  created_at: string; // ISO datetime string
}

export interface InventoryByCategory {
  category: string;
  total_stocks: number;
  total_pieces: number;
  total_value: number;
  active_stocks: number;
  archived_stocks: number;
}

export interface InventoryBySupplier {
  supplier_id: number;
  supplier_name: string;
  total_stocks: number;
  total_pieces: number;
  total_value: number;
  categories: string[];
}

export interface InventoryReportSummary {
  total_stock_items: number;
  total_available_pieces: number;
  total_inventory_value: number;
  active_stocks: number;
  archived_stocks: number;
  used_stocks: number;
  low_stock_items: number;
  categories_breakdown: InventoryByCategory[];
  suppliers_breakdown: InventoryBySupplier[];
  oldest_stock_date?: string | null; // ISO datetime string
  newest_stock_date?: string | null; // ISO datetime string
}

export interface InventoryReport {
  summary: InventoryReportSummary;
  stock_details: InventoryStockItem[];
  low_stock_alert_threshold: number;
  generated_at: string; // ISO datetime string
}

// Inventory Summary Response (for dashboard)
export interface InventorySummaryResponse {
  total_stocks: number;
  active_stocks: number;
  total_available_pieces: number;
  total_inventory_value: number;
  low_stock_items: number;
  finished_products: number;
  raw_materials: number;
  generated_at: string; // ISO datetime string
}

// Low Stock Alert Response
export interface LowStockAlertItem {
  stock_id: number;
  batch: string;
  product_name: string;
  supplier_name: string;
  current_pieces: number;
  category: string;
  created_at: string; // ISO datetime string
}

export interface LowStockAlertResponse {
  threshold_used: number;
  total_low_stock_items: number;
  items: LowStockAlertItem[];
  generated_at: string; // ISO datetime string
}

// =============================================================================
// COMBINED DASHBOARD TYPES
// =============================================================================

export interface DashboardRecentActivity {
  stock_additions_7_days: number;
  productions_7_days: number;
}

export interface DashboardReport {
  sales_summary: SalesSummaryResponse;
  inventory_summary: InventorySummaryResponse;
  low_stock_alerts: LowStockAlertResponse;
  recent_activity: DashboardRecentActivity;
  generated_at: string; // ISO datetime string
}

// =============================================================================
// API QUERY PARAMETERS TYPES
// =============================================================================

// Sales Report Query Parameters
export interface SalesReportQueryParams {
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  product_id?: number;
  user_id?: number;
  include_archived?: boolean;
}

// Inventory Report Query Parameters
export interface InventoryReportQueryParams {
  category?: 'finished product' | 'raw material';
  supplier_id?: number;
  include_archived?: boolean;
  include_used?: boolean;
  low_stock_threshold?: number;
}

// Low Stock Alert Query Parameters
export interface LowStockAlertQueryParams {
  threshold?: number;
}

// =============================================================================
// RESPONSE WRAPPER TYPES (for API calls)
// =============================================================================

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  detail: string;
  status: number;
}

// =============================================================================
// EXPORT TYPES
// =============================================================================

// For CSV export responses
export interface ExportResponse {
  filename: string;
  content: Blob;
  generated_at: string;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

// Stock Category enum
export type StockCategory = 'finished product' | 'raw material';

// Stock Unit enum  
export type StockUnit = 'kg' | 'g' | 'mg' | 'lb' | 'oz' | 'l' | 'ml' | 'pcs' | 'box' | 'pack' | 'sack' | 'bottle' | 'can' | 'jar' | 'roll';

// User Position enum
export type UserPosition = 'admin' | 'owner' | 'supervisor' | 'manager' | 'staff';

// =============================================================================
// FRONTEND HELPER TYPES
// =============================================================================

// For loading states
export interface ReportLoadingState {
  isLoading: boolean;
  error?: string | null;
}

// For chart data transformation
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

// For table sorting
export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

// For pagination
export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

// =============================================================================
// FORM TYPES (for report generation forms)
// =============================================================================

export interface SalesReportFormData {
  startDate: string;
  endDate: string;
  productId?: number;
  userId?: number;
  includeArchived: boolean;
}

export interface InventoryReportFormData {
  category?: StockCategory;
  supplierId?: number;
  includeArchived: boolean;
  includeUsed: boolean;
  lowStockThreshold: number;
}

// =============================================================================
// COMPONENT PROPS TYPES
// =============================================================================

// For report components
export interface SalesReportComponentProps {
  report: SalesReport;
  onExport?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export interface InventoryReportComponentProps {
  report: InventoryReport;
  onExport?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export interface DashboardComponentProps {
  dashboard: DashboardReport;
  onRefresh?: () => void;
  loading?: boolean;
}

// =============================================================================
// API HOOKS TYPES (for React Query or similar)
// =============================================================================

export interface UseReportsQuery {
  salesReport: (params: SalesReportQueryParams) => {
    data: SalesReport | undefined;
    isLoading: boolean;
    error: ApiError | null;
    refetch: () => void;
  };
  
  inventoryReport: (params: InventoryReportQueryParams) => {
    data: InventoryReport | undefined;
    isLoading: boolean;
    error: ApiError | null;
    refetch: () => void;
  };
  
  dashboardReport: () => {
    data: DashboardReport | undefined;
    isLoading: boolean;
    error: ApiError | null;
    refetch: () => void;
  };
  
  salesSummary: () => {
    data: SalesSummaryResponse | undefined;
    isLoading: boolean;
    error: ApiError | null;
  };
  
  inventorySummary: () => {
    data: InventorySummaryResponse | undefined;
    isLoading: boolean;
    error: ApiError | null;
  };
  
  lowStockAlert: (threshold: number) => {
    data: LowStockAlertResponse | undefined;
    isLoading: boolean;
    error: ApiError | null;
  };
}