// Products.tsx

import React, { useState, useEffect } from 'react'
import { productService } from '../services/productService'
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants/api'
import type { Product, ProductCreate, ProductUpdate, ProductStats } from '../types/product'
import { StockUnit, getUnitDisplayName, getUnitShortName, getAllUnits } from '../types/product'
import './Products.css'

interface ProductFormData {
  name: string
  price: string
  unit: StockUnit
  quantity: string
}

const Products: React.FC = () => {
  // State Management
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [priceFilter, setPriceFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all')
  const [unitFilter, setUnitFilter] = useState<StockUnit | 'all'>('all')
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  
  // Modal States
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  
  // Form State
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    price: '',
    unit: StockUnit.PCS,
    quantity: '0'
  })
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  
  // Action Loading States
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({})

  // Statistics
  const [stats, setStats] = useState<ProductStats>({
    total: 0,
    totalValue: 0,
    averagePrice: 0,
    highestPrice: 0,
    lowestPrice: 0,
    totalQuantity: 0,
    averageQuantity: 0
  })

  // Load products on component mount
  useEffect(() => {
    loadProducts()
  }, [])

  // Update filtered products when search, price, or unit filter changes
  useEffect(() => {
    filterProducts()
  }, [searchTerm, priceFilter, unitFilter, products])

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 Loading products...')
      
      // Load products and stats
      const [productsData, productStats] = await Promise.all([
        productService.getAllProducts(),
        productService.getProductStats()
      ])
      
      console.log('✅ Products loaded:', productsData)
      console.log('📊 Stats loaded:', productStats)
      
      setProducts(productsData)
      setStats(productStats)
      
    } catch (err) {
      console.error('❌ Error loading products:', err)
      setError(err instanceof Error ? err.message : (ERROR_MESSAGES?.UNKNOWN_ERROR || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const filterProducts = async () => {
    try {
      let filtered = [...products]

      // Apply search filter
      if (searchTerm) {
        filtered = await productService.filterProducts({
          search: searchTerm
        })
      }

      // Apply price filter
      if (priceFilter !== 'all' && stats.averagePrice > 0) {
        const avgPrice = stats.averagePrice
        switch (priceFilter) {
          case 'low':
            filtered = filtered.filter(p => p.price < avgPrice * 0.75)
            break
          case 'medium':
            filtered = filtered.filter(p => p.price >= avgPrice * 0.75 && p.price <= avgPrice * 1.25)
            break
          case 'high':
            filtered = filtered.filter(p => p.price > avgPrice * 1.25)
            break
        }
      }

      // Apply unit filter
      if (unitFilter !== 'all') {
        filtered = filtered.filter(p => p.unit === unitFilter)
      }

      setFilteredProducts(filtered)
    } catch (err) {
      console.error('Filter error:', err)
      setFilteredProducts(products)
    }
  }

  // Enhanced validation with better error messages
  const validateForm = (): string[] => {
    const errors: string[] = []

    console.log('🔍 Validating form data:', formData)

    // Name checks
    const name = formData.name.trim()
    if (name.length < 2) {
      errors.push('Product name must be at least 2 characters long')
    }
    if (name.length > 50) {
      errors.push('Product name cannot exceed 50 characters')
    }

    // Price checks
    const priceNum = parseFloat(formData.price)
    if (isNaN(priceNum) || priceNum <= 0) {
      errors.push('Product price must be greater than 0')
    } else if (priceNum > 99_999_999.99) {
      errors.push('Product price cannot exceed 99,999,999.99')
    }

    // Quantity checks
    const quantityNum = parseFloat(formData.quantity)
    if (isNaN(quantityNum) || quantityNum < 0) {
      errors.push('Product quantity cannot be negative')
    }

    console.log('✅ Validation errors:', errors)
    return errors
  }

  // Enhanced form submission with better error handling
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    console.log('📝 Form submitted with data:', formData)

    const errors = validateForm()
    if (errors.length > 0) {
      setFormErrors(errors)
      return
    }

    setSubmitting(true)
    setFormErrors([])

    try {
      // Build payloads with proper types
      const priceNum = parseFloat(formData.price)
      const quantityNum = parseFloat(formData.quantity)
      const nameTrimmed = formData.name.trim()

      console.log('🔄 Processing form data:', {
        name: nameTrimmed,
        price: priceNum,
        unit: formData.unit,
        quantity: quantityNum
      })

      if (modalMode === 'add') {
        console.log('➕ Creating new product...')
        
        // Check if name exists
        const exists = await productService.checkNameExists(nameTrimmed)
        if (exists) {
          setFormErrors(['Product name already exists'])
          setSubmitting(false)
          return
        }

        // Create payload
        const createPayload: ProductCreate = {
          name: nameTrimmed,
          price: priceNum,
          unit: formData.unit,
          quantity: quantityNum
        }

        console.log('📤 Sending create payload:', createPayload)
        
        const result = await productService.createProduct(createPayload)
        console.log('✅ Product created:', result)

      } else if (currentProduct) {
        console.log('✏️ Updating existing product...')
        
        // Update payload
        const updatePayload: ProductUpdate = {
          name: nameTrimmed,
          price: priceNum,
          unit: formData.unit,
          quantity: quantityNum
        }

        console.log('📤 Sending update payload:', updatePayload)
        
        const result = await productService.updateProduct(currentProduct.id, updatePayload)
        console.log('✅ Product updated:', result)
      }

      // Reload products
      await loadProducts()
      closeModal()
      
      console.log('🎉 Form submission successful')
      
      // Show success message
      const successMessage = modalMode === 'add' 
        ? (SUCCESS_MESSAGES?.PRODUCT_CREATED || 'Product created successfully!') 
        : (SUCCESS_MESSAGES?.PRODUCT_UPDATED || 'Product updated successfully!')
      console.log(successMessage)

    } catch (err) {
      console.error('❌ Form submission error:', err)
      
      let errorMessage = 'An unknown error occurred'
      if (err instanceof Error) {
        errorMessage = err.message
      }
      
      setFormErrors([errorMessage])
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (product: Product) => {
    setActionLoading(prev => ({ ...prev, [product.id]: true }))
    
    try {
      console.log('🗑️ Deleting product:', product)
      await productService.deleteProduct(product.id)
      await loadProducts()
      setShowDeleteModal(false)
      setProductToDelete(null)
      console.log('✅ Product deleted successfully')
    } catch (err) {
      console.error('❌ Delete error:', err)
      const errorMessage = err instanceof Error ? err.message : (ERROR_MESSAGES?.UNKNOWN_ERROR || 'Unknown error')
      setError(errorMessage)
    } finally {
      setActionLoading(prev => ({ ...prev, [product.id]: false }))
    }
  }

  const openModal = (mode: 'add' | 'edit', product?: Product) => {
    console.log('🪟 Opening modal:', mode, product)
    
    setModalMode(mode)
    setCurrentProduct(product || null)
    
    if (mode === 'add') {
      setFormData({
        name: '',
        price: '',
        unit: StockUnit.PCS,
        quantity: '0'
      })
    } else if (product) {
      setFormData({
        name: product.name,
        price: product.price.toFixed(2),
        unit: product.unit,
        quantity: product.quantity.toString()
      })
    }
    
    setFormErrors([])
    setShowModal(true)
  }

  const closeModal = () => {
    console.log('🚪 Closing modal')
    setShowModal(false)
    setCurrentProduct(null)
    setFormData({
      name: '',
      price: '',
      unit: StockUnit.PCS,
      quantity: '0'
    })
    setFormErrors([])
  }

  const openDeleteModal = (product: Product) => {
    setProductToDelete(product)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setProductToDelete(null)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map(p => p.id))
    } else {
      setSelectedProducts([])
    }
  }

  const handleSelectProduct = (productId: number, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId])
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return

    const confirmed = window.confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)
    if (!confirmed) return

    try {
      await productService.bulkDeleteProducts(selectedProducts)
      await loadProducts()
      setSelectedProducts([])
      console.log(`${selectedProducts.length} products deleted successfully`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : (ERROR_MESSAGES?.UNKNOWN_ERROR || 'Unknown error')
      setError(errorMessage)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP'
    }).format(price)
  }

  const formatQuantity = (quantity: number, unit: StockUnit) => {
    return `${quantity} ${getUnitShortName(unit)}`
  }

  const formatTotalValue = (value: number) => {
    if (value >= 1000000) {
      return `₱${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `₱${(value / 1000).toFixed(0)}K`
    }
    return formatPrice(value)
  }

  if (error) {
    return (
      <div className="products-container">
        <div className="products-error">
          <div className="products-error-icon">⚠️</div>
          <h3 className="products-error-title">Error Loading Products</h3>
          <p className="products-error-message">{error}</p>
          <button className="products-retry-btn" onClick={loadProducts}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="products-container">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Products</h1>
        <div className="header-actions">
          <button className="secondary-btn" onClick={() => productService.exportProducts('csv').then(csv => {
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'products.csv'
            a.click()
          })}>
            📤 Export
          </button>
          <button className="primary-btn" onClick={() => openModal('add')}>
            ➕ Add Product
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="products-stats">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>Total Products</h3>
            <p className="stat-number">{stats.total}</p>
            <span className="stat-change">Product catalog</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Total Value</h3>
            <p className="stat-number">{formatTotalValue(stats.totalValue)}</p>
            <span className="stat-change">Inventory value</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Total Quantity</h3>
            <p className="stat-number">{stats.totalQuantity.toFixed(2)}</p>
            <span className="stat-change">All products</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>Average Quantity</h3>
            <p className="stat-number">{stats.averageQuantity.toFixed(2)}</p>
            <span className="stat-change">Per product</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <h3>Price Range</h3>
            <p className="stat-number">{formatPrice(stats.lowestPrice)} - {formatPrice(stats.highestPrice)}</p>
            <span className="stat-change">Min - Max</span>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="products-content">
        <div className="products-table">
          <div className="table-header">
            <h2>Product Inventory</h2>
            <div className="table-controls">
              <input 
                type="search" 
                placeholder="Search products..." 
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select 
                className="filter-select"
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value as 'all' | 'low' | 'medium' | 'high')}
              >
                <option value="all">All Prices</option>
                <option value="low">Low Price</option>
                <option value="medium">Medium Price</option>
                <option value="high">High Price</option>
              </select>

              <select 
                className="filter-select"
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value as StockUnit | 'all')}
              >
                <option value="all">All Units</option>
                {getAllUnits().map((unit) => (
                  <option key={unit} value={unit}>
                    {getUnitDisplayName(unit)}
                  </option>
                ))}
              </select>
              
              {selectedProducts.length > 0 && (
                <div className="bulk-actions">
                  <span className="bulk-selected">
                    {selectedProducts.length} selected
                  </span>
                  <button
                    className="delete-btn"
                    onClick={handleBulkDelete}
                  >
                    Delete Selected
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="table-wrapper">
            {loading ? (
              <div className="table-loading">
                <div className="loading-spinner"></div>
                <p>Loading products...</p>
              </div>
            ) : (
              <table className="products-table-grid">
                <thead>
                  <tr>
                    <th className="table-checkbox">
                      <input
                        type="checkbox"
                        className="bulk-select-checkbox"
                        checked={filteredProducts.length > 0 && selectedProducts.length === filteredProducts.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th>Product ID</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Unit</th>
                    <th>Quantity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="table-checkbox">
                        <input
                          type="checkbox"
                          className="product-select-checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                        />
                      </td>
                      <td className="product-id">#{product.id}</td>
                      <td className="product-name">{product.name}</td>
                      <td className="price">{formatPrice(product.price)}</td>
                      <td className="unit">{getUnitDisplayName(product.unit)}</td>
                      <td className="quantity">{formatQuantity(product.quantity, product.unit)}</td>
                      <td className="actions">
                        <button
                          className="action-btn edit"
                          onClick={() => openModal('edit', product)}
                          title="Edit product"
                          disabled={actionLoading[product.id]}
                        >
                          ✏️
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => openDeleteModal(product)}
                          title="Delete product"
                          disabled={actionLoading[product.id]}
                        >
                          {actionLoading[product.id] ? '⏳' : '🗑️'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="table-empty">
                        {searchTerm || priceFilter !== 'all' || unitFilter !== 'all'
                          ? 'No products found matching your criteria.' 
                          : 'No products found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalMode === 'add' ? 'Add New Product' : 'Edit Product'}</h3>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formErrors.length > 0 && (
                  <div className="form-errors">
                    {formErrors.map((error, index) => (
                      <div key={index} className="form-error">{error}</div>
                    ))}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="product-name">Product Name *</label>
                  <input
                    id="product-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    maxLength={50}
                    required
                    placeholder="Enter product name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="product-price">Price (PHP) *</label>
                  <input
                    id="product-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="99999999.99"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    required
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="product-unit">Unit *</label>
                  <select
                    id="product-unit"
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value as StockUnit }))}
                    required
                  >
                    {getAllUnits().map((unit) => (
                      <option key={unit} value={unit}>
                        {getUnitDisplayName(unit)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="product-quantity">Quantity *</label>
                  <input
                    id="product-quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    required
                    placeholder="0.00"
                  />
                </div>

                <div className="form-note">
                  <strong>Note:</strong> All fields marked with (*) are required. 
                  {modalMode === 'add' && ' Product ID will be automatically assigned.'}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : modalMode === 'add' ? 'Add Product' : 'Update Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && productToDelete && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button className="modal-close" onClick={closeDeleteModal}>&times;</button>
            </div>

            <div className="modal-body">
              <div className="delete-confirmation">
                <div className="delete-icon">⚠️</div>
                <p>Are you sure you want to delete this product?</p>
                <p><strong>{productToDelete.name}</strong></p>
                <p><strong>Price: {formatPrice(productToDelete.price)}</strong></p>
                <p><strong>Unit: {getUnitDisplayName(productToDelete.unit)}</strong></p>
                <p><strong>Quantity: {formatQuantity(productToDelete.quantity, productToDelete.unit)}</strong></p>
                <p className="delete-warning">This action cannot be undone.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={closeDeleteModal}
                disabled={actionLoading[productToDelete.id]}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(productToDelete)}
                disabled={actionLoading[productToDelete.id]}
              >
                {actionLoading[productToDelete.id] ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Products