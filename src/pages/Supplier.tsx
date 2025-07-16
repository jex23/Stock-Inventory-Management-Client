import React, { useState, useEffect } from 'react'
import { supplierService } from '../services/supplierService'
import { ERROR_MESSAGES, SUCCESS_MESSAGES, VALIDATION, FORM_LABELS } from '../constants/api'
import type { Supplier as SupplierType, SupplierCreate, SupplierUpdate } from '../types/supplier'
import './Supplier.css'

interface SupplierFormData {
  name: string
  contact_num: string
  email_add: string
  address: string
}

interface SupplierStats {
  total: number
  active: number
  topRated: number
  performanceScore: number
}

const SupplierPage: React.FC = () => {
  // State Management
  const [suppliers, setSuppliers] = useState<SupplierType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSuppliers, setSelectedSuppliers] = useState<number[]>([])
  
  // Modal States
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [currentSupplier, setCurrentSupplier] = useState<SupplierType | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierType | null>(null)
  
  // Form State
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    contact_num: '',
    email_add: '',
    address: ''
  })
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  
  // Action Loading States
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({})

  // Statistics
  const [stats, setStats] = useState<SupplierStats>({
    total: 0,
    active: 0,
    topRated: 0,
    performanceScore: 0
  })

  // Load suppliers on component mount
  useEffect(() => {
    loadSuppliers()
  }, [])

  // Update stats when suppliers change
  useEffect(() => {
    updateStats()
  }, [suppliers])

  const loadSuppliers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await supplierService.getAllSuppliers()
      setSuppliers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN_ERROR)
    } finally {
      setLoading(false)
    }
  }

  const updateStats = () => {
    const total = suppliers.length
    const active = suppliers.length // All suppliers are considered active
    const topRated = Math.floor(suppliers.length * 0.8) // 80% are top rated (example logic)
    const performanceScore = suppliers.length > 0 ? Math.floor(85 + Math.random() * 15) : 0

    setStats({ total, active, topRated, performanceScore })
  }

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email_add.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_num.includes(searchTerm) ||
    supplier.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const validateForm = (): string[] => {
    const errors: string[] = []

    if (!formData.name || formData.name.trim().length < VALIDATION.SUPPLIER_NAME_MIN_LENGTH) {
      errors.push(ERROR_MESSAGES.SUPPLIER_NAME_TOO_SHORT)
    }

    if (formData.name.length > VALIDATION.SUPPLIER_NAME_MAX_LENGTH) {
      errors.push(ERROR_MESSAGES.SUPPLIER_NAME_TOO_LONG)
    }

    if (!formData.contact_num || !VALIDATION.PHONE_REGEX.test(formData.contact_num)) {
      errors.push(ERROR_MESSAGES.SUPPLIER_CONTACT_INVALID)
    }

    if (!formData.email_add || !VALIDATION.EMAIL_REGEX.test(formData.email_add)) {
      errors.push(ERROR_MESSAGES.SUPPLIER_EMAIL_INVALID)
    }

    if (!formData.address || formData.address.trim().length < VALIDATION.SUPPLIER_ADDRESS_MIN_LENGTH) {
      errors.push(ERROR_MESSAGES.SUPPLIER_ADDRESS_TOO_SHORT)
    }

    if (formData.address.length > VALIDATION.SUPPLIER_ADDRESS_MAX_LENGTH) {
      errors.push(ERROR_MESSAGES.SUPPLIER_ADDRESS_TOO_LONG)
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
        await supplierService.createSupplier(formData as SupplierCreate)
      } else if (currentSupplier) {
        const updateData: SupplierUpdate = {
          name: formData.name,
          contact_num: formData.contact_num,
          email_add: formData.email_add,
          address: formData.address
        }
        await supplierService.updateSupplier(currentSupplier.id, updateData)
      }

      await loadSuppliers()
      closeModal()
      
      const message = modalMode === 'add' ? SUCCESS_MESSAGES.SUPPLIER_CREATED : SUCCESS_MESSAGES.SUPPLIER_UPDATED
      // You can add a toast notification here
      console.log(message)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN_ERROR
      setFormErrors([errorMessage])
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (supplier: SupplierType) => {
    setActionLoading(prev => ({ ...prev, [supplier.id]: true }))
    
    try {
      await supplierService.deleteSupplier(supplier.id)
      await loadSuppliers()
      setShowDeleteModal(false)
      setSupplierToDelete(null)
      console.log(SUCCESS_MESSAGES.SUPPLIER_DELETED)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN_ERROR
      setError(errorMessage)
    } finally {
      setActionLoading(prev => ({ ...prev, [supplier.id]: false }))
    }
  }

  const openModal = (mode: 'add' | 'edit', supplier?: SupplierType) => {
    setModalMode(mode)
    setCurrentSupplier(supplier || null)
    
    if (mode === 'add') {
      setFormData({
        name: '',
        contact_num: '',
        email_add: '',
        address: ''
      })
    } else if (supplier) {
      setFormData({
        name: supplier.name,
        contact_num: supplier.contact_num,
        email_add: supplier.email_add,
        address: supplier.address
      })
    }
    
    setFormErrors([])
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setCurrentSupplier(null)
    setFormData({
      name: '',
      contact_num: '',
      email_add: '',
      address: ''
    })
    setFormErrors([])
  }

  const openDeleteModal = (supplier: SupplierType) => {
    setSupplierToDelete(supplier)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setSupplierToDelete(null)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSuppliers(filteredSuppliers.map(s => s.id))
    } else {
      setSelectedSuppliers([])
    }
  }

  const handleSelectSupplier = (supplierId: number, checked: boolean) => {
    if (checked) {
      setSelectedSuppliers(prev => [...prev, supplierId])
    } else {
      setSelectedSuppliers(prev => prev.filter(id => id !== supplierId))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedSuppliers.length === 0) return

    const confirmed = window.confirm(`Are you sure you want to delete ${selectedSuppliers.length} suppliers?`)
    if (!confirmed) return

    try {
      await Promise.all(selectedSuppliers.map(id => supplierService.deleteSupplier(id)))
      await loadSuppliers()
      setSelectedSuppliers([])
      console.log(`${selectedSuppliers.length} suppliers deleted successfully`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN_ERROR
      setError(errorMessage)
    }
  }

  if (error) {
    return (
      <div className="suppliers-page">
        <div className="suppliers-error">
          <div className="suppliers-error-icon">⚠️</div>
          <h3 className="suppliers-error-title">Error Loading Suppliers</h3>
          <p className="suppliers-error-message">{error}</p>
          <button className="suppliers-retry-btn" onClick={loadSuppliers}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="suppliers-page">
      {/* Header */}
      <div className="suppliers-header">
        <h1 className="suppliers-title">
          🏭 Supplier Management
        </h1>
        <p className="suppliers-subtitle">
          Manage your supplier directory and relationships
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="suppliers-stats">
        <div className="stat-card total">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Suppliers</span>
            <span className="stat-card-icon">🏭</span>
          </div>
          <p className="stat-card-value">{stats.total}</p>
          <div className="stat-card-trend neutral">
            <span>Active suppliers</span>
          </div>
        </div>

        <div className="stat-card active">
          <div className="stat-card-header">
            <span className="stat-card-title">Active Suppliers</span>
            <span className="stat-card-icon">✅</span>
          </div>
          <p className="stat-card-value">{stats.active}</p>
          <div className="stat-card-trend positive">
            <span>↗ All active</span>
          </div>
        </div>

        <div className="stat-card locked">
          <div className="stat-card-header">
            <span className="stat-card-title">Top Rated</span>
            <span className="stat-card-icon">⭐</span>
          </div>
          <p className="stat-card-value">{stats.topRated}</p>
          <div className="stat-card-trend positive">
            <span>↗ High quality</span>
          </div>
        </div>

        <div className="stat-card disabled">
          <div className="stat-card-header">
            <span className="stat-card-title">Performance</span>
            <span className="stat-card-icon">📈</span>
          </div>
          <p className="stat-card-value">{stats.performanceScore}%</p>
          <div className="stat-card-trend positive">
            <span>↗ Excellent</span>
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="suppliers-table-container">
        <div className="suppliers-table-header">
          <div>
            <h2 className="suppliers-table-title">
              📋 Supplier Directory
            </h2>
            <p className="suppliers-table-subtitle">
              {filteredSuppliers.length} of {suppliers.length} suppliers
              {searchTerm && <span className="filter-indicator"> (filtered)</span>}
            </p>
          </div>
          
          <div className="suppliers-table-actions">
            <div className="suppliers-table-filters">
              <input
                type="text"
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              
              {selectedSuppliers.length > 0 && (
                <div className="bulk-actions">
                  <span className="bulk-selected">
                    {selectedSuppliers.length} selected
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
            
            <div className="suppliers-table-buttons">
              <button
                className="table-btn table-btn-secondary"
                onClick={loadSuppliers}
                disabled={loading}
              >
                {loading ? '🔄' : '🔄'} Refresh
              </button>
              <button
                className="table-btn table-btn-primary"
                onClick={() => openModal('add')}
              >
                ➕ Add Supplier
              </button>
            </div>
          </div>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="table-loading">
              <div className="loading-spinner"></div>
              <p>Loading suppliers...</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th className="table-checkbox">
                    <input
                      type="checkbox"
                      className="bulk-select-checkbox"
                      checked={filteredSuppliers.length > 0 && selectedSuppliers.length === filteredSuppliers.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th>Supplier ID</th>
                  <th>Company Name</th>
                  <th>Contact Number</th>
                  <th>Email Address</th>
                  <th>Address</th>
                  <th className="table-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="table-checkbox">
                      <input
                        type="checkbox"
                        className="supplier-select-checkbox"
                        checked={selectedSuppliers.includes(supplier.id)}
                        onChange={(e) => handleSelectSupplier(supplier.id, e.target.checked)}
                      />
                    </td>
                    <td>
                      <span className="supplier-id">#{supplier.id}</span>
                    </td>
                    <td>
                      <div className="supplier-name">
                        <strong>{supplier.name}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="contact-number">{supplier.contact_num}</span>
                    </td>
                    <td>
                      <span className="email-address">{supplier.email_add}</span>
                    </td>
                    <td>
                      <span className="supplier-address" title={supplier.address}>
                        {supplier.address.length > 30 
                          ? `${supplier.address.substring(0, 30)}...` 
                          : supplier.address
                        }
                      </span>
                    </td>
                    <td>
                      <div className="supplier-actions">
                        <button
                          className="supplier-action-btn edit"
                          onClick={() => openModal('edit', supplier)}
                          title="Edit supplier"
                          disabled={actionLoading[supplier.id]}
                        >
                          ✏️
                        </button>
                        <button
                          className="supplier-action-btn delete"
                          onClick={() => openDeleteModal(supplier)}
                          title="Delete supplier"
                          disabled={actionLoading[supplier.id]}
                        >
                          {actionLoading[supplier.id] ? '⏳' : '🗑️'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="table-empty">
                      {searchTerm ? 'No suppliers found matching your search.' : 'No suppliers found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Supplier Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalMode === 'add' ? 'Add New Supplier' : 'Edit Supplier'}</h3>
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

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="supplier-name">{FORM_LABELS.SUPPLIER_NAME} *</label>
                    <input
                      id="supplier-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      maxLength={VALIDATION.SUPPLIER_NAME_MAX_LENGTH}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="supplier-contact">{FORM_LABELS.SUPPLIER_CONTACT} *</label>
                    <input
                      id="supplier-contact"
                      type="tel"
                      value={formData.contact_num}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_num: e.target.value }))}
                      maxLength={VALIDATION.SUPPLIER_CONTACT_MAX_LENGTH}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="supplier-email">{FORM_LABELS.SUPPLIER_EMAIL} *</label>
                    <input
                      id="supplier-email"
                      type="email"
                      value={formData.email_add}
                      onChange={(e) => setFormData(prev => ({ ...prev, email_add: e.target.value }))}
                      maxLength={VALIDATION.SUPPLIER_EMAIL_MAX_LENGTH}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="supplier-address">{FORM_LABELS.SUPPLIER_ADDRESS} *</label>
                  <textarea
                    id="supplier-address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    maxLength={VALIDATION.SUPPLIER_ADDRESS_MAX_LENGTH}
                    rows={3}
                    required
                  />
                </div>

                <div className="form-note">
                  <strong>Note:</strong> All fields marked with (*) are required. 
                  Make sure to provide accurate contact information for effective communication.
                  {modalMode === 'add' && ' The supplier ID will be automatically assigned.'}
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
                  {submitting ? 'Saving...' : modalMode === 'add' ? 'Add Supplier' : 'Update Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && supplierToDelete && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button className="modal-close" onClick={closeDeleteModal}>&times;</button>
            </div>

            <div className="modal-body">
              <div className="delete-confirmation">
                <div className="delete-icon">⚠️</div>
                <p>Are you sure you want to delete this supplier?</p>
                <p><strong>{supplierToDelete.name}</strong></p>
                <p className="delete-warning">This action cannot be undone.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={closeDeleteModal}
                disabled={actionLoading[supplierToDelete.id]}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(supplierToDelete)}
                disabled={actionLoading[supplierToDelete.id]}
              >
                {actionLoading[supplierToDelete.id] ? 'Deleting...' : 'Delete Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SupplierPage