// InventoryReport.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import './InventoryReport.css';

// Import your services and types
import { inventoryReportService } from '../services';
import type {
  InventoryReport as InventoryReportType,
  InventoryReportQueryParams,
  LowStockAlertResponse,
  StockCategory
} from '../types/reports';

// Cache interface
interface CachedInventoryData {
  reportData: InventoryReportType | null;
  lowStockData: LowStockAlertResponse | null;
  timestamp: number;
  filters: InventoryReportQueryParams;
}

// Cache constants
const CACHE_KEY = 'inventory_report_data';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Icon component interface
interface IconProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}

// Icons (you can replace with your preferred icon library)
const Icons = {
  Package: ({ className = "inventory-report__title-icon", width = "32", height = "32", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Download: ({ className, width = "16", height = "16", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-4-4m4 4l4-4m5-2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2h2m10 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0V8a2 2 0 00-2-2h-2" />
    </svg>
  ),
  Refresh: ({ className, width = "16", height = "16", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Filter: ({ className, width = "16", height = "16", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
    </svg>
  ),
  AlertTriangle: ({ className, width = "16", height = "16", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  Lock: ({ className, width = "16", height = "16", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  Eye: ({ className, width = "16", height = "16", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  EyeOff: ({ className, width = "16", height = "16", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
    </svg>
  ),
  DollarSign: ({ className, width = "16", height = "16", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
  ),
  Archive: ({ className, width = "16", height = "16", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6m0 0l6-6m-6 6V3m-4 18h8a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  TrendingUp: ({ className, width = "16", height = "16", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  BarChart: ({ className, width = "16", height = "16", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Clock: ({ className, width = "16", height = "16", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ShoppingCart: ({ className, width = "16", height = "16", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5 6H2m5 7l-2 2m0 0l-2-2m2 2l2-2m5-2v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
    </svg>
  ),
  Check: ({ className, width = "16", height = "16", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: ({ className, width = "16", height = "16", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Truck: ({ className, width = "16", height = "16", style }: IconProps = {}) => (
    <svg className={className} width={width} height={height} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
};

interface InventoryReportProps {
  className?: string;
  onExport?: (data: InventoryReportType) => void;
  onRefresh?: () => void;
  initialFilters?: Partial<InventoryReportQueryParams>;
  lowStockThreshold?: number;
}

const InventoryReport: React.FC<InventoryReportProps> = ({
  className = '',
  onExport,
  onRefresh,
  initialFilters = {},
  lowStockThreshold = 10
}) => {
  // Cache refs
  const cacheRef = useRef<{ [key: string]: CachedInventoryData }>({});

  // State management
  const [reportData, setReportData] = useState<InventoryReportType | null>(null);
  const [lowStockData, setLowStockData] = useState<LowStockAlertResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cache state
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // PIN verification state
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  
  // Filter state
  const [filters, setFilters] = useState<InventoryReportQueryParams>({
    include_archived: false,
    include_used: false,
    low_stock_threshold: lowStockThreshold,
    ...initialFilters
  });

  // Cache utility functions
  const getCacheKey = (filters: InventoryReportQueryParams) => {
    return JSON.stringify(filters || {});
  };

  const isCacheValid = (cachedData: CachedInventoryData) => {
    return (Date.now() - cachedData.timestamp) < CACHE_DURATION;
  };

  const loadFromCache = (cacheKey: string): CachedInventoryData | null => {
    // Check memory cache first
    if (cacheRef.current[cacheKey] && isCacheValid(cacheRef.current[cacheKey])) {
      return cacheRef.current[cacheKey];
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(`${CACHE_KEY}_${cacheKey}`);
      if (stored) {
        const cachedData: CachedInventoryData = JSON.parse(stored);
        if (isCacheValid(cachedData)) {
          cacheRef.current[cacheKey] = cachedData;
          return cachedData;
        } else {
          localStorage.removeItem(`${CACHE_KEY}_${cacheKey}`);
        }
      }
    } catch (error) {
      console.warn('Error loading from cache:', error);
    }
    
    return null;
  };

  const saveToCache = (cacheKey: string, reportData: InventoryReportType | null, lowStockData: LowStockAlertResponse | null, filters: InventoryReportQueryParams) => {
    const cachedData: CachedInventoryData = {
      reportData,
      lowStockData,
      timestamp: Date.now(),
      filters
    };

    // Save to memory
    cacheRef.current[cacheKey] = cachedData;

    // Save to localStorage
    try {
      localStorage.setItem(`${CACHE_KEY}_${cacheKey}`, JSON.stringify(cachedData));
    } catch (error) {
      console.warn('Error saving to cache:', error);
    }
  };


  const getTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Load data with caching
  const loadData = async (newFilters?: InventoryReportQueryParams, skipCache = false) => {
    const filtersToUse = newFilters || filters;
    const cacheKey = getCacheKey(filtersToUse);
    
    // Try to load from cache first (unless skipping cache)
    if (!skipCache) {
      const cachedData = loadFromCache(cacheKey);
      if (cachedData) {
        setReportData(cachedData.reportData);
        setLowStockData(cachedData.lowStockData);
        setIsFromCache(true);
        setLastUpdated(new Date(cachedData.timestamp));
        setError(null);
        
        if (isFirstLoad) {
          setIsFirstLoad(false);
        }
        
        return;
      }
    }
    
    // Set loading state only if we don't have cached data or it's a refresh
    if (!reportData || skipCache || isFirstLoad) {
      setLoading(true);
    }
    
    setError(null);
    setIsFromCache(false);
    
    try {
      const [reportPromise, lowStockPromise] = await Promise.all([
        inventoryReportService.getInventoryReport(filtersToUse),
        inventoryReportService.getLowStockAlert({ threshold: filtersToUse.low_stock_threshold || lowStockThreshold })
      ]);
      
      setReportData(reportPromise);
      setLowStockData(lowStockPromise);
      setLastUpdated(new Date());
      
      // Save to cache
      saveToCache(cacheKey, reportPromise, lowStockPromise, filtersToUse);
      
      if (isFirstLoad) {
        setIsFirstLoad(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory report');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Handle filter changes
  const handleFilterChange = (key: keyof InventoryReportQueryParams, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  // Apply filters
  const applyFilters = () => {
    loadData(filters, true); // Skip cache for filter changes
    setShowFilters(false);
  };

  // Reset filters
  const resetFilters = () => {
    const defaultFilters: InventoryReportQueryParams = {
      include_archived: false,
      include_used: false,
      low_stock_threshold: lowStockThreshold
    };
    setFilters(defaultFilters);
    loadData(defaultFilters, true); // Skip cache for filter reset
  };

  // Handle export with PIN authentication
  const handleExport = async () => {
    if (!reportData) return;
    
    if (!pinInput.trim()) {
      setPinError('Please enter your PIN');
      return;
    }

    setExporting(true);
    setPinError(null);
    
    try {
      // Export CSV with PIN authentication using inventoryReportService
      await inventoryReportService.exportAndDownloadCSV(pinInput.trim(), filters);
      
      onExport?.(reportData);
      setShowExportModal(false);
      resetExportState();
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  // Reset export state
  const resetExportState = () => {
    setPinInput('');
    setPinError(null);
    setShowPin(false);
  };

  // Handle export modal close
  const handleExportModalClose = () => {
    setShowExportModal(false);
    resetExportState();
  };

  // Handle PIN input change
  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) { // Assuming PIN is max 6 digits
      setPinInput(value);
      setPinError(null);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    loadData(filters, true); // Skip cache for refresh
    onRefresh?.();
  };

  // Memoized calculations
  const analyticsData = useMemo(() => {
    if (!reportData) return null;
    
    const inventoryHealth = inventoryReportService.getInventoryHealthScore(reportData);
    const valuation = inventoryReportService.getInventoryValuation(reportData);
    const aging = inventoryReportService.getInventoryAging(reportData);
    const topItems = inventoryReportService.getTopValueItems(reportData, 10);
    const reorderRecs = inventoryReportService.getReorderRecommendations(reportData, filters.low_stock_threshold || lowStockThreshold);

    return {
      health: inventoryHealth,
      valuation,
      aging,
      topItems,
      reorderRecs
    };
  }, [reportData, filters.low_stock_threshold, lowStockThreshold]);

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

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get stock level status
  const getStockLevel = (pieces: number, threshold: number) => {
    if (pieces === 0) return 'empty';
    if (pieces <= threshold) return 'low';
    if (pieces <= threshold * 2) return 'medium';
    return 'high';
  };

  // Render loading state
  if (loading && !reportData) {
    return (
      <div className={`inventory-report ${className}`}>
        <div className="inventory-report__loading">
          <div className="inventory-report__spinner"></div>
          <div className="inventory-report__loading-text">Loading inventory report...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`inventory-report ${className} inventory-report__fade-in`}>
      {/* Header */}
      <div className="inventory-report__header">
        <div className="inventory-report__header-left">
          <h1 className="inventory-report__title">
            <Icons.Package />
            Inventory Report
          </h1>
          {/* Cache indicators */}
          {reportData && lastUpdated && (
            <div className="inventory-report__cache-info">
              <span className={`inventory-report__cache-badge ${
                isFromCache ? 'inventory-report__cache-badge--cached' : 'inventory-report__cache-badge--fresh'
              }`}>
                {isFromCache ? '💾 Cached' : '🔄 Fresh'}
              </span>
              <span className="inventory-report__cache-timestamp">
                Updated {isFromCache && lastUpdated ? getTimeAgo(lastUpdated.getTime()) : 'just now'}
              </span>
            </div>
          )}
        </div>
        <div className="inventory-report__actions">
          <button
            className="inventory-report__button inventory-report__button--secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Icons.Filter />
            Filters
          </button>
          <button
            className="inventory-report__button inventory-report__button--secondary"
            onClick={handleRefresh}
            disabled={loading}
          >
            <Icons.Refresh />
            Refresh
          </button>
          <button
            className="inventory-report__button inventory-report__button--primary"
            onClick={() => setShowExportModal(true)}
            disabled={!reportData || loading}
          >
            <Icons.Download />
            Export to CSV
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="inventory-report__error">
          <div className="inventory-report__error-title">Error</div>
          <div className="inventory-report__error-message">{error}</div>
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStockData && lowStockData.total_low_stock_items > 0 && (
        <div className="inventory-report__alert inventory-report__alert--critical">
          <Icons.AlertTriangle className="inventory-report__alert-icon" />
          <div className="inventory-report__alert-content">
            <div className="inventory-report__alert-title">Low Stock Alert</div>
            <div className="inventory-report__alert-message">
              {lowStockData.total_low_stock_items} items are running low on stock and need attention.
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="inventory-report__filters">
          <div className="inventory-report__filters-title">
            <Icons.Filter />
            Filter Options
          </div>
          <div className="inventory-report__filters-grid">
            <div className="inventory-report__filter-group">
              <label className="inventory-report__filter-label">Category</label>
              <select
                className="inventory-report__filter-select"
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value as StockCategory || undefined)}
              >
                <option value="">All Categories</option>
                <option value="finished product">Finished Products</option>
                <option value="raw material">Raw Materials</option>
              </select>
            </div>
            <div className="inventory-report__filter-group">
              <label className="inventory-report__filter-label">Supplier ID</label>
              <input
                type="number"
                className="inventory-report__filter-input"
                placeholder="Filter by supplier..."
                value={filters.supplier_id || ''}
                onChange={(e) => handleFilterChange('supplier_id', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
            <div className="inventory-report__filter-group">
              <label className="inventory-report__filter-label">Low Stock Threshold</label>
              <input
                type="number"
                className="inventory-report__filter-input"
                placeholder="10"
                value={filters.low_stock_threshold || ''}
                onChange={(e) => handleFilterChange('low_stock_threshold', e.target.value ? parseInt(e.target.value) : lowStockThreshold)}
              />
            </div>
            <div className="inventory-report__filter-group">
              <div className="inventory-report__filter-checkbox">
                <input
                  type="checkbox"
                  id="include_archived"
                  checked={filters.include_archived || false}
                  onChange={(e) => handleFilterChange('include_archived', e.target.checked)}
                />
                <label htmlFor="include_archived" className="inventory-report__filter-label">Include Archived</label>
              </div>
              <div className="inventory-report__filter-checkbox">
                <input
                  type="checkbox"
                  id="include_used"
                  checked={filters.include_used || false}
                  onChange={(e) => handleFilterChange('include_used', e.target.checked)}
                />
                <label htmlFor="include_used" className="inventory-report__filter-label">Include Used</label>
              </div>
            </div>
          </div>
          <div className="inventory-report__filters-actions">
            <button
              className="inventory-report__button inventory-report__button--secondary"
              onClick={resetFilters}
            >
              Reset
            </button>
            <button
              className="inventory-report__button inventory-report__button--primary"
              onClick={applyFilters}
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {reportData && (
        <>
          <div className="inventory-report__summary">
            <div className="inventory-report__summary-card">
              <div className="inventory-report__summary-card-header">
                <div className="inventory-report__summary-card-title">Total Inventory Value</div>
                <div className="inventory-report__summary-card-icon">
                  <Icons.DollarSign />
                </div>
              </div>
              <div className="inventory-report__summary-card-value">
                {formatCurrency(reportData.summary.total_inventory_value)}
              </div>
              <div className="inventory-report__summary-card-change inventory-report__summary-card-change--positive">
                <Icons.TrendingUp />
                Total asset value
              </div>
            </div>

            <div className="inventory-report__summary-card">
              <div className="inventory-report__summary-card-header">
                <div className="inventory-report__summary-card-title">Active Stock Items</div>
                <div className="inventory-report__summary-card-icon">
                  <Icons.Package />
                </div>
              </div>
              <div className="inventory-report__summary-card-value">
                {reportData.summary.active_stocks.toLocaleString()}
              </div>
              <div className="inventory-report__summary-card-change inventory-report__summary-card-change--neutral">
                Available items
              </div>
            </div>

            <div className="inventory-report__summary-card inventory-report__summary-card--warning">
              <div className="inventory-report__summary-card-header">
                <div className="inventory-report__summary-card-title">Low Stock Items</div>
                <div className="inventory-report__summary-card-icon inventory-report__summary-card-icon--warning">
                  <Icons.AlertTriangle />
                </div>
              </div>
              <div className="inventory-report__summary-card-value">
                {reportData.summary.low_stock_items}
              </div>
              <div className={`inventory-report__summary-card-change ${
                reportData.summary.low_stock_items > 0 
                  ? 'inventory-report__summary-card-change--negative'
                  : 'inventory-report__summary-card-change--positive'
              }`}>
                {reportData.summary.low_stock_items > 0 ? '⚠️ Need attention' : '✅ All good'}
              </div>
            </div>

            <div className="inventory-report__summary-card">
              <div className="inventory-report__summary-card-header">
                <div className="inventory-report__summary-card-title">Total Pieces</div>
                <div className="inventory-report__summary-card-icon">
                  <Icons.BarChart />
                </div>
              </div>
              <div className="inventory-report__summary-card-value">
                {reportData.summary.total_available_pieces.toLocaleString()}
              </div>
              <div className="inventory-report__summary-card-change inventory-report__summary-card-change--neutral">
                In stock
              </div>
            </div>
          </div>

          {/* Inventory Health Score */}
          {analyticsData?.health && (
            <div className="inventory-report__health-score">
              <div className={`inventory-report__health-score-value inventory-report__health-score-value--${analyticsData.health.rating}`}>
                {Math.round(analyticsData.health.score)}
              </div>
              <div className={`inventory-report__health-score-rating inventory-report__health-score-value--${analyticsData.health.rating}`}>
                {analyticsData.health.rating}
              </div>
              <p>Inventory Health Score</p>
              <div className="inventory-report__health-factors">
                <div className="inventory-report__health-factor">
                  <div className="inventory-report__health-factor-label">Utilization</div>
                  <div className="inventory-report__health-factor-value">
                    {formatPercentage(analyticsData.health.factors.stockUtilization)}
                  </div>
                </div>
                <div className="inventory-report__health-factor">
                  <div className="inventory-report__health-factor-label">Low Stock</div>
                  <div className="inventory-report__health-factor-value">
                    {formatPercentage(analyticsData.health.factors.lowStockRatio)}
                  </div>
                </div>
                <div className="inventory-report__health-factor">
                  <div className="inventory-report__health-factor-label">Balance</div>
                  <div className="inventory-report__health-factor-value">
                    {formatPercentage(analyticsData.health.factors.categoryBalance)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Charts and Analytics */}
          <div className="inventory-report__charts">
            <div className="inventory-report__chart-container">
              <div className="inventory-report__chart-title">
                <Icons.BarChart />
                Category Breakdown
              </div>
              <div className="inventory-report__category-breakdown">
                {reportData.summary.categories_breakdown.map((category) => (
                  <div key={category.category} className="inventory-report__category-item">
                    <div className="inventory-report__category-info">
                      <div className={`inventory-report__category-icon ${
                        category.category === 'finished product' 
                          ? 'inventory-report__category-icon--finished'
                          : 'inventory-report__category-icon--raw'
                      }`}>
                        {category.category === 'finished product' ? '📦' : '🔧'}
                      </div>
                      <div className="inventory-report__category-details">
                        <div className="inventory-report__category-name">
                          {category.category === 'finished product' ? 'Finished Products' : 'Raw Materials'}
                        </div>
                        <div className="inventory-report__category-stats">
                          {category.total_stocks} items • {category.total_pieces.toLocaleString()} pieces
                        </div>
                      </div>
                    </div>
                    <div className="inventory-report__category-value">
                      <div className="inventory-report__category-amount">
                        {formatCurrency(category.total_value)}
                      </div>
                      <div className="inventory-report__category-count">
                        {category.active_stocks} active
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="inventory-report__chart-container">
              <div className="inventory-report__chart-title">
                <Icons.Clock />
                Inventory Age Analysis
              </div>
              {analyticsData?.aging && (
                <div className="inventory-report__age-breakdown">
                  <div className="inventory-report__age-category">
                    <div className="inventory-report__age-category-label">New (0-30 days)</div>
                    <div className="inventory-report__age-category-value">{analyticsData.aging.counts.new}</div>
                    <div className="inventory-report__age-category-percentage">
                      {formatPercentage(analyticsData.aging.percentages.new)}
                    </div>
                  </div>
                  <div className="inventory-report__age-category">
                    <div className="inventory-report__age-category-label">Medium (31-90 days)</div>
                    <div className="inventory-report__age-category-value">{analyticsData.aging.counts.medium}</div>
                    <div className="inventory-report__age-category-percentage">
                      {formatPercentage(analyticsData.aging.percentages.medium)}
                    </div>
                  </div>
                  <div className="inventory-report__age-category">
                    <div className="inventory-report__age-category-label">Old (91-180 days)</div>
                    <div className="inventory-report__age-category-value">{analyticsData.aging.counts.old}</div>
                    <div className="inventory-report__age-category-percentage">
                      {formatPercentage(analyticsData.aging.percentages.old)}
                    </div>
                  </div>
                  <div className="inventory-report__age-category">
                    <div className="inventory-report__age-category-label">Very Old (180+ days)</div>
                    <div className="inventory-report__age-category-value">{analyticsData.aging.counts.veryOld}</div>
                    <div className="inventory-report__age-category-percentage">
                      {formatPercentage(analyticsData.aging.percentages.veryOld)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Low Stock Alert Details */}
          {lowStockData && lowStockData.total_low_stock_items > 0 && (
            <div className="inventory-report__low-stock">
              <div className="inventory-report__low-stock-header">
                <Icons.AlertTriangle className="inventory-report__low-stock-icon" />
                <h3 className="inventory-report__low-stock-title">
                  Low Stock Items ({lowStockData.total_low_stock_items})
                </h3>
              </div>
              <div className="inventory-report__low-stock-list">
                {lowStockData.items.slice(0, 10).map((item) => (
                  <div key={item.stock_id} className="inventory-report__low-stock-item">
                    <div className="inventory-report__low-stock-item-info">
                      <div className="inventory-report__low-stock-item-name">
                        {item.product_name}
                      </div>
                      <div className="inventory-report__low-stock-item-details">
                        Batch: {item.batch} • Supplier: {item.supplier_name}
                      </div>
                    </div>
                    <div className="inventory-report__low-stock-item-level">
                      <span className={`inventory-report__badge ${
                        item.current_pieces === 0 ? 'inventory-report__badge--error' :
                        item.current_pieces <= 5 ? 'inventory-report__badge--error' :
                        'inventory-report__badge--warning'
                      }`}>
                        {item.current_pieces} left
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reorder Recommendations */}
          {analyticsData?.reorderRecs && analyticsData.reorderRecs.length > 0 && (
            <div className="inventory-report__reorder">
              <div className="inventory-report__reorder-header">
                <Icons.ShoppingCart className="inventory-report__reorder-icon" />
                <h3 className="inventory-report__reorder-title">
                  Reorder Recommendations ({analyticsData.reorderRecs.length})
                </h3>
              </div>
              {analyticsData.reorderRecs.slice(0, 5).map((item) => (
                <div key={item.stock_id} className="inventory-report__reorder-item">
                  <div>
                    <div className="inventory-report__low-stock-item-name">{item.product_name}</div>
                    <div className="inventory-report__low-stock-item-details">
                      Current: {item.available_pieces} • Recommended: {item.recommended_reorder_quantity}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className={`inventory-report__reorder-urgency inventory-report__reorder-urgency--${item.urgency_level}`}>
                      {item.urgency_level}
                    </span>
                    <span className="inventory-report__badge inventory-report__badge--info">
                      {item.estimated_days_remaining} days
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Supplier Performance */}
          <div className="inventory-report__suppliers">
            <div className="inventory-report__chart-title">
              <Icons.Truck />
              Top Suppliers by Value
            </div>
            {reportData.summary.suppliers_breakdown.slice(0, 10).map((supplier) => (
              <div key={supplier.supplier_id} className="inventory-report__supplier-item">
                <div className="inventory-report__supplier-info">
                  <div className="inventory-report__supplier-name">{supplier.supplier_name}</div>
                  <div className="inventory-report__supplier-stats">
                    {supplier.total_stocks} items • {supplier.total_pieces.toLocaleString()} pieces • {supplier.categories.join(', ')}
                  </div>
                </div>
                <div className="inventory-report__supplier-value">
                  {formatCurrency(supplier.total_value)}
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Stock Table */}
          <div className="inventory-report__table-container">
            <div className="inventory-report__table-header">
              <h3 className="inventory-report__table-title">Stock Details</h3>
              <div className="inventory-report__table-actions">
                <span className="inventory-report__badge inventory-report__badge--info">
                  Showing {Math.min(reportData.stock_details.length, 50)} of {reportData.stock_details.length} items
                </span>
              </div>
            </div>
            <div className="inventory-report__table-wrapper">
              <table className="inventory-report__table">
                <thead>
                  <tr>
                    <th>Stock ID</th>
                    <th>Batch</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Supplier</th>
                    <th>Available</th>
                    <th>Unit Price</th>
                    <th>Total Value</th>
                    <th>Status</th>
                    <th>Age</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.stock_details.slice(0, 50).map((item) => {
                    const stockLevel = getStockLevel(item.available_pieces, filters.low_stock_threshold || lowStockThreshold);
                    
                    return (
                      <tr key={item.stock_id}>
                        <td>{item.stock_id}</td>
                        <td>{item.batch}</td>
                        <td>{item.product_name}</td>
                        <td>
                          <span className={`inventory-report__badge ${
                            item.category === 'finished product' 
                              ? 'inventory-report__badge--success' 
                              : 'inventory-report__badge--warning'
                          }`}>
                            {item.category}
                          </span>
                        </td>
                        <td>{item.supplier_name}</td>
                        <td>
                          <div className="inventory-report__stock-status">
                            <div className={`inventory-report__stock-status-dot inventory-report__stock-status-dot--${stockLevel}`}></div>
                            {item.available_pieces.toLocaleString()} {item.product_unit}
                          </div>
                        </td>
                        <td>{formatCurrency(item.product_price)}</td>
                        <td>{formatCurrency(item.total_value)}</td>
                        <td>
                          <span className={`inventory-report__badge ${
                            item.is_low_stock ? 'inventory-report__badge--error' : 'inventory-report__badge--success'
                          }`}>
                            {item.is_low_stock ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td>{formatDate(item.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Show more button if there are more items */}
          {reportData.stock_details.length > 50 && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <button className="inventory-report__button inventory-report__button--secondary">
                Showing 50 of {reportData.stock_details.length} items
              </button>
            </div>
          )}
        </>
      )}

      {/* Export Modal with PIN Authentication */}
      {showExportModal && (
        <div className="inventory-report__modal-overlay" onClick={handleExportModalClose}>
          <div className="inventory-report__modal" onClick={(e) => e.stopPropagation()}>
            <div className="inventory-report__modal-header">
              <h3 className="inventory-report__modal-title">
                <Icons.Lock />
                Export Inventory Report
              </h3>
            </div>
            <div className="inventory-report__modal-body">
              <p>Enter your PIN to export the inventory report as CSV file:</p>
              
              <div className="inventory-report__pin-input-group" style={{ marginTop: '20px' }}>
                <label className="inventory-report__filter-label">
                  <Icons.Lock />
                  PIN Authentication
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPin ? 'text' : 'password'}
                    className={`inventory-report__filter-input ${pinError ? 'inventory-report__input--error' : ''}`}
                    placeholder="Enter your PIN"
                    value={pinInput}
                    onChange={handlePinChange}
                    maxLength={6}
                    style={{ paddingRight: '40px' }}
                    disabled={exporting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                    disabled={exporting}
                  >
                    {showPin ? <Icons.EyeOff /> : <Icons.Eye />}
                  </button>
                </div>
                {pinError && (
                  <div className="inventory-report__error-message" style={{ 
                    marginTop: '8px', 
                    fontSize: '14px',
                    color: '#dc2626'
                  }}>
                    {pinError}
                  </div>
                )}
              </div>

              <div style={{ 
                marginTop: '20px',
                padding: '16px',
                backgroundColor: '#f3f4f6',
                borderRadius: '8px',
                border: '1px solid #d1d5db'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <Icons.Download />
                  <span style={{ marginLeft: '8px', fontWeight: 500 }}>Export Format: CSV (.csv)</span>
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                  This will export all filtered data including stock details, summary statistics, and analytics.
                </p>
              </div>

              {exporting && (
                <div className="inventory-report__progress" style={{ marginTop: '16px' }}>
                  <div className="inventory-report__progress-bar" style={{ width: '100%' }}></div>
                  <p style={{ textAlign: 'center', marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
                    Generating CSV report...
                  </p>
                </div>
              )}
            </div>
            <div className="inventory-report__modal-footer">
              <button
                className="inventory-report__button inventory-report__button--secondary"
                onClick={handleExportModalClose}
                disabled={exporting}
              >
                Cancel
              </button>
              <button
                className="inventory-report__button inventory-report__button--primary"
                onClick={handleExport}
                disabled={exporting || !pinInput.trim()}
              >
                {exporting ? (
                  <>
                    <div className="inventory-report__spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }}></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Icons.Download />
                    Export CSV
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay during operations */}
      {loading && reportData && (
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
          <div className="inventory-report__spinner"></div>
        </div>
      )}
    </div>
  );
};

export default InventoryReport;