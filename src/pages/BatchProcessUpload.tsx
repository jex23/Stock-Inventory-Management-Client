import React, { useState, useEffect } from 'react';
import { processManagementService } from '../services/processManagementService';
import { authService } from '../services/authService';
import type { 
  BatchProcessCreate,
  BatchProcessItem,
  ProcessFormErrors
} from '../types/processManagement';
import { API_CONFIG, ApiUtils } from '../constants/api'; // Import your API configuration
import './BatchProcessUpload.css';

interface Product {
  id: number;
  name: string;
  price: number | string; // API might return string
  unit: string;
  quantity: number | string; // API might return string
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
  product_quantity?: number | string; // API might return string
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

  // Utility function to safely get error message
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error occurred';
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(prev => ({ ...prev, data: true }));
    
    try {
      console.log('🔄 Loading initial data for batch upload...');
      
      // Load products, stocks, and next batch number
      const [productsResponse, stocksResponse, batchNumber] = await Promise.all([
        fetchProducts(),
        fetchStocks(),
        processManagementService.getNextBatchNumber()
      ]);

      console.log('✅ Initial data loaded:', { 
        products: productsResponse.length, 
        stocks: stocksResponse.length, 
        batchNumber 
      });

      setProducts(productsResponse);
      setStocks(stocksResponse);
      setNextBatchNumber(batchNumber);
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      setErrors({ general: `Failed to load required data: ${getErrorMessage(error)}` });
    } finally {
      setLoading(prev => ({ ...prev, data: false }));
    }
  };

  // Fixed API calls to match your actual API endpoints
  const fetchProducts = async (): Promise<Product[]> => {
    try {
      console.log('📦 Fetching products...');
      
      const url = `${API_CONFIG.BASE_URL}/products`;
      console.log('🌐 Products URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: ApiUtils.getAuthHeaders() // Use your existing auth method
      });
      
      console.log('📡 Products response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Products error response:', errorText);
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate and clean the data
      if (!Array.isArray(data)) {
        console.error('❌ Products data is not an array:', typeof data);
        throw new Error('Invalid products data format received from server');
      }
      
      // Clean and validate each product
      const cleanedProducts = data.map((product: any, index: number) => {
        try {
          return {
            id: Number(product.id) || 0,
            name: String(product.name || `Product ${index + 1}`),
            price: product.price, // Keep original type, will be handled by safeParsePrice
            unit: String(product.unit || 'pcs'),
            quantity: product.quantity // Keep original type, will be handled by safeParseQuantity
          };
        } catch (error) {
          console.warn(`⚠️ Error cleaning product at index ${index}:`, error);
          return {
            id: index + 1,
            name: `Product ${index + 1}`,
            price: 0,
            unit: 'pcs',
            quantity: 0
          };
        }
      });
      
      console.log('✅ Products fetched and cleaned:', cleanedProducts.length, 'items');
      console.log('📋 Sample product:', cleanedProducts[0]);
      return cleanedProducts;
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      throw error;
    }
  };

  const fetchStocks = async (): Promise<Stock[]> => {
    try {
      console.log('📦 Fetching stocks...');
      
      // Build URL with query parameters to match your API
      const params = new URLSearchParams({
        archive: 'false',
        used: 'false'
      });
      const url = `${API_CONFIG.BASE_URL}/stocks?${params.toString()}`;
      console.log('🌐 Stocks URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: ApiUtils.getAuthHeaders() // Use your existing auth method
      });
      
      console.log('📡 Stocks response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Stocks error response:', errorText);
        throw new Error(`Failed to fetch stocks: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate and clean the data
      if (!Array.isArray(data)) {
        console.error('❌ Stocks data is not an array:', typeof data);
        throw new Error('Invalid stocks data format received from server');
      }
      
      // Clean and validate each stock
      const cleanedStocks = data.map((stock: any, index: number) => {
        try {
          return {
            id: Number(stock.id) || 0,
            batch: String(stock.batch || `batch-${index + 1}`),
            piece: Number(stock.piece) || 0,
            category: String(stock.category || 'raw_material'),
            archive: Boolean(stock.archive),
            product_id: Number(stock.product_id) || 0,
            supplier_id: Number(stock.supplier_id) || 0,
            users_id: Number(stock.users_id) || 0,
            used: Boolean(stock.used),
            created_at: String(stock.created_at || new Date().toISOString()),
            updated_at: String(stock.updated_at || new Date().toISOString()),
            product_name: stock.product_name ? String(stock.product_name) : undefined,
            product_unit: stock.product_unit ? String(stock.product_unit) : undefined,
            product_quantity: stock.product_quantity, // Keep original type
            supplier_name: stock.supplier_name ? String(stock.supplier_name) : undefined,
            user_name: stock.user_name ? String(stock.user_name) : undefined
          };
        } catch (error) {
          console.warn(`⚠️ Error cleaning stock at index ${index}:`, error);
          return {
            id: index + 1,
            batch: `batch-${index + 1}`,
            piece: 0,
            category: 'raw_material',
            archive: false,
            product_id: 0,
            supplier_id: 0,
            users_id: 0,
            used: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
      });
      
      console.log('✅ Stocks fetched and cleaned:', cleanedStocks.length, 'items');
      console.log('📋 Sample stock:', cleanedStocks[0]);
      return cleanedStocks;
    } catch (error) {
      console.error('❌ Error fetching stocks:', error);
      throw error;
    }
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
      console.log('🚀 Submitting batch creation...', formData);
      
      const submitData: BatchProcessCreate = {
        ...formData,
        users_id: currentUser?.id
      };

      await processManagementService.createBatch(submitData);
      console.log('✅ Batch created successfully');
      onSuccess();
    } catch (error) {
      console.error('❌ Failed to create batch:', error);
      setErrors({ 
        general: `Failed to create batch: ${getErrorMessage(error)}`
      });
    } finally {
      setLoading(prev => ({ ...prev, submitting: false }));
    }
  };

  // Helper function to safely convert price to number
  const safeParsePrice = (price: number | string | null | undefined): number => {
    if (typeof price === 'number') {
      return isNaN(price) ? 0 : price;
    }
    if (typeof price === 'string') {
      const parsed = parseFloat(price);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Helper function to safely convert quantity to number
  const safeParseQuantity = (quantity: number | string | null | undefined): number => {
    if (typeof quantity === 'number') {
      return isNaN(quantity) ? 0 : quantity;
    }
    if (typeof quantity === 'string') {
      const parsed = parseFloat(quantity);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const getStockDisplayName = (stock: Stock): string => {
    const quantity = safeParseQuantity(stock.product_quantity);
    return `${stock.batch} - ${stock.product_name || `Product ${stock.product_id}`} (${stock.piece} pcs)`;
  };

  const getProductDisplayName = (product: Product): string => {
    const price = safeParsePrice(product.price);
    return `${product.name} - ${price.toFixed(2)}`;
  };

  const availableStocks = stocks.filter(stock => 
    !stock.archive && !stock.used
  );

  // Debug information component
  const DebugInfo = () => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    const sampleProduct = products[0];
    const sampleStock = availableStocks[0];
    
    return (
      <div style={{ 
        backgroundColor: '#f0f8ff', 
        border: '1px solid #add8e6', 
        padding: '10px', 
        margin: '10px 0',
        fontSize: '12px',
        borderRadius: '4px'
      }}>
        <strong>🔍 Debug Info:</strong>
        <pre style={{ margin: '5px 0', fontSize: '11px' }}>
          API Base URL: {API_CONFIG.BASE_URL}
          Products loaded: {products.length}
          Stocks loaded: {stocks.length}
          Available stocks: {availableStocks.length}
          Next batch: {nextBatchNumber}
          Current user: {currentUser?.username}
          {sampleProduct && `
          Sample product:
            ID: ${sampleProduct.id} (${typeof sampleProduct.id})
            Name: ${sampleProduct.name}
            Price: ${sampleProduct.price} (${typeof sampleProduct.price})
            Parsed price: ${safeParsePrice(sampleProduct.price)}`}
          {sampleStock && `
          Sample stock:
            ID: ${sampleStock.id}
            Batch: ${sampleStock.batch}
            Product: ${sampleStock.product_name}
            Quantity: ${sampleStock.product_quantity} (${typeof sampleStock.product_quantity})`}
        </pre>
      </div>
    );
  };

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
          <DebugInfo />
          
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
                <div className="error-message" style={{
                  backgroundColor: '#fee',
                  border: '1px solid #fcc',
                  padding: '10px',
                  borderRadius: '4px',
                  margin: '10px 0',
                  color: '#c33'
                }}>
                  <span>{errors.general}</span>
                </div>
              )}

              {errors.items && (
                <div className="error-message" style={{
                  backgroundColor: '#fee',
                  border: '1px solid #fcc',
                  padding: '10px',
                  borderRadius: '4px',
                  margin: '10px 0',
                  color: '#c33'
                }}>
                  <span>{errors.items}</span>
                </div>
              )}

              {/* Data Status */}
              <div style={{ 
                backgroundColor: products.length > 0 && stocks.length > 0 ? '#e8f5e8' : '#fff3cd',
                border: `1px solid ${products.length > 0 && stocks.length > 0 ? '#28a745' : '#ffc107'}`,
                padding: '8px',
                borderRadius: '4px',
                margin: '10px 0',
                fontSize: '14px'
              }}>
                📊 Data Status: {products.length} products, {availableStocks.length} available stocks
              </div>

              {/* Process Items */}
              <div className="process-items">
                <div className="items-header">
                  <h3>Process Items</h3>
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={addItem}
                    disabled={availableStocks.length === 0 || products.length === 0}
                  >
                    + Add Item
                  </button>
                </div>

                {availableStocks.length === 0 && (
                  <div style={{ 
                    backgroundColor: '#f8d7da', 
                    border: '1px solid #f5c6cb', 
                    padding: '10px',
                    borderRadius: '4px',
                    margin: '10px 0'
                  }}>
                    ⚠️ No available stocks found. Please ensure you have active, unused stock items.
                  </div>
                )}

                {products.length === 0 && (
                  <div style={{ 
                    backgroundColor: '#f8d7da', 
                    border: '1px solid #f5c6cb', 
                    padding: '10px',
                    borderRadius: '4px',
                    margin: '10px 0'
                  }}>
                    ⚠️ No products found. Please ensure you have products configured.
                  </div>
                )}

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
                            disabled={availableStocks.length === 0}
                          >
                            <option value={0}>
                              {availableStocks.length === 0 ? 'No stocks available' : 'Select stock item...'}
                            </option>
                            {availableStocks.map((stock) => {
                              try {
                                return (
                                  <option key={stock.id} value={stock.id}>
                                    {getStockDisplayName(stock)}
                                  </option>
                                );
                              } catch (error) {
                                console.warn('Error rendering stock option:', stock, error);
                                return (
                                  <option key={stock.id} value={stock.id}>
                                    Stock ID: {stock.id} (Error in display)
                                  </option>
                                );
                              }
                            })}
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
                            disabled={products.length === 0}
                          >
                            <option value={0}>
                              {products.length === 0 ? 'No products available' : 'Select finished product...'}
                            </option>
                            {products.map((product) => {
                              try {
                                return (
                                  <option key={product.id} value={product.id}>
                                    {getProductDisplayName(product)}
                                  </option>
                                );
                              } catch (error) {
                                console.warn('Error rendering product option:', product, error);
                                return (
                                  <option key={product.id} value={product.id}>
                                    {product.name || `Product ID: ${product.id}`} (Error in display)
                                  </option>
                                );
                              }
                            })}
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
                              {(() => {
                                try {
                                  const stock = availableStocks.find(s => s.id === item.stock_id);
                                  return stock?.batch || `Stock ID: ${item.stock_id}`;
                                } catch (error) {
                                  return `Stock ID: ${item.stock_id}`;
                                }
                              })()}
                            </strong>
                            {' → '}
                            <strong>
                              {(() => {
                                try {
                                  const product = products.find(p => p.id === item.finished_product_id);
                                  return product?.name || `Product ID: ${item.finished_product_id}`;
                                } catch (error) {
                                  return `Product ID: ${item.finished_product_id}`;
                                }
                              })()}
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
            disabled={loading.submitting || loading.data || products.length === 0 || availableStocks.length === 0}
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