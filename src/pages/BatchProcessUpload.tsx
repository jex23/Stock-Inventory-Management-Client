import React, { useState, useEffect } from 'react';
import { processManagementService } from '../services/processManagementService';
import { authService } from '../services/authService';
import type { 
  BatchProcessCreate,
  BatchProcessItem,
  ProcessFormErrors
} from '../types/processManagement';
import './BatchProcessUpload.css';

interface Product {
  id: number;
  name: string;
  price: number;
  unit: string;
  quantity: number;
}

interface Stock {
  id: number;
  batch: string;
  piece: number;
  category: string;
  archive: boolean;
  product_id: number;
  supplier_id: number;
  users_id: number;
  used: boolean;
  created_at: string;
  updated_at: string;
  product_name?: string;
  product_unit?: string;
  product_quantity?: number;
  supplier_name?: string;
  user_name?: string;
}

interface BatchProcessUploadProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const BatchProcessUpload: React.FC<BatchProcessUploadProps> = ({
  onSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState<BatchProcessCreate>({
    items: [{ stock_id: 0, finished_product_id: 0 }],
    users_id: undefined
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [nextBatchNumber, setNextBatchNumber] = useState<string>('');
  const [loading, setLoading] = useState({
    data: false,
    submitting: false
  });
  const [errors, setErrors] = useState<ProcessFormErrors>({});

  const currentUser = authService.getUser();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(prev => ({ ...prev, data: true }));
    
    try {
      // Load products, stocks, and next batch number
      const [productsResponse, stocksResponse, batchNumber] = await Promise.all([
        fetchProducts(),
        fetchStocks(),
        processManagementService.getNextBatchNumber()
      ]);

      setProducts(productsResponse);
      setStocks(stocksResponse);
      setNextBatchNumber(batchNumber);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setErrors({ general: 'Failed to load required data. Please try again.' });
    } finally {
      setLoading(prev => ({ ...prev, data: false }));
    }
  };

  // Mock API calls - replace with actual API endpoints
  const fetchProducts = async (): Promise<Product[]> => {
    // In real implementation, this would call your products API
    const response = await fetch('/api/products', {
      headers: {
        'Authorization': `Bearer ${authService.getToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }
    
    return response.json();
  };

  const fetchStocks = async (): Promise<Stock[]> => {
    // In real implementation, this would call your stocks API
    const response = await fetch('/api/stocks?archive=false&used=false', {
      headers: {
        'Authorization': `Bearer ${authService.getToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch stocks');
    }
    
    return response.json();
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { stock_id: 0, finished_product_id: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: keyof BatchProcessItem, value: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));

    // Clear field-specific errors
    if (errors[`items`]) {
      setErrors(prev => ({ ...prev, items: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ProcessFormErrors = {};

    // Validate items array
    if (formData.items.length === 0) {
      newErrors.items = 'At least one item is required';
    }

    // Validate each item
    let hasItemErrors = false;
    formData.items.forEach((item, index) => {
      if (item.stock_id === 0) {
        newErrors[`stock_${index}`] = 'Please select a stock item';
        hasItemErrors = true;
      }
      if (item.finished_product_id === 0) {
        newErrors[`product_${index}`] = 'Please select a finished product';
        hasItemErrors = true;
      }
    });

    if (hasItemErrors) {
      newErrors.items = 'Please complete all item selections';
    }

    // Check for duplicate stock items
    const stockIds = formData.items.map(item => item.stock_id);
    const duplicateStockIds = stockIds.filter((id, index) => stockIds.indexOf(id) !== index);
    if (duplicateStockIds.length > 0) {
      newErrors.items = 'Each stock item can only be used once per batch';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(prev => ({ ...prev, submitting: true }));

    try {
      const submitData: BatchProcessCreate = {
        ...formData,
        users_id: currentUser?.id
      };

      await processManagementService.createBatch(submitData);
      onSuccess();
    } catch (error) {
      console.error('Failed to create batch:', error);
      setErrors({ 
        general: error instanceof Error ? error.message : 'Failed to create batch. Please try again.' 
      });
    } finally {
      setLoading(prev => ({ ...prev, submitting: false }));
    }
  };

  const getStockDisplayName = (stock: Stock): string => {
    return `${stock.batch} - ${stock.product_name || `Product ${stock.product_id}`} (${stock.piece} pcs)`;
  };

  const getProductDisplayName = (product: Product): string => {
    return `${product.name} - $${product.price.toFixed(2)}`;
  };

  const availableStocks = stocks.filter(stock => 
    !stock.archive && !stock.used
  );

  return (
    <div className="batch-upload-overlay">
      <div className="batch-upload-modal">
        <div className="modal-header">
          <h2>Create Process Batch</h2>
          <button 
            className="close-btn"
            onClick={onCancel}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {loading.data ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading data...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="batch-form">
              {/* Batch Info */}
              <div className="batch-info">
                <div className="info-item">
                  <label>Batch Number:</label>
                  <span className="batch-number">{nextBatchNumber || 'Loading...'}</span>
                </div>
                <div className="info-item">
                  <label>Operator:</label>
                  <span className="operator-name">
                    {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Unknown'}
                  </span>
                </div>
                <div className="info-item">
                  <label>Date:</label>
                  <span className="batch-date">
                    {new Date().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              {/* Error Display */}
              {errors.general && (
                <div className="error-message">
                  <span>{errors.general}</span>
                </div>
              )}

              {errors.items && (
                <div className="error-message">
                  <span>{errors.items}</span>
                </div>
              )}

              {/* Process Items */}
              <div className="process-items">
                <div className="items-header">
                  <h3>Process Items</h3>
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={addItem}
                  >
                    + Add Item
                  </button>
                </div>

                <div className="items-list">
                  {formData.items.map((item, index) => (
                    <div key={index} className="process-item-form">
                      <div className="item-header">
                        <span className="item-number">Item #{index + 1}</span>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            className="remove-item-btn"
                            onClick={() => removeItem(index)}
                          >
                            🗑️
                          </button>
                        )}
                      </div>

                      <div className="item-fields">
                        <div className="field-group">
                          <label htmlFor={`stock_${index}`}>
                            Stock Item <span className="required">*</span>
                          </label>
                          <select
                            id={`stock_${index}`}
                            value={item.stock_id}
                            onChange={(e) => updateItem(index, 'stock_id', parseInt(e.target.value))}
                            className={errors[`stock_${index}`] ? 'error' : ''}
                            required
                          >
                            <option value={0}>Select stock item...</option>
                            {availableStocks.map((stock) => (
                              <option key={stock.id} value={stock.id}>
                                {getStockDisplayName(stock)}
                              </option>
                            ))}
                          </select>
                          {errors[`stock_${index}`] && (
                            <span className="field-error">{errors[`stock_${index}`]}</span>
                          )}
                        </div>

                        <div className="field-group">
                          <label htmlFor={`product_${index}`}>
                            Finished Product <span className="required">*</span>
                          </label>
                          <select
                            id={`product_${index}`}
                            value={item.finished_product_id}
                            onChange={(e) => updateItem(index, 'finished_product_id', parseInt(e.target.value))}
                            className={errors[`product_${index}`] ? 'error' : ''}
                            required
                          >
                            <option value={0}>Select finished product...</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {getProductDisplayName(product)}
                              </option>
                            ))}
                          </select>
                          {errors[`product_${index}`] && (
                            <span className="field-error">{errors[`product_${index}`]}</span>
                          )}
                        </div>
                      </div>

                      {/* Item Preview */}
                      {item.stock_id > 0 && item.finished_product_id > 0 && (
                        <div className="item-preview">
                          <div className="preview-icon">✓</div>
                          <div className="preview-text">
                            Processing{' '}
                            <strong>
                              {availableStocks.find(s => s.id === item.stock_id)?.batch}
                            </strong>
                            {' → '}
                            <strong>
                              {products.find(p => p.id === item.finished_product_id)?.name}
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="batch-summary">
                <h3>Batch Summary</h3>
                <div className="summary-stats">
                  <div className="summary-item">
                    <span className="summary-label">Total Items:</span>
                    <span className="summary-value">{formData.items.length}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Completed Items:</span>
                    <span className="summary-value">
                      {formData.items.filter(item => item.stock_id > 0 && item.finished_product_id > 0).length}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Ready to Process:</span>
                    <span className={`summary-value ${
                      formData.items.every(item => item.stock_id > 0 && item.finished_product_id > 0) 
                        ? 'ready' : 'not-ready'
                    }`}>
                      {formData.items.every(item => item.stock_id > 0 && item.finished_product_id > 0) 
                        ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="modal-footer">
          <button 
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading.submitting}
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading.submitting || loading.data}
          >
            {loading.submitting ? (
              <>
                <div className="btn-spinner"></div>
                Creating Batch...
              </>
            ) : (
              'Create Process Batch'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchProcessUpload;