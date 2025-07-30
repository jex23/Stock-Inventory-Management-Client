// services/salesReportService.ts

import { 
  API_CONFIG, 
  API_ENDPOINTS, 
  ApiUtils, 
  HTTP_METHODS, 
  ERROR_MESSAGES,
  STORAGE_KEYS
} from '../constants/api';

import type { PinEntry } from '../types/auth';

import type {
  SalesReport,
  SalesReportQueryParams,
  SalesSummaryResponse,
  ApiResponse,
  ApiError
} from '../types/reports';

// Extended endpoints for sales reports (not modifying api.ts)
const SALES_REPORT_ENDPOINTS = {
  SALES_REPORT: '/reports/sales',
  SALES_SUMMARY: '/reports/sales/summary',
  SALES_EXPORT_CSV: '/reports/export/sales',
  SALES_EXPORT_EXCEL: '/reports/sales/export', // Use proper export endpoint
} as const;

class SalesReportService {
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
   * Get comprehensive sales report with filters
   */
  async getSalesReport(params?: SalesReportQueryParams): Promise<SalesReport> {
    try {
      const url = ApiUtils.buildUrl(SALES_REPORT_ENDPOINTS.SALES_REPORT, params);
      
      const response = await fetch(url, {
        method: HTTP_METHODS.GET,
        headers: ApiUtils.getAuthHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(ApiUtils.getErrorMessage(response.status));
      }

      const data: SalesReport = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching sales report:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get sales summary for dashboard
   */
  async getSalesSummary(): Promise<SalesSummaryResponse> {
    try {
      const url = ApiUtils.buildUrl(SALES_REPORT_ENDPOINTS.SALES_SUMMARY);
      
      const response = await fetch(url, {
        method: HTTP_METHODS.GET,
        headers: ApiUtils.getAuthHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(ApiUtils.getErrorMessage(response.status));
      }

      const data: SalesSummaryResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching sales summary:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Export sales report as CSV
   */
  async exportSalesReportCSV(params?: SalesReportQueryParams): Promise<Blob> {
    try {
      const url = ApiUtils.buildUrl(SALES_REPORT_ENDPOINTS.SALES_EXPORT_CSV, params);
      
      const response = await fetch(url, {
        method: HTTP_METHODS.GET,
        headers: ApiUtils.getAuthHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(ApiUtils.getErrorMessage(response.status));
      }

      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Error exporting sales report:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Export sales report as Excel with PIN authentication (client-side generation)
   */
  async exportSalesReportExcel(pin: string, params?: SalesReportQueryParams): Promise<Blob> {
    try {
      // Get current user's email
      const email = this.getCurrentUserEmail();
      
      // Validate PIN directly with /enter-pin endpoint
      const pinData: PinEntry = {
        email: email,
        pin: pin
      };

      const pinResponse = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.ENTER_PIN}`, {
        method: HTTP_METHODS.POST,
        headers: API_CONFIG.HEADERS,
        body: JSON.stringify(pinData),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!pinResponse.ok) {
        const errorData = await pinResponse.json().catch(() => ({ detail: 'Invalid PIN or email' }));
        throw new Error(errorData.detail || 'PIN authentication failed');
      }

      const authData = await pinResponse.json();
      
      // Get sales report data using the authenticated token
      const reportUrl = ApiUtils.buildUrl(SALES_REPORT_ENDPOINTS.SALES_REPORT, params);
      
      const reportResponse = await fetch(reportUrl, {
        method: HTTP_METHODS.GET,
        headers: {
          ...API_CONFIG.HEADERS,
          'Authorization': `Bearer ${authData.access_token}`
        },
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!reportResponse.ok) {
        throw new Error(ApiUtils.getErrorMessage(reportResponse.status));
      }

      const salesData = await reportResponse.json();
      
      // Convert to CSV format (since Excel export requires additional libraries)
      const csvContent = this.convertToCSV(salesData);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      return blob;
    } catch (error) {
      console.error('Error exporting sales report Excel:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Convert sales report data to CSV format
   */
  private convertToCSV(salesData: SalesReport): string {
    const lines: string[] = [];
    
    // Add header
    lines.push('Sales Report');
    lines.push(`Generated at: ${new Date(salesData.generated_at).toLocaleString()}`);
    lines.push(`Date Range: ${salesData.date_range.start} to ${salesData.date_range.end}`);
    lines.push('');
    
    // Add summary
    lines.push('SUMMARY');
    lines.push(`Total Production Batches,${salesData.summary.total_production_batches}`);
    lines.push(`Total Pieces Produced,${salesData.summary.total_pieces_produced}`);
    lines.push(`Total Pieces Good,${salesData.summary.total_pieces_good}`);
    lines.push(`Total Pieces Defect,${salesData.summary.total_pieces_defect}`);
    lines.push(`Total Revenue,₱${salesData.summary.total_revenue}`);
    lines.push(`Quality Rate,${salesData.summary.quality_rate}%`);
    lines.push(`Defect Rate,${salesData.summary.defect_rate}%`);
    lines.push(`Average Output Price,₱${salesData.summary.average_output_price}`);
    lines.push('');
    
    // Add details header
    lines.push('DETAILED DATA');
    lines.push('Process ID,Batch Number,Product Name,Supplier Name,User Name,Pieces Used,Pieces Good,Pieces Defect,Price Output,Revenue,Manufactured Date,Quality Rate');
    
    // Add details
    salesData.details.forEach(detail => {
      const row = [
        detail.process_id,
        detail.process_batch_number,
        `"${detail.product_name}"`, // Quote product names to handle commas
        `"${detail.supplier_name}"`,
        `"${detail.user_name}"`,
        detail.pieces_used,
        detail.pieces_good || 0,
        detail.pieces_defect || 0,
        detail.price_output || 0,
        detail.revenue || 0,
        new Date(detail.manufactured_date).toLocaleDateString(),
        detail.quality_rate ? `${detail.quality_rate}%` : 'N/A'
      ];
      lines.push(row.join(','));
    });
    
    return lines.join('\n');
  }

  /**
   * Download CSV file
   */
  downloadCSV(blob: Blob, filename?: string): void {
    try {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `sales_report_${new Date().toISOString().split('T')[0]}.csv`;
      
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
   * Download Excel file (CSV format)
   */
  downloadExcel(blob: Blob, filename?: string): void {
    try {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `sales_report_${new Date().toISOString().split('T')[0]}.csv`;
      
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
   * Get sales report with date range
   */
  async getSalesReportByDateRange(
    startDate: string, 
    endDate: string, 
    additionalParams?: Omit<SalesReportQueryParams, 'start_date' | 'end_date'>
  ): Promise<SalesReport> {
    const params: SalesReportQueryParams = {
      start_date: startDate,
      end_date: endDate,
      ...additionalParams,
    };

    return this.getSalesReport(params);
  }

  /**
   * Get sales report for specific product
   */
  async getSalesReportByProduct(
    productId: number, 
    additionalParams?: Omit<SalesReportQueryParams, 'product_id'>
  ): Promise<SalesReport> {
    const params: SalesReportQueryParams = {
      product_id: productId,
      ...additionalParams,
    };

    return this.getSalesReport(params);
  }

  /**
   * Get sales report for specific user
   */
  async getSalesReportByUser(
    userId: number, 
    additionalParams?: Omit<SalesReportQueryParams, 'user_id'>
  ): Promise<SalesReport> {
    const params: SalesReportQueryParams = {
      user_id: userId,
      ...additionalParams,
    };

    return this.getSalesReport(params);
  }

  /**
   * Get sales report for current month
   */
  async getCurrentMonthSalesReport(): Promise<SalesReport> {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    return this.getSalesReportByDateRange(startDate, endDate);
  }

  /**
   * Get sales report for last 30 days
   */
  async getLast30DaysSalesReport(): Promise<SalesReport> {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return this.getSalesReportByDateRange(startDate, endDate);
  }

  /**
   * Get sales report for last 7 days
   */
  async getLast7DaysSalesReport(): Promise<SalesReport> {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return this.getSalesReportByDateRange(startDate, endDate);
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): ApiError {
    if (error instanceof Error) {
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
   * Validate date range
   */
  private validateDateRange(startDate: string, endDate: string): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }
    
    if (start > end) {
      throw new Error('Start date cannot be after end date');
    }
    
    return true;
  }

  /**
   * Format date for API
   */
  private formatDateForAPI(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get sales metrics from report
   */
  getSalesMetrics(report: SalesReport) {
    const { summary } = report;
    
    return {
      totalRevenue: summary.total_revenue,
      totalProduction: summary.total_pieces_produced,
      qualityRate: summary.quality_rate,
      defectRate: summary.defect_rate,
      averagePrice: summary.average_output_price,
      batchCount: summary.total_production_batches,
      profitMargin: this.calculateProfitMargin(summary.total_revenue, summary.total_pieces_produced),
      productivityScore: this.calculateProductivityScore(summary.total_pieces_good, summary.total_pieces_produced),
    };
  }

  /**
   * Calculate profit margin (simplified)
   */
  private calculateProfitMargin(revenue: number, production: number): number {
    if (production === 0) return 0;
    // This is a simplified calculation - you'd need cost data for actual profit margin
    const estimatedCostPerUnit = 5; // Replace with actual cost calculation
    const totalCost = production * estimatedCostPerUnit;
    return ((revenue - totalCost) / revenue) * 100;
  }

  /**
   * Calculate productivity score
   */
  private calculateProductivityScore(goodPieces: number, totalProduced: number): number {
    if (totalProduced === 0) return 0;
    return (goodPieces / totalProduced) * 100;
  }

  /**
   * Get top performing periods from sales data
   */
  getTopPerformingPeriods(report: SalesReport, limit = 5) {
    return report.summary.production_by_date
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, limit);
  }

  /**
   * Export sales report as Excel with PIN validation and download
   */
  async exportAndDownloadExcel(pin: string, params?: SalesReportQueryParams, filename?: string): Promise<void> {
    try {
      const blob = await this.exportSalesReportExcel(pin, params);
      this.downloadExcel(blob, filename);
    } catch (error) {
      console.error('Error exporting and downloading Excel:', error);
      throw error;
    }
  }

  /**
   * Get performance comparison between periods
   */
  async getPerformanceComparison(
    currentPeriodStart: string,
    currentPeriodEnd: string,
    previousPeriodStart: string,
    previousPeriodEnd: string
  ) {
    const [currentReport, previousReport] = await Promise.all([
      this.getSalesReportByDateRange(currentPeriodStart, currentPeriodEnd),
      this.getSalesReportByDateRange(previousPeriodStart, previousPeriodEnd),
    ]);

    const currentMetrics = this.getSalesMetrics(currentReport);
    const previousMetrics = this.getSalesMetrics(previousReport);

    return {
      current: currentMetrics,
      previous: previousMetrics,
      growth: {
        revenue: this.calculateGrowthRate(previousMetrics.totalRevenue, currentMetrics.totalRevenue),
        production: this.calculateGrowthRate(previousMetrics.totalProduction, currentMetrics.totalProduction),
        quality: currentMetrics.qualityRate - previousMetrics.qualityRate,
      },
    };
  }

  /**
   * Calculate growth rate percentage
   */
  private calculateGrowthRate(previous: number, current: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }
}

// Create and export singleton instance
export const salesReportService = new SalesReportService();
export default salesReportService;