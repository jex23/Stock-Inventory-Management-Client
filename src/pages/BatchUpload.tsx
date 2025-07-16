import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { stockService } from '../services/stockService'
import { supplierService } from '../services/supplierService'
import { authService } from '../services/authService'
import { ERROR_MESSAGES, SUCCESS_MESSAGES, VALIDATION, FORM_LABELS } from '../constants/api'
import type { 
  StockCategory,
  ProductOption,
  SupplierOption,
  BatchStockCreate,
  BatchStockItem
} from '../types/stock'
import type { AuthState } from '../types/auth'
import type { SupplierCreate } from '../types/supplier'
import './BatchUpload.css'

// UPDATED: Database-matched enums - quantity and unit removed from stock
const STOCK_CATEGORIES = [
  { value: 'finished product', label: 'Finished Product' },  // Note: space not underscore
  { value: 'raw material', label: 'Raw Material' }          // Note: space not underscore
] as const

// UPDATED: Database-matched types - quantity and unit removed from stock
type StockCategoryDB = 'finished product' | 'raw material'  // Note: spaces not underscores

// UPDATED: BatchItem interface - removed quantity and unit (now in Product table)
interface BatchItem {
  id: string // Temporary ID for frontend management
  piece: number
  // REMOVED: quantity and unit (now in Product table)
  category: StockCategoryDB
  product_id: number
  supplier_id: number
  product_name?: string
  supplier_name?: string
  // ADDED: Product info for display
  product_price?: number
  product_quantity?: number
  product_unit?: string
}

interface BatchUploadProps {
  onSuccess: () => void
  onCancel: () => void
}

// UPDATED: Validation utilities - removed unit validation
const isValidStockCategory = (category: string): category is StockCategoryDB => {
  return STOCK_CATEGORIES.some(stockCategory => stockCategory.value === category)
}

// UPDATED: Debug helper function - removed quantity and unit
const debugBatchData = (batchData: any) => {
  console.log('🔍 === BATCH DATA DEBUG REPORT ===')
  console.log('📦 Full batch data:', JSON.stringify(batchData, null, 2))
  
  console.log('📋 Items summary:')
  console.log(`  - Count: ${batchData.items?.length || 0}`)
  
  if (batchData.items) {
    batchData.items.forEach((item: any, index: number) => {
      console.log(`  Item ${index + 1}:`)
      console.log(`    - category: "${item.category}" (${typeof item.category}) [valid: ${isValidStockCategory(item.category)}]`)
      console.log(`    - piece: ${item.piece} (${typeof item.piece}) [integer: ${Number.isInteger(item.piece)}]`)
      console.log(`    - product_id: ${item.product_id} (${typeof item.product_id})`)
      console.log(`    - supplier_id: ${item.supplier_id} (${typeof item.supplier_id})`)
      // REMOVED: quantity and unit logging
    })
  }
  
  console.log('🔍 === END DEBUG REPORT ===')
}

const BatchUpload: React.FC<BatchUploadProps> = ({ onSuccess, onCancel }) => {
  const navigate = useNavigate()
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState())
  const [items, setItems] = useState<BatchItem[]>([])
  const [nextBatchNumber, setNextBatchNumber] = useState<string>('')
  
  // Dropdown Options
  const [productOptions, setProductOptions] = useState<ProductOption[]>([])
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([])
  
  // Form States
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [successMessage, setSuccessMessage] = useState<string>('')

  // UPDATED: Current Form Data - removed quantity and unit
  const [currentItem, setCurrentItem] = useState({
    piece: '',
    // REMOVED: quantity and unit
    category: 'raw material' as StockCategoryDB,  // Note: 'raw material' with space
    product_id: 0,
    supplier_id: 0
  })

  // Editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  // Supplier Modal State
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [supplierFormData, setSupplierFormData] = useState<SupplierCreate>({
    name: '',
    contact_num: '',
    email_add: '',
    address: ''
  })
  const [supplierFormErrors, setSupplierFormErrors] = useState<string[]>([])
  const [supplierSubmitting, setSupplierSubmitting] = useState(false)

  // Product Modal State  
  const [showProductModal, setShowProductModal] = useState(false)
  const [productFormData, setProductFormData] = useState({
    name: '',
    price: '',
    unit: 'pcs',
    quantity: ''
  })
  const [productFormErrors, setProductFormErrors] = useState<string[]>([])
  const [productSubmitting, setProductSubmitting] = useState(false)

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState)
    return unsubscribe
  }, [])

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setErrors([])
      setSuccessMessage('')
      
      console.log('📥 Loading initial data for batch upload...')
      
      const [products, suppliers, nextBatch] = await Promise.all([
        stockService.getProductOptions(),
        stockService.getSupplierOptions(),
        stockService.getNextBatchNumber()
      ])
      
      setProductOptions(products)
      setSupplierOptions(suppliers)
      setNextBatchNumber(nextBatch)
      
      console.log('✅ Initial data loaded successfully')
      console.log(`  - Products: ${products.length}`)
      console.log(`  - Suppliers: ${suppliers.length}`)
      console.log(`  - Next batch: ${nextBatch}`)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN_ERROR
      console.error('❌ Failed to load initial data:', errorMessage)
      setErrors([errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const generateItemId = () => {
    return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // UPDATED: Helper functions to get product and supplier info
  const getProductInfo = (productId: number): ProductOption | null => {
    return productOptions.find(p => p.id === productId) || null
  }

  const getSupplierInfo = (supplierId: number): SupplierOption | null => {
    return supplierOptions.find(s => s.id === supplierId) || null
  }

  // UPDATED: Validation - removed quantity and unit validation
  const validateCurrentItem = (): string[] => {
    const validationErrors: string[] = []

    const piece = Number(currentItem.piece)

    console.log('🔍 Validating current item:', currentItem)

    // Piece validation
    if (!currentItem.piece || piece <= 0 || !Number.isInteger(piece)) {
      validationErrors.push('Piece count must be a positive whole number')
    }

    // REMOVED: Quantity validation (now in Product table)

    // Product validation
    if (!currentItem.product_id || currentItem.product_id <= 0) {
      validationErrors.push('Product is required')
    }

    // Supplier validation
    if (!currentItem.supplier_id || currentItem.supplier_id <= 0) {
      validationErrors.push('Supplier is required')
    }

    // REMOVED: Unit validation (now in Product table)

    // Category validation - CRITICAL CHECK
    if (!isValidStockCategory(currentItem.category)) {
      validationErrors.push(`Invalid category: ${currentItem.category}. Valid categories: ${STOCK_CATEGORIES.map(c => c.value).join(', ')}`)
    }

    // Debug logging
    console.log('🔍 Current item validation details:')
    console.log('  - piece:', currentItem.piece, '(parsed:', piece, ', integer:', Number.isInteger(piece), ')')
    console.log('  - category:', currentItem.category, '(valid:', isValidStockCategory(currentItem.category), ')')
    console.log('  - product_id:', currentItem.product_id)
    console.log('  - supplier_id:', currentItem.supplier_id)

    if (validationErrors.length > 0) {
      console.log('❌ Current item validation failed:', validationErrors)
    } else {
      console.log('✅ Current item validation passed')
    }

    return validationErrors
  }

  // UPDATED: Reset form - removed quantity and unit
  const resetForm = () => {
    setCurrentItem({
      piece: '',
      // REMOVED: quantity and unit
      category: 'raw material' as StockCategoryDB,  // Note: 'raw material' with space
      product_id: 0,
      supplier_id: 0
    })
    setErrors([])
    setSuccessMessage('')
  }

  // UPDATED: Add item to batch - removed quantity and unit, added product info
  const addItemToBatch = () => {
    console.log('➕ Adding item to batch...')
    
    const validationErrors = validateCurrentItem()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      setSuccessMessage('')
      return
    }

    const productInfo = getProductInfo(currentItem.product_id)
    const supplierInfo = getSupplierInfo(currentItem.supplier_id)

    const newItem: BatchItem = {
      id: generateItemId(),
      piece: Number(currentItem.piece),
      // REMOVED: quantity and unit
      category: currentItem.category,
      product_id: currentItem.product_id,
      supplier_id: currentItem.supplier_id,
      product_name: productInfo?.name || 'Unknown Product',
      supplier_name: supplierInfo?.name || 'Unknown Supplier',
      // ADDED: Product info for display
      product_price: productInfo?.price,
      product_quantity: productInfo?.quantity,
      product_unit: productInfo?.unit
    }

    console.log('✅ New item created:', newItem)

    setItems(prev => [...prev, newItem])
    resetForm()
    setSuccessMessage('Item added to batch successfully!')
    
    // Clear success message after 3 seconds
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const removeItem = (itemId: string) => {
    console.log('🗑️ Removing item:', itemId)
    setItems(prev => prev.filter(item => item.id !== itemId))
    if (editingItemId === itemId) {
      setEditingItemId(null)
      resetForm()
    }
    setSuccessMessage('Item removed from batch')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  // UPDATED: Start editing - removed quantity and unit
  const startEditing = (item: BatchItem) => {
    console.log('✏️ Starting edit for item:', item.id)
    setEditingItemId(item.id)
    setCurrentItem({
      piece: item.piece.toString(),
      // REMOVED: quantity and unit
      category: item.category,
      product_id: item.product_id,
      supplier_id: item.supplier_id
    })
    setErrors([])
    setSuccessMessage('')
  }

  // UPDATED: Update existing item - removed quantity and unit, added product info
  const updateExistingItem = () => {
    if (!editingItemId) return

    console.log('💾 Updating existing item:', editingItemId)

    const validationErrors = validateCurrentItem()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      setSuccessMessage('')
      return
    }

    const productInfo = getProductInfo(currentItem.product_id)
    const supplierInfo = getSupplierInfo(currentItem.supplier_id)

    setItems(prev => prev.map(item => 
      item.id === editingItemId 
        ? {
            ...item,
            piece: Number(currentItem.piece),
            // REMOVED: quantity and unit
            category: currentItem.category,
            product_id: currentItem.product_id,
            supplier_id: currentItem.supplier_id,
            product_name: productInfo?.name || 'Unknown Product',
            supplier_name: supplierInfo?.name || 'Unknown Supplier',
            // UPDATED: Product info for display
            product_price: productInfo?.price,
            product_quantity: productInfo?.quantity,
            product_unit: productInfo?.unit
          }
        : item
    ))

    setEditingItemId(null)
    resetForm()
    setSuccessMessage('Item updated successfully!')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const cancelEditing = () => {
    console.log('❌ Cancelling edit')
    setEditingItemId(null)
    resetForm()
  }

  const duplicateItem = (item: BatchItem) => {
    console.log('📋 Duplicating item:', item.id)
    const duplicatedItem: BatchItem = {
      ...item,
      id: generateItemId()
    }
    setItems(prev => [...prev, duplicatedItem])
    setSuccessMessage('Item duplicated successfully!')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  // UPDATED: Validate batch - removed quantity and unit validation
  const validateBatch = (): string[] => {
    const validationErrors: string[] = []

    console.log('🔍 Validating batch for submission...')

    if (items.length === 0) {
      validationErrors.push('At least one item is required')
      return validationErrors
    }

    if (!authState.user?.id) {
      validationErrors.push('User authentication required')
      return validationErrors
    }

    // Validate each item in the batch
    items.forEach((item, index) => {
      const itemNum = index + 1
      
      if (!Number.isInteger(item.piece) || item.piece <= 0) {
        validationErrors.push(`Item ${itemNum}: Invalid piece count`)
      }
      
      // REMOVED: Quantity and unit validation (now in Product table)
      
      if (!isValidStockCategory(item.category)) {
        validationErrors.push(`Item ${itemNum}: Invalid category "${item.category}"`)
      }
      
      if (!item.product_id || item.product_id <= 0) {
        validationErrors.push(`Item ${itemNum}: Product not selected`)
      }
      
      if (!item.supplier_id || item.supplier_id <= 0) {
        validationErrors.push(`Item ${itemNum}: Supplier not selected`)
      }
    })

    console.log('🔍 Batch validation result:', validationErrors.length === 0 ? 'PASSED' : 'FAILED')
    if (validationErrors.length > 0) {
      console.log('❌ Validation errors:', validationErrors)
    }

    return validationErrors
  }

  // UPDATED: Handle create batch - updated API payload structure
  const handleCreateBatch = async () => {
    console.log('📦 Starting batch creation process...')
    
    const validationErrors = validateBatch()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      setSuccessMessage('')
      return
    }

    if (!authState.user?.id) {
      setErrors(['User authentication required'])
      setSuccessMessage('')
      return
    }

    setSubmitting(true)
    setErrors([])
    setSuccessMessage('')

    try {
      // UPDATED: Batch data structure to match new API schema
      const batchData: BatchStockCreate = {
        items: items.map(item => ({
          piece: item.piece,
          // REMOVED: quantity and unit (now in Product table)
          category: item.category,  // This should be 'finished product' or 'raw material'
          product_id: item.product_id,
          supplier_id: item.supplier_id
        })),
        users_id: authState.user.id
      }

      // Enhanced debugging
      console.log('🔍 Final batch data being sent to API:')
      console.log('📦 Batch items count:', batchData.items.length)
      console.log('👤 User ID:', batchData.users_id)
      
      // Debug each item
      debugBatchData(batchData)
      
      // Final validation before sending
      console.log('🔍 Final validation checks:')
      const invalidCategories = batchData.items.filter(item => 
        !['finished product', 'raw material'].includes(item.category)
      )
      
      if (invalidCategories.length > 0) {
        console.error('❌ Found invalid categories before sending:', invalidCategories)
        throw new Error(`Invalid categories found: ${invalidCategories.map(item => item.category).join(', ')}`)
      }

      console.log('✅ All final validations passed, sending to API...')
      console.log('📤 Exact JSON payload:', JSON.stringify(batchData, null, 2))

      const result = await stockService.createBatchStocks(batchData)
      
      console.log('✅ Batch creation successful:', result)
      setSuccessMessage(`Batch ${result.batch_number} created successfully with ${result.items_created} items!`)
      
      // Call success callback after a short delay to show the success message
      setTimeout(() => {
        onSuccess()
      }, 2000)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN_ERROR
      console.error('❌ Batch creation failed:', errorMessage)
      setErrors([errorMessage])
      setSuccessMessage('')
    } finally {
      setSubmitting(false)
    }
  }

  // UPDATED: Summary calculations - removed quantity, added product value
  const getTotalItems = () => items.length
  const getTotalPieces = () => items.reduce((sum, item) => sum + (item.piece || 0), 0)
  const getTotalValue = () => items.reduce((sum, item) => {
    const value = (item.product_price || 0) * (item.piece || 0)
    return sum + value
  }, 0)

  // Supplier Modal Functions
  const validateSupplierForm = (): string[] => {
    const errors: string[] = []

    if (!supplierFormData.name || supplierFormData.name.trim().length < 2) {
      errors.push('Supplier name must be at least 2 characters long')
    }

    if (supplierFormData.name.length > 50) {
      errors.push('Supplier name must be less than 50 characters')
    }

    if (!supplierFormData.contact_num || supplierFormData.contact_num.length < 10 || supplierFormData.contact_num.length > 15) {
      errors.push('Contact number must be between 10-15 characters')
    }

    if (!supplierFormData.email_add) {
      errors.push('Email address is required')
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(supplierFormData.email_add)) {
        errors.push('Please enter a valid email address')
      }
      if (supplierFormData.email_add.length > 50) {
        errors.push('Email address must be less than 50 characters')
      }
    }

    if (!supplierFormData.address || supplierFormData.address.trim().length < 5) {
      errors.push('Address must be at least 5 characters long')
    }
    if (supplierFormData.address.length > 50) {
      errors.push('Address must be less than 50 characters')
    }

    return errors
  }

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🏭 Creating new supplier...')
    
    const errors = validateSupplierForm()
    if (errors.length > 0) {
      setSupplierFormErrors(errors)
      return
    }

    setSupplierSubmitting(true)
    setSupplierFormErrors([])

    try {
      await supplierService.createSupplier(supplierFormData)
      
      // Refresh supplier options
      const updatedSuppliers = await stockService.getSupplierOptions()
      setSupplierOptions(updatedSuppliers)
      
      // Close modal and reset form
      setShowSupplierModal(false)
      setSupplierFormData({
        name: '',
        contact_num: '',
        email_add: '',
        address: ''
      })
      
      console.log('✅ Supplier created successfully!')
      setSuccessMessage('Supplier added successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create supplier'
      console.error('❌ Supplier creation failed:', errorMessage)
      setSupplierFormErrors([errorMessage])
    } finally {
      setSupplierSubmitting(false)
    }
  }

  const openSupplierModal = () => {
    setSupplierFormData({
      name: '',
      contact_num: '',
      email_add: '',
      address: ''
    })
    setSupplierFormErrors([])
    setShowSupplierModal(true)
  }

  const closeSupplierModal = () => {
    setShowSupplierModal(false)
    setSupplierFormData({
      name: '',
      contact_num: '',
      email_add: '',
      address: ''
    })
    setSupplierFormErrors([])
  }

  // UPDATED: Product Modal Functions - now includes unit and quantity
  const validateProductForm = (): string[] => {
    const errors: string[] = []

    if (!productFormData.name || productFormData.name.trim().length < 2) {
      errors.push('Product name must be at least 2 characters long')
    }

    if (productFormData.name.length > 50) {
      errors.push('Product name must be less than 50 characters')
    }

    const price = Number(productFormData.price)
    if (!productFormData.price || price <= 0) {
      errors.push('Price must be greater than 0')
    }

    const quantity = Number(productFormData.quantity)
    if (!productFormData.quantity || quantity < 0) {
      errors.push('Quantity cannot be negative')
    }

    return errors
  }

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('📦 Creating new product...')
    
    const errors = validateProductForm()
    if (errors.length > 0) {
      setProductFormErrors(errors)
      return
    }

    setProductSubmitting(true)
    setProductFormErrors([])

    try {
      // Get auth token
      const token = localStorage.getItem('access_token')
      if (!token) {
        throw new Error('Authentication required')
      }

      // UPDATED: Create product with unit and quantity
      const productData = {
        name: productFormData.name,
        price: Number(productFormData.price),
        unit: productFormData.unit,
        quantity: Number(productFormData.quantity)
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4567'}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to create product')
      }
      
      // Refresh product options
      const updatedProducts = await stockService.getProductOptions()
      setProductOptions(updatedProducts)
      
      // Close modal and reset form
      setShowProductModal(false)
      setProductFormData({
        name: '',
        price: '',
        unit: 'pcs',
        quantity: ''
      })
      
      console.log('✅ Product created successfully!')
      setSuccessMessage('Product added successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create product'
      console.error('❌ Product creation failed:', errorMessage)
      setProductFormErrors([errorMessage])
    } finally {
      setProductSubmitting(false)
    }
  }

  const openProductModal = () => {
    setProductFormData({
      name: '',
      price: '',
      unit: 'pcs',
      quantity: ''
    })
    setProductFormErrors([])
    setShowProductModal(true)
  }

  const closeProductModal = () => {
    setShowProductModal(false)
    setProductFormData({
      name: '',
      price: '',
      unit: 'pcs',
      quantity: ''
    })
    setProductFormErrors([])
  }

  if (loading) {
    return (
      <div className="batch-upload-loading">
        <div className="loading-spinner"></div>
        <p>Loading batch upload...</p>
      </div>
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP'
    }).format(price)
  }

  return (
    <div className="batch-upload-container">
      {/* Navigation Bar */}
      <div className="batch-nav-bar">
        <div className="nav-content">
          <div className="nav-header">
            <h4>📋 Quick Actions</h4>
          </div>
          <div className="nav-buttons">
            <button
              type="button"
              className="nav-btn products"
              onClick={() => navigate('/products')}
              disabled={submitting}
            >
              📦 Manage Products
            </button>
            <button
              type="button"
              className="nav-btn add-product"
              onClick={openProductModal}
              disabled={submitting}
            >
              ➕ Add Product
            </button>
            <button
              type="button"
              className="nav-btn suppliers"
              onClick={() => navigate('/supplier')}
              disabled={submitting}
            >
              🏭 Manage Suppliers
            </button>
            <button
              type="button"
              className="nav-btn add-supplier"
              onClick={openSupplierModal}
              disabled={submitting}
            >
              ➕ Add Supplier
            </button>
          </div>
          <div className="nav-tip">
            💡 Tip: Add missing products or suppliers before creating your batch
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="batch-upload-header">
        <div className="header-content">
          <h2>📦 Create New Batch</h2>
          <div className="batch-number">
            <strong>Batch Number:</strong> <span className="batch-id">{nextBatchNumber}</span>
          </div>
        </div>
        <div className="batch-stats">
          <div className="stat">
            <span className="stat-value">{getTotalItems()}</span>
            <span className="stat-label">Items</span>
          </div>
          <div className="stat">
            <span className="stat-value">{getTotalPieces()}</span>
            <span className="stat-label">Pieces</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatPrice(getTotalValue())}</span>
            <span className="stat-label">Est. Value</span>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="batch-success">
          <div className="success-message">✅ {successMessage}</div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="batch-errors">
          {errors.map((error, index) => (
            <div key={index} className="batch-error">⚠️ {error}</div>
          ))}
        </div>
      )}

      {/* Add Item Form */}
      <div className="add-item-form">
        <div className="form-header">
          <h3>{editingItemId ? '✏️ Edit Item' : '➕ Add Item to Batch'}</h3>
          {editingItemId && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={cancelEditing}
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Product *</label>
            <select
              value={currentItem.product_id}
              onChange={(e) => setCurrentItem(prev => ({ ...prev, product_id: parseInt(e.target.value) || 0 }))}
              disabled={submitting}
              required
            >
              <option value="">Select a product</option>
              {productOptions.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} - {formatPrice(product.price)} ({product.quantity} {product.unit})
                </option>
              ))}
            </select>
            {/* UPDATED: Show product info when selected */}
            {currentItem.product_id > 0 && (
              <div className="product-info">
                {(() => {
                  const product = getProductInfo(currentItem.product_id)
                  return product ? (
                    <div className="product-details">
                      <span className="product-detail">
                        <strong>Price:</strong> {formatPrice(product.price)}
                      </span>
                      <span className="product-detail">
                        <strong>Stock:</strong> {product.quantity} {product.unit}
                      </span>
                    </div>
                  ) : null
                })()}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Supplier *</label>
            <select
              value={currentItem.supplier_id}
              onChange={(e) => setCurrentItem(prev => ({ ...prev, supplier_id: parseInt(e.target.value) || 0 }))}
              disabled={submitting}
              required
            >
              <option value="">Select a supplier</option>
              {supplierOptions.map(supplier => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Pieces *</label>
            <input
              type="number"
              value={currentItem.piece}
              onChange={(e) => setCurrentItem(prev => ({ ...prev, piece: e.target.value }))}
              placeholder="Enter number of pieces"
              min="1"
              step="1"
              disabled={submitting}
              required
            />
          </div>

          {/* REMOVED: Quantity and Unit inputs (now in Product table) */}

          <div className="form-group">
            <label>Category *</label>
            <select
              value={currentItem.category}
              onChange={(e) => setCurrentItem(prev => ({ ...prev, category: e.target.value as StockCategoryDB }))}
              disabled={submitting}
              required
            >
              {STOCK_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={editingItemId ? updateExistingItem : addItemToBatch}
              disabled={submitting}
            >
              {editingItemId ? '💾 Update Item' : '➕ Add Item'}
            </button>
          </div>
        </div>
      </div>

      {/* UPDATED: Batch Items Table - removed quantity and unit columns, added product info */}
      {items.length > 0 && (
        <div className="batch-items-section">
          <div className="section-header">
            <h3>📋 Batch Items ({items.length})</h3>
          </div>

          <div className="batch-table-container">
            <table className="batch-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Product Info</th>
                  <th>Supplier</th>
                  <th>Pieces</th>
                  <th>Category</th>
                  <th>Value</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className={editingItemId === item.id ? 'editing' : ''}>
                    <td className="item-number">{index + 1}</td>
                    <td className="product-name">{item.product_name}</td>
                    <td className="product-info-cell">
                      {item.product_quantity !== undefined && item.product_unit ? (
                        <span className="product-info-display">
                          {item.product_quantity} {item.product_unit}
                        </span>
                      ) : (
                        <span className="product-info-na">N/A</span>
                      )}
                    </td>
                    <td className="supplier-name">{item.supplier_name}</td>
                    <td className="pieces">{item.piece}</td>
                    <td>
                      <span className={`category-badge category-${item.category.replace(/\s+/g, '-').toLowerCase()}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="value">
                      {item.product_price ? formatPrice(item.product_price * item.piece) : 'N/A'}
                    </td>
                    <td className="actions">
                      <button
                        type="button"
                        className="action-btn edit"
                        onClick={() => startEditing(item)}
                        disabled={submitting || editingItemId !== null}
                        title="Edit item"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="action-btn duplicate"
                        onClick={() => duplicateItem(item)}
                        disabled={submitting}
                        title="Duplicate item"
                      >
                        📋
                      </button>
                      <button
                        type="button"
                        className="action-btn remove"
                        onClick={() => removeItem(item.id)}
                        disabled={submitting}
                        title="Remove item"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* UPDATED: Summary - removed total quantity, added total value */}
          <div className="batch-summary-card">
            <h4>📊 Batch Summary</h4>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Total Items:</span>
                <span className="summary-value">{getTotalItems()}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Pieces:</span>
                <span className="summary-value">{getTotalPieces()}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Estimated Value:</span>
                <span className="summary-value">{formatPrice(getTotalValue())}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Created by:</span>
                <span className="summary-value">
                  {authState.user ? `${authState.user.first_name} ${authState.user.last_name}` : 'Current User'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="batch-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleCreateBatch}
          disabled={submitting || items.length === 0 || editingItemId !== null}
        >
          {submitting ? '🔄 Creating Batch...' : `📦 Create Batch (${getTotalItems()} items)`}
        </button>
      </div>

      {/* Add Supplier Modal */}
      {showSupplierModal && (
        <div className="modal-overlay" onClick={closeSupplierModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🏭 Add New Supplier</h3>
              <button className="modal-close" onClick={closeSupplierModal}>&times;</button>
            </div>

            <form onSubmit={handleSupplierSubmit}>
              <div className="modal-body">
                {supplierFormErrors.length > 0 && (
                  <div className="form-errors">
                    {supplierFormErrors.map((error, index) => (
                      <div key={index} className="form-error">⚠️ {error}</div>
                    ))}
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="supplier-name">Company Name *</label>
                    <input
                      id="supplier-name"
                      type="text"
                      value={supplierFormData.name}
                      onChange={(e) => setSupplierFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter company name"
                      maxLength={50}
                      disabled={supplierSubmitting}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="supplier-contact">Contact Number *</label>
                    <input
                      id="supplier-contact"
                      type="tel"
                      value={supplierFormData.contact_num}
                      onChange={(e) => setSupplierFormData(prev => ({ ...prev, contact_num: e.target.value }))}
                      placeholder="Enter contact number"
                      maxLength={15}
                      disabled={supplierSubmitting}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="supplier-email">Email Address *</label>
                  <input
                    id="supplier-email"
                    type="email"
                    value={supplierFormData.email_add}
                    onChange={(e) => setSupplierFormData(prev => ({ ...prev, email_add: e.target.value }))}
                    placeholder="Enter email address"
                    maxLength={50}
                    disabled={supplierSubmitting}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="supplier-address">Address *</label>
                  <textarea
                    id="supplier-address"
                    value={supplierFormData.address}
                    onChange={(e) => setSupplierFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter company address"
                    maxLength={50}
                    rows={3}
                    disabled={supplierSubmitting}
                    required
                  />
                </div>

                <div className="form-note">
                  <strong>💡 Tip:</strong> After adding the supplier, it will be immediately available in the supplier dropdown above.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeSupplierModal}
                  disabled={supplierSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={supplierSubmitting}
                >
                  {supplierSubmitting ? '🔄 Adding...' : '✅ Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATED: Add Product Modal - now includes unit and quantity */}
      {showProductModal && (
        <div className="modal-overlay" onClick={closeProductModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📦 Add New Product</h3>
              <button className="modal-close" onClick={closeProductModal}>&times;</button>
            </div>

            <form onSubmit={handleProductSubmit}>
              <div className="modal-body">
                {productFormErrors.length > 0 && (
                  <div className="form-errors">
                    {productFormErrors.map((error, index) => (
                      <div key={index} className="form-error">⚠️ {error}</div>
                    ))}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="product-name">Product Name *</label>
                  <input
                    id="product-name"
                    type="text"
                    value={productFormData.name}
                    onChange={(e) => setProductFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter product name"
                    maxLength={50}
                    disabled={productSubmitting}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="product-price">Price (PHP) *</label>
                    <input
                      id="product-price"
                      type="number"
                      step="0.01"
                      value={productFormData.price}
                      onChange={(e) => setProductFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="Enter product price"
                      min="0.01"
                      disabled={productSubmitting}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="product-unit">Unit *</label>
                    <select
                      id="product-unit"
                      value={productFormData.unit}
                      onChange={(e) => setProductFormData(prev => ({ ...prev, unit: e.target.value }))}
                      disabled={productSubmitting}
                      required
                    >
                      <option value="pcs">Pieces (pcs)</option>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="g">Gram (g)</option>
                      <option value="l">Liter (l)</option>
                      <option value="ml">Milliliter (ml)</option>
                      <option value="box">Box</option>
                      <option value="pack">Pack</option>
                      <option value="bottle">Bottle</option>
                      <option value="can">Can</option>
                      <option value="jar">Jar</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="product-quantity">Quantity *</label>
                  <input
                    id="product-quantity"
                    type="number"
                    step="0.01"
                    value={productFormData.quantity}
                    onChange={(e) => setProductFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="Enter product quantity"
                    min="0"
                    disabled={productSubmitting}
                    required
                  />
                </div>

                <div className="form-note">
                  <strong>💡 Tip:</strong> After adding the product, it will be immediately available in the product dropdown above.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeProductModal}
                  disabled={productSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={productSubmitting}
                >
                  {productSubmitting ? '🔄 Adding...' : '✅ Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default BatchUpload