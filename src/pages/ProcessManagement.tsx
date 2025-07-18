import React, { useState, useEffect } from 'react';
import { processManagementService } from '../services/processManagementService';
import { authService } from '../services/authService';
import BatchProcessUpload from './BatchProcessUpload';
import type { 
  ProcessManagementResponse,
  ProcessManagementStats,
  ProcessBatchSummaryResponse,
  ProcessManagementFilters,
  ProcessManagementLoadingState,
  ProcessManagementError
} from '../types/processManagement';
import './ProcessManagement.css';

interface ProcessManagementProps {
  // Add any props if needed
}

const ProcessManagement: React.FC<ProcessManagementProps> = () => {
  const [activeTab, setActiveTab] = useState<'items' | 'batches' | 'analytics'>('items');
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [filters, setFilters] = useState<ProcessManagementFilters>({});
  
  // Service state
  const [items, setItems] = useState<ProcessManagementResponse[]>([]);
  const [batches, setBatches] = useState<ProcessBatchSummaryResponse[]>([]);
  const [stats, setStats] = useState<ProcessManagementStats | null>(null);
  const [loading, setLoading] = useState<ProcessManagementLoadingState>({
    items: false,
    stats: false,
    batches: false,
    creating: false,
    updating: false,
    deleting: false,
    archiving: false,
    validating: false,
    consolidation: false,
  });
  const [error, setError] = useState<ProcessManagementError | null>(null);

  const currentUser = authService.getUser();

  useEffect(() => {
    // Subscribe to service state changes
    const unsubscribe = processManagementService.subscribe((state) => {
      setItems(state.items);
      setBatches(state.batches);
      setStats(state.stats);
      setLoading(state.loading);
      setError(state.error);
    });

    // Load initial data
    loadData();

    return unsubscribe;
  }, []);

  const loadData = async () => {
    try {
      await processManagementService.refreshData();
    } catch (error) {
      console.error('❌ Failed to load process management data:', error);
    }
  };

  const handleFilterChange = (newFilters: Partial<ProcessManagementFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    processManagementService.applyFilters(updatedFilters);
  };

  const handleSelectItem = (itemId: number) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    setSelectedItems(
      selectedItems.length === items.length 
        ? [] 
        : items.map(item => item.id)
    );
  };

  const handleArchiveSelected = async (archive: boolean) => {
    if (selectedItems.length === 0) return;

    try {
      // Group by batch and archive entire batches
      const batchGroups = new Map<string, number[]>();
      
      selectedItems.forEach(itemId => {
        const item = items.find(i => i.id === itemId);
        if (item?.process_id_batch) {
          const existing = batchGroups.get(item.process_id_batch) || [];
          existing.push(itemId);
          batchGroups.set(item.process_id_batch, existing);
        }
      });

      for (const [batchNumber] of batchGroups) {
        await processManagementService.setBatchArchiveStatus(batchNumber, archive);
      }

      setSelectedItems([]);
      await loadData();
    } catch (error) {
      console.error('❌ Failed to archive items:', error);
    }
  };

  const handleDeleteBatch = async (batchNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete batch ${batchNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      await processManagementService.deleteBatch(batchNumber);
      await loadData();
    } catch (error) {
      console.error('❌ Failed to delete batch:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatPieces = (pieces: number | null | undefined): string => {
    return pieces?.toLocaleString() || 'N/A';
  };

  const getStatusBadge = (archive: boolean) => {
    return (
      <span className={`status-badge ${archive ? 'archived' : 'active'}`}>
        {archive ? 'Archived' : 'Active'}
      </span>
    );
  };

  const getStockStatus = (remainingPieces: number | null | undefined) => {
    const pieces = remainingPieces ?? 0;
    if (pieces <= 0) return { status: 'depleted', color: '#dc3545' };
    if (pieces <= 10) return { status: 'low', color: '#fd7e14' };
    return { status: 'available', color: '#28a745' };
  };

  // Stats Cards Component
  const StatsCards = () => (
    <div className="stats-cards">
      <div className="stat-card">
        <div className="stat-icon">📊</div>
        <div className="stat-content">
          <div className="stat-value">{stats?.total_processes || 0}</div>
          <div className="stat-label">Total Processes</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">✅</div>
        <div className="stat-content">
          <div className="stat-value">{stats?.active_processes || 0}</div>
          <div className="stat-label">Active Processes</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">📥</div>
        <div className="stat-content">
          <div className="stat-value">{stats?.archived_processes || 0}</div>
          <div className="stat-label">Archived</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">📦</div>
        <div className="stat-content">
          <div className="stat-value">{stats?.total_batches || 0}</div>
          <div className="stat-label">Batches</div>
        </div>
      </div>
    </div>
  );

  // Filters Component
  const FiltersBar = () => (
    <div className="filters-bar">
      <div className="filter-group">
        <label>Status:</label>
        <select 
          value={filters.archive !== undefined ? (filters.archive ? 'archived' : 'active') : 'all'}
          onChange={(e) => {
            const value = e.target.value;
            handleFilterChange({
              archive: value === 'all' ? undefined : value === 'archived'
            });
          }}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      
      <div className="filter-actions">
        <button
          className="btn btn-secondary"
          onClick={() => {
            setFilters({});
            processManagementService.clearFilters();
          }}
        >
          Clear Filters
        </button>
        <button
          className="btn btn-primary"
          onClick={() => setShowBatchUpload(true)}
          disabled={loading.creating}
        >
          + Create Batch
        </button>
      </div>
    </div>
  );

  // Items Table Component
  const ItemsTable = () => (
    <div className="items-table-container">
      <div className="table-header">
        <div className="table-actions">
          <label className="select-all">
            <input
              type="checkbox"
              checked={selectedItems.length === items.length && items.length > 0}
              onChange={handleSelectAll}
            />
            Select All ({selectedItems.length} selected)
          </label>
          
          {selectedItems.length > 0 && (
            <div className="bulk-actions">
              <button
                className="btn btn-warning btn-sm"
                onClick={() => handleArchiveSelected(true)}
                disabled={loading.archiving}
              >
                Archive Selected
              </button>
              <button
                className="btn btn-success btn-sm"
                onClick={() => handleArchiveSelected(false)}
                disabled={loading.archiving}
              >
                Unarchive Selected
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="table-responsive">
        <table className="process-table">
          <thead>
            <tr>
              <th>Select</th>
              <th>ID</th>
              <th>Batch</th>
              <th>Stock</th>
              <th>Product</th>
              <th>Used</th>
              <th>Remaining</th>
              <th>Operator</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading.items ? (
              <tr>
                <td colSpan={10} className="loading-row">
                  <div className="spinner"></div>
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={10} className="empty-row">
                  No processes found
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const stockStatus = getStockStatus(item.stock_remaining_pieces);
                return (
                  <tr key={item.id} className={selectedItems.includes(item.id) ? 'selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                      />
                    </td>
                    <td>{item.id}</td>
                    <td>
                      <code>{item.process_id_batch || 'N/A'}</code>
                    </td>
                    <td>{item.stock_batch || 'N/A'}</td>
                    <td>{item.finished_product_name || 'N/A'}</td>
                    <td className="pieces-cell">
                      <strong>{formatPieces(item.pieces_used)}</strong>
                    </td>
                    <td>
                      <span 
                        className="stock-pieces"
                        style={{ color: stockStatus.color }}
                        title={`Stock status: ${stockStatus.status}`}
                      >
                        {formatPieces(item.stock_remaining_pieces)}
                      </span>
                    </td>
                    <td>{item.user_name || 'Unknown'}</td>
                    <td>{formatDate(item.manufactured_date)}</td>
                    <td>{getStatusBadge(item.archive)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Batches Table Component
  const BatchesTable = () => (
    <div className="batches-table-container">
      <div className="table-responsive">
        <table className="batches-table">
          <thead>
            <tr>
              <th>Batch Number</th>
              <th>Items</th>
              <th>Date</th>
              <th>Operator</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading.batches ? (
              <tr>
                <td colSpan={5} className="loading-row">
                  <div className="spinner"></div>
                  Loading...
                </td>
              </tr>
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-row">
                  No batches found
                </td>
              </tr>
            ) : (
              batches.map((batch) => (
                <tr key={batch.process_batch_number}>
                  <td>
                    <code>{batch.process_batch_number}</code>
                  </td>
                  <td>{batch.total_items}</td>
                  <td>{formatDate(batch.manufactured_date)}</td>
                  <td>{batch.user_name}</td>
                  <td>
                    <div className="batch-actions">
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteBatch(batch.process_batch_number)}
                        disabled={loading.deleting}
                        title="Delete batch"
                      >
                        🗑️ Delete
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => processManagementService.archiveBatch(batch.process_batch_number)}
                        disabled={loading.archiving}
                        title="Archive/Unarchive batch"
                      >
                        📥 Archive
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
  );

  // Analytics Component
  const Analytics = () => {
    const analytics = processManagementService.getAnalytics();
    
    useEffect(() => {
      // Calculate analytics when tab becomes active
      if (activeTab === 'analytics') {
        processManagementService.calculatePieceAnalytics();
      }
    }, [activeTab]);

    if (!analytics) {
      return (
        <div className="analytics-container">
          <div className="empty-analytics">
            <h3>No Data Available</h3>
            <p>Analytics will appear once processing begins.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="analytics-container">
        <div className="analytics-cards">
          <div className="analytics-card">
            <h4>Total Pieces Consumed</h4>
            <div className="analytics-value">
              {analytics.total_pieces_consumed?.toLocaleString() || 0}
            </div>
          </div>
          
          <div className="analytics-card">
            <h4>Average Pieces per Process</h4>
            <div className="analytics-value">
              {analytics.average_pieces_per_process || 0}
            </div>
          </div>
          
          <div className="analytics-card">
            <h4>Most Efficient Stock</h4>
            <div className="analytics-value">
              {analytics.most_efficient_stock?.stock_batch || 'None'}
            </div>
            {analytics.most_efficient_stock?.efficiency_ratio && (
              <div className="analytics-detail">
                {analytics.most_efficient_stock.efficiency_ratio.toFixed(2)} pieces/process
              </div>
            )}
          </div>
        </div>

        {analytics.piece_consumption_by_product && analytics.piece_consumption_by_product.length > 0 && (
          <div className="consumption-table">
            <h4>Piece Consumption by Product</h4>
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Product Category</th>
                  <th>Total Pieces</th>
                  <th>Process Count</th>
                  <th>Avg Pieces/Process</th>
                </tr>
              </thead>
              <tbody>
                {analytics.piece_consumption_by_product.map((product, index) => (
                  <tr key={index}>
                    <td>{product.product_name}</td>
                    <td>{product.total_pieces.toLocaleString()}</td>
                    <td>{product.process_count}</td>
                    <td>{(product.total_pieces / product.process_count).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="process-management">
      <div className="page-header">
        <div className="header-content">
          <h1>Process Management</h1>
          <p>Track manufacturing processes and inventory consumption</p>
        </div>
        
        {currentUser && (
          <div className="user-info">
            <span>👤 {currentUser.first_name} {currentUser.last_name}</span>
            <span className="user-role">({currentUser.position})</span>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-message">
              {processManagementService.getErrorMessage(error)}
            </span>
            <button 
              className="error-close"
              onClick={() => processManagementService.clearError()}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <StatsCards />

      {/* Navigation Tabs */}
      <div className="tab-navigation">
        <button
          className={`tab ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          Process Items ({items.length})
        </button>
        <button
          className={`tab ${activeTab === 'batches' ? 'active' : ''}`}
          onClick={() => setActiveTab('batches')}
        >
          Batches ({batches.length})
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </div>

      {/* Filters */}
      {activeTab === 'items' && <FiltersBar />}

      {/* Content */}
      <div className="tab-content">
        {activeTab === 'items' && <ItemsTable />}
        {activeTab === 'batches' && <BatchesTable />}
        {activeTab === 'analytics' && <Analytics />}
      </div>

      {/* Batch Upload Modal */}
      {showBatchUpload && (
        <BatchProcessUpload
          onSuccess={() => {
            setShowBatchUpload(false);
            loadData();
          }}
          onCancel={() => setShowBatchUpload(false)}
        />
      )}

      {/* Loading Overlay */}
      {(loading.creating || loading.deleting || loading.archiving) && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>
              {loading.creating && 'Creating process...'}
              {loading.deleting && 'Deleting batch...'}
              {loading.archiving && 'Updating status...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessManagement;