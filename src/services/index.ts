// services/index.ts - Export all report services

export { salesReportService, default as SalesReportService } from './salesReportService';
export { inventoryReportService, default as InventoryReportService } from './inventoryReportService';
export { dashboardService, default as DashboardService } from './dashboardService';

// Re-export types for convenience
export type {
  SalesReport,
  SalesReportSummary,
  SalesDetailItem,
  SalesReportQueryParams,
  SalesSummaryResponse,
  InventoryReport,
  InventoryReportSummary,
  InventoryStockItem,
  InventoryReportQueryParams,
  InventorySummaryResponse,
  LowStockAlertResponse,
  DashboardReport,
  ApiResponse,
  ApiError
} from '../types/reports';

// ============================================================================
// services/reportExportService.ts - Dedicated export service
// ============================================================================

import { 
  API_CONFIG, 
  ERROR_MESSAGES 
} from '../constants/api';

import type {
  SalesReportQueryParams,
  InventoryReportQueryParams,
  ApiError
} from '../types/reports';

import { salesReportService } from './salesReportService';
import { inventoryReportService } from './inventoryReportService';
import dashboardService from './dashboardService';

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf' | 'json';
  filename?: string;
  includeCharts?: boolean;
  customFields?: string[];
}

export interface ExportResult {
  success: boolean;
  filename: string;
  size: number;
  downloadUrl?: string;
  error?: string;
}

class ReportExportService {
  private baseURL = API_CONFIG.BASE_URL;

  /**
   * Export sales report in various formats
   */
  async exportSalesReport(
    params?: SalesReportQueryParams,
    options: ExportOptions = { format: 'csv' }
  ): Promise<ExportResult> {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const baseFilename = options.filename || `sales_report_${timestamp}`;
      
      switch (options.format) {
        case 'csv':
          return await this.exportSalesCSV(params, baseFilename);
        case 'json':
          return await this.exportSalesJSON(params, baseFilename);
        case 'excel':
          return await this.exportSalesExcel(params, baseFilename);
        case 'pdf':
          return await this.exportSalesPDF(params, baseFilename);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error('Error exporting sales report:', error);
      return {
        success: false,
        filename: '',
        size: 0,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Export inventory report in various formats
   */
  async exportInventoryReport(
    params?: InventoryReportQueryParams,
    options: ExportOptions = { format: 'csv' }
  ): Promise<ExportResult> {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const baseFilename = options.filename || `inventory_report_${timestamp}`;
      
      switch (options.format) {
        case 'csv':
          return await this.exportInventoryCSV(params, baseFilename);
        case 'json':
          return await this.exportInventoryJSON(params, baseFilename);
        case 'excel':
          return await this.exportInventoryExcel(params, baseFilename);
        case 'pdf':
          return await this.exportInventoryPDF(params, baseFilename);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error('Error exporting inventory report:', error);
      return {
        success: false,
        filename: '',
        size: 0,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Export sales report as CSV
   */
  private async exportSalesCSV(params?: SalesReportQueryParams, baseFilename?: string): Promise<ExportResult> {
    try {
      const blob = await salesReportService.exportSalesReportCSV(params);
      const filename = `${baseFilename || 'sales_report'}.csv`;
      
      this.downloadBlob(blob, filename);
      
      return {
        success: true,
        filename,
        size: blob.size,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Export inventory report as CSV
   */
  private async exportInventoryCSV(_params?: InventoryReportQueryParams, _baseFilename?: string): Promise<ExportResult> {
    try {
      // Note: This method requires PIN authentication
      // For now, we'll use a placeholder or throw an error
      throw new Error('PIN authentication required for inventory CSV export');
      
      // If PIN was available, it would be:
      // const blob = await inventoryReportService.exportInventoryReportCSV(pin, _params);
      // const filename = `${_baseFilename || 'inventory_report'}.csv`;
      // this.downloadBlob(blob, filename);
      // return { success: true, filename, size: blob.size };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Export sales report as JSON
   */
  private async exportSalesJSON(params?: SalesReportQueryParams, baseFilename?: string): Promise<ExportResult> {
    try {
      const report = await salesReportService.getSalesReport(params);
      const jsonData = JSON.stringify(report, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const filename = `${baseFilename || 'sales_report'}.json`;
      
      this.downloadBlob(blob, filename);
      
      return {
        success: true,
        filename,
        size: blob.size,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Export inventory report as JSON
   */
  private async exportInventoryJSON(params?: InventoryReportQueryParams, baseFilename?: string): Promise<ExportResult> {
    try {
      const report = await inventoryReportService.getInventoryReport(params);
      const jsonData = JSON.stringify(report, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const filename = `${baseFilename || 'inventory_report'}.json`;
      
      this.downloadBlob(blob, filename);
      
      return {
        success: true,
        filename,
        size: blob.size,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Export sales report as Excel (requires additional processing)
   */
  private async exportSalesExcel(params?: SalesReportQueryParams, baseFilename?: string): Promise<ExportResult> {
    try {
      // For Excel export, you'd typically need a library like SheetJS or ExcelJS
      // For now, we'll export as CSV and rename the extension
      const report = await salesReportService.getSalesReport(params);
      const csvData = this.convertSalesReportToCSV(report);
      const blob = new Blob([csvData], { type: 'application/vnd.ms-excel' });
      const filename = `${baseFilename || 'sales_report'}.xlsx`;
      
      this.downloadBlob(blob, filename);
      
      return {
        success: true,
        filename,
        size: blob.size,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Export inventory report as Excel
   */
  private async exportInventoryExcel(params?: InventoryReportQueryParams, baseFilename?: string): Promise<ExportResult> {
    try {
      const report = await inventoryReportService.getInventoryReport(params);
      const csvData = this.convertInventoryReportToCSV(report);
      const blob = new Blob([csvData], { type: 'application/vnd.ms-excel' });
      const filename = `${baseFilename || 'inventory_report'}.xlsx`;
      
      this.downloadBlob(blob, filename);
      
      return {
        success: true,
        filename,
        size: blob.size,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Export sales report as PDF (requires PDF generation library)
   */
  private async exportSalesPDF(params?: SalesReportQueryParams, baseFilename?: string): Promise<ExportResult> {
    try {
      // For PDF export, you'd use a library like jsPDF or similar
      // This is a placeholder implementation
      const report = await salesReportService.getSalesReport(params);
      const pdfContent = this.generateSalesPDFContent(report);
      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      const filename = `${baseFilename || 'sales_report'}.pdf`;
      
      this.downloadBlob(blob, filename);
      
      return {
        success: true,
        filename,
        size: blob.size,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Export inventory report as PDF
   */
  private async exportInventoryPDF(params?: InventoryReportQueryParams, baseFilename?: string): Promise<ExportResult> {
    try {
      const report = await inventoryReportService.getInventoryReport(params);
      const pdfContent = this.generateInventoryPDFContent(report);
      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      const filename = `${baseFilename || 'inventory_report'}.pdf`;
      
      this.downloadBlob(blob, filename);
      
      return {
        success: true,
        filename,
        size: blob.size,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Download blob as file
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(url);
  }

  /**
   * Convert sales report to CSV format
   */
  private convertSalesReportToCSV(report: any): string {
    const headers = [
      'Process ID', 'Batch Number', 'Product Name', 'Supplier Name', 
      'User Name', 'Pieces Used', 'Pieces Good', 'Pieces Defect', 
      'Price Output', 'Revenue', 'Quality Rate %', 'Manufactured Date'
    ];

    const rows = report.details.map((detail: any) => [
      detail.process_id,
      detail.process_batch_number,
      detail.product_name,
      detail.supplier_name,
      detail.user_name,
      detail.pieces_used,
      detail.pieces_good || 0,
      detail.pieces_defect || 0,
      detail.price_output || 0,
      detail.revenue || 0,
      detail.quality_rate || 0,
      detail.manufactured_date
    ]);

    return [headers, ...rows]
      .map(row => row.map((field: any) => `"${field}"`).join(','))
      .join('\n');
  }

  /**
   * Convert inventory report to CSV format
   */
  private convertInventoryReportToCSV(report: any): string {
    const headers = [
      'Stock ID', 'Batch', 'Product Name', 'Supplier Name', 'Category',
      'Available Pieces', 'Product Price', 'Product Unit', 'Product Quantity',
      'Total Value', 'Is Low Stock', 'Created Date'
    ];

    const rows = report.stock_details.map((item: any) => [
      item.stock_id,
      item.batch,
      item.product_name,
      item.supplier_name,
      item.category,
      item.available_pieces,
      item.product_price,
      item.product_unit,
      item.product_quantity,
      item.total_value,
      item.is_low_stock ? 'Yes' : 'No',
      item.created_at
    ]);

    return [headers, ...rows]
      .map(row => row.map((field: any) => `"${field}"`).join(','))
      .join('\n');
  }

  /**
   * Generate PDF content for sales report (placeholder)
   */
  private generateSalesPDFContent(report: any): string {
    // This is a placeholder - you'd use a proper PDF library
    return `Sales Report PDF Content - implement with jsPDF or similar library`;
  }

  /**
   * Generate PDF content for inventory report (placeholder)
   */
  private generateInventoryPDFContent(report: any): string {
    // This is a placeholder - you'd use a proper PDF library
    return `Inventory Report PDF Content - implement with jsPDF or similar library`;
  }

  /**
   * Bulk export multiple reports
   */
  async bulkExport(exports: Array<{
    type: 'sales' | 'inventory';
    params?: any;
    options?: ExportOptions;
  }>): Promise<ExportResult[]> {
    const results: ExportResult[] = [];

    for (const exportConfig of exports) {
      try {
        let result: ExportResult;
        
        if (exportConfig.type === 'sales') {
          result = await this.exportSalesReport(exportConfig.params, exportConfig.options);
        } else {
          result = await this.exportInventoryReport(exportConfig.params, exportConfig.options);
        }
        
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          filename: '',
          size: 0,
          error: this.getErrorMessage(error),
        });
      }
    }

    return results;
  }

  /**
   * Schedule automated exports (placeholder for future feature)
   */
  scheduleExport(config: {
    reportType: 'sales' | 'inventory';
    frequency: 'daily' | 'weekly' | 'monthly';
    format: 'csv' | 'excel' | 'pdf';
    email?: string;
  }): boolean {
    // This would integrate with a scheduling system
    console.log('Export scheduled:', config);
    return true;
  }

  /**
   * Get export history (placeholder for future feature)
   */
  async getExportHistory(): Promise<Array<{
    id: string;
    type: string;
    filename: string;
    size: number;
    createdAt: string;
    downloadUrl?: string;
  }>> {
    // This would fetch from a backend service
    return [];
  }

  /**
   * Get error message from error object
   */
  private getErrorMessage(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    return ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  /**
   * Validate export parameters
   */
  private validateExportParams(params: any): boolean {
    // Add validation logic for export parameters
    return true;
  }

  /**
   * Get supported export formats
   */
  getSupportedFormats(): string[] {
    return ['csv', 'json', 'excel', 'pdf'];
  }

  /**
   * Get export size limit
   */
  getExportSizeLimit(): number {
    return 50 * 1024 * 1024; // 50MB
  }

  /**
   * Estimate export size
   */
  async estimateExportSize(type: 'sales' | 'inventory', params?: any): Promise<number> {
    try {
      // This is a rough estimation - you'd implement more accurate sizing
      if (type === 'sales') {
        const report = await salesReportService.getSalesReport(params);
        return report.details.length * 200; // Rough estimate of 200 bytes per row
      } else {
        const report = await inventoryReportService.getInventoryReport(params);
        return report.stock_details.length * 300; // Rough estimate of 300 bytes per row
      }
    } catch (error) {
      return 0;
    }
  }
}

// Create and export singleton instance
export const reportExportService = new ReportExportService();

// ============================================================================
// Combined service exports
// ============================================================================

// Export all services as a combined object
export const reportServices = {
  sales: salesReportService,
  inventory: inventoryReportService,
  dashboard: dashboardService,
  export: reportExportService,
} as const;

// Default export
export default reportServices;