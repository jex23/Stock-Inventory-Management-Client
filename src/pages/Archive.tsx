import React, { useState, useEffect } from 'react';
import { stockService } from '../services/stockService';
import { processManagementService } from '../services/processManagementService';
import { authService } from '../services/authService';
import type { Stock } from '../types/stock';
import type { ProcessManagementResponse, ProcessBatchSummaryResponse } from '../types/processManagement';
import './Archive.css';

interface ArchiveStats {
  total_stock_batches: number;
  total_process_batches: number;
  archived_stock_batches: number;
  archived_process_batches: number;
  archived_stock_items: number;
  archived_process_items: number;
}

interface LoadingState {
  stocks: boolean;
  processes: boolean;
  stats: boolean;
  operation: boolean;
}

const Archive: React.FC = () => {
  const currentUser = authService.getUser();
  
  // Tab management
  const [activeTab, setActiveTab] = useState<'batches' | 'individual'>('batches');
  const [batchType, setBatchType] = useState<'stock' | 'process'>('stock');
  
  // Data states
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [processes, setProcesses] = useState<ProcessManagementResponse[]>([]);
  const [stockBatches, setStockBatches] = useState<any[]>([]);
  const [processBatches, setProcessBatches] = useState<ProcessBatchSummaryResponse[]>([]);
  const [stats, setStats] = useState<ArchiveStats | null>(null);
  
  // Selection states
  const [selectedStocks, setSelectedStocks] = useState<number[]>([]);
  const [selectedProcesses, setSelectedProcesses] = useState<number[]>([]);
  const [selectedStockBatches, setSelectedStockBatches] = useState<string[]>([]);
  const [selectedProcessBatches, setSelectedProcessBatches] = useState<string[]>([]);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  
  // Filter states
  const [archiveFilter, setArchiveFilter] = useState<'all' | 'archived' | 'active'>('all');
  
  // Loading states
  const [loading, setLoading] = useState<LoadingState>({
    stocks: false,
    processes: false,
    stats: false,
    operation: false
  });
  
  const [error, setError] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(prev => ({ ...prev, stocks: true, processes: true, stats: true }));
    setError(null);
    
    try {
      // Load data in parallel for better performance
      const [stocksData, processesData, stockBatchesData, processBatchesData] = await Promise.all([
        stockService.getAllStocks(),
        processManagementService.fetchItems({ archive: undefined }), // Get both archived and active
        stockService.getAllBatches(), // Get all stock batches
        processManagementService.fetchBatches()
      ]);

      setStocks(stocksData || []);
      setProcesses(processesData || []);
      setProcessBatches(processBatchesData || []);
      
      // Group stocks by batch
      const stockBatchGroups = groupStocksByBatch(stocksData || []);
      setStockBatches(stockBatchGroups);
      
      // Calculate stats
      calculateStats(stocksData || [], processesData || [], stockBatchGroups, processBatchesData || []);
      
    } catch (error) {
      console.error('Failed to load archive data:', error);
      setError('Failed to load archive data. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, stocks: false, processes: false, stats: false }));
    }
  };

  const groupStocksByBatch = (stocks: Stock[]) => {
    const batches = new Map<string, Stock[]>();
    
    stocks.forEach(stock => {
      const batchKey = stock.batch || 'Unknown';
      if (!batches.has(batchKey)) {
        batches.set(batchKey, []);
      }
      batches.get(batchKey)!.push(stock);
    });

    return Array.from(batches.entries()).map(([batchNumber, items]) => ({
      batch_number: batchNumber,
      items,
      total_items: items.length,
      archived_items: items.filter(item => item.archive).length,
      active_items: items.filter(item => !item.archive).length,
      archive_percentage: Math.round((items.filter(item => item.archive).length / items.length) * 100),
      is_archived: items.every(item => item.archive),
      status: items.every(item => item.archive) ? 'archived' : 
              items.some(item => item.archive) ? 'partial' : 'active',
      created_at: items[0]?.created_at || new Date().toISOString(),
      user_name: items[0]?.user_name || 'Unknown'
    }));
  };

  const calculateStats = (
    stocks: Stock[], 
    processes: ProcessManagementResponse[], 
    stockBatches: any[], 
    processBatches: ProcessBatchSummaryResponse[]
  ) => {
    const stats: ArchiveStats = {
      total_stock_batches: stockBatches.length,
      total_process_batches: processBatches.length,
      archived_stock_batches: stockBatches.filter(batch => batch.is_archived).length,
      archived_process_batches: processBatches.filter(batch => {
        // Get archive status from processes
        const batchProcesses = processes.filter(p => p.process_id_batch === batch.process_batch_number);
        return batchProcesses.length > 0 && batchProcesses.every(p => p.archive);
      }).length,
      archived_stock_items: stocks.filter(stock => stock.archive).length,
      archived_process_items: processes.filter(process => process.archive).length
    };
    
    setStats(stats);
  };

  // Archive operations
  const handleArchiveStock = async (stockId: number, archive: boolean) => {
    setLoading(prev => ({ ...prev, operation: true }));
    try {
      await stockService.archiveStock(stockId);
      await loadAllData(); // Refresh data
      alert(`Stock ${archive ? 'archived' : 'unarchived'} successfully!`);
    } catch (error) {
      console.error('Archive operation failed:', error);
      setError('Archive operation failed. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, operation: false }));
    }
  };

  const handleArchiveStockBatch = async (batchNumber: string, archive: boolean) => {
    setLoading(prev => ({ ...prev, operation: true }));
    try {
      await stockService.setBatchArchiveStatus(batchNumber, archive);
      await loadAllData(); // Refresh data
      alert(`Stock batch ${archive ? 'archived' : 'unarchived'} successfully!`);
    } catch (error) {
      console.error('Batch archive operation failed:', error);
      setError('Batch archive operation failed. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, operation: false }));
    }
  };

  const handleArchiveProcessBatch = async (batchNumber: string, archive: boolean) => {
    setLoading(prev => ({ ...prev, operation: true }));
    try {
      await processManagementService.setBatchArchiveStatus(batchNumber, archive);
      await loadAllData(); // Refresh data
      alert(`Process batch ${archive ? 'archived' : 'unarchived'} successfully!`);
    } catch (error) {
      console.error('Process batch archive operation failed:', error);
      setError('Process batch archive operation failed. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, operation: false }));
    }
  };

  // Selection handlers
  const handleSelectStock = (stockId: number) => {
    setSelectedStocks(prev => 
      prev.includes(stockId) 
        ? prev.filter(id => id !== stockId)
        : [...prev, stockId]
    );
  };

  const handleSelectProcess = (processId: number) => {
    setSelectedProcesses(prev => 
      prev.includes(processId) 
        ? prev.filter(id => id !== processId)
        : [...prev, processId]
    );
  };

  const handleSelectStockBatch = (batchNumber: string) => {
    setSelectedStockBatches(prev => 
      prev.includes(batchNumber) 
        ? prev.filter(b => b !== batchNumber)
        : [...prev, batchNumber]
    );
  };

  const handleSelectProcessBatch = (batchNumber: string) => {
    setSelectedProcessBatches(prev => 
      prev.includes(batchNumber) 
        ? prev.filter(b => b !== batchNumber)
        : [...prev, batchNumber]
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

  // Bulk operations
  const handleBulkArchive = async (archive: boolean) => {
    if (activeTab === 'batches') {
      const selectedBatches = batchType === 'stock' ? selectedStockBatches : selectedProcessBatches;
      if (selectedBatches.length === 0) return;

      setLoading(prev => ({ ...prev, operation: true }));
      try {
        for (const batchNumber of selectedBatches) {
          if (batchType === 'stock') {
            await stockService.setBatchArchiveStatus(batchNumber, archive);
          } else {
            await processManagementService.setBatchArchiveStatus(batchNumber, archive);
          }
        }
        
        // Clear selections
        if (batchType === 'stock') {
          setSelectedStockBatches([]);
        } else {
          setSelectedProcessBatches([]);
        }
        
        await loadAllData();
        alert(`${selectedBatches.length} batches ${archive ? 'archived' : 'unarchived'} successfully!`);
      } catch (error) {
        console.error('Bulk archive operation failed:', error);
        setError('Bulk archive operation failed. Please try again.');
      } finally {
        setLoading(prev => ({ ...prev, operation: false }));
      }
    } else {
      // Individual items
      const selectedItems = batchType === 'stock' ? selectedStocks : selectedProcesses;
      if (selectedItems.length === 0) return;

      setLoading(prev => ({ ...prev, operation: true }));
      try {
        for (const itemId of selectedItems) {
          if (batchType === 'stock') {
            await stockService.archiveStock(itemId);
          } else {
            // For processes, we archive by batch since that's how the API works
            const process = processes.find(p => p.id === itemId);
            if (process?.process_id_batch) {
              await processManagementService.setBatchArchiveStatus(process.process_id_batch, archive);
            }
          }
        }
        
        // Clear selections
        if (batchType === 'stock') {
          setSelectedStocks([]);
        } else {
          setSelectedProcesses([]);
        }
        
        await loadAllData();
        alert(`${selectedItems.length} items ${archive ? 'archived' : 'unarchived'} successfully!`);
      } catch (error) {
        console.error('Bulk archive operation failed:', error);
        setError('Bulk archive operation failed. Please try again.');
      } finally {
        setLoading(prev => ({ ...prev, operation: false }));
      }
    }
  };

  // Filter data based on archive status
  const getFilteredStocks = () => {
    switch (archiveFilter) {
      case 'archived': return stocks.filter(stock => stock.archive);
      case 'active': return stocks.filter(stock => !stock.archive);
      default: return stocks;
    }
  };

  const getFilteredProcesses = () => {
    switch (archiveFilter) {
      case 'archived': return processes.filter(process => process.archive);
      case 'active': return processes.filter(process => !process.archive);
      default: return processes;
    }
  };

  const getFilteredStockBatches = () => {
    switch (archiveFilter) {
      case 'archived': return stockBatches.filter(batch => batch.is_archived);
      case 'active': return stockBatches.filter(batch => !batch.is_archived);
      default: return stockBatches;
    }
  };

  const getFilteredProcessBatches = () => {
    const batchesWithStatus = processBatches.map(batch => {
      const batchProcesses = processes.filter(p => p.process_id_batch === batch.process_batch_number);
      const isArchived = batchProcesses.length > 0 && batchProcesses.every(p => p.archive);
      return { ...batch, is_archived: isArchived };
    });

    switch (archiveFilter) {
      case 'archived': return batchesWithStatus.filter(batch => batch.is_archived);
      case 'active': return batchesWithStatus.filter(batch => !batch.is_archived);
      default: return batchesWithStatus;
    }
  };

  // Utility functions
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (archive: boolean) => {
    return (
      <span className={`status-badge ${archive ? 'archived' : 'active'}`}>
        {archive ? 'Archived' : 'Active'}
      </span>
    );
  };

  const formatPieces = (pieces: number | null | undefined): string => {
    return pieces?.toLocaleString() || 'N/A';
  };

  if (loading.stocks && loading.processes && stocks.length === 0 && processes.length === 0) {
    return (
      <div className="archive-management">
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Loading Archive Management...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="archive-management">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>🗄️ Archive Management</h1>
          <p>Manage archived stock and process batches</p>
        </div>
        
        {currentUser && (
          <div className="user-info">
            <span>👤 {currentUser.first_name} {currentUser.last_name}</span>
            <span className="user-role">({currentUser.position})</span>
          </div>
        )}
      </div>

      {/* Error Messages */}
      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
            <button 
              className="error-close"
              onClick={() => setError(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <div className="stat-value">{stats.total_stock_batches}</div>
              <div className="stat-label">Stock Batches</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏭</div>
            <div className="stat-content">
              <div className="stat-value">{stats.total_process_batches}</div>
              <div className="stat-label">Process Batches</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📥</div>
            <div className="stat-content">
              <div className="stat-value">{stats.archived_stock_batches + stats.archived_process_batches}</div>
              <div className="stat-label">Archived Batches</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <div className="stat-value">{stats.archived_stock_items + stats.archived_process_items}</div>
              <div className="stat-label">Archived Items</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="filters-bar">
        <div className="filter-controls">
          <div className="filter-group">
            <label>View:</label>
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as 'batches' | 'individual')}
            >
              <option value="batches">📦 Batches</option>
              <option value="individual">📋 Individual Items</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Type:</label>
            <select
              value={batchType}
              onChange={(e) => setBatchType(e.target.value as 'stock' | 'process')}
            >
              <option value="stock">📦 Stock</option>
              <option value="process">🏭 Process</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select
              value={archiveFilter}
              onChange={(e) => setArchiveFilter(e.target.value as 'all' | 'archived' | 'active')}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        
        <div className="filter-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => setArchiveFilter('all')}
          >
            Clear Filters
          </button>
          <button 
            className="btn btn-primary"
            onClick={loadAllData}
            disabled={loading.stocks || loading.processes}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {((activeTab === 'batches' && ((batchType === 'stock' && selectedStockBatches.length > 0) || (batchType === 'process' && selectedProcessBatches.length > 0))) ||
        (activeTab === 'individual' && ((batchType === 'stock' && selectedStocks.length > 0) || (batchType === 'process' && selectedProcesses.length > 0)))) && (
        <div className="bulk-actions-card">
          <div className="bulk-actions-header">
            <h3>🔄 Bulk Actions ({
              activeTab === 'batches' 
                ? (batchType === 'stock' ? selectedStockBatches.length : selectedProcessBatches.length)
                : (batchType === 'stock' ? selectedStocks.length : selectedProcesses.length)
            } selected)</h3>
          </div>
          <div className="bulk-actions-content">
            <button
              className="btn btn-warning"
              onClick={() => handleBulkArchive(true)}
              disabled={loading.operation}
            >
              📥 Archive Selected
            </button>
            <button
              className="btn btn-success"
              onClick={() => handleBulkArchive(false)}
              disabled={loading.operation}
            >
              📤 Unarchive Selected
            </button>
          </div>
        </div>
      )}

      {/* Content based on active tab and batch type */}
      {activeTab === 'batches' ? (
        batchType === 'stock' ? (
          <StockBatchesTable 
            batches={getFilteredStockBatches()}
            selectedBatches={selectedStockBatches}
            expandedBatches={expandedBatches}
            onSelectBatch={handleSelectStockBatch}
            onToggleExpansion={toggleBatchExpansion}
            onArchiveBatch={handleArchiveStockBatch}
            loading={loading.stocks}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
            formatPieces={formatPieces}
          />
        ) : (
          <ProcessBatchesTable 
            batches={getFilteredProcessBatches()}
            processes={processes}
            selectedBatches={selectedProcessBatches}
            expandedBatches={expandedBatches}
            onSelectBatch={handleSelectProcessBatch}
            onToggleExpansion={toggleBatchExpansion}
            onArchiveBatch={handleArchiveProcessBatch}
            loading={loading.processes}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
            formatPieces={formatPieces}
          />
        )
      ) : (
        batchType === 'stock' ? (
          <StockItemsTable 
            stocks={getFilteredStocks()}
            selectedStocks={selectedStocks}
            onSelectStock={handleSelectStock}
            onArchiveStock={handleArchiveStock}
            loading={loading.stocks}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
            formatPieces={formatPieces}
          />
        ) : (
          <ProcessItemsTable 
            processes={getFilteredProcesses()}
            selectedProcesses={selectedProcesses}
            onSelectProcess={handleSelectProcess}
            onArchiveProcess={async (processId: number, archive: boolean) => {
              const process = processes.find(p => p.id === processId);
              if (process?.process_id_batch) {
                await handleArchiveProcessBatch(process.process_id_batch, archive);
              }
            }}
            loading={loading.processes}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
            formatPieces={formatPieces}
          />
        )
      )}

      {/* Loading Overlay */}
      {loading.operation && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Processing operation...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Stock Batches Table Component
const StockBatchesTable: React.FC<{
  batches: any[];
  selectedBatches: string[];
  expandedBatches: Set<string>;
  onSelectBatch: (batchNumber: string) => void;
  onToggleExpansion: (batchNumber: string) => void;
  onArchiveBatch: (batchNumber: string, archive: boolean) => void;
  loading: boolean;
  formatDate: (date: string) => string;
  getStatusBadge: (archive: boolean) => React.ReactNode;
  formatPieces: (pieces: number | null | undefined) => string;
}> = ({ 
  batches, 
  selectedBatches, 
  expandedBatches,
  onSelectBatch, 
  onToggleExpansion,
  onArchiveBatch, 
  loading, 
  formatDate, 
  getStatusBadge, 
  formatPieces 
}) => (
  <div className="table-container">
    <div className="table-responsive">
      <table className="archive-table">
        <thead>
          <tr>
            <th>Select</th>
            <th>Batch Number</th>
            <th>Items</th>
            <th>Status</th>
            <th>Progress</th>
            <th>Date</th>
            <th>User</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && batches.length === 0 ? (
            <tr className="loading-row">
              <td colSpan={8}>
                <div className="spinner"></div>
                Loading stock batches...
              </td>
            </tr>
          ) : batches.length === 0 ? (
            <tr className="empty-row">
              <td colSpan={8}>No stock batches found</td>
            </tr>
          ) : (
            batches.map((batch) => {
              const isExpanded = expandedBatches.has(batch.batch_number);
              return (
                <React.Fragment key={batch.batch_number}>
                  <tr className={selectedBatches.includes(batch.batch_number) ? 'selected batch-row' : 'batch-row'}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedBatches.includes(batch.batch_number)}
                        onChange={() => onSelectBatch(batch.batch_number)}
                      />
                    </td>
                    <td>
                      <div className="batch-number-container">
                        <button
                          className="batch-expand-btn"
                          onClick={() => onToggleExpansion(batch.batch_number)}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                        <code>{batch.batch_number}</code>
                      </div>
                    </td>
                    <td>
                      <strong>{batch.total_items}</strong>
                      <span className="item-label">items</span>
                    </td>
                    <td>{getStatusBadge(batch.is_archived)}</td>
                    <td>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${batch.archive_percentage}%` }}
                        ></div>
                        <span className="progress-text">{batch.archive_percentage}%</span>
                      </div>
                    </td>
                    <td>{formatDate(batch.created_at)}</td>
                    <td>{batch.user_name}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className={`btn btn-sm ${batch.is_archived ? 'btn-success' : 'btn-warning'}`}
                          onClick={() => onArchiveBatch(batch.batch_number, !batch.is_archived)}
                          title={batch.is_archived ? 'Unarchive batch' : 'Archive batch'}
                        >
                          {batch.is_archived ? '📤' : '📥'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {isExpanded && (
                    <tr className="batch-details-row">
                      <td colSpan={8}>
                        <div className="batch-details">
                          <h4>Items in Batch: {batch.batch_number}</h4>
                          <div className="batch-items-table">
                            <table className="items-detail-table">
                              <thead>
                                <tr>
                                  <th>Stock ID</th>
                                  <th>Product</th>
                                  <th>Pieces</th>
                                  <th>Category</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {batch.items.map((item: Stock) => (
                                  <tr key={item.id}>
                                    <td>{item.id}</td>
                                    <td>{item.product_name || `Product ${item.product_id}`}</td>
                                    <td>{formatPieces(item.piece)}</td>
                                    <td>{item.category}</td>
                                    <td>{getStatusBadge(item.archive)}</td>
                                  </tr>
                                ))}
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
  </div>
);

// Process Batches Table Component
const ProcessBatchesTable: React.FC<{
  batches: any[];
  processes: ProcessManagementResponse[];
  selectedBatches: string[];
  expandedBatches: Set<string>;
  onSelectBatch: (batchNumber: string) => void;
  onToggleExpansion: (batchNumber: string) => void;
  onArchiveBatch: (batchNumber: string, archive: boolean) => void;
  loading: boolean;
  formatDate: (date: string) => string;
  getStatusBadge: (archive: boolean) => React.ReactNode;
  formatPieces: (pieces: number | null | undefined) => string;
}> = ({ 
  batches, 
  processes,
  selectedBatches, 
  expandedBatches,
  onSelectBatch, 
  onToggleExpansion,
  onArchiveBatch, 
  loading, 
  formatDate, 
  getStatusBadge, 
  formatPieces 
}) => (
  <div className="table-container">
    <div className="table-responsive">
      <table className="archive-table">
        <thead>
          <tr>
            <th>Select</th>
            <th>Batch Number</th>
            <th>Items</th>
            <th>Status</th>
            <th>Date</th>
            <th>User</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && batches.length === 0 ? (
            <tr className="loading-row">
              <td colSpan={7}>
                <div className="spinner"></div>
                Loading process batches...
              </td>
            </tr>
          ) : batches.length === 0 ? (
            <tr className="empty-row">
              <td colSpan={7}>No process batches found</td>
            </tr>
          ) : (
            batches.map((batch) => {
              const isExpanded = expandedBatches.has(batch.process_batch_number);
              const batchProcesses = processes.filter(p => p.process_id_batch === batch.process_batch_number);
              
              return (
                <React.Fragment key={batch.process_batch_number}>
                  <tr className={selectedBatches.includes(batch.process_batch_number) ? 'selected batch-row' : 'batch-row'}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedBatches.includes(batch.process_batch_number)}
                        onChange={() => onSelectBatch(batch.process_batch_number)}
                      />
                    </td>
                    <td>
                      <div className="batch-number-container">
                        <button
                          className="batch-expand-btn"
                          onClick={() => onToggleExpansion(batch.process_batch_number)}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                        <code>{batch.process_batch_number}</code>
                      </div>
                    </td>
                    <td>
                      <strong>{batch.total_items}</strong>
                      <span className="item-label">items</span>
                    </td>
                    <td>{getStatusBadge(batch.is_archived)}</td>
                    <td>{formatDate(batch.manufactured_date)}</td>
                    <td>{batch.user_name}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className={`btn btn-sm ${batch.is_archived ? 'btn-success' : 'btn-warning'}`}
                          onClick={() => onArchiveBatch(batch.process_batch_number, !batch.is_archived)}
                          title={batch.is_archived ? 'Unarchive batch' : 'Archive batch'}
                        >
                          {batch.is_archived ? '📤' : '📥'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {isExpanded && (
                    <tr className="batch-details-row">
                      <td colSpan={7}>
                        <div className="batch-details">
                          <h4>Items in Batch: {batch.process_batch_number}</h4>
                          <div className="batch-items-table">
                            <table className="items-detail-table">
                              <thead>
                                <tr>
                                  <th>Process ID</th>
                                  <th>Stock</th>
                                  <th>Product</th>
                                  <th>Used Pieces</th>
                                  <th>Remaining</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {batchProcesses.map((item) => (
                                  <tr key={item.id}>
                                    <td>{item.id}</td>
                                    <td>{item.stock_batch || `Stock ${item.stock_id}`}</td>
                                    <td>{item.finished_product_name || `Product ${item.finished_product_id}`}</td>
                                    <td>{formatPieces(item.pieces_used)}</td>
                                    <td>{formatPieces(item.stock_remaining_pieces)}</td>
                                    <td>{getStatusBadge(item.archive)}</td>
                                  </tr>
                                ))}
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
  </div>
);

// Stock Items Table Component
const StockItemsTable: React.FC<{
  stocks: Stock[];
  selectedStocks: number[];
  onSelectStock: (stockId: number) => void;
  onArchiveStock: (stockId: number, archive: boolean) => void;
  loading: boolean;
  formatDate: (date: string) => string;
  getStatusBadge: (archive: boolean) => React.ReactNode;
  formatPieces: (pieces: number | null | undefined) => string;
}> = ({ 
  stocks, 
  selectedStocks, 
  onSelectStock, 
  onArchiveStock, 
  loading, 
  formatDate, 
  getStatusBadge, 
  formatPieces 
}) => (
  <div className="table-container">
    <div className="table-responsive">
      <table className="archive-table">
        <thead>
          <tr>
            <th>Select</th>
            <th>Stock ID</th>
            <th>Batch</th>
            <th>Product</th>
            <th>Pieces</th>
            <th>Category</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && stocks.length === 0 ? (
            <tr className="loading-row">
              <td colSpan={9}>
                <div className="spinner"></div>
                Loading stock items...
              </td>
            </tr>
          ) : stocks.length === 0 ? (
            <tr className="empty-row">
              <td colSpan={9}>No stock items found</td>
            </tr>
          ) : (
            stocks.map((stock) => (
              <tr key={stock.id} className={selectedStocks.includes(stock.id) ? 'selected' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedStocks.includes(stock.id)}
                    onChange={() => onSelectStock(stock.id)}
                  />
                </td>
                <td>{stock.id}</td>
                <td><code>{stock.batch}</code></td>
                <td>{stock.product_name || `Product ${stock.product_id}`}</td>
                <td>{formatPieces(stock.piece)}</td>
                <td>{stock.category}</td>
                <td>{getStatusBadge(stock.archive)}</td>
                <td>{formatDate(stock.created_at)}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className={`btn btn-sm ${stock.archive ? 'btn-success' : 'btn-warning'}`}
                      onClick={() => onArchiveStock(stock.id, !stock.archive)}
                      title={stock.archive ? 'Unarchive stock' : 'Archive stock'}
                    >
                      {stock.archive ? '📤' : '📥'}
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

// Process Items Table Component
const ProcessItemsTable: React.FC<{
  processes: ProcessManagementResponse[];
  selectedProcesses: number[];
  onSelectProcess: (processId: number) => void;
  onArchiveProcess: (processId: number, archive: boolean) => void;
  loading: boolean;
  formatDate: (date: string) => string;
  getStatusBadge: (archive: boolean) => React.ReactNode;
  formatPieces: (pieces: number | null | undefined) => string;
}> = ({ 
  processes, 
  selectedProcesses, 
  onSelectProcess, 
  onArchiveProcess, 
  loading, 
  formatDate, 
  getStatusBadge, 
  formatPieces 
}) => (
  <div className="table-container">
    <div className="table-responsive">
      <table className="archive-table">
        <thead>
          <tr>
            <th>Select</th>
            <th>Process ID</th>
            <th>Batch</th>
            <th>Stock</th>
            <th>Product</th>
            <th>Used</th>
            <th>Remaining</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && processes.length === 0 ? (
            <tr className="loading-row">
              <td colSpan={10}>
                <div className="spinner"></div>
                Loading process items...
              </td>
            </tr>
          ) : processes.length === 0 ? (
            <tr className="empty-row">
              <td colSpan={10}>No process items found</td>
            </tr>
          ) : (
            processes.map((process) => (
              <tr key={process.id} className={selectedProcesses.includes(process.id) ? 'selected' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedProcesses.includes(process.id)}
                    onChange={() => onSelectProcess(process.id)}
                  />
                </td>
                <td>{process.id}</td>
                <td><code>{process.process_id_batch}</code></td>
                <td>{process.stock_batch || `Stock ${process.stock_id}`}</td>
                <td>{process.finished_product_name || `Product ${process.finished_product_id}`}</td>
                <td>{formatPieces(process.pieces_used)}</td>
                <td>{formatPieces(process.stock_remaining_pieces)}</td>
                <td>{getStatusBadge(process.archive)}</td>
                <td>{formatDate(process.manufactured_date)}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className={`btn btn-sm ${process.archive ? 'btn-success' : 'btn-warning'}`}
                      onClick={() => onArchiveProcess(process.id, !process.archive)}
                      title={process.archive ? 'Unarchive process' : 'Archive process'}
                    >
                      {process.archive ? '📤' : '📥'}
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

export default Archive;