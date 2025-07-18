import React, { useState, useEffect } from 'react';
import { processManagementService } from '../services/processManagementService';
import { authService } from '../services/authService';
import type { 
  BatchProcessCreate,
  BatchProcessItem,
  ProcessFormErrors,
  BatchValidationResult,
  PieceValidation
} from '../types/processManagement';
import { API_CONFIG, ApiUtils } from '../constants/api';
import './BatchProcessUpload.css';

interface FinishedProductCategory {
  id: number;
  name: string;
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
  product_quantity?: number | string;
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
    items: [{ 
      stock_id: 0, 
      finished_product_id: 0, 
      pieces_to_use: 1  // 🆕 Default pieces
    }],
    users_id: undefined
  });

  const [finishedProductCategories, setFinishedProductCategories] = useState<FinishedProductCategory[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [nextBatchNumber, setNextBatchNumber] = useState<string>('');
  const [validation, setValidation] = useState<BatchValidationResult | null>(null);  // 🆕 Piece validation
  const [loading, setLoading] = useState({
    data: false,
    submitting: false,
    validating: false  // 🆕 Validation loading state
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

  // 🆕 Validate pieces whenever form data changes
  useEffect(() => {
    if (formData.items.length > 0 && formData.items.some(item => item.stock_id > 0)) {
      validatePieces();
    }
  }, [formData.items]);

  const loadInitialData = async () => {
    setLoading(prev => ({ ...prev, data: true }));
    
    try {
      console.log('🔄 Loading initial data for batch upload...');
      
      const [categoriesResponse, stocksResponse, batchNumber] = await Promise.all([
        fetchFinishedProductCategories(),
        fetchStocks(),
        processManagementService.getNextBatchNumber()
      ]);

      console.log('✅ Initial data loaded:', { 
        categories: categoriesResponse.length,
        stocks: stocksResponse.length, 
        batchNumber 
      });

      setFinishedProductCategories(categoriesResponse);
      setStocks(stocksResponse);
      setNextBatchNumber(batchNumber);

      // 🆕 Load stock groups for validation
      await processManagementService.fetchStockGroups(1);
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      setErrors({ general: `Failed to load required data: ${getErrorMessage(error)}` });
    } finally {
      setLoading(prev => ({ ...prev, data: false }));
    }
  };

  const fetchFinishedProductCategories = async (): Promise<FinishedProductCategory[]> => {
    try {
      console.log('📦 Fetching finished product categories...');
      
      const url = `${API_CONFIG.BASE_URL}/categories`;
      console.log('🌐 Categories URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: ApiUtils.getAuthHeaders()
      });
      
      console.log('📡 Categories response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Categories error response:', errorText);
        throw new Error(`Failed to fetch finished product categories: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        console.error('❌ Categories data is not an array:', typeof data);
        throw new Error('Invalid categories data format received from server');
      }
      
      const cleanedCategories = data.map((category: any, index: number) => {
        try {
          return {
            id: Number(category.id) || 0,
            name: String(category.name || `Category ${index + 1}`)
          };
        } catch (error) {
          console.warn(`⚠️ Error cleaning category at index ${index}:`, error);
          return {
            id: index + 1,
            name: `Category ${index + 1}`
          };
        }
      });
      
      console.log('✅ Categories fetched and cleaned:', cleanedCategories.length, 'items');
      return cleanedCategories;
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      throw error;
    }
  };

  const fetchStocks = async (): Promise<Stock[]> => {
    try {
      console.log('📦 Fetching stocks...');
      
      const params = new URLSearchParams({
        archive: 'false',
        used: 'false'
      });
      const url = `${API_CONFIG.BASE_URL}/stocks?${params.toString()}`;
      console.log('🌐 Stocks URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: ApiUtils.getAuthHeaders()
      });
      
      console.log('📡 Stocks response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Stocks error response:', errorText);
        throw new Error(`Failed to fetch stocks: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        console.error('❌ Stocks data is not an array:', typeof data);
        throw new Error('Invalid stocks data format received from server');
      }
      
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
            product_quantity: stock.product_quantity,
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
      return cleanedStocks;
    } catch (error) {
      console.error('❌ Error fetching stocks:', error);
      throw error;
    }
  };

  // 🆕 Validate pieces using the service
  const validatePieces = async () => {
    if (formData.items.length === 0) return;

    setLoading(prev => ({ ...prev, validating: true }));

    try {
      const validationResult = processManagementService.validateBatchPieces(formData.items);
      setValidation(validationResult);

      // Set piece-related errors
      if (!validationResult.is_valid) {
        const newErrors: ProcessFormErrors = {};
        
        validationResult.stock_validations.forEach(validation => {
          if (!validation.is_sufficient) {
            const itemIndex = formData.items.findIndex(item => item.stock_id === validation.stock_id);
            if (itemIndex >= 0) {
              newErrors[`pieces_${itemIndex}`] = `Insufficient pieces: need ${validation.requested_pieces}, only ${validation.available_pieces} available`;
            }
          }
        });

        if (validationResult.errors.length > 0) {
          newErrors.pieces = validationResult.errors.join('; ');
        }

        setErrors(prev => ({ ...prev, ...newErrors }));
      } else {
        // Clear piece-related errors
        setErrors(prev => {
          const newErrors = { ...prev };
          Object.keys(newErrors).forEach(key => {
            if (key.startsWith('pieces_')) {
              delete newErrors[key];
            }
          });
          delete newErrors.pieces;
          return newErrors;
        });
      }
    } catch (error) {
      console.error('❌ Error validating pieces:', error);
    } finally {
      setLoading(prev => ({ ...prev, validating: false }));
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { 
        stock_id: 0, 
        finished_product_id: 0, 
        pieces_to_use: 1  // 🆕 Default pieces
      }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // 🆕 Updated to handle pieces_to_use
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
    if (field === 'pieces_to_use' && errors[`pieces_${index}`]) {
      setErrors(prev => ({ ...prev, [`pieces_${index}`]: undefined }));
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
        newErrors[`product_${index}`] = 'Please select a finished product category';
        hasItemErrors = true;
      }
      // 🆕 Validate pieces
      if (item.pieces_to_use <= 0) {
        newErrors[`pieces_${index}`] = 'Pieces must be greater than 0';
        hasItemErrors = true;
      }
    });

    if (hasItemErrors) {
      newErrors.items = 'Please complete all item selections and piece counts';
    }

    // Check for duplicate stock items with cumulative piece validation
    const stockUsage = new Map<number, number>();
    formData.items.forEach(item => {
      if (item.stock_id > 0) {
        const currentUsage = stockUsage.get(item.stock_id) || 0;
        stockUsage.set(item.stock_id, currentUsage + item.pieces_to_use);
      }
    });

    // Validate total piece usage per stock
    for (const [stockId, totalUsage] of stockUsage) {
      const stock = stocks.find(s => s.id === stockId);
      if (stock && totalUsage > stock.piece) {
        newErrors.pieces = `Stock ${stock.batch}: Total usage (${totalUsage}) exceeds available pieces (${stock.piece})`;
        hasItemErrors = true;
      }
    }

    // Include validation errors if available
    if (validation && !validation.is_valid) {
      newErrors.pieces = `Piece validation failed: ${validation.errors.join('; ')}`;
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
      console.log('🚀 Submitting batch creation with pieces...', formData);
      
      const submitData: BatchProcessCreate = {
        ...formData,
        users_id: currentUser?.id
      };

      await processManagementService.createBatch(submitData);
      console.log('✅ Batch created successfully with piece tracking');
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

  // 🆕 Get available pieces for a stock considering current usage
  const getAvailablePieces = (stockId: number): number => {
    const stock = stocks.find(s => s.id === stockId);
    if (!stock) return 0;

    // Calculate total usage in current form
    const totalUsage = formData.items
      .filter(item => item.stock_id === stockId)
      .reduce((sum, item) => sum + item.pieces_to_use, 0);

    return Math.max(0, stock.piece - totalUsage);
  };

  // 🆕 Get piece validation for a stock
  const getStockValidation = (stockId: number): PieceValidation | null => {
    if (!validation) return null;
    return validation.stock_validations.find(v => v.stock_id === stockId) || null;
  };

  const getStockDisplayName = (stock: Stock): string => {
    return `${stock.batch} - ${stock.product_name || `Product ${stock.product_id}`} (${stock.piece} pcs available)`;
  };

  const getCategoryDisplayName = (category: FinishedProductCategory): string => {
    return category.name;
  };

  const availableStocks = stocks.filter(stock => 
    !stock.archive && !stock.used && stock.piece > 0  // 🆕 Only stocks with pieces
  );

  // 🆕 Calculate total pieces that will be consumed
  const getTotalPiecesUsed = (): number => {
    return formData.items.reduce((sum, item) => sum + item.pieces_to_use, 0);
  };

  // Debug information component
  const DebugInfo = () => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    const sampleCategory = finishedProductCategories[0];
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
          Categories loaded: {finishedProductCategories.length}
          Stocks loaded: {stocks.length}
          Available stocks: {availableStocks.length}
          Next batch: {nextBatchNumber}
          Current user: {currentUser?.username}
          Validation status: {validation ? (validation.is_valid ? 'Valid' : 'Invalid') : 'Not validated'}
          Total pieces to use: {getTotalPiecesUsed()}
          {sampleCategory && `
          Sample category:
            ID: ${sampleCategory.id}
            Name: ${sampleCategory.name}`}
          {sampleStock && `
          Sample stock:
            ID: ${sampleStock.id}
            Batch: ${sampleStock.batch}
            Available pieces: ${sampleStock.piece}`}
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

              {/* 🆕 Piece validation errors */}
              {errors.pieces && (
                <div className="error-message" style={{
                  backgroundColor: '#fee',
                  border: '1px solid #fcc',
                  padding: '10px',
                  borderRadius: '4px',
                  margin: '10px 0',
                  color: '#c33'
                }}>
                  <span>🔢 Piece Validation: {errors.pieces}</span>
                </div>
              )}

              {/* 🆕 Validation status display */}
              {validation && (
                <div style={{ 
                  backgroundColor: validation.is_valid ? '#e8f5e8' : '#fff3cd',
                  border: `1px solid ${validation.is_valid ? '#28a745' : '#ffc107'}`,
                  padding: '8px',
                  borderRadius: '4px',
                  margin: '10px 0',
                  fontSize: '14px'
                }}>
                  {validation.is_valid ? (
                    <span>✅ Piece validation passed - Total pieces: {getTotalPiecesUsed()}</span>
                  ) : (
                    <span>⚠️ Piece validation issues - Shortage: {validation.total_shortage} pieces</span>
                  )}
                  {loading.validating && <span> (Validating...)</span>}
                </div>
              )}

              <div style={{ 
                backgroundColor: finishedProductCategories.length > 0 && stocks.length > 0 ? '#e8f5e8' : '#fff3cd',
                border: `1px solid ${finishedProductCategories.length > 0 && stocks.length > 0 ? '#28a745' : '#ffc107'}`,
                padding: '8px',
                borderRadius: '4px',
                margin: '10px 0',
                fontSize: '14px'
              }}>
                📊 Data Status: {finishedProductCategories.length} categories, {availableStocks.length} available stocks
              </div>

              {/* Process Items */}
              <div className="process-items">
                <div className="items-header">
                  <h3>Process Items</h3>
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={addItem}
                    disabled={availableStocks.length === 0 || finishedProductCategories.length === 0}
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
                    ⚠️ No available stocks found. Please ensure you have active, unused stock items with available pieces.
                  </div>
                )}

                {finishedProductCategories.length === 0 && (
                  <div style={{ 
                    backgroundColor: '#f8d7da', 
                    border: '1px solid #f5c6cb', 
                    padding: '10px',
                    borderRadius: '4px',
                    margin: '10px 0'
                  }}>
                    ⚠️ No finished product categories found. Please ensure you have categories configured.
                  </div>
                )}

                <div className="items-list">
                  {formData.items.map((item, index) => {
                    const selectedStock = stocks.find(s => s.id === item.stock_id);
                    const availablePieces = getAvailablePieces(item.stock_id);
                    const stockValidation = getStockValidation(item.stock_id);
                    
                    return (
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

                          {/* 🆕 Pieces to use field */}
                          <div className="field-group">
                            <label htmlFor={`pieces_${index}`}>
                              Pieces to Use <span className="required">*</span>
                              {selectedStock && (
                                <span className="field-info">
                                  (Available: {selectedStock.piece})
                                </span>
                              )}
                            </label>
                            <input
                              type="number"
                              id={`pieces_${index}`}
                              value={item.pieces_to_use}
                              onChange={(e) => updateItem(index, 'pieces_to_use', parseInt(e.target.value) || 0)}
                              className={errors[`pieces_${index}`] ? 'error' : ''}
                              min={1}
                              max={selectedStock?.piece || 999999}
                              required
                              disabled={!Boolean(selectedStock)}
                              placeholder="Enter pieces"
                            />
                            {errors[`pieces_${index}`] && (
                              <span className="field-error">{errors[`pieces_${index}`]}</span>
                            )}
                            {/* 🆕 Piece validation feedback */}
                            {stockValidation && !stockValidation.is_sufficient && (
                              <span className="field-warning" style={{ color: '#856404', fontSize: '12px' }}>
                                ⚠️ Shortage: {stockValidation.shortage} pieces
                              </span>
                            )}
                            {selectedStock && item.pieces_to_use > 0 && (
                              <span className="field-info" style={{ fontSize: '12px', color: '#666' }}>
                                Remaining after: {selectedStock.piece - item.pieces_to_use} pieces
                              </span>
                            )}
                          </div>

                          <div className="field-group">
                            <label htmlFor={`product_${index}`}>
                              Finished Product Category <span className="required">*</span>
                            </label>
                            <select
                              id={`product_${index}`}
                              value={item.finished_product_id}
                              onChange={(e) => updateItem(index, 'finished_product_id', parseInt(e.target.value))}
                              className={errors[`product_${index}`] ? 'error' : ''}
                              required
                              disabled={finishedProductCategories.length === 0}
                            >
                              <option value={0}>
                                {finishedProductCategories.length === 0 ? 'No categories available' : 'Select finished product category...'}
                              </option>
                              {finishedProductCategories.map((category) => {
                                try {
                                  return (
                                    <option key={category.id} value={category.id}>
                                      {getCategoryDisplayName(category)}
                                    </option>
                                  );
                                } catch (error) {
                                  console.warn('Error rendering category option:', category, error);
                                  return (
                                    <option key={category.id} value={category.id}>
                                      {category.name || `Category ID: ${category.id}`} (Error in display)
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

                        {/* 🆕 Enhanced item preview with pieces */}
                        {item.stock_id > 0 && item.finished_product_id > 0 && item.pieces_to_use > 0 && (
                          <div className="item-preview">
                            <div className="preview-icon">
                              {stockValidation?.is_sufficient !== false ? '✓' : '⚠️'}
                            </div>
                            <div className="preview-text">
                              Processing{' '}
                              <strong>{item.pieces_to_use} pieces</strong>
                              {' from '}
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
                                    const category = finishedProductCategories.find(c => c.id === item.finished_product_id);
                                    return category?.name || `Category ID: ${item.finished_product_id}`;
                                  } catch (error) {
                                    return `Category ID: ${item.finished_product_id}`;
                                  }
                                })()}
                              </strong>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 🆕 Enhanced Summary with pieces */}
              <div className="batch-summary">
                <h3>Batch Summary</h3>
                <div className="summary-stats">
                  <div className="summary-item">
                    <span className="summary-label">Total Items:</span>
                    <span className="summary-value">{formData.items.length}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Total Pieces:</span>
                    <span className="summary-value">{getTotalPiecesUsed()}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Completed Items:</span>
                    <span className="summary-value">
                      {formData.items.filter(item => 
                        item.stock_id > 0 && item.finished_product_id > 0 && item.pieces_to_use > 0
                      ).length}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Ready to Process:</span>
                    <span className={`summary-value ${
                      Boolean(validation?.is_valid) && formData.items.every(item => 
                        item.stock_id > 0 && item.finished_product_id > 0 && item.pieces_to_use > 0
                      ) ? 'ready' : 'not-ready'
                    }`}>
                      {Boolean(validation?.is_valid) && formData.items.every(item => 
                        item.stock_id > 0 && item.finished_product_id > 0 && item.pieces_to_use > 0
                      ) ? 'Yes' : 'No'}
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
            disabled={
              loading.submitting || 
              loading.data || 
              loading.validating ||
              finishedProductCategories.length === 0 || 
              availableStocks.length === 0 ||
              Boolean(validation && !validation.is_valid)  // 🆕 Disable if validation fails
            }
          >
            {loading.submitting ? (
              <>
                <div className="btn-spinner"></div>
                Creating Batch...
              </>
            ) : (
              `Create Process Batch (${getTotalPiecesUsed()} pieces)`  // 🆕 Show piece count
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchProcessUpload;