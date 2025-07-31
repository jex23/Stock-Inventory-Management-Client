// services/inventoryReportService.ts

import { 
  API_CONFIG, 
  API_ENDPOINTS, 
  ApiUtils, 
  HTTP_METHODS, 
  ERROR_MESSAGES,
  STOCK_CATEGORIES,
  STORAGE_KEYS
} from '../constants/api';

import type { PinEntry } from '../types/auth';
import type {
  InventoryReport,
  InventoryReportQueryParams,
  InventorySummaryResponse,
  LowStockAlertResponse,
  LowStockAlertQueryParams,
  StockCategory,
  ApiResponse,
  ApiError
} from '../types/reports';

// Extended endpoints for inventory reports (not modifying api.ts)
const INVENTORY_REPORT_ENDPOINTS = {
  INVENTORY_REPORT: '/reports/inventory',
  INVENTORY_SUMMARY: '/reports/inventory/summary',
  LOW_STOCK_ALERT: '/reports/inventory/low-stock',
  INVENTORY_EXPORT_CSV: '/reports/export/inventory',
} as const;

class InventoryReportService {
  private baseURL = API_CONFIG.BASE_URL;

  /**
   * Get current user's email from localStorage
   */
  private getCurrentUserEmail(): string {
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (!userData) {
      throw new Error('User not authenticated');
    }
    
    try {
      const user = JSON.parse(userData);
      if (!user.email) {
        throw new Error('User email not available');
      }
      return user.email;
    } catch (error) {
      throw new Error('Failed to get user email');
    }
  }

  /**
   * Get comprehensive inventory report with filters
   */
  async getInventoryReport(params?: InventoryReportQueryParams): Promise<InventoryReport> {
    try {
      const url = ApiUtils.buildUrl(INVENTORY_REPORT_ENDPOINTS.INVENTORY_REPORT, params);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
      
      const response = await fetch(url, {
        method: HTTP_METHODS.GET,
        headers: ApiUtils.getAuthHeaders(),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(ApiUtils.getErrorMessage(response.status));
      }

      const data: InventoryReport = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching inventory report:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get inventory summary for dashboard
   */
  async getInventorySummary(): Promise<InventorySummaryResponse> {
    try {
      const url = ApiUtils.buildUrl(INVENTORY_REPORT_ENDPOINTS.INVENTORY_SUMMARY);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
      
      const response = await fetch(url, {
        method: HTTP_METHODS.GET,
        headers: ApiUtils.getAuthHeaders(),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(ApiUtils.getErrorMessage(response.status));
      }

      const data: InventorySummaryResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching inventory summary:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlert(params?: LowStockAlertQueryParams): Promise<LowStockAlertResponse> {
    try {
      const url = ApiUtils.buildUrl(INVENTORY_REPORT_ENDPOINTS.LOW_STOCK_ALERT, params);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
      
      const response = await fetch(url, {
        method: HTTP_METHODS.GET,
        headers: ApiUtils.getAuthHeaders(),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(ApiUtils.getErrorMessage(response.status));
      }

      const data: LowStockAlertResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching low stock alerts:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Export inventory report as CSV with PIN authentication (client-side generation)
   */
  async exportInventoryReportCSV(pin: string, params?: InventoryReportQueryParams): Promise<Blob> {
    try {
      // Get current user's email
      const email = this.getCurrentUserEmail();
      
      // Validate PIN directly with /enter-pin endpoint
      const pinData: PinEntry = {
        email: email,
        pin: pin
      };

      // Create timeout controller for better compatibility
      const pinController = new AbortController();
      const pinTimeoutId = setTimeout(() => pinController.abort(), API_CONFIG.TIMEOUT);

      const pinResponse = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.ENTER_PIN}`, {
        method: HTTP_METHODS.POST,
        headers: API_CONFIG.HEADERS,
        body: JSON.stringify(pinData),
        signal: pinController.signal,
      });

      clearTimeout(pinTimeoutId);

      if (!pinResponse.ok) {
        const errorData = await pinResponse.json().catch(() => ({ detail: 'Invalid PIN or email' }));
        throw new Error(errorData.detail || 'PIN authentication failed');
      }

      const authData = await pinResponse.json();
      
      // Get inventory report data using the authenticated token
      const reportUrl = ApiUtils.buildUrl(INVENTORY_REPORT_ENDPOINTS.INVENTORY_REPORT, params);
      
      // Create separate timeout controller for report request
      const reportController = new AbortController();
      const reportTimeoutId = setTimeout(() => reportController.abort(), API_CONFIG.TIMEOUT * 2); // Double timeout for data fetching
      
      const reportResponse = await fetch(reportUrl, {
        method: HTTP_METHODS.GET,
        headers: {
          ...API_CONFIG.HEADERS,
          'Authorization': `Bearer ${authData.access_token}`
        },
        signal: reportController.signal,
      });

      clearTimeout(reportTimeoutId);

      if (!reportResponse.ok) {
        throw new Error(ApiUtils.getErrorMessage(reportResponse.status));
      }

      const inventoryData = await reportResponse.json();
      
      // Convert to CSV format
      const csvContent = this.convertToCSV(inventoryData);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      return blob;
    } catch (error) {
      console.error('Error exporting inventory report CSV:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Convert inventory report data to CSV format
   */
  private convertToCSV(inventoryData: InventoryReport): string {
    const lines: string[] = [];
    
    // Add header
    lines.push('Inventory Report');
    lines.push(`Generated at: ${new Date(inventoryData.generated_at).toLocaleString()}`);
    lines.push(`Low Stock Threshold: ${inventoryData.low_stock_alert_threshold} pieces`);
    lines.push('');
    
    // Add summary
    lines.push('SUMMARY');
    lines.push(`Total Stock Items,${inventoryData.summary.total_stock_items}`);
    lines.push(`Total Available Pieces,${inventoryData.summary.total_available_pieces}`);
    lines.push(`Total Inventory Value,₱${inventoryData.summary.total_inventory_value}`);
    lines.push(`Active Stocks,${inventoryData.summary.active_stocks}`);
    lines.push(`Used Stocks,${inventoryData.summary.used_stocks}`);
    lines.push(`Archived Stocks,${inventoryData.summary.archived_stocks}`);
    lines.push(`Low Stock Items,${inventoryData.summary.low_stock_items}`);
    lines.push('');
    
    // Add categories breakdown
    lines.push('CATEGORIES BREAKDOWN');
    lines.push('Category,Total Stocks,Total Pieces,Total Value');
    inventoryData.summary.categories_breakdown.forEach(category => {
      lines.push(`"${category.category}",${category.total_stocks},${category.total_pieces},${category.total_value}`);
    });
    lines.push('');
    
    // Add suppliers breakdown
    lines.push('SUPPLIERS BREAKDOWN');
    lines.push('Supplier Name,Total Stocks,Total Pieces,Total Value');
    inventoryData.summary.suppliers_breakdown.forEach(supplier => {
      lines.push(`"${supplier.supplier_name}",${supplier.total_stocks},${supplier.total_pieces},${supplier.total_value}`);
    });
    lines.push('');
    
    // Add stock details header
    lines.push('DETAILED STOCK DATA');
    lines.push('Stock ID,Batch,Product Name,Category,Supplier,Unit,Available Pieces,Product Quantity,Unit Price,Total Value,Status,Created Date');
    
    // Add stock details
    inventoryData.stock_details.forEach(stock => {
      const row = [
        stock.stock_id,
        stock.batch,
        `"${stock.product_name}"`, // Quote names to handle commas
        `"${stock.category}"`,
        `"${stock.supplier_name}"`,
        stock.product_unit,
        stock.available_pieces,
        stock.product_quantity,
        stock.product_price,
        stock.total_value,
        stock.is_low_stock ? 'Low Stock' : 'In Stock',
        new Date(stock.created_at).toLocaleDateString()
      ];
      lines.push(row.join(','));
    });
    
    return lines.join('\n');
  }

  /**
   * Export inventory report as CSV with PIN validation and download
   */
  async exportAndDownloadCSV(pin: string, params?: InventoryReportQueryParams, filename?: string): Promise<void> {
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const blob = await this.exportInventoryReportCSV(pin, params);
        this.downloadCSV(blob, filename);
        return; // Success, exit the retry loop
      } catch (error) {
        console.error(`Error exporting and downloading inventory CSV (attempt ${attempt}/${maxRetries}):`, error);
        
        // Don't retry on authentication errors
        if (error instanceof Error && (
          error.message.includes('PIN authentication failed') || 
          error.message.includes('Invalid PIN') ||
          error.message.includes('Unauthorized')
        )) {
          throw error;
        }
        
        // If this is the last attempt, handle the error
        if (attempt === maxRetries) {
          // Provide more specific error messages for timeout issues
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              throw new Error('Export request timed out after multiple attempts. This may be due to a large dataset. Please try filtering your data or contact support.');
            }
            if (error.message.includes('timeout') || error.message.includes('TimeoutError')) {
              throw new Error('Export request timed out after multiple attempts. Please try again later or contact support.');
            }
          }
          
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  /**
   * Download CSV file
   */
  downloadCSV(blob: Blob, filename?: string): void {
    try {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `inventory_report_${new Date().toISOString().split('T')[0]}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      throw new Error('Failed to download file');
    }
  }

  /**
   * Get inventory report by category
   */
  async getInventoryReportByCategory(
    category: StockCategory,
    additionalParams?: Omit<InventoryReportQueryParams, 'category'>
  ): Promise<InventoryReport> {
    const params: InventoryReportQueryParams = {
      category,
      ...additionalParams,
    };

    return this.getInventoryReport(params);
  }

  /**
   * Get inventory report by supplier
   */
  async getInventoryReportBySupplier(
    supplierId: number,
    additionalParams?: Omit<InventoryReportQueryParams, 'supplier_id'>
  ): Promise<InventoryReport> {
    const params: InventoryReportQueryParams = {
      supplier_id: supplierId,
      ...additionalParams,
    };

    return this.getInventoryReport(params);
  }

  /**
   * Get finished products inventory
   */
  async getFinishedProductsInventory(includeArchived = false): Promise<InventoryReport> {
    return this.getInventoryReportByCategory(STOCK_CATEGORIES.FINISHED_PRODUCT, {
      include_archived: includeArchived,
    });
  }

  /**
   * Get raw materials inventory
   */
  async getRawMaterialsInventory(includeArchived = false): Promise<InventoryReport> {
    return this.getInventoryReportByCategory(STOCK_CATEGORIES.RAW_MATERIAL, {
      include_archived: includeArchived,
    });
  }

  /**
   * Get critical low stock items (threshold 5)
   */
  async getCriticalLowStockItems(): Promise<LowStockAlertResponse> {
    return this.getLowStockAlert({ threshold: 5 });
  }

  /**
   * Get low stock items with custom threshold
   */
  async getLowStockItems(threshold: number): Promise<LowStockAlertResponse> {
    return this.getLowStockAlert({ threshold });
  }

  /**
   * Get inventory valuation summary
   */
  getInventoryValuation(report: InventoryReport) {
    const { summary } = report;
    
    const categoryValues = summary.categories_breakdown.reduce((acc, category) => {
      acc[category.category] = category.total_value;
      return acc;
    }, {} as Record<string, number>);

    const supplierValues = summary.suppliers_breakdown.reduce((acc, supplier) => {
      acc[supplier.supplier_name] = supplier.total_value;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalValue: summary.total_inventory_value,
      totalItems: summary.total_stock_items,
      totalPieces: summary.total_available_pieces,
      averageValuePerItem: summary.total_stock_items > 0 ? summary.total_inventory_value / summary.total_stock_items : 0,
      averageValuePerPiece: summary.total_available_pieces > 0 ? summary.total_inventory_value / summary.total_available_pieces : 0,
      categoryBreakdown: categoryValues,
      supplierBreakdown: supplierValues,
      stockUtilization: this.calculateStockUtilization(summary),
      turnoverRate: this.estimateTurnoverRate(summary),
    };
  }

  /**
   * Calculate stock utilization percentage
   */
  private calculateStockUtilization(summary: any): number {
    const totalStocks = summary.total_stock_items;
    const activeStocks = summary.active_stocks;
    return totalStocks > 0 ? (activeStocks / totalStocks) * 100 : 0;
  }

  /**
   * Estimate inventory turnover rate (simplified)
   */
  private estimateTurnoverRate(summary: any): number {
    // This is a simplified estimation - you'd need actual sales/usage data for accurate calculation
    const usedStocks = summary.used_stocks;
    const totalStocks = summary.total_stock_items;
    return totalStocks > 0 ? (usedStocks / totalStocks) * 100 : 0;
  }

  /**
   * Get inventory aging analysis
   */
  getInventoryAging(report: InventoryReport) {
    const currentDate = new Date();
    const ageCategories = {
      new: 0,        // 0-30 days
      medium: 0,     // 31-90 days
      old: 0,        // 91-180 days
      veryOld: 0,    // 180+ days
    };

    let totalValue = 0;
    const ageValues = {
      new: 0,
      medium: 0,
      old: 0,
      veryOld: 0,
    };

    report.stock_details.forEach(item => {
      const itemDate = new Date(item.created_at);
      const ageInDays = Math.floor((currentDate.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
      
      totalValue += item.total_value;
      
      if (ageInDays <= 30) {
        ageCategories.new++;
        ageValues.new += item.total_value;
      } else if (ageInDays <= 90) {
        ageCategories.medium++;
        ageValues.medium += item.total_value;
      } else if (ageInDays <= 180) {
        ageCategories.old++;
        ageValues.old += item.total_value;
      } else {
        ageCategories.veryOld++;
        ageValues.veryOld += item.total_value;
      }
    });

    return {
      counts: ageCategories,
      values: ageValues,
      percentages: {
        new: totalValue > 0 ? (ageValues.new / totalValue) * 100 : 0,
        medium: totalValue > 0 ? (ageValues.medium / totalValue) * 100 : 0,
        old: totalValue > 0 ? (ageValues.old / totalValue) * 100 : 0,
        veryOld: totalValue > 0 ? (ageValues.veryOld / totalValue) * 100 : 0,
      },
    };
  }

  /**
   * Get top value items
   */
  getTopValueItems(report: InventoryReport, limit = 10) {
    return report.stock_details
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, limit);
  }

  /**
   * Get items by supplier performance
   */
  getSupplierPerformance(report: InventoryReport) {
    return report.summary.suppliers_breakdown
      .sort((a, b) => b.total_value - a.total_value)
      .map(supplier => ({
        ...supplier,
        averageValuePerStock: supplier.total_stocks > 0 ? supplier.total_value / supplier.total_stocks : 0,
        averageValuePerPiece: supplier.total_pieces > 0 ? supplier.total_value / supplier.total_pieces : 0,
      }));
  }

  /**
   * Get reorder recommendations
   */
  getReorderRecommendations(report: InventoryReport, lowStockThreshold = 10) {
    const lowStockItems = report.stock_details.filter(item => 
      item.available_pieces <= lowStockThreshold
    );

    return lowStockItems.map(item => ({
      ...item,
      recommended_reorder_quantity: this.calculateReorderQuantity(item),
      urgency_level: this.calculateUrgencyLevel(item.available_pieces, lowStockThreshold),
      estimated_days_remaining: this.estimateDaysRemaining(item),
    }));
  }

  /**
   * Calculate recommended reorder quantity
   */
  private calculateReorderQuantity(item: any): number {
    // Simplified calculation - you might want to use historical usage data
    const minimumStock = 50; // Base minimum
    const safetyStock = Math.max(10, item.available_pieces * 0.2); // 20% safety stock
    return minimumStock + safetyStock;
  }

  /**
   * Calculate urgency level for reordering
   */
  private calculateUrgencyLevel(availablePieces: number, threshold: number): 'critical' | 'high' | 'medium' | 'low' {
    if (availablePieces <= threshold * 0.2) return 'critical';
    if (availablePieces <= threshold * 0.5) return 'high';
    if (availablePieces <= threshold * 0.8) return 'medium';
    return 'low';
  }

  /**
   * Estimate days remaining based on usage
   */
  private estimateDaysRemaining(item: any): number {
    // Simplified estimation - you'd need actual usage history for accuracy
    const estimatedDailyUsage = 2; // pieces per day - replace with actual calculation
    return Math.floor(item.available_pieces / estimatedDailyUsage);
  }

  /**
   * Get stock movement analysis
   */
  async getStockMovementAnalysis(): Promise<{
    recent_additions: number;
    recent_usage: number;
    movement_trend: 'increasing' | 'decreasing' | 'stable';
  }> {
    try {
      // This would require additional endpoints for stock movements
      // For now, return estimated data based on inventory summary
      const summary = await this.getInventorySummary();
      
      return {
        recent_additions: 0, // Would need stock movement history
        recent_usage: summary.total_stocks - summary.active_stocks,
        movement_trend: 'stable', // Would need historical data for trend analysis
      };
    } catch (error) {
      console.error('Error analyzing stock movement:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): ApiError {
    if (error instanceof Error) {
      // Handle timeout errors specifically
      if (error.name === 'AbortError') {
        return {
          detail: 'Request timed out. Please try again.',
          status: 408
        };
      }
      
      return {
        detail: error.message,
        status: 500
      };
    }

    return {
      detail: ERROR_MESSAGES.UNKNOWN_ERROR,
      status: 500
    };
  }

  /**
   * Validate threshold values
   */
  private validateThreshold(threshold: number): boolean {
    if (threshold < 0 || threshold > 1000) {
      throw new Error('Threshold must be between 0 and 1000');
    }
    return true;
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number, currency = 'PHP'): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format percentage for display
   */
  formatPercentage(value: number, decimals = 2): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Get inventory health score
   */
  getInventoryHealthScore(report: InventoryReport): {
    score: number;
    rating: 'excellent' | 'good' | 'fair' | 'poor';
    factors: Record<string, number>;
  } {
    const factors = {
      stockUtilization: this.calculateStockUtilization(report.summary),
      lowStockRatio: (report.summary.low_stock_items / report.summary.total_stock_items) * 100,
      categoryBalance: this.calculateCategoryBalance(report.summary.categories_breakdown),
      inventoryAge: 75, // Would need aging data for accurate calculation
    };

    // Calculate weighted score (0-100)
    const weights = {
      stockUtilization: 0.3,
      lowStockRatio: 0.3,
      categoryBalance: 0.2,
      inventoryAge: 0.2,
    };

    let score = 0;
    score += factors.stockUtilization * weights.stockUtilization;
    score += (100 - factors.lowStockRatio) * weights.lowStockRatio; // Inverse for low stock
    score += factors.categoryBalance * weights.categoryBalance;
    score += factors.inventoryAge * weights.inventoryAge;

    let rating: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90) rating = 'excellent';
    else if (score >= 75) rating = 'good';
    else if (score >= 60) rating = 'fair';
    else rating = 'poor';

    return { score, rating, factors };
  }

  /**
   * Calculate category balance score
   */
  private calculateCategoryBalance(categories: any[]): number {
    if (categories.length === 0) return 0;
    
    const totalValue = categories.reduce((sum, cat) => sum + cat.total_value, 0);
    if (totalValue === 0) return 0;

    // Calculate how evenly distributed the categories are
    const expectedRatio = 1 / categories.length;
    const actualRatios = categories.map(cat => cat.total_value / totalValue);
    
    // Calculate variance from expected distribution
    const variance = actualRatios.reduce((sum, ratio) => {
      return sum + Math.pow(ratio - expectedRatio, 2);
    }, 0) / categories.length;

    // Convert variance to a 0-100 score (lower variance = higher score)
    return Math.max(0, 100 - (variance * 1000));
  }
}

// Create and export singleton instance
export const inventoryReportService = new InventoryReportService();
export default inventoryReportService;