import React, { useState, useEffect } from 'react'
import { finishedProductService } from '../services/finishedProductService'
import { ERROR_MESSAGES, SUCCESS_MESSAGES, VALIDATION, FORM_LABELS } from '../constants/api'
import type { 
  FinishedProductCategory, 
  FinishedProductCategoryCreate, 
  FinishedProductCategoryUpdate,
  FinishedProductCategoryStats 
} from '../types/finishedProduct'
import './finishedProduct.css'

interface CategoryFormData {
  name: string
}

const FinishedProducts: React.FC = () => {
  // State Management
  const [categories, setCategories] = useState<FinishedProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  
  // Modal States
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [currentCategory, setCurrentCategory] = useState<FinishedProductCategory | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<FinishedProductCategory | null>(null)
  
  // Form State
  const [formData, setFormData] = useState<CategoryFormData>({
    name: ''
  })
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  
  // Action Loading States
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({})

  // Statistics
  const [stats, setStats] = useState<FinishedProductCategoryStats>({
    total: 0,
    recentlyAdded: 0
  })

  // Load categories on component mount
  useEffect(() => {
    loadCategories()
  }, [])

  // Update stats when categories change
  useEffect(() => {
    updateStats()
  }, [categories])

  const loadCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [apiCategories, categoryStats] = await Promise.all([
        finishedProductService.getAllCategories(),
        finishedProductService.getCategoryStats()
      ])
      
      setCategories(apiCategories)
      setStats(categoryStats)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN_ERROR)
    } finally {
      setLoading(false)
    }
  }

  const updateStats = () => {
    const total = categories.length
    const recentlyAdded = Math.min(3, total)

    setStats({ total, recentlyAdded })
  }

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const validateForm = (): string[] => {
    const errors: string[] = []

    if (!formData.name || formData.name.trim().length < VALIDATION.CATEGORY_NAME_MIN_LENGTH) {
      errors.push(ERROR_MESSAGES.CATEGORY_NAME_TOO_SHORT)
    }

    if (formData.name.length > VALIDATION.CATEGORY_NAME_MAX_LENGTH) {
      errors.push(ERROR_MESSAGES.CATEGORY_NAME_TOO_LONG)
    }

    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const errors = validateForm()
    if (errors.length > 0) {
      setFormErrors(errors)
      return
    }

    setSubmitting(true)
    setFormErrors([])

    try {
      if (modalMode === 'add') {
        // Check if name already exists
        const nameExists = await finishedProductService.checkNameExists(formData.name)
        if (nameExists) {
          setFormErrors([ERROR_MESSAGES.CATEGORY_NAME_EXISTS])
          return
        }

        const createData: FinishedProductCategoryCreate = {
          name: formData.name.trim()
        }
        await finishedProductService.createCategory(createData)
      } else if (currentCategory) {
        const updateData: FinishedProductCategoryUpdate = {
          name: formData.name.trim()
        }
        await finishedProductService.updateCategory(currentCategory.id, updateData)
      }

      await loadCategories()
      closeModal()
      
      const message = modalMode === 'add' ? SUCCESS_MESSAGES.CATEGORY_CREATED : SUCCESS_MESSAGES.CATEGORY_UPDATED
      console.log(message)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN_ERROR
      setFormErrors([errorMessage])
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (category: FinishedProductCategory) => {
    setActionLoading(prev => ({ ...prev, [category.id]: true }))
    
    try {
      await finishedProductService.deleteCategory(category.id)
      await loadCategories()
      setShowDeleteModal(false)
      setCategoryToDelete(null)
      console.log(SUCCESS_MESSAGES.CATEGORY_DELETED)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN_ERROR
      setError(errorMessage)
    } finally {
      setActionLoading(prev => ({ ...prev, [category.id]: false }))
    }
  }

  const openModal = (mode: 'add' | 'edit', category?: FinishedProductCategory) => {
    setModalMode(mode)
    setCurrentCategory(category || null)
    
    if (mode === 'add') {
      setFormData({
        name: ''
      })
    } else if (category) {
      setFormData({
        name: category.name
      })
    }
    
    setFormErrors([])
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setCurrentCategory(null)
    setFormData({
      name: ''
    })
    setFormErrors([])
  }

  const openDeleteModal = (category: FinishedProductCategory) => {
    setCategoryToDelete(category)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setCategoryToDelete(null)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCategories(filteredCategories.map(c => c.id))
    } else {
      setSelectedCategories([])
    }
  }

  const handleSelectCategory = (categoryId: number, checked: boolean) => {
    if (checked) {
      setSelectedCategories(prev => [...prev, categoryId])
    } else {
      setSelectedCategories(prev => prev.filter(id => id !== categoryId))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedCategories.length === 0) return

    const confirmed = window.confirm(`Are you sure you want to delete ${selectedCategories.length} categories?`)
    if (!confirmed) return

    try {
      await finishedProductService.bulkDeleteCategories(selectedCategories)
      await loadCategories()
      setSelectedCategories([])
      console.log(`${selectedCategories.length} categories deleted successfully`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN_ERROR
      setError(errorMessage)
    }
  }

  if (error) {
    return (
      <div className="finished-products-page">
        <div className="finished-products-error">
          <div className="finished-products-error-icon">⚠️</div>
          <h3 className="finished-products-error-title">Error Loading Categories</h3>
          <p className="finished-products-error-message">{error}</p>
          <button className="finished-products-retry-btn" onClick={loadCategories}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="finished-products-page">
      {/* Header */}
      <div className="finished-products-header">
        <h1 className="finished-products-title">
          📦 Finished Product Categories
        </h1>
        <p className="finished-products-subtitle">
          Manage your finished product categories and organization
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="finished-products-stats">
        <div className="stat-card total">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Categories</span>
            <span className="stat-card-icon">📋</span>
          </div>
          <p className="stat-card-value">{stats.total}</p>
          <div className="stat-card-trend neutral">
            <span>Product categories</span>
          </div>
        </div>

        <div className="stat-card active">
          <div className="stat-card-header">
            <span className="stat-card-title">Recently Added</span>
            <span className="stat-card-icon">✨</span>
          </div>
          <p className="stat-card-value">{stats.recentlyAdded}</p>
          <div className="stat-card-trend positive">
            <span>↗ New categories</span>
          </div>
        </div>
      </div>

      {/* Categories Table */}
      <div className="finished-products-table-container">
        <div className="finished-products-table-header">
          <div>
            <h2 className="finished-products-table-title">
              📂 Category Management
            </h2>
            <p className="finished-products-table-subtitle">
              {filteredCategories.length} of {categories.length} categories
              {searchTerm && <span className="filter-indicator"> (filtered)</span>}
            </p>
          </div>
          
          <div className="finished-products-table-actions">
            <div className="finished-products-table-filters">
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              
              {selectedCategories.length > 0 && (
                <div className="bulk-actions">
                  <span className="bulk-selected">
                    {selectedCategories.length} selected
                  </span>
                  <button
                    className="table-btn table-btn-danger"
                    onClick={handleBulkDelete}
                  >
                    Delete Selected
                  </button>
                </div>
              )}
            </div>
            
            <div className="finished-products-table-buttons">
              <button
                className="table-btn table-btn-secondary"
                onClick={() => finishedProductService.exportCategories('csv').then(csv => {
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'categories.csv'
                  a.click()
                })}
              >
                📤 Export
              </button>
              <button
                className="table-btn table-btn-secondary"
                onClick={loadCategories}
                disabled={loading}
              >
                {loading ? '🔄' : '🔄'} Refresh
              </button>
              <button
                className="table-btn table-btn-primary"
                onClick={() => openModal('add')}
              >
                ➕ Add Category
              </button>
            </div>
          </div>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="table-loading">
              <div className="loading-spinner"></div>
              <p>Loading categories...</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th className="table-checkbox">
                    <input
                      type="checkbox"
                      className="bulk-select-checkbox"
                      checked={filteredCategories.length > 0 && selectedCategories.length === filteredCategories.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th>ID</th>
                  <th>Category Name</th>
                  <th className="table-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((category) => (
                  <tr key={category.id}>
                    <td className="table-checkbox">
                      <input
                        type="checkbox"
                        className="category-select-checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={(e) => handleSelectCategory(category.id, e.target.checked)}
                      />
                    </td>
                    <td>
                      <span className="category-id">#{category.id}</span>
                    </td>
                    <td>
                      <div className="category-name">
                        <strong>{category.name}</strong>
                      </div>
                    </td>
                    <td>
                      <div className="category-actions">
                        <button
                          className="category-action-btn edit"
                          onClick={() => openModal('edit', category)}
                          title="Edit category"
                          disabled={actionLoading[category.id]}
                        >
                          ✏️
                        </button>
                        <button
                          className="category-action-btn delete"
                          onClick={() => openDeleteModal(category)}
                          title="Delete category"
                          disabled={actionLoading[category.id]}
                        >
                          {actionLoading[category.id] ? '⏳' : '🗑️'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCategories.length === 0 && (
                  <tr>
                    <td colSpan={4} className="table-empty">
                      {searchTerm 
                        ? 'No categories found matching your search.' 
                        : 'No categories found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Category Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalMode === 'add' ? 'Add New Category' : 'Edit Category'}</h3>
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
                  <label htmlFor="category-name">{FORM_LABELS.CATEGORY_NAME} *</label>
                  <input
                    id="category-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    maxLength={VALIDATION.CATEGORY_NAME_MAX_LENGTH}
                    placeholder="Enter category name"
                    required
                  />
                </div>

                <div className="form-note">
                  <strong>Note:</strong> Category names must be unique and between 2-100 characters. 
                  Choose descriptive names that clearly identify the type of finished products.
                  {modalMode === 'add' && ' The category ID will be automatically assigned.'}
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
                  {submitting ? 'Saving...' : modalMode === 'add' ? 'Add Category' : 'Update Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && categoryToDelete && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button className="modal-close" onClick={closeDeleteModal}>&times;</button>
            </div>

            <div className="modal-body">
              <div className="delete-confirmation">
                <div className="delete-icon">⚠️</div>
                <p>Are you sure you want to delete this category?</p>
                <p><strong>{categoryToDelete.name}</strong></p>
                <p className="delete-warning">This action cannot be undone and may affect related products.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={closeDeleteModal}
                disabled={actionLoading[categoryToDelete.id]}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(categoryToDelete)}
                disabled={actionLoading[categoryToDelete.id]}
              >
                {actionLoading[categoryToDelete.id] ? 'Deleting...' : 'Delete Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FinishedProducts