import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { processManagementService } from '../services/processManagementService';
import { stockService } from '../services/stockService';
import { authService } from '../services/authService';
import { API_CONFIG, API_ENDPOINTS, ApiUtils } from '../constants/api';
import type { 
  BatchProcessCreate,
  ProcessFormErrors
} from '../types/processManagement';
import type { Stock } from '../types/stock';
import './BatchProcessUpload.css';

interface FinishedProductCategory {
  id: number;
  name: string;
}

interface SelectedStock {
  stock_id: number;
  pieces_to_use: number;
}

const BatchProcessUpload: React.FC = () => {
  const navigate = useNavigate();
  // State for one finished product per batch
  const [selectedFinishedProduct, setSelectedFinishedProduct] = useState<number>(0);
  
  // State for multiple stock selections
  const [selectedStocks, setSelectedStocks] = useState<SelectedStock[]>([]);
  
  // Data states
  const [finishedProductCategories, setFinishedProductCategories] = useState<FinishedProductCategory[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [allStocks, setAllStocks] = useState<Stock[]>([]);
  const [nextBatchNumber, setNextBatchNumber] = useState<string>('');
  
  // Loading and error states
  const [loading, setLoading] = useState({
    data: false,
    submitting: false,
    validating: false
  });
  const [errors, setErrors] = useState<ProcessFormErrors>({});

  const currentUser = authService.getUser();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(prev => ({ ...prev, data: true }));
    
    try {
      // Get data using proper services
      const [batchNumber, categories, allStocks] = await Promise.all([
        processManagementService.getNextBatchNumber(),
        // Get finished product categories from the categories API
        fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.CATEGORIES.BASE}`, {
          method: 'GET',
          headers: ApiUtils.getAuthHeaders()
        }).then(res => res.ok ? res.json() : []),
        // Use stockService to get all stocks
        stockService.getAllStocks()
      ]);
      
      console.log('🔍 BatchProcessUpload - Total stocks from API:', allStocks.length);
      console.log('🔍 BatchProcessUpload - Sample stocks:', allStocks.slice(0, 2));
      
      // Filter stocks to only include available ones for batch processing
      // Only include non-archived, non-used raw materials with available pieces
      const availableStocks = allStocks.filter(stock => {
        const isAvailable = !stock.archive && !stock.used && stock.piece > 0 && stock.category === 'raw material';
        return isAvailable;
      });

      // Check if there are archived stocks with pieces that could be used
      const archivedStocksWithPieces = allStocks.filter(stock => 
        stock.archive && !stock.used && stock.piece > 0 && stock.category === 'raw material'
      );

      if (archivedStocksWithPieces.length > 0 && availableStocks.length === 0) {
        // Show info about archived stocks
        const archivedBatches = [...new Set(archivedStocksWithPieces.map(stock => stock.batch))];
        setErrors({ 
          general: `No active stocks available. There are ${archivedStocksWithPieces.length} archived stocks with available pieces in batches: ${archivedBatches.join(', ')}. Please unarchive these batches in Stock Management to use them for processing.` 
        });
      }
      
      console.log('🔍 BatchProcessUpload - Available stocks after filter:', availableStocks.length);
      console.log('🔍 BatchProcessUpload - Categories:', categories?.length || 0);
      if (availableStocks.length > 0) {
        console.log('🔍 BatchProcessUpload - Sample available stock:', availableStocks[0]);
      }
      
      setFinishedProductCategories(categories || []);
      setAllStocks(allStocks || []); // Store all stocks for reference
      setStocks(availableStocks || []); // Store only available stocks for selection
      setNextBatchNumber(batchNumber || '');
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      setErrors({ general: 'Failed to load data. Please refresh and try again.' });
    } finally {
      setLoading(prev => ({ ...prev, data: false }));
    }
  };

  // stocks are already filtered in loadInitialData, so we can use them directly
  const availableStocks = stocks;

  // Add stock to selection with default 100 pieces
  const addStock = () => {
    const newStock: SelectedStock = {
      stock_id: 0,
      pieces_to_use: 100  // Default to 100 pieces
    };
    setSelectedStocks(prev => [...prev, newStock]);
  };

  // Remove stock from selection
  const removeStock = (index: number) => {
    setSelectedStocks(prev => prev.filter((_, i) => i !== index));
  };

  // Update stock selection
  const updateStock = (index: number, field: 'stock_id' | 'pieces_to_use', value: number) => {
    setSelectedStocks(prev => prev.map((stock, i) => 
      i === index ? { ...stock, [field]: value } : stock
    ));
  };

  const getStockDisplayName = (stock: Stock): string => {
    return `${stock.batch} - ${stock.product_name || `Product ${stock.product_id}`} (${stock.piece} pcs available)`;
  };

  const getCategoryDisplayName = (category: FinishedProductCategory): string => {
    return category.name;
  };

  const validateForm = (): boolean => {
    const newErrors: ProcessFormErrors = {};

    if (selectedFinishedProduct === 0) {
      newErrors.finished_product = 'Please select a finished product';
    }

    if (selectedStocks.length === 0) {
      newErrors.stocks = 'Please add at least one stock item';
    }

    selectedStocks.forEach((stock, index) => {
      if (stock.stock_id === 0) {
        newErrors[`stock_${index}`] = 'Please select a stock item';
      }
      if (stock.pieces_to_use <= 0) {
        newErrors[`pieces_${index}`] = 'Pieces must be greater than 0';
      }
      
      const stockData = stocks.find(s => s.id === stock.stock_id);
      if (stockData && stock.pieces_to_use > stockData.piece) {
        newErrors[`pieces_${index}`] = `Not enough pieces available (max: ${stockData.piece})`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(prev => ({ ...prev, submitting: true }));
    
    try {
      const formData: BatchProcessCreate = {
        items: selectedStocks.map(stock => ({
          stock_id: stock.stock_id,
          finished_product_id: selectedFinishedProduct,
          pieces_to_use: stock.pieces_to_use
        })),
        users_id: currentUser?.id
      };

      await processManagementService.createBatch(formData);
      
      // Show success message and navigate back to process management
      alert('Batch process created successfully!');
      navigate('/process');
      
    } catch (error) {
      console.error('Error creating batch process:', error);
      setErrors({ 
        general: error instanceof Error ? error.message : 'Failed to create batch process'
      });
    } finally {
      setLoading(prev => ({ ...prev, submitting: false }));
    }
  };

  if (loading.data) {
    return (
      <div className="batch-process-upload">
        <div className="loading">
          <div className="spinner"></div>
          <div>Loading batch process data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <h1>Create Batch Process</h1>
          <p>Process multiple stock items into a finished product</p>
          {nextBatchNumber && (
            <div className="batch-number-display">
              <strong>Next Batch Number: {nextBatchNumber}</strong>
            </div>
          )}
        </div>
        
        {currentUser && (
          <div className="user-info">
            <span>👤 {currentUser.first_name} {currentUser.last_name}</span>
            <span className="user-role">({currentUser.position})</span>
          </div>
        )}
      </div>

      <div className="batch-process-upload">

      {errors.general && (
        <div className="alert alert-danger">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="batch-process-form">
        {/* Finished Product Selection (One per batch) */}
        <div className="form-section">
          <h3>Finished Product Selection</h3>
          <div className="field-group">
            <label htmlFor="finished_product">
              Finished Product <span className="required">*</span>
            </label>
            <select
              id="finished_product"
              value={selectedFinishedProduct}
              onChange={(e) => setSelectedFinishedProduct(parseInt(e.target.value))}
              className={errors.finished_product ? 'form-control error' : 'form-control'}
              required
              disabled={finishedProductCategories.length === 0}
            >
              <option value={0}>
                {finishedProductCategories.length === 0 ? 'No categories available' : 'Select finished product...'}
              </option>
              {finishedProductCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {getCategoryDisplayName(category)}
                </option>
              ))}
            </select>
            {errors.finished_product && (
              <div className="field-error">{errors.finished_product}</div>
            )}
          </div>
        </div>

        {/* Stock Items Selection */}
        <div className="form-section">
          <div className="section-header">
            <h3>Stock Items to Process</h3>
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={addStock}
              disabled={availableStocks.length === 0 || selectedFinishedProduct === 0}
            >
              + Add Stock
            </button>
          </div>

          {availableStocks.length === 0 && (
            <div className="alert alert-warning">
              ⚠️ No active stocks available for processing.
              {allStocks.filter(stock => 
                stock.archive && !stock.used && stock.piece > 0 && stock.category === 'raw material'
              ).length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  💡 <strong>Tip:</strong> There are archived stocks with available pieces. 
                  <button 
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => navigate('/stock-in')}
                    style={{ marginLeft: '8px', padding: '4px 8px' }}
                  >
                    Go to Stock Management
                  </button>
                  to unarchive batches and make them available for processing.
                </div>
              )}
            </div>
          )}

          {finishedProductCategories.length === 0 && (
            <div className="alert alert-warning">
              ⚠️ No finished product categories found. Please ensure you have categories configured.
            </div>
          )}

          {selectedStocks.length === 0 && selectedFinishedProduct > 0 && (
            <div className="alert alert-info">
              📋 Click "+ Add Stock" to add stock items to process.
            </div>
          )}

          {errors.stocks && (
            <div className="alert alert-danger">
              {errors.stocks}
            </div>
          )}

          {/* Selected Stocks Table */}
          {selectedStocks.length > 0 && (
            <div className="selected-stocks-table">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Stock Item</th>
                    <th>Available Pieces</th>
                    <th>Pieces to Use</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStocks.map((selectedStock, index) => {
                    const stockData = stocks.find(s => s.id === selectedStock.stock_id);
                    
                    return (
                      <tr key={index}>
                        <td>
                          <select
                            value={selectedStock.stock_id}
                            onChange={(e) => updateStock(index, 'stock_id', parseInt(e.target.value))}
                            className={`form-control ${errors[`stock_${index}`] ? 'error' : ''}`}
                            required
                          >
                            <option value={0}>Select stock item...</option>
                            {availableStocks
                              .filter(stock => 
                                !selectedStocks.some((s, i) => i !== index && s.stock_id === stock.id)
                              )
                              .map((stock) => (
                                <option key={stock.id} value={stock.id}>
                                  {getStockDisplayName(stock)}
                                </option>
                              ))
                            }
                          </select>
                          {errors[`stock_${index}`] && (
                            <div className="field-error">{errors[`stock_${index}`]}</div>
                          )}
                        </td>
                        <td className="text-center">
                          {stockData ? stockData.piece.toLocaleString() : '-'}
                        </td>
                        <td>
                          <input
                            type="number"
                            value={selectedStock.pieces_to_use}
                            onChange={(e) => updateStock(index, 'pieces_to_use', parseInt(e.target.value) || 0)}
                            className={`form-control ${errors[`pieces_${index}`] ? 'error' : ''}`}
                            min="1"
                            max={stockData?.piece || 999999}
                            required
                          />
                          {errors[`pieces_${index}`] && (
                            <div className="field-error">{errors[`pieces_${index}`]}</div>
                          )}
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => removeStock(index)}
                            title="Remove this stock item"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        {selectedStocks.length > 0 && selectedFinishedProduct > 0 && (
          <div className="form-section">
            <h3>Process Summary</h3>
            <div className="summary-card">
              <div className="summary-item">
                <label>Finished Product:</label>
                <span>{finishedProductCategories.find(c => c.id === selectedFinishedProduct)?.name}</span>
              </div>
              <div className="summary-item">
                <label>Stock Items:</label>
                <span>{selectedStocks.length}</span>
              </div>
              <div className="summary-item">
                <label>Total Pieces to Process:</label>
                <span>{selectedStocks.reduce((sum, stock) => sum + stock.pieces_to_use, 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/process')}
            disabled={loading.submitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading.submitting || selectedStocks.length === 0 || selectedFinishedProduct === 0}
          >
            {loading.submitting ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status"></span>
                Creating Process...
              </>
            ) : (
              'Create Batch Process'
            )}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default BatchProcessUpload;