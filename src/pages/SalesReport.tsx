// SalesReport.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import './SalesReport.css';

// Import recharts components
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Import your services and types
import { salesReportService } from '../services';
import type {
  SalesReport as SalesReportType,
  SalesReportQueryParams
} from '../types/reports';

// Import auth service for PIN validation
import { authService } from '../services/authService';
import { API_CONFIG, API_ENDPOINTS, HTTP_METHODS } from '../constants/api';
import type { PinEntry } from '../types/auth';

// Icons (you can replace with your preferred icon library)
const Icons = {
  TrendingUp: () => (
    <svg className="sales-report__title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  Download: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-4-4m4 4l4-4m5-2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2h2m10 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0V8a2 2 0 00-2-2h-2" />
    </svg>
  ),
  Refresh: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Filter: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
    </svg>
  ),
  DollarSign: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
  ),
  Package: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  CheckCircle: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  XCircle: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Calendar: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  BarChart: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Lock: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  Eye: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  EyeOff: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
    </svg>
  )
};

interface SalesReportProps {
  className?: string;
  onExport?: (data: SalesReportType) => void;
  onRefresh?: () => void;
  initialFilters?: Partial<SalesReportQueryParams>;
}

// Cache interface for storing report data
interface CachedReportData {
  data: SalesReportType;
  filters: SalesReportQueryParams;
  timestamp: number;
  cacheKey: string;
}

