
import React, { useState, useEffect, useMemo, useRef } from 'react';
import './Dashboard.css';

// Import recharts components
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
// Import your services
import { dashboardService, salesReportService, inventoryReportService } from '../services';
import type {
  DashboardReport,
  SalesSummaryResponse,
  InventorySummaryResponse,
  LowStockAlertResponse
} from '../types/reports';

// Icon component interface
interface IconProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}

// Icons
const Icons = {
  Dashboard: ({ className = "dashboard__title-icon", width = "40", height = "40", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Refresh: ({ className, width = "16", height = "16", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Settings: ({ className, width = "16", height = "16", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  FileText: ({ className, width = "16", height = "16", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  DollarSign: ({ className, width = "24", height = "24", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
  ),
  Package: ({ className, width = "24", height = "24", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  TrendingUp: ({ className, width = "24", height = "24", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  AlertTriangle: ({ className, width = "24", height = "24", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  CheckCircle: ({ className, width = "24", height = "24", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Activity: ({ className, width = "24", height = "24", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  BarChart3: ({ className, width = "24", height = "24", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M8 17l4-4 4 4 6-6" />
    </svg>
  ),
  Users: ({ className, width = "24", height = "24", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Plus: ({ className, width = "24", height = "24", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Clock: ({ className, width = "16", height = "16", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ShoppingCart: ({ className, width = "24", height = "24", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5 6H2m5 7l-2 2m0 0l-2-2m2 2l2-2m5-2v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
    </svg>
  ),
  Building: ({ className, width = "24", height = "24", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Cog: ({ className, width = "24", height = "24", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
};

// Cache interface for storing dashboard data
interface CachedDashboardData {
  dashboardData: DashboardReport;
  salesSummary: SalesSummaryResponse;
  inventorySummary: InventorySummaryResponse;
  lowStockAlerts: LowStockAlertResponse;
  timestamp: number;
}

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;
const STORAGE_KEY = 'dashboard_cache';

interface DashboardProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const Dashboard: React.FC<DashboardProps> = ({
  className = '',
  autoRefresh = true,
  refreshInterval = 300000 // 5 minutes
}) => {
  // Cache reference
  const cacheRef = useRef<CachedDashboardData | null>(null);
  
  // State management
  const [dashboardData, setDashboardData] = useState<DashboardReport | null>(null);
  const [salesSummary, setSalesSummary] = useState<SalesSummaryResponse | null>(null);
  const [inventorySummary, setInventorySummary] = useState<InventorySummaryResponse | null>(null);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlertResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [systemStatus, setSystemStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy');
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);

  // Check if cached data is still valid
  const isCacheValid = (cachedData: CachedDashboardData): boolean => {
    const now = Date.now();
    return (now - cachedData.timestamp) < CACHE_DURATION;
  };

  // Load from localStorage cache
  const loadFromCache = (): CachedDashboardData | null => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsedCache = JSON.parse(cached) as CachedDashboardData;
        if (isCacheValid(parsedCache)) {
          return parsedCache;
        }
      }
    } catch (error) {
      console.warn('Failed to load dashboard cache:', error);
    }
    return null;
  };

  // Save to localStorage cache
  const saveToCache = (data: CachedDashboardData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      cacheRef.current = data;
    } catch (error) {
      console.warn('Failed to save dashboard cache:', error);
    }
  };

  // Load dashboard data with caching
  const loadDashboardData = async (forceRefresh = false) => {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = loadFromCache();
      if (cachedData) {
        setDashboardData(cachedData.dashboardData);
        setSalesSummary(cachedData.salesSummary);
        setInventorySummary(cachedData.inventorySummary);
        setLowStockAlerts(cachedData.lowStockAlerts);
        setLastUpdated(new Date(cachedData.timestamp));
        setIsFromCache(true);
        setError(null);
        
        // Determine system status
        if (cachedData.lowStockAlerts.total_low_stock_items > 5 || cachedData.salesSummary.quality_rate < 80) {
          setSystemStatus('critical');
        } else if (cachedData.lowStockAlerts.total_low_stock_items > 0 || cachedData.salesSummary.quality_rate < 90) {
          setSystemStatus('warning');
        } else {
          setSystemStatus('healthy');
        }
        
        // If it's first load and we have cache, skip loading state
        if (isFirstLoad) {
          setIsFirstLoad(false);
        }
        
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    setIsFromCache(false);
    
    try {
      const [dashboard, sales, inventory, alerts] = await Promise.all([
        dashboardService.getDashboardReport(),
        salesReportService.getSalesSummary(),
        inventoryReportService.getInventorySummary(),
        inventoryReportService.getLowStockAlert({ threshold: 10 })
      ]);
      
      // Cache the data
      const cacheData: CachedDashboardData = {
        dashboardData: dashboard,
        salesSummary: sales,
        inventorySummary: inventory,
        lowStockAlerts: alerts,
        timestamp: Date.now()
      };
      saveToCache(cacheData);
      
      setDashboardData(dashboard);
      setSalesSummary(sales);
      setInventorySummary(inventory);
      setLowStockAlerts(alerts);
      setLastUpdated(new Date());
      
      // Determine system status
      if (alerts.total_low_stock_items > 5 || sales.quality_rate < 80) {
        setSystemStatus('critical');
      } else if (alerts.total_low_stock_items > 0 || sales.quality_rate < 90) {
        setSystemStatus('warning');
      } else {
        setSystemStatus('healthy');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setIsFirstLoad(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(loadDashboardData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Handle manual refresh - force refresh
  const handleRefresh = () => {
    loadDashboardData(true);
  };

  // Memoized calculations
  const quickStats = useMemo(() => {
    if (!salesSummary || !inventorySummary) return null;
    
    return {
      totalRevenue: salesSummary.total_revenue,
      inventoryValue: inventorySummary.total_inventory_value,
      activeStocks: inventorySummary.active_stocks,
      qualityRate: salesSummary.quality_rate,
      lowStockItems: inventorySummary.low_stock_items,
      recentProduction: salesSummary.recent_activity_30_days
    };
  }, [salesSummary, inventorySummary]);

  // Chart colors
  const CHART_COLORS = {
    primary: '#3b82f6',
    secondary: '#10b981',
    accent: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    purple: '#8b5cf6',
    pink: '#ec4899',
    indigo: '#6366f1'
  };

  // Chart data for performance overview
  const chartData = useMemo(() => {
    if (!salesSummary || !inventorySummary || !dashboardData) return null;
    
    // Generate mock weekly data for the chart
    const generateWeeklyData = () => {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return days.map(day => ({
        day,
        revenue: Math.floor(Math.random() * 50000) + 10000,
        production: Math.floor(Math.random() * 100) + 20,
        quality: Math.floor(Math.random() * 20) + 80,
        inventory: Math.floor(Math.random() * 200) + 300
      }));
    };
    
    return {
      weeklyData: generateWeeklyData(),
      statusData: [
        { name: 'Active', value: inventorySummary.active_stocks, fill: CHART_COLORS.secondary },
        { name: 'Low Stock', value: inventorySummary.low_stock_items, fill: CHART_COLORS.accent },
        { name: 'Finished Products', value: inventorySummary.finished_products, fill: CHART_COLORS.primary },
        { name: 'Raw Materials', value: inventorySummary.raw_materials, fill: CHART_COLORS.purple }
      ]
    };
  }, [salesSummary, inventorySummary, dashboardData]);

  const recentActivity = useMemo(() => {
    if (!dashboardData) return [];
    
    return [
      {
        id: 1,
        type: 'success',
        icon: '📦',
        text: `${dashboardData.recent_activity.stock_additions_7_days} new stock items added`,
        time: 'Today',
        category: 'Inventory'
      },
      {
        id: 2,
        type: 'info',
        icon: '🏭',
        text: `${dashboardData.recent_activity.productions_7_days} production batches completed`,
        time: 'This week',
        category: 'Production'
      },
      {
        id: 3,
        type: lowStockAlerts?.total_low_stock_items ? 'warning' : 'success',
        icon: lowStockAlerts?.total_low_stock_items ? '⚠️' : '✅',
        text: lowStockAlerts?.total_low_stock_items 
          ? `${lowStockAlerts.total_low_stock_items} items need reordering`
          : 'All stock levels are healthy',
        time: 'Current',
        category: 'Alerts'
      }
    ];
  }, [dashboardData, lowStockAlerts]);

  const performanceMetrics = useMemo(() => {
    if (!salesSummary || !inventorySummary) return null;
    
    return {
      quality: {
        value: salesSummary.quality_rate,
        target: 95,
        percentage: (salesSummary.quality_rate / 95) * 100
      },
      inventory: {
        value: inventorySummary.active_stocks,
        target: 1000,
        percentage: (inventorySummary.active_stocks / 1000) * 100
      },
     
    };
  }, [salesSummary, inventorySummary]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Get time ago
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Render full-screen loading state for first load
  if (loading && isFirstLoad && !dashboardData) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        userSelect: 'none',
        pointerEvents: 'all'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          border: '4px solid #f3f4f6',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '24px'
        }}></div>
        <div style={{
          fontSize: '18px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '8px'
        }}>
          Loading Dashboard...
        </div>
        <div style={{
          fontSize: '14px',
          color: '#6b7280'
        }}>
          Please wait while we fetch your data
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`dashboard ${className} dashboard__fade-in`}>
      {/* Header */}
      <div className="dashboard__header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="dashboard__title">
              <Icons.Dashboard />
              Dashboard
            </h1>
            {isFromCache && (
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                backgroundColor: '#f3f4f6',
                padding: '4px 8px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                📄 Cached data
              </div>
            )}
          </div>
          <p className="dashboard__subtitle">
            Stock Inventory Management Overview
          </p>
        </div>
        <div className="dashboard__actions">
          <button
            className="dashboard__button dashboard__button--secondary"
            onClick={handleRefresh}
            disabled={loading}
          >
            <Icons.Refresh />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button className="dashboard__button dashboard__button--secondary">
            <Icons.Settings />
            Settings
          </button>
          <a href="/sales-report" className="dashboard__button dashboard__button--primary">
            <Icons.FileText />
            View Reports
          </a>
        </div>
      </div>

      {/* Status Bar */}
      <div className={`dashboard__status-bar dashboard__status-bar--${systemStatus}`}>
        <div className="dashboard__status-info">
          <div className="dashboard__status-icon">
            {systemStatus === 'healthy' ? (
              <Icons.CheckCircle />
            ) : systemStatus === 'warning' ? (
              <Icons.AlertTriangle />
            ) : (
              <Icons.AlertTriangle />
            )}
          </div>
          <div>
            <div className="dashboard__status-text">
              System Status: {systemStatus === 'healthy' ? 'All Systems Operational' : 
                             systemStatus === 'warning' ? 'Minor Issues Detected' : 
                             'Critical Issues Require Attention'}
            </div>
            <div className="dashboard__status-meta">
              {lastUpdated && `Last updated: ${getTimeAgo(lastUpdated)}`}
            </div>
          </div>
        </div>
        <div className="dashboard__status-actions">
          <div className="dashboard__refresh-time">
            Auto-refresh: {autoRefresh ? 'On' : 'Off'}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="dashboard__alert dashboard__alert--critical">
          <Icons.AlertTriangle className="dashboard__alert-icon" />
          <div className="dashboard__alert-content">
            <div className="dashboard__alert-title">Error</div>
            <div className="dashboard__alert-message">{error}</div>
          </div>
          <button 
            className="dashboard__alert-action"
            onClick={handleRefresh}
          >
            Retry
          </button>
        </div>
      )}

      {/* Quick Stats */}
      {quickStats && (
        <div className="dashboard__quick-stats">
          <div className="dashboard__stat-card dashboard__stat-card--success">
            <div className="dashboard__stat-header">
              <h3 className="dashboard__stat-title">Total Revenue</h3>
              <div className="dashboard__stat-icon dashboard__stat-icon--success">
                <Icons.DollarSign />
              </div>
            </div>
            <div className="dashboard__stat-value">
              {formatCurrency(quickStats.totalRevenue)}
            </div>
            <div className="dashboard__stat-change dashboard__stat-change--positive">
              <Icons.TrendingUp width="16" height="16" />
              Revenue generated
            </div>
            <div className="dashboard__stat-trend">
              Based on current period
            </div>
          </div>

          <div className="dashboard__stat-card dashboard__stat-card--info">
            <div className="dashboard__stat-header">
              <h3 className="dashboard__stat-title">Inventory Value</h3>
              <div className="dashboard__stat-icon dashboard__stat-icon--info">
                <Icons.Package />
              </div>
            </div>
            <div className="dashboard__stat-value">
              {formatCurrency(quickStats.inventoryValue)}
            </div>
            <div className="dashboard__stat-change dashboard__stat-change--neutral">
              Total asset value
            </div>
            <div className="dashboard__stat-trend">
              {quickStats.activeStocks.toLocaleString()} active items
            </div>
          </div>

          <div className="dashboard__stat-card dashboard__stat-card--warning">
            <div className="dashboard__stat-header">
              <h3 className="dashboard__stat-title">Quality Rate</h3>
              <div className="dashboard__stat-icon dashboard__stat-icon--warning">
                <Icons.CheckCircle />
              </div>
            </div>
            <div className="dashboard__stat-value">
              {formatPercentage(quickStats.qualityRate)}
            </div>
            <div className={`dashboard__stat-change ${
              quickStats.qualityRate >= 95 ? 'dashboard__stat-change--positive' :
              quickStats.qualityRate >= 90 ? 'dashboard__stat-change--neutral' :
              'dashboard__stat-change--negative'
            }`}>
              {quickStats.qualityRate >= 95 ? '🎯 Excellent' :
               quickStats.qualityRate >= 90 ? '👍 Good' :
               '⚠️ Needs improvement'}
            </div>
            <div className="dashboard__stat-trend">
              Production quality score
            </div>
          </div>

          <div className={`dashboard__stat-card ${
            quickStats.lowStockItems > 0 ? 'dashboard__stat-card--danger' : 'dashboard__stat-card--success'
          }`}>
            <div className="dashboard__stat-header">
              <h3 className="dashboard__stat-title">Stock Alerts</h3>
              <div className={`dashboard__stat-icon ${
                quickStats.lowStockItems > 0 ? 'dashboard__stat-icon--danger' : 'dashboard__stat-icon--success'
              }`}>
                <Icons.AlertTriangle />
              </div>
            </div>
            <div className="dashboard__stat-value">
              {quickStats.lowStockItems}
            </div>
            <div className={`dashboard__stat-change ${
              quickStats.lowStockItems === 0 ? 'dashboard__stat-change--positive' : 'dashboard__stat-change--negative'
            }`}>
              {quickStats.lowStockItems === 0 ? '✅ All good' : '⚠️ Need attention'}
            </div>
            <div className="dashboard__stat-trend">
              Low stock items
            </div>
          </div>
        </div>
      )}

      {/* Alerts Section */}
      {lowStockAlerts && lowStockAlerts.total_low_stock_items > 0 && (
        <div className="dashboard__alerts">
          <div className="dashboard__alert dashboard__alert--warning">
            <Icons.AlertTriangle className="dashboard__alert-icon" />
            <div className="dashboard__alert-content">
              <div className="dashboard__alert-title">Low Stock Warning</div>
              <div className="dashboard__alert-message">
                {lowStockAlerts.total_low_stock_items} items are running low and need reordering soon.
              </div>
            </div>
            <button className="dashboard__alert-action">
              View Items
            </button>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="dashboard__charts">
        {/* Performance Overview Chart */}
        <div className="dashboard__chart-container">
          <div className="dashboard__chart-header">
            <h3 className="dashboard__chart-title">
              <Icons.BarChart3 />
              Weekly Performance Overview
            </h3>
            <div className="dashboard__chart-actions">
              <button className="dashboard__chart-action dashboard__chart-action--active">
                Week
              </button>
              <button className="dashboard__chart-action">
                Month
              </button>
              <button className="dashboard__chart-action">
                Year
              </button>
            </div>
          </div>
          <div className="dashboard__chart" style={{ height: '300px' }}>
            {chartData?.weeklyData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.weeklyData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorProduction" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <YAxis 
                    yAxisId="revenue"
                    orientation="left"
                    stroke="#6b7280"
                    fontSize={12}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <YAxis 
                    yAxisId="production"
                    orientation="right"
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(Number(value)) : value,
                      name === 'revenue' ? 'Revenue' : 'Production'
                    ]}
                  />
                  <Area
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    stroke={CHART_COLORS.primary}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                  />
                  <Area
                    yAxisId="production"
                    type="monotone"
                    dataKey="production"
                    stroke={CHART_COLORS.secondary}
                    fillOpacity={1}
                    fill="url(#colorProduction)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280'
              }}>
                No chart data available
              </div>
            )}
          </div>
        </div>

        {/* Inventory Status Pie Chart */}
        <div className="dashboard__chart-container">
          <div className="dashboard__chart-header">
            <h3 className="dashboard__chart-title">
              <Icons.Package />
              Inventory Status
            </h3>
          </div>
          <div className="dashboard__chart" style={{ height: '300px' }}>
            {chartData?.statusData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value) => [value, 'Items']}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280'
              }}>
                No inventory data available
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dashboard__activity">
          <div className="dashboard__activity-header">
            <h3 className="dashboard__activity-title">
              <Icons.Activity />
              Recent Activity
            </h3>
          </div>
          <div className="dashboard__activity-list">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="dashboard__activity-item">
                <div className={`dashboard__activity-icon dashboard__activity-icon--${activity.type}`}>
                  {activity.icon}
                </div>
                <div className="dashboard__activity-content">
                  <div className="dashboard__activity-text">
                    {activity.text}
                  </div>
                  <div className="dashboard__activity-meta">
                    <span className="dashboard__activity-time">{activity.time}</span>
                    <span>{activity.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      {performanceMetrics && (
        <div className="dashboard__performance">
          <div className="dashboard__performance-card">
            <div className="dashboard__performance-header">
              <h4 className="dashboard__performance-title">Quality Score</h4>
              <div className="dashboard__performance-value">
                {formatPercentage(performanceMetrics.quality.value)}
              </div>
            </div>
            <div className="dashboard__performance-target">
              Target: {formatPercentage(performanceMetrics.quality.target)}
            </div>
            <div className="dashboard__performance-bar">
              <div 
                className="dashboard__performance-fill dashboard__performance-fill--success"
                style={{ width: `${Math.min(performanceMetrics.quality.percentage, 100)}%` }}
              ></div>
            </div>
            <div className="dashboard__performance-percentage">
              {formatPercentage(performanceMetrics.quality.percentage)} of target
            </div>
          </div>

          <div className="dashboard__performance-card">
            <div className="dashboard__performance-header">
              <h4 className="dashboard__performance-title">Active Inventory</h4>
              <div className="dashboard__performance-value">
                {performanceMetrics.inventory.value.toLocaleString()}
              </div>
            </div>
            <div className="dashboard__performance-target">
              Target: {performanceMetrics.inventory.target.toLocaleString()} items
            </div>
            <div className="dashboard__performance-bar">
              <div 
                className="dashboard__performance-fill"
                style={{ width: `${Math.min(performanceMetrics.inventory.percentage, 100)}%` }}
              ></div>
            </div>
            <div className="dashboard__performance-percentage">
              {formatPercentage(performanceMetrics.inventory.percentage)} of target
            </div>
          </div>
          
        </div>
      )}

      {/* Quick Actions */}
      <div className="dashboard__quick-actions">
        <h3 className="dashboard__quick-actions-title">
          <Icons.Plus />
          Quick Actions
        </h3>
        <div className="dashboard__quick-actions-grid">
          <a href="/stock-in" className="dashboard__quick-action">
            <div className="dashboard__quick-action-icon">
              📦
            </div>
            <div className="dashboard__quick-action-title">Add Stock</div>
            <div className="dashboard__quick-action-description">
              Add new inventory items
            </div>
          </a>

          <a href="/process/create-batch" className="dashboard__quick-action">
            <div className="dashboard__quick-action-icon">
              🏭
            </div>
            <div className="dashboard__quick-action-title">Start Production</div>
            <div className="dashboard__quick-action-description">
              Create new production batch
            </div>
          </a>

          <a href="/supplier" className="dashboard__quick-action">
            <div className="dashboard__quick-action-icon">
              🚚
            </div>
            <div className="dashboard__quick-action-title">Manage Suppliers</div>
            <div className="dashboard__quick-action-description">
              View and edit suppliers
            </div>
          </a>

          <a href="/sales-report" className="dashboard__quick-action">
            <div className="dashboard__quick-action-icon">
              📊
            </div>
            <div className="dashboard__quick-action-title">Generate Report</div>
            <div className="dashboard__quick-action-description">
              Create detailed reports
            </div>
          </a>

          <a href="/users" className="dashboard__quick-action">
            <div className="dashboard__quick-action-icon">
              👥
            </div>
            <div className="dashboard__quick-action-title">User Management</div>
            <div className="dashboard__quick-action-description">
              Manage system users
            </div>
          </a>
        </div>
      </div>

      {/* Loading overlay during refresh */}
      {loading && dashboardData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999
        }}>
          <div className="dashboard__spinner"></div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;