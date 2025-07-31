import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { processManagementService } from '../services/processManagementService';
import { authService } from '../services/authService';
import type { 
  ProcessManagementResponse,
  ProcessManagementStats,
  ProcessBatchSummaryResponse,
  ProcessManagementFilters,
  ProcessManagementLoadingState,
  ProcessManagementError,
  QualityControlUpdate
} from '../types/processManagement';
import './ProcessManagement.css';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ProcessManagementProps {
  // Add any props if needed
}

const ProcessManagement: React.FC<ProcessManagementProps> = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'batches' | 'individual'>('batches');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<ProcessManagementFilters>({});
  const [qualityControlModal, setQualityControlModal] = useState<{
    show: boolean;
    processId?: number;
    batchNumber?: string;
    mode: 'single' | 'batch';
    initialData?: QualityControlUpdate;
  }>({ show: false, mode: 'single' });
  
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
    const filteredItems = items.filter(item => {
      if (filters.archive !== undefined) {
        return item.archive === filters.archive;
      }
      return true;
    });
    
    setSelectedItems(
      selectedItems.length === filteredItems.length && filteredItems.length > 0
        ? [] 
        : filteredItems.map(item => item.id)
    );
  };

  const handleSelectBatch = (batchNumber: string) => {
    setSelectedBatches(prev => 
      prev.includes(batchNumber)
        ? prev.filter(b => b !== batchNumber)
        : [...prev, batchNumber]
    );
  };

  const handleSelectAllBatches = () => {
    setSelectedBatches(
      selectedBatches.length === batches.length && batches.length > 0
        ? []
        : batches.map(batch => batch.process_batch_number)
    );
  };

  const toggleBatchExpansion = (batchNumber: string) => {
    setExpandedBatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(batchNumber)) {
        newSet.delete(batchNumber);
      } else {
        newSet.add(batchNumber);
      }
      return newSet;
    });
  };

  const handleArchiveSelected = async (archive: boolean) => {
    if (activeTab === 'batches' && selectedBatches.length === 0) return;
    if (activeTab === 'individual' && selectedItems.length === 0) return;

    try {
      if (activeTab === 'batches') {
        const action = archive ? 'archive' : 'unarchive';
        const confirmed = window.confirm(
          `Are you sure you want to ${action} ${selectedBatches.length} selected batch(es)?`
        );
        
        if (!confirmed) return;
        
        for (const batchNumber of selectedBatches) {
          await processManagementService.setBatchArchiveStatus(batchNumber, archive);
        }
        
        setSelectedBatches([]);
        alert(`Successfully ${archive ? 'archived' : 'unarchived'} ${selectedBatches.length} batch(es)!`);
      } else {
        // Group by batch and archive entire batches for individual items
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
        alert(`Successfully ${archive ? 'archived' : 'unarchived'} batches for ${selectedItems.length} selected items!`);
      }

      await loadData();
    } catch (error) {
      console.error('❌ Failed to archive:', error);
      alert('Failed to update archive status. Please try again.');
    }
  };

  const handleArchiveBatch = async (batchNumber: string, archive?: boolean) => {
    try {
      // Get current archive status from items
      const batchItems = items.filter(item => item.process_id_batch === batchNumber);
      const isCurrentlyArchived = batchItems.length > 0 ? batchItems[0].archive : false;
      const newArchiveStatus = archive !== undefined ? archive : !isCurrentlyArchived;
      
      await processManagementService.setBatchArchiveStatus(batchNumber, newArchiveStatus);
      
      // Reload data to ensure consistency
      await loadData();
      
      // Show success message
      alert(`Batch ${batchNumber} has been ${newArchiveStatus ? 'archived' : 'unarchived'} successfully!`);
    } catch (error) {
      console.error('Failed to update batch archive status:', error);
      alert('Failed to update batch archive status. Please try again.');
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

  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined || typeof price !== 'number') {
      return 'N/A';
    }
    return price.toFixed(2);
  };

  // Quality Control Modal Functions
  const openQualityControlModal = (
    mode: 'single' | 'batch',
    processId?: number,
    batchNumber?: string,
    initialData?: QualityControlUpdate
  ) => {
    setQualityControlModal({
      show: true,
      mode,
      processId,
      batchNumber,
      initialData
    });
  };

  const closeQualityControlModal = () => {
    setQualityControlModal({ show: false, mode: 'single' });
  };

  const handleQualityControlSubmit = async (data: QualityControlUpdate) => {
    try {
      if (qualityControlModal.mode === 'single' && qualityControlModal.processId) {
        await processManagementService.updateQualityControl(qualityControlModal.processId, data);
        alert('Quality control updated successfully!');
      } else if (qualityControlModal.mode === 'batch' && qualityControlModal.batchNumber) {
        await processManagementService.updateBatchQualityControl(qualityControlModal.batchNumber, {
          process_batch_number: qualityControlModal.batchNumber,
          ...data
        });
        alert('Batch quality control updated successfully!');
      }
      closeQualityControlModal();
      await loadData();
    } catch (error) {
      console.error('Failed to update quality control:', error);
      alert('Failed to update quality control. Please try again.');
    }
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
          onClick={() => navigate('/batch-process-upload')}
          disabled={loading.creating}
        >
          + Create Batch
        </button>
      </div>
    </div>
  );

  // Items Table Component
  const ItemsTable = () => {
    const filteredItems = items.filter(item => {
      if (filters.archive !== undefined) {
        return item.archive === filters.archive;
      }
      return true;
    });

    return (
      <div className="items-table-container">
        <div className="table-header">
          <div className="table-actions">
            <label className="select-all">
              <input
                type="checkbox"
                checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                onChange={handleSelectAll}
              />
              Select All ({selectedItems.length} of {filteredItems.length} selected)
            </label>
            
            {selectedItems.length > 0 && (
              <div className="bulk-actions">
                <button
                  className="btn btn-warning btn-sm"
                  onClick={() => handleArchiveSelected(true)}
                  disabled={loading.archiving}
                >
                  📥 Archive Selected ({selectedItems.length})
                </button>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => handleArchiveSelected(false)}
                  disabled={loading.archiving}
                >
                  📤 Unarchive Selected ({selectedItems.length})
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
                <th>Used Pieces</th>
                <th>Stock Remaining</th>
                <th>Quality Control</th>
                <th>Operator</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading.items ? (
                <tr>
                  <td colSpan={12} className="loading-row">
                    <div className="spinner"></div>
                    Loading process items...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="empty-row">
                    {filters.archive !== undefined 
                      ? `No ${filters.archive ? 'archived' : 'active'} processes found`
                      : 'No processes found'
                    }
                    {Object.keys(filters).length > 0 && (
                      <div style={{ marginTop: '8px', fontSize: '0.875rem', color: '#6b7280' }}>
                        Try adjusting your filters or{' '}
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setFilters({});
                            processManagementService.clearFilters();
                          }}
                          style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                        >
                          Clear Filters
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
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
                      <td>
                        <span className="item-id">{item.id}</span>
                      </td>
                      <td>
                        <code>{item.process_id_batch || 'N/A'}</code>
                      </td>
                      <td>
                        <span className="stock-batch" title={`Stock ID: ${item.stock_id}`}>
                          {item.stock_batch || `Stock-${item.stock_id}`}
                        </span>
                      </td>
                      <td>
                        <span className="product-name" title={`Product ID: ${item.finished_product_id}`}>
                          {item.finished_product_name || `Product-${item.finished_product_id}`}
                        </span>
                      </td>
                      <td className="pieces-cell">
                        <strong className="pieces-used">{formatPieces(item.pieces_used)}</strong>
                        <span className="pieces-unit">pcs</span>
                      </td>
                      <td>
                        <span 
                          className="stock-pieces"
                          style={{ color: stockStatus.color }}
                          title={`Stock status: ${stockStatus.status} (${formatPieces(item.stock_remaining_pieces)} pieces remaining)`}
                        >
                          {formatPieces(item.stock_remaining_pieces)}
                          <span className="pieces-unit">pcs</span>
                        </span>
                      </td>
                      <td className="quality-control-cell">
                        <div className="quality-control-info">
                          {item.good !== null || item.defect !== null || item.price_output !== null ? (
                            <div className="quality-data">
                              {item.good !== null && (
                                <span className="good-count" title="Good pieces">
                                  ✅ {item.good}
                                </span>
                              )}
                              {item.defect !== null && (
                                <span className="defect-count" title="Defective pieces">
                                  ❌ {item.defect}
                                </span>
                              )}
                              {item.price_output !== null && item.price_output !== undefined && (
                                <span className="price-output" title="Output price">
                                  💰 ${formatPrice(item.price_output)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="no-qc-data" title="No quality control data">
                              📋 Pending
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="operator-name">{item.user_name || 'Unknown'}</span>
                      </td>
                      <td>
                        <span className="date-display" title={item.manufactured_date}>
                          {formatDate(item.manufactured_date)}
                        </span>
                      </td>
                      <td>{getStatusBadge(item.archive)}</td>
                      <td>
                        <div className="item-actions">
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => openQualityControlModal('single', item.id, undefined, {
                              good: item.good,
                              defect: item.defect,
                              price_output: item.price_output
                            })}
                            title="Edit quality control"
                          >
                            🔍 QC
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {filteredItems.length > 0 && (
          <div className="table-footer">
            <div className="table-summary">
              <span>Showing {filteredItems.length} of {items.length} process items</span>
              {selectedItems.length > 0 && (
                <span className="selection-summary">
                  • {selectedItems.length} selected
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Batches Table Component - Process by Batch with expandable details
  const BatchesTable = () => {
    // Get batch archive status from items
    const getBatchArchiveStatus = (batchNumber: string): boolean => {
      const batchItems = items.filter(item => item.process_id_batch === batchNumber);
      return batchItems.length > 0 ? batchItems[0].archive : false;
    };

    const getBatchItems = (batchNumber: string) => {
      return items.filter(item => item.process_id_batch === batchNumber);
    };

    // Calculate batch-level quality control summary
    const getBatchQualityControl = (batchNumber: string) => {
      const batchItems = getBatchItems(batchNumber);
      
      let totalGood = 0;
      let totalDefect = 0;
      let totalPrice = 0;
      let itemsWithQC = 0;
      let allItemsHaveQC = true;

      batchItems.forEach(item => {
        const hasQC = item.good !== null || item.defect !== null || item.price_output !== null;
        if (hasQC) {
          itemsWithQC++;
          if (item.good !== null) totalGood += item.good;
          if (item.defect !== null) totalDefect += item.defect;
          if (item.price_output !== null) totalPrice += item.price_output;
        } else {
          allItemsHaveQC = false;
        }
      });

      const totalOutput = totalGood + totalDefect;
      const successRate = totalOutput > 0 ? (totalGood / totalOutput) * 100 : 0;

      return {
        totalGood,
        totalDefect,
        totalOutput,
        totalPrice,
        successRate,
        itemsWithQC,
        totalItems: batchItems.length,
        allItemsHaveQC,
        hasAnyQC: itemsWithQC > 0
      };
    };

    return (
      <div className="batches-table-container">
        <div className="table-header">
          <div className="table-actions">
            <label className="select-all">
              <input
                type="checkbox"
                checked={selectedBatches.length === batches.length && batches.length > 0}
                onChange={handleSelectAllBatches}
              />
              Select All ({selectedBatches.length} selected)
            </label>
            
            {selectedBatches.length > 0 && (
              <div className="bulk-actions">
                <button
                  className="btn btn-warning btn-sm"
                  onClick={() => handleArchiveSelected(true)}
                  disabled={loading.archiving}
                >
                  📥 Archive Selected ({selectedBatches.length})
                </button>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => handleArchiveSelected(false)}
                  disabled={loading.archiving}
                >
                  📤 Unarchive Selected ({selectedBatches.length})
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="table-responsive">
          <table className="batches-table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Batch Number</th>
                <th>Items</th>
                <th>Quality Control</th>
                <th>Date</th>
                <th>Operator</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading.batches ? (
                <tr>
                  <td colSpan={8} className="loading-row">
                    <div className="spinner"></div>
                    Loading batches...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-row">
                    No batches found
                    {Object.keys(filters).length > 0 && (
                      <div style={{ marginTop: '8px', fontSize: '0.875rem', color: '#6b7280' }}>
                        Try adjusting your filters or{' '}
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setFilters({});
                            processManagementService.clearFilters();
                          }}
                          style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                        >
                          Clear Filters
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                batches.map((batch) => {
                  const isArchived = getBatchArchiveStatus(batch.process_batch_number);
                  const batchItems = getBatchItems(batch.process_batch_number);
                  const isExpanded = expandedBatches.has(batch.process_batch_number);
                  const qcData = getBatchQualityControl(batch.process_batch_number);
                  
                  return (
                    <React.Fragment key={batch.process_batch_number}>
                      <tr className={selectedBatches.includes(batch.process_batch_number) ? 'selected batch-row' : 'batch-row'}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedBatches.includes(batch.process_batch_number)}
                            onChange={() => handleSelectBatch(batch.process_batch_number)}
                          />
                        </td>
                        <td>
                          <div className="batch-number-container">
                            <button
                              className="batch-expand-btn"
                              onClick={() => toggleBatchExpansion(batch.process_batch_number)}
                              title={isExpanded ? 'Collapse batch details' : 'Expand batch details'}
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                            <code>{batch.process_batch_number}</code>
                          </div>
                        </td>
                        <td>
                          <strong className="batch-item-count">{batch.total_items}</strong>
                          <span className="item-label">items</span>
                        </td>
                        <td className="batch-quality-control-cell">
                          <div className="batch-quality-control-info">
                            {qcData.hasAnyQC ? (
                              <div className="batch-quality-data">
                                <div className="batch-qc-summary">
                                  {qcData.totalOutput > 0 && (
                                    <div className="qc-output-summary">
                                      <span className="batch-good-count" title={`Good pieces: ${qcData.totalGood}`}>
                                        ✅ {qcData.totalGood}
                                      </span>
                                      <span className="batch-defect-count" title={`Defective pieces: ${qcData.totalDefect}`}>
                                        ❌ {qcData.totalDefect}
                                      </span>
                                      <span className="batch-success-rate" title={`Success rate: ${qcData.successRate.toFixed(1)}%`}>
                                        📈 {qcData.successRate.toFixed(1)}%
                                      </span>
                                    </div>
                                  )}
                                  {qcData.totalPrice > 0 && (
                                    <span className="batch-total-price" title={`Total output price: $${formatPrice(qcData.totalPrice)}`}>
                                      💰 ${formatPrice(qcData.totalPrice)}
                                    </span>
                                  )}
                                </div>
                                <div className="qc-status">
                                  <span className={`qc-completion ${qcData.allItemsHaveQC ? 'complete' : 'partial'}`}>
                                    {qcData.allItemsHaveQC 
                                      ? '✅ Complete' 
                                      : `⚠️ ${qcData.itemsWithQC}/${qcData.totalItems} items`
                                    }
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="no-batch-qc-data" title="No quality control data for this batch">
                                📋 Pending QC
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="date-display">{formatDate(batch.manufactured_date)}</span>
                        </td>
                        <td>
                          <span className="operator-name">{batch.user_name || 'Unknown'}</span>
                        </td>
                        <td>{getStatusBadge(isArchived)}</td>
                        <td>
                          <div className="batch-actions">
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => openQualityControlModal('batch', undefined, batch.process_batch_number)}
                              title="Edit batch quality control"
                              style={{ marginRight: '8px' }}
                            >
                              🔍 QC
                            </button>
                            <button
                              className={`btn btn-sm ${isArchived ? 'btn-success' : 'btn-warning'}`}
                              onClick={() => handleArchiveBatch(batch.process_batch_number)}
                              disabled={loading.archiving}
                              title={isArchived ? 'Unarchive batch' : 'Archive batch'}
                            >
                              {isArchived ? '📤 Unarchive' : '📥 Archive'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded batch details */}
                      {isExpanded && (
                        <tr className="batch-details-row">
                          <td colSpan={8}>
                            <div className="batch-details">
                              <h4>Batch Details: {batch.process_batch_number}</h4>
                              <div className="batch-items-table">
                                <table className="items-detail-table">
                                  <thead>
                                    <tr>
                                      <th>Item ID</th>
                                      <th>Stock</th>
                                      <th>Product</th>
                                      <th>Used Pieces</th>
                                      <th>Stock Remaining</th>
                                      <th>Quality Control</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {batchItems.map((item) => {
                                      const stockStatus = getStockStatus(item.stock_remaining_pieces);
                                      return (
                                        <tr key={item.id}>
                                          <td>
                                            <span className="item-id">{item.id}</span>
                                          </td>
                                          <td>
                                            <span className="stock-info" title={`Stock ID: ${item.stock_id}`}>
                                              {item.stock_batch || `Stock-${item.stock_id}`}
                                            </span>
                                          </td>
                                          <td>
                                            <span className="product-info" title={`Product ID: ${item.finished_product_id}`}>
                                              {item.finished_product_name || `Product-${item.finished_product_id}`}
                                            </span>
                                          </td>
                                          <td className="pieces-cell">
                                            <strong className="pieces-used">{formatPieces(item.pieces_used)}</strong>
                                            <span className="pieces-unit">pcs</span>
                                          </td>
                                          <td>
                                            <span 
                                              className="stock-pieces"
                                              style={{ color: stockStatus.color }}
                                              title={`Stock status: ${stockStatus.status}`}
                                            >
                                              {formatPieces(item.stock_remaining_pieces)}
                                              <span className="pieces-unit">pcs</span>
                                            </span>
                                          </td>
                                          <td className="batch-item-quality-control">
                                            <div className="batch-item-quality-info">
                                              {item.good !== null || item.defect !== null || item.price_output !== null ? (
                                                <div className="batch-item-quality-data">
                                                  {item.good !== null && (
                                                    <span className="batch-item-good" title="Good pieces">
                                                      ✅ {item.good}
                                                    </span>
                                                  )}
                                                  {item.defect !== null && (
                                                    <span className="batch-item-defect" title="Defective pieces">
                                                      ❌ {item.defect}
                                                    </span>
                                                  )}
                                                  {item.price_output !== null && item.price_output !== undefined && (
                                                    <span className="batch-item-price" title="Output price">
                                                      💰 ${formatPrice(item.price_output)}
                                                    </span>
                                                  )}
                                                </div>
                                              ) : (
                                                <span className="batch-item-no-qc" title="No quality control data">
                                                  📋 Pending
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td>
                                            <div className="batch-item-actions">
                                              <button
                                                className="btn btn-xs btn-primary"
                                                onClick={() => openQualityControlModal('single', item.id, undefined, {
                                                  good: item.good,
                                                  defect: item.defect,
                                                  price_output: item.price_output
                                                })}
                                                title="Edit quality control"
                                              >
                                                🔍 QC
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {batches.length > 0 && (
          <div className="table-footer">
            <div className="table-summary">
              <span>Showing {batches.length} batches</span>
              {selectedBatches.length > 0 && (
                <span className="selection-summary">
                  • {selectedBatches.length} selected
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Quality Control Modal Component
  const QualityControlModal = () => {
    const [formData, setFormData] = useState<QualityControlUpdate>({
      good: null,
      defect: null,
      price_output: null
    });

    React.useEffect(() => {
      if (qualityControlModal.show && qualityControlModal.initialData) {
        setFormData(qualityControlModal.initialData);
      } else if (qualityControlModal.show) {
        setFormData({ good: null, defect: null, price_output: null });
      }
    }, [qualityControlModal.show, qualityControlModal.initialData]);

    const handleInputChange = (field: keyof QualityControlUpdate, value: string) => {
      const numValue = value === '' ? null : Number(value);
      setFormData(prev => ({ ...prev, [field]: numValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleQualityControlSubmit(formData);
    };

    if (!qualityControlModal.show) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content quality-control-modal">
          <div className="modal-header">
            <h3>
              {qualityControlModal.mode === 'single' 
                ? `Quality Control - Process ${qualityControlModal.processId}`
                : `Batch Quality Control - ${qualityControlModal.batchNumber}`
              }
            </h3>
            <button 
              className="modal-close"
              onClick={closeQualityControlModal}
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="modal-body">
            <div className="form-group">
              <label htmlFor="good">Good Pieces:</label>
              <input
                type="number"
                id="good"
                min="0"
                step="1"
                value={formData.good ?? ''}
                onChange={(e) => handleInputChange('good', e.target.value)}
                placeholder="Enter good pieces count"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="defect">Defective Pieces:</label>
              <input
                type="number"
                id="defect"
                min="0"
                step="1"
                value={formData.defect ?? ''}
                onChange={(e) => handleInputChange('defect', e.target.value)}
                placeholder="Enter defective pieces count"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="price_output">Output Price ($):</label>
              <input
                type="number"
                id="price_output"
                min="0"
                step="0.01"
                value={formData.price_output ?? ''}
                onChange={(e) => handleInputChange('price_output', e.target.value)}
                placeholder="Enter output price"
              />
            </div>

            {(formData.good !== null || formData.defect !== null) && (
              <div className="quality-summary">
                <strong>Total Output: {(formData.good || 0) + (formData.defect || 0)} pieces</strong>
                {formData.good !== null && formData.defect !== null && (
                  <div className="quality-rate">
                    Success Rate: {(((formData.good || 0) / ((formData.good || 0) + (formData.defect || 0))) * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            )}
            
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeQualityControlModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading.updating}
              >
                {loading.updating ? 'Updating...' : 'Update Quality Control'}
              </button>
            </div>
          </form>
        </div>
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
          className={`tab ${activeTab === 'batches' ? 'active' : ''}`}
          onClick={() => setActiveTab('batches')}
        >
          📦 Process Batches ({batches.length})
        </button>
        <button
          className={`tab ${activeTab === 'individual' ? 'active' : ''}`}
          onClick={() => setActiveTab('individual')}
        >
          📋 Individual Items ({items.length})
        </button>
      </div>

      {/* Filters */}
      <FiltersBar />

      {/* Content */}
      <div className="tab-content">
        {activeTab === 'batches' && <BatchesTable />}
        {activeTab === 'individual' && <ItemsTable />}
      </div>


      {/* Quality Control Modal */}
      <QualityControlModal />

      {/* Loading Overlay */}
      {(loading.creating || loading.archiving) && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>
              {loading.creating && 'Creating process...'}
              {loading.archiving && 'Updating archive status...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessManagement;