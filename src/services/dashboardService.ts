// services/dashboardService.ts

import { 
  API_CONFIG, 
  API_ENDPOINTS, 
  ApiUtils, 
  HTTP_METHODS, 
  ERROR_MESSAGES 
} from '../constants/api';

import type {
  DashboardReport,
  SalesSummaryResponse,
  InventorySummaryResponse,
  LowStockAlertResponse,
  ApiError
} from '../types/reports';

import { salesReportService } from './salesReportService';
import { inventoryReportService } from './inventoryReportService';

// Extended endpoints for dashboard (not modifying api.ts)
const DASHBOARD_ENDPOINTS = {
  DASHBOARD: '/reports/dashboard',
} as const;

interface DashboardMetrics {
  totalRevenue: number;
  totalInventoryValue: number;
  activeStocks: number;
  lowStockItems: number;
  qualityRate: number;
  recentActivity: {
    stockAdditions: number;
    productions: number;
  };
  trends: {
    revenueTrend: 'up' | 'down' | 'stable';
    inventoryTrend: 'up' | 'down' | 'stable';
    qualityTrend: 'up' | 'down' | 'stable';
  };
  alerts: {
    criticalLowStock: number;
    qualityIssues: number;
    systemAlerts: number;
  };
}

interface PerformanceKPIs {
  revenue: {
    current: number;
    target: number;
    percentage: number;
  };
  production: {
    current: number;
    target: number;
    percentage: number;
  };
  quality: {
    current: number;
    target: number;
    percentage: number;
  };
  inventory: {
    current: number;
    target: number;
    percentage: number;
  };
}

class DashboardService {
  private baseURL = API_CONFIG.BASE_URL;

