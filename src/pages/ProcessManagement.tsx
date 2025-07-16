import React, { useState, useEffect } from 'react';
import { processManagementService } from '../services/processManagementService';
import { authService } from '../services/authService';
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
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    console.log('🚀 ProcessManagement component mounted');
    
    // Debug API configuration on mount
    if (process.env.NODE_ENV === 'development') {
      processManagementService.debugConfiguration();
    }

    // Subscribe to service state changes
    const unsubscribe = processManagementService.subscribe((serviceState) => {
      console.log('🔄 Service state updated:', serviceState);
      setState(serviceState);
    });

    // Load initial data
    loadInitialData();

    return () => {
      console.log('🧹 ProcessManagement component unmounting');
      unsubscribe();
    };
  }, []);

  const loadInitialData = async () => {
    try {
      console.log('📋 Loading initial process management data...');
      
      // Load each endpoint separately to identify which one fails
      const loadPromises = [];

      // Load stats
      try {
        console.log('📊 Loading stats...');
        loadPromises.push(
          processManagementService.fetchStats()
            .then(() => console.log('✅ Stats loaded successfully'))
            .catch(error => console.error('❌ Failed to load stats:', error))
        );
      } catch (error) {
        console.error('❌ Error setting up stats loading:', error);
      }

      // Load batches
      try {
        console.log('📦 Loading batches...');
        loadPromises.push(
          processManagementService.fetchBatches()
            .then(() => console.log('✅ Batches loaded successfully'))
            .catch(error => console.error('❌ Failed to load batches:', error))
        );
      } catch (error) {
        console.error('❌ Error setting up batches loading:', error);
      }

      // Load items
      try {
        console.log('📋 Loading items...');
        const filters = { 
          archive: viewMode === 'archived' ? true : viewMode === 'active' ? false : undefined 
        };
        console.log('🔍 Using filters:', filters);
        
        loadPromises.push(
          processManagementService.fetchItems(filters)
            .then(() => console.log('✅ Items loaded successfully'))
            .catch(error => {
              console.error('❌ Failed to load items:', error);
              // Don't rethrow here, let the component handle the error display
            })
        );
      } catch (error) {
        console.error('❌ Error setting up items loading:', error);
      }

      // Wait for all promises to settle (not fail fast)
      await Promise.allSettled(loadPromises);
      console.log('📋 Initial data loading completed');

    } catch (error) {
      console.error('❌ Failed to load process management data:', error);
    }
  };

  // Enhanced view mode change handler
  const handleViewModeChange = async (mode: 'active' | 'archived' | 'all') => {
    console.log('🔄 Changing view mode to:', mode);
    setViewMode(mode);
    
    const filters: ProcessManagementFilters = {};
    
    if (mode === 'archived') {
      filters.archive = true;
    } else if (mode === 'active') {
      filters.archive = false;
    }
    // For 'all' mode, don't set archive filter

    console.log('🔍 Applying filters:', filters);

    try {
      await processManagementService.fetchItems(filters);
      console.log('✅ View mode changed successfully');
    } catch (error) {
      console.error('❌ Failed to filter items:', error);
      // Show user-friendly error message
      processManagementService.setPublicError({
        code: 'FILTER_ERROR',
        message: 'Failed to filter processes. Please try again.'
      });
    }
  };

  const handleArchiveProcess = async (id: number) => {
    try {
      console.log('📥 Archiving process:', id);
      const item = state.items.find(i => i.id === id);
      if (!item) {
        console.warn('⚠️ Process item not found:', id);
        return;
      }

      await processManagementService.updateItem(id, { archive: !item.archive });
      
      // Refresh data
      await loadInitialData();
      console.log('✅ Process archived successfully');
    } catch (error) {
      console.error('❌ Failed to archive process:', error);
    }
  };

  const handleDeleteProcess = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this process?')) {
      return;
    }

    try {
      console.log('🗑️ Deleting process:', id);
      await processManagementService.deleteItem(id);
      console.log('✅ Process deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete process:', error);
    }
  };

  const handleBatchAction = async (batchNumber: string, action: 'delete' | 'archive') => {
    if (action === 'delete') {
      if (!window.confirm(`Are you sure you want to delete batch ${batchNumber}?`)) {
        return;
      }
      try {
        console.log('🗑️ Deleting batch:', batchNumber);
        await processManagementService.deleteBatch(batchNumber);
        await loadInitialData();
        console.log('✅ Batch deleted successfully');
      } catch (error) {
        console.error('❌ Failed to delete batch:', error);
      }
    } else if (action === 'archive') {
      try {
        console.log('📥 Archiving batch:', batchNumber);
        await processManagementService.archiveBatch(batchNumber);
        await loadInitialData();
        console.log('✅ Batch archived successfully');
      } catch (error) {
        console.error('❌ Failed to archive batch:', error);
      }
    }
  };

  const handleBatchUploadSuccess = async () => {
    console.log('✅ Batch upload successful, refreshing data...');
    setShowBatchUpload(false);
    await loadInitialData();
  };

  // Debug functions
 const debugApiConnectivity = async () => {
  console.log('🧪 Starting API connectivity test...');
  
  try {
    const isConnected = await processManagementService.testApiConnectivity();
    if (isConnected) {
      alert('✅ API connectivity test passed!');
    } else {
      alert('❌ API connectivity test failed. Check console for details.');
    }
  } catch (error) {
    console.error('❌ Debug test failed:', error);
    
    // Fix: Properly handle unknown error type
    const errorMessage = error instanceof Error ? error.message : String(error);
    alert(`❌ Debug test failed: ${errorMessage}`);
  }
};

  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
    console.log('🧪 Debug mode:', !debugMode ? 'ON' : 'OFF');
  };

  const handleClearError = () => {
    console.log('🧹 Clearing error');
    processManagementService.clearError();
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

  const currentUser = authService.getUser();

  if (!currentUser) {
    return (
      <div className="process-container">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          Please log in to access process management.
        </div>
      </div>
    );
  }

  return (
    <div className="process-container">
      {/* Header */}
      <div className="page-header">
        <h1>Process Management</h1>
        <div className="header-actions">
          {/* Debug controls for development */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{ display: 'flex', gap: '10px', marginRight: '10px' }}>
              <button 
                className="btn btn-secondary"
                onClick={debugApiConnectivity}
                title="Test API connectivity"
              >
                🧪 Test API
              </button>
              <button 
                className={`btn ${debugMode ? 'btn-warning' : 'btn-secondary'}`}
                onClick={toggleDebugMode}
                title="Toggle debug mode"
              >
                🔍 Debug {debugMode ? 'ON' : 'OFF'}
              </button>
            </div>
          )}
          <button 
            className="btn btn-primary"
            onClick={() => setShowBatchUpload(true)}
            disabled={state.loading.creating}
          >
            {state.loading.creating ? 'Creating...' : '+ New Batch Process'}
          </button>
        </div>
      </div>

      {/* Debug Information */}
      {debugMode && (
        <div style={{ 
          backgroundColor: '#f0f8ff', 
          border: '1px solid #add8e6', 
          padding: '12px', 
          borderRadius: '4px',
          margin: '10px 0',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <strong>🔍 Debug Info:</strong>
          <pre style={{ margin: '8px 0' }}>
            {JSON.stringify({
              currentUser: currentUser?.username,
              viewMode,
              filters: state.filters,
              loading: state.loading,
              itemsCount: state.items.length,
              batchesCount: state.batches.length,
              hasStats: !!state.stats,
              hasError: !!state.error
            }, null, 2)}
          </pre>
        </div>
      )}

      {/* Enhanced Error Display */}
      {state.error && (
        <div style={{ 
          backgroundColor: '#fee', 
          border: '1px solid #fcc', 
          padding: '12px', 
          borderRadius: '4px',
          margin: '10px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div style={{ flex: 1 }}>
            <strong>⚠️ {state.error.code}:</strong> {processManagementService.getErrorMessage(state.error)}
            {state.error.details && debugMode && (
              <details style={{ marginTop: '8px' }}>
                <summary style={{ cursor: 'pointer', fontSize: '12px' }}>Show technical details</summary>
                <pre style={{ fontSize: '11px', marginTop: '4px', backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                  {JSON.stringify(state.error.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
          <button 
            onClick={handleClearError}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '16px', 
              cursor: 'pointer',
              padding: '4px 8px',
              marginLeft: '10px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Loading States */}
      {(state.loading.stats || state.loading.batches || state.loading.items) && (
        <div style={{ 
          backgroundColor: '#f0f8ff', 
          border: '1px solid #add8e6', 
          padding: '8px', 
          borderRadius: '4px',
          margin: '10px 0',
          fontSize: '14px'
        }}>
          <span>🔄 Loading: </span>
          {state.loading.stats && <span>Stats... </span>}
          {state.loading.batches && <span>Batches... </span>}
          {state.loading.items && <span>Items... </span>}
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
                {debugMode && (
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                    Debug: {state.items.length} items, filters: {JSON.stringify(state.filters)}
                  </div>
                )}
              </div>
            ) : (
              state.items.map((process) => (
                <div key={process.id} className="process-item">
                  <div className="process-info">
                    <h4>{process.finished_product_name || `Process ${process.id}`}</h4>
                    <div className="process-id">
                      {process.process_id_batch ? `Batch: ${process.process_id_batch}` : `ID: ${process.id}`}
                    </div>
                    {debugMode && (
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '5px' }}>
                        Debug: ID={process.id}, Stock={process.stock_id}, Archive={process.archive}
                      </div>
                    )}
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
                    {debugMode && (
                      <div style={{ fontSize: '10px', color: '#666' }}>
                        Debug: {batch.process_batch_number}
                      </div>
                    )}
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