import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  archiveService,
  type ArchiveStats,
  type ArchiveFilter,
  type ArchiveBatchItem,
  type ArchiveBulkOperation,
  type ArchiveBulkResult
} from '../services/archiveService';
import { authService } from '../services/authService';
import './Archive.css';

// Cache interface
interface CachedArchiveData {
  stats: ArchiveStats | null;
  batches: ArchiveBatchItem[];
  timestamp: number;
  filters: ArchiveFilter;
}

// Cache constants
const ARCHIVE_CACHE_KEY = 'archive_data';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface LoadingState {
  stats: boolean;
  batches: boolean;
  operation: boolean;
}

interface ErrorState {
  message: string;
  type: 'error' | 'warning' | 'info';
}

const Archive: React.FC = () => {
  const currentUser = authService.getUser();

  // Cache refs
  const cacheRef = useRef<{ [key: string]: CachedArchiveData }>({});

  // State management
  const [stats, setStats] = useState<ArchiveStats | null>(null);
  const [batches, setBatches] = useState<ArchiveBatchItem[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<ArchiveBatchItem[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<ArchiveFilter>(archiveService.getDefaultFilter());
  const [activeTab, setActiveTab] = useState<'processes' | 'batches'>('processes');
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [loading, setLoading] = useState<LoadingState>({
    stats: false,
    batches: false,
    operation: false
  });
  
  const [error, setError] = useState<ErrorState | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Cache state
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // =============================================================================
  // CACHE UTILITY FUNCTIONS
  // =============================================================================

  // Cache utility functions (stable - no dependencies)
  const isCacheValid = (cachedData: CachedArchiveData) => {
    return (Date.now() - cachedData.timestamp) < CACHE_DURATION;
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

  // =============================================================================
  // OPTIMIZED DATA LOADING
  // =============================================================================


  const loadAllData = useCallback(async (skipCache: boolean = false) => {
    const cacheKey = JSON.stringify(filters || {});
    
    // Try to load from cache first (unless skipping cache)
    if (!skipCache) {
      // Check memory cache first
      if (cacheRef.current[cacheKey] && isCacheValid(cacheRef.current[cacheKey])) {
        const cachedData = cacheRef.current[cacheKey];
        setStats(cachedData.stats);
        setBatches(cachedData.batches);
        setFilteredBatches(cachedData.batches);
        setIsFromCache(true);
        setLastUpdated(new Date(cachedData.timestamp));
        setError(null);
        
        if (isFirstLoad) {
          setIsFirstLoad(false);
        }
        
        return;
      }

      // Check localStorage
      try {
        const stored = localStorage.getItem(`${ARCHIVE_CACHE_KEY}_${cacheKey}`);
        if (stored) {
          const cachedData: CachedArchiveData = JSON.parse(stored);
          if (isCacheValid(cachedData)) {
            cacheRef.current[cacheKey] = cachedData;
            setStats(cachedData.stats);
            setBatches(cachedData.batches);
            setFilteredBatches(cachedData.batches);
            setIsFromCache(true);
            setLastUpdated(new Date(cachedData.timestamp));
            setError(null);
            
            if (isFirstLoad) {
              setIsFirstLoad(false);
            }
            
            return;
          } else {
            localStorage.removeItem(`${ARCHIVE_CACHE_KEY}_${cacheKey}`);
          }
        }
      } catch (error) {
        console.warn('Error loading from cache:', error);
      }
    }
    
    // Set loading state only if we don't have cached data or it's a refresh
    if (skipCache || isFirstLoad || !stats) {
      setLoading(prev => ({ ...prev, stats: true, batches: true }));
    }
    
    setError(null);
    setIsFromCache(false);
    
    try {
      const [archiveStats, archiveBatches] = await Promise.all([
        archiveService.getArchiveStats(!skipCache), 
        archiveService.getAllArchivedBatches(filters, !skipCache)
      ]);
      
      setStats(archiveStats);
      setBatches(archiveBatches);
      setFilteredBatches(archiveBatches);
      setLastUpdated(new Date());
      
      // Save to cache
      const cachedData: CachedArchiveData = {
        stats: archiveStats,
        batches: archiveBatches,
        timestamp: Date.now(),
        filters
      };

      // Save to memory
      cacheRef.current[cacheKey] = cachedData;

      // Save to localStorage
      try {
        localStorage.setItem(`${ARCHIVE_CACHE_KEY}_${cacheKey}`, JSON.stringify(cachedData));
      } catch (error) {
        console.warn('Error saving to cache:', error);
      }
      
      if (isFirstLoad) {
        setIsFirstLoad(false);
      }
      
      console.log(`✅ Loaded stats and ${archiveBatches.length} batches`);
    } catch (error) {
      console.error('❌ Failed to load archive data:', error);
      setError({
        message: `Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
      setBatches([]);
      setFilteredBatches([]);
    } finally {
      setLoading(prev => ({ ...prev, stats: false, batches: false }));
    }
  }, [filters]);

  const refreshData = useCallback(async () => {
    // Clear all cached data
    cacheRef.current = {};
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(ARCHIVE_CACHE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Error clearing cache:', error);
    }
    await loadAllData(true); // Skip cache for refresh
  }, []); // No dependencies to avoid circular calls

  const initializeData = useCallback(async () => {
    try {
      setInitialLoading(true);
      await loadAllData(); // This will check cache first
    } catch (error) {
      console.error('Failed to initialize archive data:', error);
    } finally {
      setInitialLoading(false);
    }
  }, []); // No dependencies to avoid circular calls

  // =============================================================================
  // EFFECTS
  // =============================================================================

  useEffect(() => {
    // Preload data on service initialization
    archiveService.preloadData().then(() => {
      initializeData();
    }).catch(() => {
      initializeData(); // Fallback to normal loading
    });
  }, [initializeData]);

  useEffect(() => {
    // Only reload data when filters change (not initial load)
    if (!initialLoading) {
      // Call loadAllData directly to avoid circular dependency
      (async () => {
        const cacheKey = JSON.stringify(filters || {});
        
        setLoading(prev => ({ ...prev, stats: true, batches: true }));
        setError(null);
        setIsFromCache(false);
        
        try {
          const [archiveStats, archiveBatches] = await Promise.all([
            archiveService.getArchiveStats(false), // Skip cache for filter changes
            archiveService.getAllArchivedBatches(filters, false)
          ]);
          
          setStats(archiveStats);
          setBatches(archiveBatches);
          setFilteredBatches(archiveBatches);
          setLastUpdated(new Date());
          
          // Save to cache
          const cachedData: CachedArchiveData = {
            stats: archiveStats,
            batches: archiveBatches,
            timestamp: Date.now(),
            filters
          };

          cacheRef.current[cacheKey] = cachedData;
          try {
            localStorage.setItem(`${ARCHIVE_CACHE_KEY}_${cacheKey}`, JSON.stringify(cachedData));
          } catch (error) {
            console.warn('Error saving to cache:', error);
          }
          
          console.log(`✅ Filter change: Loaded stats and ${archiveBatches.length} batches`);
        } catch (error) {
          console.error('❌ Failed to load archive data on filter change:', error);
          setError({
            message: `Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`,
            type: 'error'
          });
          setBatches([]);
          setFilteredBatches([]);
        } finally {
          setLoading(prev => ({ ...prev, stats: false, batches: false }));
        }
      })();
    }
  }, [filters, initialLoading]);

  useEffect(() => {
    // Auto-clear messages
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // =============================================================================
  // FILTER MANAGEMENT
  // =============================================================================

  const handleFilterChange = useCallback((newFilters: Partial<ArchiveFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setSelectedBatches(new Set()); // Clear selection when filters change
  }, []);

  const handleSearch = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredBatches(batches);
      return;
    }

    const filtered = batches.filter(batch =>
      batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.user_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredBatches(filtered);
  }, [batches]);

  // =============================================================================
  // BATCH OPERATIONS
  // =============================================================================

  const handleArchiveToggle = async (batch: ArchiveBatchItem) => {
    setLoading(prev => ({ ...prev, operation: true }));
    setError(null);

    try {
      const newArchiveStatus = !batch.is_archived;
      let result;

      if (batch.type === 'stock') {
        result = await archiveService.archiveStockBatch(batch.batch_number, newArchiveStatus);
      } else {
        result = await archiveService.archiveProcessBatch(batch.batch_number, newArchiveStatus);
      }

      if (result.success) {
        setSuccessMessage(`Batch ${batch.batch_number} ${newArchiveStatus ? 'archived' : 'unarchived'} successfully`);
        // Clear cache and reload data
        cacheRef.current = {};
        try {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith(ARCHIVE_CACHE_KEY)) {
              localStorage.removeItem(key);
            }
          });
        } catch (error) {
          console.warn('Error clearing cache:', error);
        }
        await loadAllData(true);
      } else {
        setError({
          message: result.message,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('❌ Archive operation failed:', error);
      setError({
        message: `Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, operation: false }));
    }
  };

  const handleDelete = async (batch: ArchiveBatchItem) => {
    if (!window.confirm(`Are you sure you want to delete batch "${batch.batch_number}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(prev => ({ ...prev, operation: true }));
    setError(null);

    try {
      const result = await archiveService.deleteBatch(batch.batch_number, batch.type);
      
      if (result.success) {
        setSuccessMessage(`Batch ${batch.batch_number} deleted successfully`);
        // Clear cache and reload data
        cacheRef.current = {};
        try {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith(ARCHIVE_CACHE_KEY)) {
              localStorage.removeItem(key);
            }
          });
        } catch (error) {
          console.warn('Error clearing cache:', error);
        }
        await loadAllData(true);
      } else {
        setError({
          message: result.message,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('❌ Delete operation failed:', error);
      setError({
        message: `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, operation: false }));
    }
  };

  // =============================================================================
  // BULK OPERATIONS
  // =============================================================================

  const handleBulkOperation = async (operation: 'archive' | 'unarchive' | 'delete') => {
    if (selectedBatches.size === 0) {
      setError({ message: 'Please select batches to perform bulk operations', type: 'warning' });
      return;
    }

    const selectedBatchNumbers = Array.from(selectedBatches);
    const confirmMessage = `Are you sure you want to ${operation} ${selectedBatchNumbers.length} selected batches?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLoading(prev => ({ ...prev, operation: true }));
    setError(null);

    try {
      // Group by type
      const stockBatches = selectedBatchNumbers.filter(id => id.startsWith('stock-')).map(id => id.replace('stock-', ''));
      const processBatches = selectedBatchNumbers.filter(id => id.startsWith('process-')).map(id => id.replace('process-', ''));

      const results: ArchiveBulkResult[] = [];

      // Perform bulk operations for each type
      if (stockBatches.length > 0) {
        const stockOperation: ArchiveBulkOperation = {
          batch_numbers: stockBatches,
          type: 'stock',
          operation
        };
        const stockResult = await archiveService.performBulkOperation(stockOperation);
        results.push(stockResult);
      }

      if (processBatches.length > 0) {
        const processOperation: ArchiveBulkOperation = {
          batch_numbers: processBatches,
          type: 'process',
          operation
        };
        const processResult = await archiveService.performBulkOperation(processOperation);
        results.push(processResult);
      }

      // Summarize results
      const totalSuccess = results.reduce((sum, result) => sum + result.successful_operations, 0);
      const totalFailed = results.reduce((sum, result) => sum + result.failed_operations, 0);

      if (totalSuccess > 0) {
        setSuccessMessage(`Bulk ${operation}: ${totalSuccess} successful, ${totalFailed} failed`);
      }

      if (totalFailed > 0) {
        const allErrors = results.flatMap(result => result.errors);
        setError({
          message: `Some operations failed: ${allErrors.slice(0, 3).join(', ')}${allErrors.length > 3 ? '...' : ''}`,
          type: 'warning'
        });
      }

      setSelectedBatches(new Set());
      // Clear cache and reload data
      cacheRef.current = {};
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(ARCHIVE_CACHE_KEY)) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('Error clearing cache:', error);
      }
      await loadAllData(true);
    } catch (error) {
      console.error('❌ Bulk operation failed:', error);
      setError({
        message: `Bulk operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, operation: false }));
    }
  };

  // =============================================================================
  // SELECTION MANAGEMENT
  // =============================================================================

  const handleSelectBatch = (batchId: string) => {
    setSelectedBatches(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(batchId)) {
        newSelection.delete(batchId);
      } else {
        newSelection.add(batchId);
      }
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    const currentTabBatches = activeTab === 'processes' ? processBatches : stockBatches;
    if (selectedBatches.size === currentTabBatches.length) {
      setSelectedBatches(new Set());
    } else {
      setSelectedBatches(new Set(currentTabBatches.map(batch => batch.id)));
    }
  };

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return '#10b981';
      case 'archived': return '#6b7280';
      case 'partial': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'active': return '✅';
      case 'archived': return '📥';
      case 'partial': return '⚠️';
      default: return '❓';
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================

  const stockBatches = useMemo(() => 
    filteredBatches.filter(batch => batch.type === 'stock'), 
    [filteredBatches]
  );

  const processBatches = useMemo(() => 
    filteredBatches.filter(batch => batch.type === 'process'), 
    [filteredBatches]
  );

  const selectedCount = selectedBatches.size;
  const canPerformBulkOps = selectedCount > 0;
  const currentTabBatches = activeTab === 'processes' ? processBatches : stockBatches;
  const isAnyLoading = loading.stats || loading.batches || loading.operation;

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="archive-management">
      {/* Loading Overlay */}
      {initialLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Loading Archive Management System...</p>
            <small>Fetching cached data and statistics...</small>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>🗄️ Archive Management</h1>
          <p>Manage archived stock batches and process batches</p>
          {/* Cache indicators */}
          {!initialLoading && stats && lastUpdated && (
            <div className="cache-status">
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
              <small style={{ color: '#6c757d', marginLeft: '8px' }}>
                Updated {isFromCache && lastUpdated ? getTimeAgo(lastUpdated.getTime()) : 'just now'}
              </small>
            </div>
          )}
        </div>
        <div className="user-info">
          <div>{currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Unknown User'}</div>
          <div className="user-role">Archive Manager</div>
        </div>
      </div>

      {/* Error Messages */}
      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">
              {error.type === 'error' ? '❌' : error.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <span className="error-message">{error.message}</span>
            <button 
              className="error-close"
              onClick={() => setError(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Success Messages */}
      {successMessage && (
        <div className="success-banner">
          <div className="success-content">
            <span className="success-icon">✅</span>
            <span className="success-message">{successMessage}</span>
            <button 
              className="success-close"
              onClick={() => setSuccessMessage('')}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-value">
              {loading.stats && !stats ? (
                <div className="spinner-small"></div>
              ) : (
                stats?.stock_batches.total || 0
              )}
            </div>
            <div className="stat-label">Total Stock Batches</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏭</div>
          <div className="stat-content">
            <div className="stat-value">
              {loading.stats && !stats ? (
                <div className="spinner-small"></div>
              ) : (
                stats?.process_batches.total || 0
              )}
            </div>
            <div className="stat-label">Total Process Batches</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📥</div>
          <div className="stat-content">
            <div className="stat-value">
              {loading.stats && !stats ? (
                <div className="spinner-small"></div>
              ) : (
                (stats?.stock_batches.archived || 0) + (stats?.process_batches.archived || 0)
              )}
            </div>
            <div className="stat-label">Total Archived</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">
              {loading.stats && !stats ? (
                <div className="spinner-small"></div>
              ) : (
                (stats?.stock_batches.active || 0) + (stats?.process_batches.active || 0)
              )}
            </div>
            <div className="stat-label">Total Active</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-value">
              {loading.stats && !stats ? (
                <div className="spinner-small"></div>
              ) : (
                (stats?.items.archived_stock_items || 0) + (stats?.items.archived_process_items || 0)
              )}
            </div>
            <div className="stat-label">Total Archived Items</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">
              {loading.stats && !stats ? (
                <div className="spinner-small"></div>
              ) : (
                stats?.stock_batches.partial || 0
              )}
            </div>
            <div className="stat-label">Partial Stock Batches</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab ${activeTab === 'processes' ? 'active' : ''}`}
          onClick={() => setActiveTab('processes')}
          disabled={isAnyLoading}
        >
          🏭 Process Batches ({processBatches.length})
          {loading.batches && <div className="spinner-small"></div>}
        </button>
        <button 
          className={`tab ${activeTab === 'batches' ? 'active' : ''}`}
          onClick={() => setActiveTab('batches')}
          disabled={isAnyLoading}
        >
          📦 Stock Batches ({stockBatches.length})
          {loading.batches && <div className="spinner-small"></div>}
        </button>
      </div>

      {/* Filters */}
      <div className={`filters-bar ${loading.batches ? 'loading' : ''}`}>
        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange({ status: e.target.value as any })}
            disabled={isAnyLoading}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="partial">Partial</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Sort By:</label>
          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange({ sortBy: e.target.value as any })}
            disabled={isAnyLoading}
          >
            <option value="date">Date</option>
            <option value="name">Batch Number</option>
            <option value="items">Item Count</option>
            <option value="status">Archive Status</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Search:</label>
          <input
            type="text"
            placeholder="Search batch number or user..."
            onChange={(e) => handleSearch(e.target.value)}
            disabled={isAnyLoading}
          />
        </div>

        <div className="filter-actions">
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => {
              setFilters(archiveService.getDefaultFilter());
              setFilteredBatches(batches);
            }}
            disabled={isAnyLoading}
          >
            Clear Filters
          </button>
          <button 
            className="btn btn-primary btn-sm" 
            onClick={refreshData}
            disabled={isAnyLoading}
          >
            {isAnyLoading ? (
              <>
                <div className="spinner-small"></div>
                Refreshing...
              </>
            ) : (
              '🔄 Refresh'
            )}
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {canPerformBulkOps && (
        <div className="bulk-actions-card">
          <div className="bulk-actions-header">
            <h3>🔄 Bulk Actions ({selectedCount} selected)</h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedBatches(new Set())}
            >
              Clear Selection
            </button>
          </div>
          <div className="bulk-actions-content">
            <button
              className="btn btn-secondary"
              onClick={() => handleBulkOperation('archive')}
              disabled={loading.operation}
            >
              📥 Archive Selected
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => handleBulkOperation('unarchive')}
              disabled={loading.operation}
            >
              📤 Unarchive Selected
            </button>
            <button
              className="btn btn-danger"
              onClick={() => handleBulkOperation('delete')}
              disabled={loading.operation}
            >
              🗑️ Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <div className="table-header">
          <div className="table-actions">
            <div className="select-all">
              <input
                type="checkbox"
                checked={selectedBatches.size === currentTabBatches.length && currentTabBatches.length > 0}
                onChange={handleSelectAll}
                disabled={loading.batches || currentTabBatches.length === 0}
              />
              <span>Select All {activeTab === 'processes' ? 'Process' : 'Stock'} Batches ({selectedBatches.size}/{currentTabBatches.length})</span>
            </div>
            <div className="table-info">
              <small style={{ color: '#6c757d' }}>
                Showing {currentTabBatches.length} {activeTab === 'processes' ? 'process' : 'stock'} batches
                {loading.batches && ' (updating...)'}
              </small>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="archive-table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Batch Number</th>
                <th>Type</th>
                <th>Status</th>
                <th>Items</th>
                <th>Progress</th>
                <th>Categories</th>
                {activeTab === 'processes' && <th>Product</th>}
                <th>User</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading.batches && batches.length === 0 ? (
                <tr className="loading-row">
                  <td colSpan={activeTab === 'processes' ? 11 : 10}>
                    <div className="spinner"></div>
                    Loading {activeTab === 'processes' ? 'process' : 'stock'} batches from cache...
                  </td>
                </tr>
              ) : currentTabBatches.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={activeTab === 'processes' ? 11 : 10}>
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                      <p>No {activeTab === 'processes' ? 'process' : 'stock'} batches found.</p>
                      {batches.length > 0 && (
                        <small style={{ color: '#6c757d' }}>
                          Try adjusting your filters to see more results.
                        </small>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentTabBatches.map((batch) => (
                  <tr key={batch.id} className={selectedBatches.has(batch.id) ? 'selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedBatches.has(batch.id)}
                        onChange={() => handleSelectBatch(batch.id)}
                      />
                    </td>
                    <td>
                      <strong>{batch.batch_number}</strong>
                    </td>
                    <td>
                      <span className={`status-badge ${batch.type}`}>
                        {batch.type === 'stock' ? '📦' : '🏭'} {batch.type}
                      </span>
                    </td>
                    <td>
                      <span 
                        className={`status-badge ${batch.status}`}
                        style={{ color: getStatusColor(batch.status) }}
                      >
                        {getStatusIcon(batch.status)} {batch.status}
                      </span>
                    </td>
                    <td>
                      <div>
                        <span style={{ fontWeight: '600' }}>{batch.total_items} items</span>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>
                          {batch.archived_items} archived
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ 
                        position: 'relative', 
                        width: '100px', 
                        height: '20px', 
                        background: '#f1f5f9', 
                        borderRadius: '10px', 
                        overflow: 'hidden' 
                      }}>
                        <div 
                          style={{ 
                            height: '100%',
                            width: `${batch.archive_percentage}%`,
                            backgroundColor: getStatusColor(batch.status),
                            borderRadius: '10px',
                            transition: 'width 0.3s ease'
                          }}
                        ></div>
                        <span style={{ 
                          position: 'absolute', 
                          top: '50%', 
                          left: '50%', 
                          transform: 'translate(-50%, -50%)', 
                          fontSize: '10px', 
                          fontWeight: '600', 
                          color: '#374151' 
                        }}>
                          {batch.archive_percentage}%
                        </span>
                      </div>
                    </td>
                    <td>
                      {batch.categories ? (
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>
                          {Object.keys(batch.categories).join(', ')}
                        </div>
                      ) : 'N/A'}
                    </td>
                    {activeTab === 'processes' && (
                      <td>
                        {batch.finished_product_name && batch.finished_product_name !== 'N/A' ? (
                          <div style={{ fontSize: '12px', color: '#007bff', fontWeight: '500' }}>
                            {batch.finished_product_name}
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: '#6c757d', fontStyle: 'italic' }}>
                            N/A
                          </div>
                        )}
                      </td>
                    )}
                    <td>{batch.user_name}</td>
                    <td>{formatDate(batch.created_at)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className={`btn btn-sm ${batch.is_archived ? 'btn-secondary' : 'btn-warning'}`}
                          onClick={() => handleArchiveToggle(batch)}
                          disabled={loading.operation}
                          title={batch.is_archived ? 'Unarchive batch' : 'Archive batch'}
                        >
                          {batch.is_archived ? '📤' : '📥'}
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(batch)}
                          disabled={loading.operation}
                          title="Delete batch"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Loading Overlay for Operations */}
      {loading.operation && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Processing operation...</p>
            <small>Please wait while we update the archive data...</small>
          </div>
        </div>
      )}
    </div>
  );
};

export default Archive;