  /**
   * Get complete dashboard report
   */
  async getDashboardReport(): Promise<DashboardReport> {
    try {
      const url = ApiUtils.buildUrl(DASHBOARD_ENDPOINTS.DASHBOARD);
      
      const response = await fetch(url, {
        method: HTTP_METHODS.GET,
        headers: ApiUtils.getAuthHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(ApiUtils.getErrorMessage(response.status));
      }

      const data: DashboardReport = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching dashboard report:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get dashboard metrics summary
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const dashboardData = await this.getDashboardReport();
      
      const trends = await this.calculateTrends();
      const alerts = await this.getSystemAlerts();

      return {
        totalRevenue: dashboardData.sales_summary.total_revenue,
        totalInventoryValue: dashboardData.inventory_summary.total_inventory_value,
        activeStocks: dashboardData.inventory_summary.active_stocks,
        lowStockItems: dashboardData.low_stock_alerts.total_low_stock_items,
        qualityRate: dashboardData.sales_summary.quality_rate,
        recentActivity: {
          stockAdditions: dashboardData.recent_activity.stock_additions_7_days,
          productions: dashboardData.recent_activity.productions_7_days,
        },
        trends,
        alerts,
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get performance KPIs with targets
   */
  async getPerformanceKPIs(targets?: {
    revenue?: number;
    production?: number;
    quality?: number;
    inventory?: number;
  }): Promise<PerformanceKPIs> {
    try {
      const dashboardData = await this.getDashboardReport();
      
      // Default targets (you can customize these)
      const defaultTargets = {
        revenue: 100000,
        production: 10000,
        quality: 95,
        inventory: 500000,
      };

      const finalTargets = { ...defaultTargets, ...targets };

      return {
        revenue: {
          current: dashboardData.sales_summary.total_revenue,
          target: finalTargets.revenue,
          percentage: (dashboardData.sales_summary.total_revenue / finalTargets.revenue) * 100,
        },
        production: {
          current: dashboardData.sales_summary.total_good_pieces,
          target: finalTargets.production,
          percentage: (dashboardData.sales_summary.total_good_pieces / finalTargets.production) * 100,
        },
        quality: {
          current: dashboardData.sales_summary.quality_rate,
          target: finalTargets.quality,
          percentage: (dashboardData.sales_summary.quality_rate / finalTargets.quality) * 100,
        },
        inventory: {
          current: dashboardData.inventory_summary.total_inventory_value,
          target: finalTargets.inventory,
          percentage: (dashboardData.inventory_summary.total_inventory_value / finalTargets.inventory) * 100,
        },
      };
    } catch (error) {
      console.error('Error fetching performance KPIs:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get real-time dashboard updates
   */
  async getRealtimeUpdates(): Promise<{
    lastUpdated: string;
    newStockItems: number;
    newProcesses: number;
    alertsCount: number;
    systemStatus: 'healthy' | 'warning' | 'critical';
  }> {
    try {
      const [salesSummary, inventorySummary, lowStockAlerts] = await Promise.all([
        salesReportService.getSalesSummary(),
        inventoryReportService.getInventorySummary(),
        inventoryReportService.getLowStockAlert({ threshold: 10 }),
      ]);

      const systemStatus = this.determineSystemStatus(salesSummary, inventorySummary, lowStockAlerts);

      return {
        lastUpdated: new Date().toISOString(),
        newStockItems: inventorySummary.active_stocks,
        newProcesses: salesSummary.recent_activity_30_days,
        alertsCount: lowStockAlerts.total_low_stock_items,
        systemStatus,
      };
    } catch (error) {
      console.error('Error fetching realtime updates:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get critical alerts summary
   */
  async getCriticalAlerts(): Promise<{
    critical: Array<{
      type: 'stock' | 'quality' | 'system';
      message: string;
      severity: 'critical' | 'warning' | 'info';
      timestamp: string;
    }>;
    count: number;
  }> {
    try {
      const [lowStockAlerts, salesSummary] = await Promise.all([
        inventoryReportService.getCriticalLowStockItems(),
        salesReportService.getSalesSummary(),
      ]);

      const alerts = [];

      // Low stock alerts
      if (lowStockAlerts.total_low_stock_items > 0) {
        alerts.push({
          type: 'stock' as const,
          message: `${lowStockAlerts.total_low_stock_items} items are critically low in stock`,
          severity: 'critical' as const,
          timestamp: new Date().toISOString(),
        });
      }

      // Quality alerts
      if (salesSummary.quality_rate < 90) {
        alerts.push({
          type: 'quality' as const,
          message: `Quality rate is below target (${salesSummary.quality_rate.toFixed(1)}%)`,
          severity: salesSummary.quality_rate < 80 ? 'critical' as const : 'warning' as const,
          timestamp: new Date().toISOString(),
        });
      }

      // System alerts (you can expand this based on your needs)
      alerts.push({
        type: 'system' as const,
        message: 'System is operating normally',
        severity: 'info' as const,
        timestamp: new Date().toISOString(),
      });

      return {
        critical: alerts,
        count: alerts.filter(alert => alert.severity === 'critical').length,
      };
    } catch (error) {
      console.error('Error fetching critical alerts:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get top insights for dashboard
   */
  async getTopInsights(): Promise<Array<{
    title: string;
    description: string;
    value: string;
    trend: 'up' | 'down' | 'stable';
    category: 'sales' | 'inventory' | 'production' | 'quality';
  }>> {
    try {
      const dashboardData = await this.getDashboardReport();
      const insights = [];

      // Revenue insight
      insights.push({
        title: 'Total Revenue',
        description: 'Current period revenue performance',
        value: this.formatCurrency(dashboardData.sales_summary.total_revenue),
        trend: 'stable' as const, // You'd calculate this from historical data
        category: 'sales' as const,
      });

      // Inventory value insight
      insights.push({
        title: 'Inventory Value',
        description: 'Total value of current inventory',
        value: this.formatCurrency(dashboardData.inventory_summary.total_inventory_value),
        trend: 'up' as const,
        category: 'inventory' as const,
      });

      // Quality rate insight
      insights.push({
        title: 'Quality Rate',
        description: 'Production quality percentage',
        value: `${dashboardData.sales_summary.quality_rate.toFixed(1)}%`,
        trend: dashboardData.sales_summary.quality_rate >= 95 ? 'up' as const : 'down' as const,
        category: 'quality' as const,
      });

      // Production insight
      insights.push({
        title: 'Good Production',
        description: 'Successfully produced items',
        value: dashboardData.sales_summary.total_good_pieces.toLocaleString(),
        trend: 'up' as const,
        category: 'production' as const,
      });

      return insights;
    } catch (error) {
      console.error('Error fetching top insights:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get weekly summary report
   */
  async getWeeklySummary(): Promise<{
    weekRange: string;
    summary: {
      totalRevenue: number;
      totalProduction: number;
      qualityRate: number;
      newStockItems: number;
      stockMovements: number;
    };
    comparison: {
      revenueChange: number;
      productionChange: number;
      qualityChange: number;
    };
  }> {
    try {
      // Get current week data
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Get previous week data for comparison
      const prevEndDate = new Date(startDate.getTime() - 1);
      const prevStartDate = new Date(prevEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [currentWeekSales, previousWeekSales] = await Promise.all([
        salesReportService.getSalesReportByDateRange(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        ),
        salesReportService.getSalesReportByDateRange(
          prevStartDate.toISOString().split('T')[0],
          prevEndDate.toISOString().split('T')[0]
        ),
      ]);

      const weekRange = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;

      return {
        weekRange,
        summary: {
          totalRevenue: currentWeekSales.summary.total_revenue,
          totalProduction: currentWeekSales.summary.total_pieces_produced,
          qualityRate: currentWeekSales.summary.quality_rate,
          newStockItems: 0, // Would need stock creation data
          stockMovements: currentWeekSales.summary.total_pieces_produced,
        },
        comparison: {
          revenueChange: this.calculatePercentageChange(
            previousWeekSales.summary.total_revenue,
            currentWeekSales.summary.total_revenue
          ),
          productionChange: this.calculatePercentageChange(
            previousWeekSales.summary.total_pieces_produced,
            currentWeekSales.summary.total_pieces_produced
          ),
          qualityChange: currentWeekSales.summary.quality_rate - previousWeekSales.summary.quality_rate,
        },
      };
    } catch (error) {
      console.error('Error fetching weekly summary:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Calculate trends (simplified - you'd use historical data for accurate trends)
   */
  private async calculateTrends(): Promise<{
    revenueTrend: 'up' | 'down' | 'stable';
    inventoryTrend: 'up' | 'down' | 'stable';
    qualityTrend: 'up' | 'down' | 'stable';
  }> {
    // This is simplified - in real implementation, you'd compare with historical data
    return {
      revenueTrend: 'stable',
      inventoryTrend: 'up',
      qualityTrend: 'stable',
    };
  }

  /**
   * Get system alerts
   */
  private async getSystemAlerts(): Promise<{
    criticalLowStock: number;
    qualityIssues: number;
    systemAlerts: number;
  }> {
    try {
      const [lowStockAlerts, salesSummary] = await Promise.all([
        inventoryReportService.getCriticalLowStockItems(),
        salesReportService.getSalesSummary(),
      ]);

      return {
        criticalLowStock: lowStockAlerts.total_low_stock_items,
        qualityIssues: salesSummary.quality_rate < 90 ? 1 : 0,
        systemAlerts: 0, // Add your system health checks here
      };
    } catch (error) {
      return {
        criticalLowStock: 0,
        qualityIssues: 0,
        systemAlerts: 1, // Error counts as system alert
      };
    }
  }

  /**
   * Determine overall system status
   */
  private determineSystemStatus(
    salesSummary: SalesSummaryResponse,
    inventorySummary: InventorySummaryResponse,
    lowStockAlerts: LowStockAlertResponse
  ): 'healthy' | 'warning' | 'critical' {
    // Critical conditions
    if (lowStockAlerts.total_low_stock_items > 5 || salesSummary.quality_rate < 80) {
      return 'critical';
    }
    
    // Warning conditions
    if (lowStockAlerts.total_low_stock_items > 0 || salesSummary.quality_rate < 90) {
      return 'warning';
    }
    
    return 'healthy';
  }

  /**
   * Calculate percentage change
   */
  private calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Format currency for display
   */
  private formatCurrency(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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
   * Refresh all dashboard data
   */
  async refreshDashboard(): Promise<{
    success: boolean;
    lastRefresh: string;
    dataAge: string;
  }> {
    try {
      // Refresh all data sources
      await Promise.all([
        this.getDashboardReport(),
        salesReportService.getSalesSummary(),
        inventoryReportService.getInventorySummary(),
      ]);

      return {
        success: true,
        lastRefresh: new Date().toISOString(),
        dataAge: '0 minutes',
      };
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      return {
        success: false,
        lastRefresh: new Date().toISOString(),
        dataAge: 'unknown',
      };
    }
  }

  /**
   * Get dashboard configuration for user preferences
   */
  getDashboardConfig(): {
    refreshInterval: number;
    autoRefresh: boolean;
    defaultView: string;
    widgets: string[];
  } {
    // This could be stored in user preferences
    return {
      refreshInterval: 300000, // 5 minutes
      autoRefresh: true,
      defaultView: 'overview',
      widgets: ['revenue', 'inventory', 'quality', 'alerts', 'recent_activity'],
    };
  }

  /**
   * Update dashboard configuration
   */
  updateDashboardConfig(config: Partial<{
    refreshInterval: number;
    autoRefresh: boolean;
    defaultView: string;
    widgets: string[];
  }>): boolean {
    // In a real implementation, this would save to user preferences
    console.log('Dashboard config updated:', config);
    return true;
  }
}

// Create and export singleton instance
export const dashboardService = new DashboardService();
export default dashboardService;