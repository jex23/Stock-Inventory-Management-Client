import React, { useState, useEffect } from 'react';
import { processManagementService } from '../services/processManagementService';
import { authService } from '../services/authService'; // Fixed: removed 's' from authServices
import BatchProcessUpload from '../pages/BatchProcessUpload';
import type { 
  ProcessManagementResponse,
  ProcessBatchSummaryResponse,
  ProcessManagementStats,
  ProcessManagementFilters,
  ProcessManagementLoadingState,
  ProcessManagementError
} from '../types/processManagement';
import { PROCESS_STAGES } from '../types/processManagement';
import './ProcessManagement.css';

interface ProcessManagementState {
  items: ProcessManagementResponse[];
  batches: ProcessBatchSummaryResponse[];
  stats: ProcessManagementStats | null;
  loading: ProcessManagementLoadingState;
  error: ProcessManagementError | null;
  filters: ProcessManagementFilters;
}

const ProcessManagement: React.FC = () => {
  const [state, setState] = useState<ProcessManagementState>({
    items: [],
    batches: [],
    stats: null,
    loading: {
      items: false,
      stats: false,
      batches: false,
      creating: false,
      updating: false,
      deleting: false,
      archiving: false,
    },
    error: null,
    filters: {}
  });

  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'active' | 'archived' | 'all'>('active');

  useEffect(() => {
    // Subscribe to service state changes
    const unsubscribe = processManagementService.subscribe((serviceState) => {
      setState(serviceState);
    });

    // Load initial data
    loadInitialData();

    return unsubscribe;
  }, []);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        processManagementService.fetchStats(),
        processManagementService.fetchItems({ archive: viewMode === 'archived' ? true : viewMode === 'active' ? false : undefined }),
        processManagementService.fetchBatches()
      ]);
    } catch (error) {
      console.error('Failed to load process management data:', error);
    }
  };

  const handleViewModeChange = async (mode: 'active' | 'archived' | 'all') => {
    setViewMode(mode);
    const filters: ProcessManagementFilters = {};
    
    if (mode === 'archived') {
      filters.archive = true;
    } else if (mode === 'active') {
      filters.archive = false;
    }

    try {
      await processManagementService.fetchItems(filters);
    } catch (error) {
      console.error('Failed to filter items:', error);
    }
  };

  const handleArchiveProcess = async (id: number) => {
    try {
      const item = state.items.find(i => i.id === id);
      if (!item) return;

      // For individual items, we'd need an archive endpoint or update the item
      await processManagementService.updateItem(id, { archive: !item.archive });
      
      // Refresh data
      await loadInitialData();
    } catch (error) {
      console.error('Failed to archive process:', error);
    }
  };

  const handleDeleteProcess = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this process?')) {
      return;
    }

    try {
      await processManagementService.deleteItem(id);
    } catch (error) {
      console.error('Failed to delete process:', error);
    }
  };

  const handleBatchAction = async (batchNumber: string, action: 'delete' | 'archive') => {
    if (action === 'delete') {
      if (!window.confirm(`Are you sure you want to delete batch ${batchNumber}?`)) {
        return;
      }
      try {
        await processManagementService.deleteBatch(batchNumber);
        await loadInitialData();
      } catch (error) {
        console.error('Failed to delete batch:', error);
      }
    } else if (action === 'archive') {
      try {
        await processManagementService.archiveBatch(batchNumber);
        await loadInitialData();
      } catch (error) {
        console.error('Failed to archive batch:', error);
      }
    }
  };

  const handleBatchUploadSuccess = async () => {
    setShowBatchUpload(false);
    await loadInitialData();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressPercentage = (stage: string) => {
    // Mock progress calculation - in real app this would be based on actual process data
    const stages = ['material_preparation', 'processing', 'quality_control', 'finishing', 'packaging', 'dispatch'];
    const currentIndex = stages.indexOf(stage);
    return currentIndex >= 0 ? ((currentIndex + 1) / stages.length) * 100 : 0;
  };

  const handleClearError = () => {
    // Clear error through service
    processManagementService.clearError();
  };

  const currentUser = authService.getUser();

  if (!currentUser) {
    return <div className="process-container">Please log in to access process management.</div>;
  }

  return (
    <div className="process-container">
      {/* Header */}
      <div className="page-header">
        <h1>Process Management</h1>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowBatchUpload(true)}
            disabled={state.loading.creating}
          >
            {state.loading.creating ? 'Creating...' : '+ New Batch Process'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="error-message">
          <span>⚠️ {processManagementService.getErrorMessage(state.error)}</span>
          <button onClick={handleClearError}>×</button>
        </div>
      )}

      {/* Statistics */}
      <div className="process-stats">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-number">{state.stats?.total_processes || 0}</div>
            <div className="stat-label">Total Processes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">▶️</div>
          <div className="stat-content">
            <div className="stat-number">{state.stats?.active_processes || 0}</div>
            <div className="stat-label">Active Processes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-number">{state.stats?.archived_processes || 0}</div>
            <div className="stat-label">Archived</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <div className="stat-number">{state.stats?.total_batches || 0}</div>
            <div className="stat-label">Total Batches</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="process-content">
        {/* Active Processes */}
        <div className="active-processes">
          <div className="section-header">
            <h2>Manufacturing Processes</h2>
            <div className="view-mode-toggle">
              <button 
                className={`toggle-btn ${viewMode === 'active' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('active')}
              >
                Active
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'archived' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('archived')}
              >
                Archived
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'all' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('all')}
              >
                All
              </button>
            </div>
          </div>

          <div className="process-list">
            {state.loading.items ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading processes...</p>
              </div>
            ) : state.items.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No processes found</h3>
                <p>Create your first process batch to get started.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowBatchUpload(true)}
                >
                  Create Batch Process
                </button>
              </div>
            ) : (
              state.items.map((process) => (
                <div key={process.id} className="process-item">
                  <div className="process-info">
                    <h4>{process.finished_product_name || `Process ${process.id}`}</h4>
                    <div className="process-id">
                      {process.process_id_batch ? `Batch: ${process.process_id_batch}` : `ID: ${process.id}`}
                    </div>
                    <div className="process-details">
                      <span className="stage stage-processing">Processing</span>
                      <span className="operator">👤 {process.user_name}</span>
                      <span className="stock-info">📦 {process.stock_batch}</span>
                    </div>
                    <div className="process-progress">
                      <div className="progress-header">
                        <span className="progress-text">Progress</span>
                        <span className="progress-percentage">75%</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: '75%' }}
                        ></div>
                      </div>
                    </div>
                    <div className="process-meta">
                      <span className="process-date">📅 {formatDate(process.manufactured_date)}</span>
                      <span className={`process-status ${process.archive ? 'archived' : 'active'}`}>
                        {process.archive ? 'Archived' : 'Active'}
                      </span>
                    </div>
                  </div>
                  <div className="process-actions">
                    <button 
                      className="action-btn edit"
                      onClick={() => console.log('Edit process', process.id)}
                      title="Edit Process"
                    >
                      ✏️
                    </button>
                    <button 
                      className="action-btn archive"
                      onClick={() => handleArchiveProcess(process.id)}
                      title={process.archive ? 'Unarchive Process' : 'Archive Process'}
                    >
                      {process.archive ? '📤' : '📥'}
                    </button>
                    <button 
                      className="action-btn delete"
                      onClick={() => handleDeleteProcess(process.id)}
                      title="Delete Process"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Process Overview */}
        <div className="process-overview">
          <h2>Process Flow</h2>
          <div className="flow-stages">
            {PROCESS_STAGES.map((stage, index) => (
              <React.Fragment key={stage.id}>
                <div className={`flow-stage ${index <= 2 ? 'active' : ''}`}>
                  <div className="stage-icon">{stage.icon}</div>
                  <span>{stage.name}</span>
                </div>
                {index < PROCESS_STAGES.length - 1 && (
                  <div className="flow-arrow">↓</div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Batch Summary */}
          <div className="batch-summary">
            <h3>Recent Batches</h3>
            <div className="batch-list">
              {state.loading.batches ? (
                <div className="loading-spinner">Loading batches...</div>
              ) : state.batches.slice(0, 5).map((batch) => (
                <div key={batch.process_batch_number} className="batch-item">
                  <div className="batch-info">
                    <div className="batch-number">{batch.process_batch_number}</div>
                    <div className="batch-details">
                      <span>{batch.total_items} items</span>
                      <span>👤 {batch.user_name}</span>
                    </div>
                    <div className="batch-date">{formatDate(batch.manufactured_date)}</div>
                  </div>
                  <div className="batch-actions">
                    <button 
                      className="action-btn view"
                      onClick={() => setSelectedBatch(batch.process_batch_number)}
                      title="View Batch"
                    >
                      👁️
                    </button>
                    <button 
                      className="action-btn archive"
                      onClick={() => handleBatchAction(batch.process_batch_number, 'archive')}
                      title="Archive Batch"
                    >
                      📥
                    </button>
                    <button 
                      className="action-btn delete"
                      onClick={() => handleBatchAction(batch.process_batch_number, 'delete')}
                      title="Delete Batch"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Batch Upload Modal */}
      {showBatchUpload && (
        <BatchProcessUpload
          onSuccess={handleBatchUploadSuccess}
          onCancel={() => setShowBatchUpload(false)}
        />
      )}
    </div>
  );
};

export default ProcessManagement;