// Cache constants
const CACHE_KEY = 'sales_report_data';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const SalesReport: React.FC<SalesReportProps> = ({
  className = '',
  onExport,
  onRefresh,
  initialFilters = {}
}) => {
  // Cache reference
  const cacheRef = useRef<Map<string, CachedReportData>>(new Map());
  
  // State management
  const [reportData, setReportData] = useState<SalesReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  // PIN verification state
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  
  
  // Filter state
  const [filters, setFilters] = useState<SalesReportQueryParams>({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
    end_date: new Date().toISOString().split('T')[0],
    include_archived: false,
    ...initialFilters
  });

  // Cache utility functions
  const generateCacheKey = (filterParams: SalesReportQueryParams): string => {
    return JSON.stringify({
      start_date: filterParams.start_date || '',
      end_date: filterParams.end_date || '',
      product_id: filterParams.product_id || null,
      user_id: filterParams.user_id || null,
      include_archived: filterParams.include_archived || false
    });
  };

  const isCacheValid = (cachedData: CachedReportData): boolean => {
    const now = Date.now();
    return (now - cachedData.timestamp) < CACHE_DURATION;
  };

  const loadFromCache = (cacheKey: string): CachedReportData | null => {
    // Check memory cache first
    if (cacheRef.current.has(cacheKey)) {
      const cachedData = cacheRef.current.get(cacheKey)!;
      if (isCacheValid(cachedData)) {
        return cachedData;
      } else {
        cacheRef.current.delete(cacheKey);
      }
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(`${CACHE_KEY}_${cacheKey}`);
      if (stored) {
        const cachedData: CachedReportData = JSON.parse(stored);
        if (isCacheValid(cachedData)) {
          // Restore to memory cache
          cacheRef.current.set(cacheKey, cachedData);
          return cachedData;
        } else {
          localStorage.removeItem(`${CACHE_KEY}_${cacheKey}`);
        }
      }
    } catch (error) {
      console.warn('Error loading from localStorage cache:', error);
    }
    
    return null;
  };

  const saveToCache = (cacheKey: string, data: SalesReportType, filters: SalesReportQueryParams) => {
    const cachedData: CachedReportData = {
      data,
      filters,
      timestamp: Date.now(),
      cacheKey
    };

    // Save to memory cache
    cacheRef.current.set(cacheKey, cachedData);

    // Save to localStorage
    try {
      localStorage.setItem(`${CACHE_KEY}_${cacheKey}`, JSON.stringify(cachedData));
    } catch (error) {
      console.warn('Error saving to localStorage cache:', error);
    }

    // Clean up old cache entries (keep only last 10)
    if (cacheRef.current.size > 10) {
      const entries = Array.from(cacheRef.current.entries())
        .sort(([, a], [, b]) => b.timestamp - a.timestamp)
        .slice(10);
      
      cacheRef.current.clear();
      entries.forEach(([key, value]) => {
        cacheRef.current.set(key, value);
      });
    }
  };

  const clearCache = () => {
    // Clear memory cache
    cacheRef.current.clear();
    
    // Clear localStorage cache
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Error clearing localStorage cache:', error);
    }
  };

  // Get time ago helper function
  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  // Load data with caching
  const loadData = async (newFilters?: SalesReportQueryParams, forceRefresh = false) => {
    const filtersToUse = newFilters || filters;
    const cacheKey = generateCacheKey(filtersToUse);
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = loadFromCache(cacheKey);
      if (cachedData) {
        setReportData(cachedData.data);
        setIsFromCache(true);
        setLastUpdated(new Date(cachedData.timestamp));
        setError(null);
        
        // If it's first load and we have cache, skip loading state
        if (isFirstLoad) {
          setIsFirstLoad(false);
        }
        
        return;
      }
    }
    
    // Set loading state only if we don't have cached data or it's a refresh
    if (!reportData || forceRefresh || isFirstLoad) {
      setLoading(true);
    }
    
    setError(null);
    setIsFromCache(false);
    
    try {
      const data = await salesReportService.getSalesReport(filtersToUse);
      
      // Cache the data using our enhanced caching system
      saveToCache(cacheKey, data, filtersToUse);
      
      setReportData(data);
      setLastUpdated(new Date());
      
      if (isFirstLoad) {
        setIsFirstLoad(false);
      }
      
      console.log(`✅ Loaded sales report and cached with key: ${cacheKey}`);
    } catch (err) {
      console.error('❌ Failed to load sales report:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sales report');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Handle filter changes
  const handleFilterChange = (key: keyof SalesReportQueryParams, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  // Apply filters
  const applyFilters = () => {
    // Clear relevant cache when applying new filters to force fresh data
    const newCacheKey = generateCacheKey(filters);
    cacheRef.current.delete(newCacheKey);
    try {
      localStorage.removeItem(`${CACHE_KEY}_${newCacheKey}`);
    } catch (error) {
      console.warn('Error removing filter cache from localStorage:', error);
    }
    loadData(filters, true); // Force refresh for new filters
    setShowFilters(false);
  };

  // Reset filters
  const resetFilters = () => {
    const defaultFilters: SalesReportQueryParams = {
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      include_archived: false
    };
    setFilters(defaultFilters);
    // Clear cache for the default filters to ensure fresh data
    const defaultCacheKey = generateCacheKey(defaultFilters);
    cacheRef.current.delete(defaultCacheKey);
    try {
      localStorage.removeItem(`${CACHE_KEY}_${defaultCacheKey}`);
    } catch (error) {
      console.warn('Error removing default filter cache from localStorage:', error);
    }
    loadData(defaultFilters, true); // Force refresh for reset
  };

  // Handle export with direct PIN validation
  const handleExport = async () => {
    if (!reportData) return;
    
    if (!pinInput.trim()) {
      setPinError('Please enter your PIN');
      return;
    }

    setExporting(true);
    setPinError(null);
    
    try {
      // Get current user's email
      const currentUser = authService.getUser();
      if (!currentUser) {
        setPinError('User not authenticated');
        return;
      }

      // Validate PIN directly with /enter-pin endpoint
      const pinData: PinEntry = {
        email: currentUser.email,
        pin: pinInput.trim()
      };

      const pinResponse = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.ENTER_PIN}`, {
        method: HTTP_METHODS.POST,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pinData),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!pinResponse.ok) {
        const errorData = await pinResponse.json().catch(() => ({ detail: 'Invalid PIN' }));
        setPinError(errorData.detail || 'PIN authentication failed');
        return;
      }

      await pinResponse.json();
      
      // Export Excel with the validated token using salesReportService
      await salesReportService.exportAndDownloadExcel(pinInput.trim(), filters);
      
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

  // Handle refresh - force refresh and clear cache
  const handleRefresh = () => {
    // Clear all cache when manually refreshing
    clearCache();
    loadData(filters, true); // Force refresh
    onRefresh?.();
  };

  // Handle PIN input change
  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) { // Assuming PIN is max 6 digits
      setPinInput(value);
      setPinError(null);
    }
  };


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

  // Memoized calculations
  const chartData = useMemo(() => {
    if (!reportData) return null;
    
    return {
      dailyRevenue: reportData.summary.production_by_date.map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: item.total_revenue,
        production: item.total_pieces_used,
        quality: ((item.total_good || 0) / (item.total_pieces_used || 1)) * 100
      })),
      topProducts: reportData.summary.top_performing_products.slice(0, 5).map((product, index) => ({
        ...product,
        fill: [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.accent, CHART_COLORS.purple, CHART_COLORS.pink][index]
      })),
      userPerformance: reportData.summary.production_by_user.slice(0, 8).map(user => ({
        name: user.user_name.length > 12 ? user.user_name.substring(0, 12) + '...' : user.user_name,
        revenue: user.total_revenue,
        production: user.total_pieces_used,
        quality: ((user.total_good || 0) / (user.total_pieces_used || 1)) * 100
      })),
      qualityTrend: reportData.summary.production_by_date.map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        good: item.total_good || 0,
        defect: item.total_defect || 0,
        qualityRate: ((item.total_good || 0) / (item.total_pieces_used || 1)) * 100
      }))
    };
  }, [reportData]);

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

  // Render loading state
  if (loading && !reportData) {
    return (
      <div className={`sales-report ${className}`}>
        <div className="sales-report__loading">
          <div className="sales-report__spinner"></div>
          <div className="sales-report__loading-text">Loading sales report...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`sales-report ${className} sales-report__fade-in`}>
      {/* Header */}
      <div className="sales-report__header">
        <div className="sales-report__title-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="sales-report__title">
              <Icons.TrendingUp />
              Sales Report
            </h1>
            {/* Cache indicators */}
            {reportData && lastUpdated && (
              <div className="sales-report__cache-info" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  padding: '4px 8px',
                  backgroundColor: isFromCache ? '#e7f3ff' : '#f0fdf4',
                  border: `1px solid ${isFromCache ? '#b3d9ff' : '#bbf7d0'}`,
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: isFromCache ? '#0066cc' : '#059669'
                }}>
                  {isFromCache ? '💾 Cached' : '🔄 Fresh'}
                </span>
                <small style={{ color: '#6c757d' }}>
                  Updated {isFromCache && lastUpdated ? getTimeAgo(lastUpdated) : 'just now'}
                </small>
              </div>
            )}
          </div>
        </div>
        <div className="sales-report__actions">
          <button
            className="sales-report__button sales-report__button--secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Icons.Filter />
            Filters
          </button>
          <button
            className="sales-report__button sales-report__button--secondary"
            onClick={handleRefresh}
            disabled={loading}
          >
            <Icons.Refresh />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            className="sales-report__button sales-report__button--primary"
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
        <div className="sales-report__error">
          <div className="sales-report__error-title">Error</div>
          <div className="sales-report__error-message">{error}</div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="sales-report__filters">
          <div className="sales-report__filters-title">
            <Icons.Filter />
            Filter Options
          </div>
          <div className="sales-report__filters-grid">
            <div className="sales-report__filter-group">
              <label className="sales-report__filter-label">Start Date</label>
              <input
                type="date"
                className="sales-report__filter-input"
                value={filters.start_date || ''}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
              />
            </div>
            <div className="sales-report__filter-group">
              <label className="sales-report__filter-label">End Date</label>
              <input
                type="date"
                className="sales-report__filter-input"
                value={filters.end_date || ''}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
              />
            </div>
            <div className="sales-report__filter-group">
              <label className="sales-report__filter-label">Product ID</label>
              <input
                type="number"
                className="sales-report__filter-input"
                placeholder="Filter by product..."
                value={filters.product_id || ''}
                onChange={(e) => handleFilterChange('product_id', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
            <div className="sales-report__filter-group">
              <label className="sales-report__filter-label">User ID</label>
              <input
                type="number"
                className="sales-report__filter-input"
                placeholder="Filter by user..."
                value={filters.user_id || ''}
                onChange={(e) => handleFilterChange('user_id', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
          </div>
          <div className="sales-report__filters-actions">
            <button
              className="sales-report__button sales-report__button--secondary"
              onClick={resetFilters}
            >
              Reset
            </button>
            <button
              className="sales-report__button sales-report__button--primary"
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
          <div className="sales-report__summary">
            <div className="sales-report__summary-card">
              <div className="sales-report__summary-card-header">
                <div className="sales-report__summary-card-title">Total Revenue</div>
                <div className="sales-report__summary-card-icon">
                  <Icons.DollarSign />
                </div>
              </div>
              <div className="sales-report__summary-card-value">
                {formatCurrency(reportData.summary.total_revenue)}
              </div>
              <div className="sales-report__summary-card-change sales-report__summary-card-change--positive">
                <Icons.TrendingUp />
                Revenue generated
              </div>
            </div>

            <div className="sales-report__summary-card">
              <div className="sales-report__summary-card-header">
                <div className="sales-report__summary-card-title">Total Production</div>
                <div className="sales-report__summary-card-icon">
                  <Icons.Package />
                </div>
              </div>
              <div className="sales-report__summary-card-value">
                {reportData.summary.total_pieces_produced.toLocaleString()}
              </div>
              <div className="sales-report__summary-card-change sales-report__summary-card-change--neutral">
                Pieces produced
              </div>
            </div>

            <div className="sales-report__summary-card">
              <div className="sales-report__summary-card-header">
                <div className="sales-report__summary-card-title">Quality Rate</div>
                <div className="sales-report__summary-card-icon">
                  <Icons.CheckCircle />
                </div>
              </div>
              <div className="sales-report__summary-card-value">
                {formatPercentage(reportData.summary.quality_rate)}
              </div>
              <div className={`sales-report__summary-card-change ${
                reportData.summary.quality_rate >= 95 
                  ? 'sales-report__summary-card-change--positive'
                  : reportData.summary.quality_rate >= 90
                  ? 'sales-report__summary-card-change--neutral'
                  : 'sales-report__summary-card-change--negative'
              }`}>
                {reportData.summary.quality_rate >= 95 ? '🎯 Excellent' : 
                 reportData.summary.quality_rate >= 90 ? '👍 Good' : '⚠️ Needs improvement'}
              </div>
            </div>

            <div className="sales-report__summary-card">
              <div className="sales-report__summary-card-header">
                <div className="sales-report__summary-card-title">Production Batches</div>
                <div className="sales-report__summary-card-icon">
                  <Icons.BarChart />
                </div>
              </div>
              <div className="sales-report__summary-card-value">
                {reportData.summary.total_production_batches}
              </div>
              <div className="sales-report__summary-card-change sales-report__summary-card-change--neutral">
                Batches completed
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="sales-report__charts">
            {/* Daily Revenue Trend Chart */}
            <div className="sales-report__chart-container">
              <div className="sales-report__chart-title">
                <Icons.BarChart />
                Daily Revenue & Production Trend
              </div>
              <div className="sales-report__chart" style={{ height: '300px' }}>
                {chartData?.dailyRevenue && chartData.dailyRevenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData.dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
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
                      <Legend />
                      <Line 
                        yAxisId="revenue"
                        type="monotone" 
                        dataKey="revenue" 
                        stroke={CHART_COLORS.primary}
                        strokeWidth={3}
                        dot={{ fill: CHART_COLORS.primary, r: 4 }}
                        name="Revenue"
                      />
                      <Line 
                        yAxisId="production"
                        type="monotone" 
                        dataKey="production" 
                        stroke={CHART_COLORS.secondary}
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS.secondary, r: 3 }}
                        name="Production"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#6b7280'
                  }}>
                    No data available for chart
                  </div>
                )}
              </div>
            </div>

            {/* Top Products Pie Chart */}
            <div className="sales-report__chart-container">
              <div className="sales-report__chart-title">
                <Icons.Package />
                Top Products by Revenue
              </div>
              <div className="sales-report__chart" style={{ height: '300px' }}>
                {chartData?.topProducts && chartData.topProducts.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.topProducts}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="total_revenue"
                      >
                        {chartData.topProducts.map((entry, index) => (
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
                        formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '12px' }}
                        formatter={(value, entry) => {
                          const payload = entry.payload as any;
                          return payload?.product_name || 'Unknown';
                        }}
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
                    No product data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Performance Chart */}
          <div className="sales-report__chart-container" style={{ marginTop: '24px' }}>
            <div className="sales-report__chart-title">
              <Icons.BarChart />
              User Performance Comparison
            </div>
            <div className="sales-report__chart" style={{ height: '350px' }}>
              {chartData?.userPerformance && chartData.userPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.userPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#6b7280"
                      fontSize={12}
                      angle={-45}
                      textAnchor="end"
                      height={80}
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
                        name === 'revenue' ? 'Revenue' : name === 'production' ? 'Production' : 'Quality Rate'
                      ]}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="revenue"
                      dataKey="revenue" 
                      fill={CHART_COLORS.primary}
                      name="Revenue"
                      radius={[2, 2, 0, 0]}
                    />
                    <Bar 
                      yAxisId="production"
                      dataKey="production" 
                      fill={CHART_COLORS.secondary}
                      name="Production"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#6b7280'
                }}>
                  No user performance data available
                </div>
              )}
            </div>
          </div>

          {/* Performance Indicators */}
          <div className="sales-report__performance">
            <div className="sales-report__performance-item">
              <div className="sales-report__performance-label">Good Production Rate</div>
              <div className="sales-report__performance-value">
                {formatPercentage(reportData.summary.quality_rate)}
              </div>
              <div className="sales-report__performance-bar">
                <div 
                  className="sales-report__performance-fill"
                  style={{ width: `${Math.min(reportData.summary.quality_rate, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="sales-report__performance-item">
              <div className="sales-report__performance-label">Defect Rate</div>
              <div className="sales-report__performance-value">
                {formatPercentage(reportData.summary.defect_rate)}
              </div>
              <div className="sales-report__performance-bar">
                <div 
                  className="sales-report__performance-fill"
                  style={{ 
                    width: `${Math.min(reportData.summary.defect_rate, 100)}%`,
                    backgroundColor: reportData.summary.defect_rate > 10 ? '#dc2626' : '#f59e0b'
                  }}
                ></div>
              </div>
            </div>

            <div className="sales-report__performance-item">
              <div className="sales-report__performance-label">Average Output Price</div>
              <div className="sales-report__performance-value">
                {formatCurrency(reportData.summary.average_output_price)}
              </div>
              <div className="sales-report__performance-bar">
                <div 
                  className="sales-report__performance-fill"
                  style={{ width: '75%' }}
                ></div>
              </div>
            </div>
          </div>

          {/* Detailed Data Table */}
          <div className="sales-report__table-container">
            <div className="sales-report__table-header">
              <h3 className="sales-report__table-title">Production Details</h3>
            </div>
            <div className="sales-report__table-wrapper">
              <table className="sales-report__table">
                <thead>
                  <tr>
                    <th>Process ID</th>
                    <th>Batch</th>
                    <th>Product</th>
                    <th>Supplier</th>
                    <th>User</th>
                    <th>Pieces Used</th>
                    <th>Good</th>
                    <th>Defect</th>
                    <th>Quality Rate</th>
                    <th>Revenue</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.details.slice(0, 50).map((item) => (
                    <tr key={item.process_id}>
                      <td>{item.process_id}</td>
                      <td>{item.process_batch_number}</td>
                      <td>{item.product_name}</td>
                      <td>{item.supplier_name}</td>
                      <td>{item.user_name}</td>
                      <td>{item.pieces_used}</td>
                      <td>
                        <span className={`sales-report__badge ${
                          (item.pieces_good || 0) > 0 ? 'sales-report__badge--success' : 'sales-report__badge--info'
                        }`}>
                          {item.pieces_good || 0}
                        </span>
                      </td>
                      <td>
                        <span className={`sales-report__badge ${
                          (item.pieces_defect || 0) > 0 ? 'sales-report__badge--error' : 'sales-report__badge--success'
                        }`}>
                          {item.pieces_defect || 0}
                        </span>
                      </td>
                      <td>{item.quality_rate ? formatPercentage(item.quality_rate) : 'N/A'}</td>
                      <td>{item.revenue ? formatCurrency(item.revenue) : 'N/A'}</td>
                      <td>{formatDate(item.manufactured_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Show more button if there are more items */}
          {reportData.details.length > 50 && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <button className="sales-report__button sales-report__button--secondary">
                Showing 50 of {reportData.details.length} items
              </button>
            </div>
          )}
        </>
      )}

      {/* Export Modal with PIN Authentication */}
      {showExportModal && (
        <div className="sales-report__modal-overlay" onClick={handleExportModalClose}>
          <div className="sales-report__modal" onClick={(e) => e.stopPropagation()}>
            <div className="sales-report__modal-header">
              <h3 className="sales-report__modal-title">
                <Icons.Lock />
                Export Sales Report
              </h3>
            </div>
            <div className="sales-report__modal-body">
              <p>Enter your PIN to export the sales report as CSV file:</p>
              
              <div className="sales-report__pin-input-group" style={{ marginTop: '20px' }}>
                <label className="sales-report__filter-label">
                  <Icons.Lock />
                  PIN Authentication
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPin ? 'text' : 'password'}
                    className={`sales-report__filter-input ${pinError ? 'sales-report__input--error' : ''}`}
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
                  <div className="sales-report__error-message" style={{ 
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
                  This will export all filtered data including production details, summary statistics, and performance metrics.
                </p>
              </div>

              {exporting && (
                <div className="sales-report__progress" style={{ marginTop: '16px' }}>
                  <div className="sales-report__progress-bar" style={{ width: '100%' }}></div>
                  <p style={{ textAlign: 'center', marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
                    Generating CSV report...
                  </p>
                </div>
              )}
            </div>
            <div className="sales-report__modal-footer">
              <button
                className="sales-report__button sales-report__button--secondary"
                onClick={handleExportModalClose}
                disabled={exporting}
              >
                Cancel
              </button>
              <button
                className="sales-report__button sales-report__button--primary"
                onClick={handleExport}
                disabled={exporting || !pinInput.trim()}
              >
                {exporting ? (
                  <>
                    <div className="sales-report__spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }}></div>
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
          <div className="sales-report__spinner"></div>
        </div>
      )}
    </div>
  );
};

export default SalesReport;