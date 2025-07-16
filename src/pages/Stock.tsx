import React, { useState, useEffect } from 'react'
import { stockService } from '../services/stockService'
import { authService } from '../services/authService'
import { ERROR_MESSAGES } from '../constants/api'
import BatchUpload from './BatchUpload'
import type { 
  Stock, 
  StockUpdate,
  StockStats,
  StockCategory,
  ProductOption,
  SupplierOption,
  formatProductQuantity,
  hasProductInfo
} from '../types/stock'
import type { AuthState } from '../types/auth'
import { STOCK_CATEGORIES } from '../types/stock'
import './Stock.css'

// Error Boundary Component
class StockErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('StockPage Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="table-empty">
          <div className="table-empty-icon">⚠️</div>
          <div className="table-empty-text">Something went wrong</div>
          <div className="table-empty-subtext">
            {this.state.error?.message || 'An unexpected error occurred'}
          </div>
          <button 
            className="table-btn table-btn-primary" 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '16px' }}
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

interface BatchInfo {
  batch_number: string
  total_items: number
  total_product_quantity: number  // UPDATED: Now from Product table
  categories: Record<string, number>
  created_at: string
  user_name: string
  archived_items?: number
  is_archived?: boolean
}

interface BatchDetails {
  batch_number: string
  total_items: number
  total_product_quantity: number  // UPDATED: Now from Product table
  categories: Record<string, number>
  created_at: string
  user_name: string
  items: Stock[]
}

// UPDATED: Removed quantity from sort fields since it's no longer in Stock table
type SortField = 'id' | 'batch' | 'product_name' | 'category' | 'supplier_name' | 'archive' | 'used' | 'created_at'
type BatchSortField = 'batch_number' | 'total_items' | 'total_product_quantity' | 'user_name' | 'created_at' | 'is_archived'
type SortOrder = 'asc' | 'desc'

const StockPageContent: React.FC = () => {
  // Auth State
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState())
  
  // View Mode
  const [viewMode, setViewMode] = useState<'batches' | 'individual' | 'batch-upload'>('batches')
  
  // State Management
  const [stocks, setStocks] = useState<Stock[]>([])
  const [batches, setBatches] = useState<BatchInfo[]>([])
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())
  const [expandedStocks, setExpandedStocks] = useState<Set<number>>(new Set())
  const [batchDetails, setBatchDetails] = useState<Map<string, BatchDetails>>(new Map())
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  
  // Filter States
  const [categoryFilter, setCategoryFilter] = useState<StockCategory | 'all'>('all')
  const [archiveFilter, setArchiveFilter] = useState<boolean | 'all'>('all')
  const [usedFilter, setUsedFilter] = useState<boolean | 'all'>('all')
  
  // Sorting States for Individual View
  const [sortField, setSortField] = useState<SortField>('id')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  
  // Sorting States for Batch View
  const [batchSortField, setBatchSortField] = useState<BatchSortField>('created_at')
  const [batchSortOrder, setBatchSortOrder] = useState<SortOrder>('desc')
  
  // Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [stockToDelete, setStockToDelete] = useState<Stock | null>(null)
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false)
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null)
  
  // Dropdown Options
  const [productOptions, setProductOptions] = useState<ProductOption[]>([])
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([])
  
  // Action Loading States
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({})

  // UPDATED: Statistics (now includes total_product_quantity)
  const [stats, setStats] = useState<StockStats>({
    total_stocks: 0,
    active_stocks: 0,
    archived_stocks: 0,
    used_stocks: 0,
    finished_products: 0,
    raw_materials: 0,
    total_product_quantity: 0  // ADDED
  })

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState)
    return unsubscribe
  }, [])

  // Load data on component mount
  useEffect(() => {
    loadInitialData()
  }, [viewMode])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (viewMode === 'batches') {
        const [batchesData, statsData, products, suppliers] = await Promise.all([
          stockService.getAllBatches(),
          stockService.getStockStats(),
          stockService.getProductOptions(),
          stockService.getSupplierOptions()
        ])
        
        setBatches(batchesData)
        setStats(statsData)
        setProductOptions(products)
        setSupplierOptions(suppliers)
      } else if (viewMode === 'individual') {
        const [stocksData, statsData, products, suppliers] = await Promise.all([
          stockService.getAllStocks(),
          stockService.getStockStats(),
          stockService.getProductOptions(),
          stockService.getSupplierOptions()
        ])
        
        setStocks(stocksData)
        setStats(statsData)
        setProductOptions(products)
        setSupplierOptions(suppliers)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN_ERROR)
    } finally {
      setLoading(false)
    }
  }

  const loadBatchDetails = async (batchNumber: string) => {
    if (batchDetails.has(batchNumber)) return
    
    try {
      setActionLoading(prev => ({ ...prev, [`batch-${batchNumber}`]: true }))
      
      const batchDetail = await stockService.getBatchDetails(batchNumber)
      setBatchDetails(prev => new Map(prev.set(batchNumber, batchDetail)))
      
    } catch (err) {
      console.error(`Error loading batch details for ${batchNumber}:`, err)
    } finally {
      setActionLoading(prev => ({ ...prev, [`batch-${batchNumber}`]: false }))
    }
  }

  const toggleBatchExpansion = async (batchNumber: string) => {
    const newExpanded = new Set(expandedBatches)
    
    if (expandedBatches.has(batchNumber)) {
      newExpanded.delete(batchNumber)
    } else {
      newExpanded.add(batchNumber)
      await loadBatchDetails(batchNumber)
    }
    
    setExpandedBatches(newExpanded)
  }

  const toggleStockExpansion = (stockId: number) => {
    const newExpanded = new Set(expandedStocks)
    
    if (expandedStocks.has(stockId)) {
      newExpanded.delete(stockId)
    } else {
      newExpanded.add(stockId)
    }
    
    setExpandedStocks(newExpanded)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleBatchSort = (field: BatchSortField) => {
    if (batchSortField === field) {
      setBatchSortOrder(batchSortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setBatchSortField(field)
      setBatchSortOrder('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️'
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  const getBatchSortIcon = (field: BatchSortField) => {
    if (batchSortField !== field) return '↕️'
    return batchSortOrder === 'asc' ? '↑' : '↓'
  }

  const handleArchiveStock = async (stock: Stock) => {
    setActionLoading(prev => ({ ...prev, [`stock-${stock.id}`]: true }))
    
    try {
      await stockService.archiveStock(stock.id)
      await loadInitialData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN_ERROR
      setError(errorMessage)
    } finally {
      setActionLoading(prev => ({ ...prev, [`stock-${stock.id}`]: false }))
    }
  }

  const handleUseStock = async (stock: Stock) => {
    setActionLoading(prev => ({ ...prev, [`stock-${stock.id}`]: true }))
    
    try {
      await stockService.markStockUsed(stock.id)
      await loadInitialData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN_ERROR
      setError(errorMessage)
    } finally {
      setActionLoading(prev => ({ ...prev, [`stock-${stock.id}`]: false }))
    }
  }

  const handleDeleteStock = async (stock: Stock) => {
    setActionLoading(prev => ({ ...prev, [`stock-${stock.id}`]: true }))
    
    try {
      await stockService.deleteStock(stock.id)
      await loadInitialData()
      setShowDeleteModal(false)
      setStockToDelete(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN_ERROR
      setError(errorMessage)
    } finally {
      setActionLoading(prev => ({ ...prev, [`stock-${stock.id}`]: false }))
    }
  }

  const handleArchiveBatch = async (batchNumber: string) => {
    setActionLoading(prev => ({ ...prev, [`batch-archive-${batchNumber}`]: true }))
    
    try {
      // Get current batch to determine new archive status
      const batch = batches.find(b => b.batch_number === batchNumber)
      if (!batch) {
        console.error('❌ Batch not found:', batchNumber)
        return
      }
      
      // Determine current archive status and what the new status should be
      const currentArchiveStatus = getBatchDisplayArchiveStatus(batch)
      const newArchiveStatus = !currentArchiveStatus
      
      console.log(`🔄 Batch ${batchNumber}: Current status: ${currentArchiveStatus ? 'archived' : 'active'}, Setting to: ${newArchiveStatus ? 'archived' : 'active'}`)
      
      // Use the explicit boolean control method
      const response = await stockService.setBatchArchiveStatus(batchNumber, newArchiveStatus)
      
      console.log('✅ Batch archive response:', response)
      
      // Reload data to reflect changes
      await loadInitialData()
      
      // Refresh batch details if expanded to show updated item statuses
      if (expandedBatches.has(batchNumber)) {
        setBatchDetails(prev => {
          const newMap = new Map(prev)
          newMap.delete(batchNumber) // Clear cached details
          return newMap
        })
        await loadBatchDetails(batchNumber) // Reload fresh details
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN_ERROR
      console.error('❌ Error in handleArchiveBatch:', errorMessage)
      setError(errorMessage)
    } finally {
      setActionLoading(prev => ({ ...prev, [`batch-archive-${batchNumber}`]: false }))
    }
  }

  const handleSetBatchArchiveStatus = async (batchNumber: string, archive: boolean) => {
    const actionKey = `batch-${archive ? 'archive' : 'unarchive'}-${batchNumber}`
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))
    
    try {
      console.log(`🔄 ${archive ? 'Archiving' : 'Unarchiving'} batch:`, batchNumber)
      
      // Use the explicit boolean control method
      const response = await stockService.setBatchArchiveStatus(batchNumber, archive)
      
      console.log(`✅ Batch ${archive ? 'archived' : 'unarchived'}:`, response)
      
      // Reload data to reflect changes
      await loadInitialData()
      
      // Refresh batch details if expanded
      if (expandedBatches.has(batchNumber)) {
        setBatchDetails(prev => {
          const newMap = new Map(prev)
          newMap.delete(batchNumber)
          return newMap
        })
        await loadBatchDetails(batchNumber)
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN_ERROR
      console.error(`❌ Error ${archive ? 'archiving' : 'unarchiving'} batch:`, errorMessage)
      setError(errorMessage)
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  const handleDeleteBatch = async (batchNumber: string) => {
    setActionLoading(prev => ({ ...prev, [`batch-delete-${batchNumber}`]: true }))
    
    try {
      await stockService.deleteBatch(batchNumber)
      await loadInitialData()
      
      // Remove from expanded batches and details
      setExpandedBatches(prev => {
        const newSet = new Set(prev)
        newSet.delete(batchNumber)
        return newSet
      })
      
      setBatchDetails(prev => {
        const newMap = new Map(prev)
        newMap.delete(batchNumber)
        return newMap
      })
      
      setShowBatchDeleteModal(false)
      setBatchToDelete(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN_ERROR
      setError(errorMessage)
    } finally {
      setActionLoading(prev => ({ ...prev, [`batch-delete-${batchNumber}`]: false }))
    }
  }

  const openDeleteModal = (stock: Stock) => {
    setStockToDelete(stock)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setStockToDelete(null)
  }

  const openBatchDeleteModal = (batchNumber: string) => {
    setBatchToDelete(batchNumber)
    setShowBatchDeleteModal(true)
  }

  const closeBatchDeleteModal = () => {
    setShowBatchDeleteModal(false)
    setBatchToDelete(null)
  }

  const filteredAndSortedBatches = (() => {
    try {
      let filtered = batches.filter(batch => {
        // Ensure batch has required properties
        if (!batch || !batch.batch_number) return false
        
        if (searchTerm) {
          const term = searchTerm.toLowerCase()
          const batchNumber = batch.batch_number?.toLowerCase() || ''
          const userName = batch.user_name?.toLowerCase() || ''
          const categories = batch.categories || {}
          
          const matchesSearch = 
            batchNumber.includes(term) ||
            userName.includes(term) ||
            Object.keys(categories).some(category => 
              category.toLowerCase().includes(term)
            )
          if (!matchesSearch) return false
        }

        if (categoryFilter !== 'all') {
          const categories = batch.categories || {}
          if (!categories[categoryFilter] || categories[categoryFilter] === 0) {
            return false
          }
        }

        // Archive filter for batches - use calculated archive status
        if (archiveFilter !== 'all') {
          const batchArchiveStatus = getBatchDisplayArchiveStatus(batch)
          if (batchArchiveStatus !== archiveFilter) {
            return false
          }
        }

        return true
      })

      // Sort the filtered batches
      filtered.sort((a, b) => {
        try {
          let aValue: any = a[batchSortField]
          let bValue: any = b[batchSortField]

          // Handle special cases
          if (batchSortField === 'is_archived') {
            aValue = getBatchDisplayArchiveStatus(a) ? 1 : 0
            bValue = getBatchDisplayArchiveStatus(b) ? 1 : 0
          }

          // Handle undefined/null values
          if (aValue == null) aValue = ''
          if (bValue == null) bValue = ''

          if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase()
            bValue = bValue.toLowerCase()
          }

          if (aValue < bValue) {
            return batchSortOrder === 'asc' ? -1 : 1
          }
          if (aValue > bValue) {
            return batchSortOrder === 'asc' ? 1 : -1
          }
          return 0
        } catch (error) {
          console.error('Error in batch sorting:', error)
          return 0
        }
      })

      return filtered
    } catch (error) {
      console.error('Error in batch filtering:', error)
      return []
    }
  })()

  const filteredAndSortedStocks = (() => {
    try {
      let filtered = stocks.filter(stock => {
        // Ensure stock has required properties
        if (!stock || !stock.id) return false
        
        // Search filter - UPDATED: removed direct quantity search, now searches product info
        if (searchTerm) {
          const term = searchTerm.toLowerCase()
          const batch = stock.batch?.toLowerCase() || ''
          const productName = stock.product_name?.toLowerCase() || ''
          const supplierName = stock.supplier_name?.toLowerCase() || ''
          const userName = stock.user_name?.toLowerCase() || ''
          const category = stock.category?.toLowerCase() || ''
          const productUnit = stock.product_unit?.toLowerCase() || ''  // UPDATED: search product unit
          
          const matchesSearch = 
            batch.includes(term) ||
            productName.includes(term) ||
            supplierName.includes(term) ||
            userName.includes(term) ||
            category.includes(term) ||
            productUnit.includes(term)  // UPDATED: search in product unit
          if (!matchesSearch) return false
        }

        // Category filter
        if (categoryFilter !== 'all' && stock.category !== categoryFilter) {
          return false
        }

        // Archive filter
        if (archiveFilter !== 'all' && stock.archive !== archiveFilter) {
          return false
        }

        // Used filter
        if (usedFilter !== 'all' && stock.used !== usedFilter) {
          return false
        }

        return true
      })

      // Sort the filtered results
      filtered.sort((a, b) => {
        try {
          let aValue: any = a[sortField]
          let bValue: any = b[sortField]

          // Handle special cases
          if (sortField === 'archive' || sortField === 'used') {
            aValue = aValue ? 1 : 0
            bValue = bValue ? 1 : 0
          }

          // Handle undefined/null values
          if (aValue == null) aValue = ''
          if (bValue == null) bValue = ''

          if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase()
            bValue = bValue.toLowerCase()
          }

          if (aValue < bValue) {
            return sortOrder === 'asc' ? -1 : 1
          }
          if (aValue > bValue) {
            return sortOrder === 'asc' ? 1 : -1
          }
          return 0
        } catch (error) {
          console.error('Error in stock sorting:', error)
          return 0
        }
      })

      return filtered
    } catch (error) {
      console.error('Error in stock filtering:', error)
      return []
    }
  })()

  const handleBatchUploadSuccess = () => {
    setViewMode('batches')
    loadInitialData()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getArchiveStatusDisplay = (archived: boolean) => {
    return archived ? 'Archived' : 'Active'
  }

  const getUsedStatusDisplay = (used: boolean) => {
    return used ? 'Used' : 'Available'
  }

  const getBatchArchiveStatus = (batchNumber: string): boolean => {
    const batchDetail = batchDetails.get(batchNumber)
    if (!batchDetail || batchDetail.items.length === 0) {
      return false
    }
    
    // A batch is considered archived if ALL its items are archived
    return batchDetail.items.every(item => item.archive)
  }

  const getBatchDisplayArchiveStatus = (batch: BatchInfo): boolean => {
    // If we have loaded batch details, use the calculated status
    if (batchDetails.has(batch.batch_number)) {
      return getBatchArchiveStatus(batch.batch_number)
    }
    
    // Otherwise, use the stored status (this would come from your API)
    return batch.is_archived || false
  }

  const getCategoryNames = (categories: Record<string, number>) => {
    return Object.entries(categories)
      .filter(([_, count]) => count > 0)
      .map(([category, count]) => `${category} (${count})`)
      .join(', ')
  }

  // UPDATED: Helper function to format product quantity with unit
  const formatProductQuantity = (stock: Stock): string => {
    if (stock.product_quantity !== undefined && stock.product_unit !== undefined) {
      return `${stock.product_quantity} ${stock.product_unit}`
    }
    return 'N/A'
  }

  // UPDATED: Helper function to check if stock has product info
  const hasProductInfo = (stock: Stock): boolean => {
    return stock.product_unit !== undefined && stock.product_quantity !== undefined
  }

  if (error) {
    return (
      <div className="stock-page">
        <div className="table-empty">
          <div className="table-empty-icon">⚠️</div>
          <div className="table-empty-text">Error Loading Stock</div>
          <div className="table-empty-subtext">{error}</div>
          <button className="table-btn table-btn-primary" onClick={loadInitialData} style={{ marginTop: '16px' }}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Batch Upload View
  if (viewMode === 'batch-upload') {
    return (
      <div className="stock-page">
        <BatchUpload
          onSuccess={handleBatchUploadSuccess}
          onCancel={() => setViewMode('batches')}
        />
      </div>
    )
  }

  return (
    <div className="stock-page">
      {/* Header */}
      <div className="stock-header">
        <h1 className="stock-title">
          📦 Stock Management
        </h1>
        <p className="stock-subtitle">
          Manage your inventory stock levels and tracking
        </p>
      </div>

      {/* UPDATED: Statistics Cards (now includes total_product_quantity) */}
      <div className="stock-stats">
        <div className="stat-card total">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Stock</span>
            <span className="stat-card-icon">📦</span>
          </div>
          <p className="stat-card-value">{stats.total_stocks}</p>
          <div className="stat-card-trend neutral">
            <span>All items</span>
          </div>
        </div>

        <div className="stat-card active">
          <div className="stat-card-header">
            <span className="stat-card-title">Active Stock</span>
            <span className="stat-card-icon">✅</span>
          </div>
          <p className="stat-card-value">{stats.active_stocks}</p>
          <div className="stat-card-trend positive">
            <span>↗ Available</span>
          </div>
        </div>

        <div className="stat-card finished">
          <div className="stat-card-header">
            <span className="stat-card-title">Finished Products</span>
            <span className="stat-card-icon">🏭</span>
          </div>
          <p className="stat-card-value">{stats.finished_products}</p>
          <div className="stat-card-trend positive">
            <span>↗ Ready</span>
          </div>
        </div>

        <div className="stat-card raw">
          <div className="stat-card-header">
            <span className="stat-card-title">Raw Materials</span>
            <span className="stat-card-icon">🔧</span>
          </div>
          <p className="stat-card-value">{stats.raw_materials}</p>
          <div className="stat-card-trend positive">
            <span>↗ Materials</span>
          </div>
        </div>

        {/* NEW: Product Quantity Card */}
        <div className="stat-card quantity">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Product Quantity</span>
            <span className="stat-card-icon">📊</span>
          </div>
          <p className="stat-card-value">{stats.total_product_quantity}</p>
          <div className="stat-card-trend neutral">
            <span>All products</span>
          </div>
        </div>
      </div>

      {/* View Toggle and Actions */}
      <div className="stock-view-controls">
        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${viewMode === 'batches' ? 'active' : ''}`}
            onClick={() => setViewMode('batches')}
          >
            📦 Batch Table
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'individual' ? 'active' : ''}`}
            onClick={() => setViewMode('individual')}
          >
            📋 Individual Table
          </button>
        </div>
        
        <div className="view-actions">
          <button
            className="table-btn table-btn-primary"
            onClick={() => setViewMode('batch-upload')}
          >
            ➕ Batch Upload
          </button>
        </div>
      </div>

      {/* Batch Table View */}
      {viewMode === 'batches' && (
        <div className="table-container">
          <div className="table-header">
            <div className="table-header-top">
              <div className="table-header-info">
                <h2 className="table-title">📦 Batch Inventory</h2>
                <p className="table-subtitle">
                  {filteredAndSortedBatches.length} of {batches.length} batches
                  {(searchTerm || categoryFilter !== 'all' || archiveFilter !== 'all') && 
                    <span style={{ color: '#3b82f6', fontWeight: '600' }}> (filtered)</span>
                  }
                </p>
              </div>
              
              <div className="table-actions">
                <div className="table-search">
                  <span className="table-search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search batches..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="table-search-input"
                  />
                </div>
                
                <div className="table-filter">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as StockCategory | 'all')}
                    className="table-filter-select"
                  >
                    <option value="all">All Categories</option>
                    {STOCK_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="table-filter">
                  <select
                    value={archiveFilter === 'all' ? 'all' : archiveFilter ? 'true' : 'false'}
                    onChange={(e) => setArchiveFilter(e.target.value === 'all' ? 'all' : e.target.value === 'true')}
                    className="table-filter-select"
                  >
                    <option value="all">All Status</option>
                    <option value="false">Active</option>
                    <option value="true">Archived</option>
                  </select>
                </div>
                
                <button
                  className="table-btn table-btn-secondary"
                  onClick={loadInitialData}
                  disabled={loading}
                >
                  {loading ? '🔄' : '🔄'} Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="table-content">
            {loading ? (
              <div className="table-loading">
                <div className="loading-spinner"></div>
                <p>Loading batches...</p>
              </div>
            ) : (
              <table className="data-table">
                <thead className="table-head">
                  <tr className="table-head-row">
                    <th className="table-head-cell"></th>
                    <th 
                      className={`table-head-cell sortable ${batchSortField === 'batch_number' ? 'sorted' : ''}`}
                      onClick={() => handleBatchSort('batch_number')}
                    >
                      Batch Number <span className="sort-icon">{getBatchSortIcon('batch_number')}</span>
                    </th>
                    <th 
                      className={`table-head-cell sortable ${batchSortField === 'total_items' ? 'sorted' : ''}`}
                      onClick={() => handleBatchSort('total_items')}
                    >
                      Items <span className="sort-icon">{getBatchSortIcon('total_items')}</span>
                    </th>
                    {/* UPDATED: Changed from Total Quantity to Total Product Quantity */}
                    <th 
                      className={`table-head-cell sortable ${batchSortField === 'total_product_quantity' ? 'sorted' : ''}`}
                      onClick={() => handleBatchSort('total_product_quantity')}
                    >
                      Product Quantity <span className="sort-icon">{getBatchSortIcon('total_product_quantity')}</span>
                    </th>
                    <th className="table-head-cell">Categories</th>
                    <th 
                      className={`table-head-cell sortable ${batchSortField === 'is_archived' ? 'sorted' : ''}`}
                      onClick={() => handleBatchSort('is_archived')}
                    >
                      Status <span className="sort-icon">{getBatchSortIcon('is_archived')}</span>
                    </th>
                    <th 
                      className={`table-head-cell sortable ${batchSortField === 'user_name' ? 'sorted' : ''}`}
                      onClick={() => handleBatchSort('user_name')}
                    >
                      Created By <span className="sort-icon">{getBatchSortIcon('user_name')}</span>
                    </th>
                    <th 
                      className={`table-head-cell sortable ${batchSortField === 'created_at' ? 'sorted' : ''}`}
                      onClick={() => handleBatchSort('created_at')}
                    >
                      Created Date <span className="sort-icon">{getBatchSortIcon('created_at')}</span>
                    </th>
                    <th className="table-head-cell">Actions</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {filteredAndSortedBatches.map((batch) => (
                    <React.Fragment key={batch.batch_number}>
                      <tr className={`table-body-row ${expandedBatches.has(batch.batch_number) ? 'selected' : ''}`}>
                        <td className="table-body-cell">
                          <button
                            className="action-btn view"
                            onClick={() => toggleBatchExpansion(batch.batch_number)}
                            aria-label={expandedBatches.has(batch.batch_number) ? 'Collapse batch items' : 'Expand batch items'}
                          >
                            {expandedBatches.has(batch.batch_number) ? '🔽' : '▶️'}
                          </button>
                        </td>
                        <td className="table-body-cell">
                          <span style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '0.875rem' }}>
                            {batch.batch_number}
                          </span>
                        </td>
                        <td className="table-body-cell">
                          <span className="cell-badge status-enabled">{batch.total_items}</span>
                        </td>
                        {/* UPDATED: Display total_product_quantity instead of total_quantity */}
                        <td className="table-body-cell">
                          <span style={{ fontWeight: '600', color: '#059669' }}>{batch.total_product_quantity}</span>
                        </td>
                        <td className="table-body-cell">
                          <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {getCategoryNames(batch.categories)}
                          </div>
                        </td>
                        <td className="table-body-cell">
                          <span className={`cell-badge ${getBatchDisplayArchiveStatus(batch) ? 'status-disabled' : 'status-enabled'}`}>
                            {getArchiveStatusDisplay(getBatchDisplayArchiveStatus(batch))}
                          </span>
                        </td>
                        <td className="table-body-cell">
                          <span style={{ fontWeight: '600' }}>{batch.user_name}</span>
                        </td>
                        <td className="table-body-cell">
                          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{formatDate(batch.created_at)}</span>
                        </td>
                        <td className="table-body-cell">
                          <div className="cell-actions">
                            <button
                              className="action-btn edit"
                              onClick={() => handleArchiveBatch(batch.batch_number)}
                              title={`${getBatchDisplayArchiveStatus(batch) ? 'Unarchive' : 'Archive'} batch`}
                              disabled={actionLoading[`batch-archive-${batch.batch_number}`]}
                            >
                              {actionLoading[`batch-archive-${batch.batch_number}`] ? '⏳' : 
                               getBatchDisplayArchiveStatus(batch) ? '📤' : '📥'}
                            </button>
                            
                            <button
                              className="action-btn delete"
                              onClick={() => openBatchDeleteModal(batch.batch_number)}
                              title="Delete batch"
                              disabled={actionLoading[`batch-delete-${batch.batch_number}`]}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedBatches.has(batch.batch_number) && (
                        <tr>
                          <td colSpan={9} style={{ padding: '0', background: '#f9fafb' }}>
                            <div style={{ padding: '24px' }}>
                              {actionLoading[`batch-${batch.batch_number}`] ? (
                                <div className="table-loading">
                                  <div className="loading-spinner"></div>
                                  <p>Loading batch items...</p>
                                </div>
                              ) : (
                                <div>
                                  <h4 style={{ fontSize: '1.125rem', fontWeight: '700', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    📋 Items in Batch {batch.batch_number}
                                  </h4>
                                  <div className="table-container">
                                    <table className="data-table">
                                      <thead className="table-head">
                                        <tr className="table-head-row">
                                          <th className="table-head-cell">ID</th>
                                          <th className="table-head-cell">Product</th>
                                          {/* UPDATED: Changed from Quantity to Product Quantity */}
                                          <th className="table-head-cell">Product Quantity</th>
                                          <th className="table-head-cell">Product Unit</th>
                                          <th className="table-head-cell">Pieces</th>
                                          <th className="table-head-cell">Category</th>
                                          <th className="table-head-cell">Supplier</th>
                                          <th className="table-head-cell">Status</th>
                                          <th className="table-head-cell">Availability</th>
                                          <th className="table-head-cell">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody className="table-body">
                                        {batchDetails.get(batch.batch_number)?.items.map((stock) => (
                                          <tr key={stock.id} className="table-body-row">
                                            <td className="table-body-cell">
                                              <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#3b82f6' }}>
                                                #{stock.id}
                                              </span>
                                            </td>
                                            <td className="table-body-cell">
                                              <span style={{ fontWeight: '600' }}>{stock.product_name}</span>
                                            </td>
                                            {/* UPDATED: Display product_quantity instead of stock quantity */}
                                            <td className="table-body-cell">
                                              <span style={{ fontWeight: '600', color: '#059669' }}>
                                                {stock.product_quantity !== undefined ? stock.product_quantity : 'N/A'}
                                              </span>
                                            </td>
                                            {/* UPDATED: Display product_unit instead of stock unit */}
                                            <td className="table-body-cell">
                                              {stock.product_unit || 'N/A'}
                                            </td>
                                            <td className="table-body-cell">
                                              <span style={{ fontWeight: '500' }}>{stock.piece}</span>
                                            </td>
                                            <td className="table-body-cell">
                                              <span className={`cell-badge ${stock.category === 'finished product' ? 'position-admin' : 'position-staff'}`}>
                                                {stock.category}
                                              </span>
                                            </td>
                                            <td className="table-body-cell">{stock.supplier_name}</td>
                                            <td className="table-body-cell">
                                              <span className={`cell-badge ${stock.archive ? 'status-disabled' : 'status-enabled'}`}>
                                                {getArchiveStatusDisplay(stock.archive)}
                                              </span>
                                            </td>
                                            <td className="table-body-cell">
                                              <span className={`cell-badge ${stock.used ? 'status-disabled' : 'status-enabled'}`}>
                                                {getUsedStatusDisplay(stock.used)}
                                              </span>
                                            </td>
                                            <td className="table-body-cell">
                                              <div className="cell-actions">
                                                <button
                                                  className="action-btn edit"
                                                  onClick={() => handleArchiveStock(stock)}
                                                  title={stock.archive ? 'Unarchive' : 'Archive'}
                                                  disabled={actionLoading[`stock-${stock.id}`]}
                                                >
                                                  {actionLoading[`stock-${stock.id}`] ? '⏳' : stock.archive ? '📤' : '📥'}
                                                </button>
                                                <button
                                                  className="action-btn enable"
                                                  onClick={() => handleUseStock(stock)}
                                                  title={stock.used ? 'Mark as unused' : 'Mark as used'}
                                                  disabled={actionLoading[`stock-${stock.id}`]}
                                                >
                                                  {actionLoading[`stock-${stock.id}`] ? '⏳' : stock.used ? '↩️' : '✅'}
                                                </button>
                                                <button
                                                  className="action-btn delete"
                                                  onClick={() => openDeleteModal(stock)}
                                                  title="Delete stock"
                                                  disabled={actionLoading[`stock-${stock.id}`]}
                                                >
                                                  🗑️
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {filteredAndSortedBatches.length === 0 && (
                    <tr>
                      <td colSpan={9} className="table-body-cell">
                        <div className="table-empty">
                          <div className="table-empty-icon">📦</div>
                          <div className="table-empty-text">No batches found</div>
                          <div className="table-empty-subtext">
                            {searchTerm || categoryFilter !== 'all' || archiveFilter !== 'all'
                              ? 'Try adjusting your search or filters' 
                              : 'Create your first batch to get started'}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* UPDATED: Individual Stock Table View (updated column headers and data) */}
      {viewMode === 'individual' && (
        <div className="table-container">
          <div className="table-header">
            <div className="table-header-top">
              <div className="table-header-info">
                <h2 className="table-title">📋 Individual Stock Items</h2>
                <p className="table-subtitle">
                  {filteredAndSortedStocks.length} of {stocks.length} stock items
                  {(searchTerm || categoryFilter !== 'all' || archiveFilter !== 'all' || usedFilter !== 'all') && 
                    <span style={{ color: '#3b82f6', fontWeight: '600' }}> (filtered)</span>
                  }
                </p>
              </div>
              
              <div className="table-actions">
                <div className="table-search">
                  <span className="table-search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search stock..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="table-search-input"
                  />
                </div>
                
                <div className="table-filter">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as StockCategory | 'all')}
                    className="table-filter-select"
                  >
                    <option value="all">All Categories</option>
                    {STOCK_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="table-filter">
                  <select
                    value={archiveFilter === 'all' ? 'all' : archiveFilter ? 'true' : 'false'}
                    onChange={(e) => setArchiveFilter(e.target.value === 'all' ? 'all' : e.target.value === 'true')}
                    className="table-filter-select"
                  >
                    <option value="all">All Status</option>
                    <option value="false">Active</option>
                    <option value="true">Archived</option>
                  </select>
                </div>

                <div className="table-filter">
                  <select
                    value={usedFilter === 'all' ? 'all' : usedFilter ? 'true' : 'false'}
                    onChange={(e) => setUsedFilter(e.target.value === 'all' ? 'all' : e.target.value === 'true')}
                    className="table-filter-select"
                  >
                    <option value="all">All Availability</option>
                    <option value="false">Available</option>
                    <option value="true">Used</option>
                  </select>
                </div>
                
                <button
                  className="table-btn table-btn-secondary"
                  onClick={loadInitialData}
                  disabled={loading}
                >
                  {loading ? '🔄' : '🔄'} Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="table-content">
            {loading ? (
              <div className="table-loading">
                <div className="loading-spinner"></div>
                <p>Loading stock...</p>
              </div>
            ) : (
              <table className="data-table">
                <thead className="table-head">
                  <tr className="table-head-row">
                    <th className="table-head-cell"></th>
                    <th 
                      className={`table-head-cell sortable ${sortField === 'id' ? 'sorted' : ''}`}
                      onClick={() => handleSort('id')}
                    >
                      ID <span className="sort-icon">{getSortIcon('id')}</span>
                    </th>
                    <th 
                      className={`table-head-cell sortable ${sortField === 'batch' ? 'sorted' : ''}`}
                      onClick={() => handleSort('batch')}
                    >
                      Batch <span className="sort-icon">{getSortIcon('batch')}</span>
                    </th>
                    <th 
                      className={`table-head-cell sortable ${sortField === 'product_name' ? 'sorted' : ''}`}
                      onClick={() => handleSort('product_name')}
                    >
                      Product <span className="sort-icon">{getSortIcon('product_name')}</span>
                    </th>
                    {/* UPDATED: Changed from Quantity to Product Info */}
                    <th className="table-head-cell">Product Info</th>
                    <th className="table-head-cell">Pieces</th>
                    <th 
                      className={`table-head-cell sortable ${sortField === 'category' ? 'sorted' : ''}`}
                      onClick={() => handleSort('category')}
                    >
                      Category <span className="sort-icon">{getSortIcon('category')}</span>
                    </th>
                    <th 
                      className={`table-head-cell sortable ${sortField === 'supplier_name' ? 'sorted' : ''}`}
                      onClick={() => handleSort('supplier_name')}
                    >
                      Supplier <span className="sort-icon">{getSortIcon('supplier_name')}</span>
                    </th>
                    <th 
                      className={`table-head-cell sortable ${sortField === 'archive' ? 'sorted' : ''}`}
                      onClick={() => handleSort('archive')}
                    >
                      Status <span className="sort-icon">{getSortIcon('archive')}</span>
                    </th>
                    <th 
                      className={`table-head-cell sortable ${sortField === 'used' ? 'sorted' : ''}`}
                      onClick={() => handleSort('used')}
                    >
                      Availability <span className="sort-icon">{getSortIcon('used')}</span>
                    </th>
                    <th className="table-head-cell">Actions</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {filteredAndSortedStocks.map((stock) => (
                    <React.Fragment key={stock.id}>
                      <tr className={`table-body-row ${expandedStocks.has(stock.id) ? 'selected' : ''}`}>
                        <td className="table-body-cell">
                          <button
                            className="action-btn view"
                            onClick={() => toggleStockExpansion(stock.id)}
                            aria-label={expandedStocks.has(stock.id) ? 'Collapse details' : 'Expand details'}
                          >
                            {expandedStocks.has(stock.id) ? '🔽' : '▶️'}
                          </button>
                        </td>
                        <td className="table-body-cell">
                          <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#3b82f6' }}>
                            #{stock.id}
                          </span>
                        </td>
                        <td className="table-body-cell">
                          <div>
                            <strong style={{ fontWeight: '600' }}>{stock.batch}</strong>
                          </div>
                        </td>
                        <td className="table-body-cell">
                          <span style={{ fontWeight: '600' }}>{stock.product_name}</span>
                        </td>
                        {/* UPDATED: Display product quantity and unit instead of stock quantity */}
                        <td className="table-body-cell">
                          <span style={{ fontWeight: '600', color: '#059669' }}>
                            {formatProductQuantity(stock)}
                          </span>
                        </td>
                        <td className="table-body-cell">
                          <span style={{ fontWeight: '500' }}>{stock.piece}</span>
                        </td>
                        <td className="table-body-cell">
                          <span className={`cell-badge ${stock.category === 'finished product' ? 'position-admin' : 'position-staff'}`}>
                            {stock.category}
                          </span>
                        </td>
                        <td className="table-body-cell">
                          <span style={{ fontWeight: '500' }}>{stock.supplier_name}</span>
                        </td>
                        <td className="table-body-cell">
                          <span className={`cell-badge ${stock.archive ? 'status-disabled' : 'status-enabled'}`}>
                            {getArchiveStatusDisplay(stock.archive)}
                          </span>
                        </td>
                        <td className="table-body-cell">
                          <span className={`cell-badge ${stock.used ? 'status-disabled' : 'status-enabled'}`}>
                            {getUsedStatusDisplay(stock.used)}
                          </span>
                        </td>
                        <td className="table-body-cell">
                          <div className="cell-actions">
                            <button
                              className="action-btn edit"
                              onClick={() => handleArchiveStock(stock)}
                              title={stock.archive ? 'Unarchive' : 'Archive'}
                              disabled={actionLoading[`stock-${stock.id}`]}
                            >
                              {actionLoading[`stock-${stock.id}`] ? '⏳' : stock.archive ? '📤' : '📥'}
                            </button>
                            <button
                              className="action-btn enable"
                              onClick={() => handleUseStock(stock)}
                              title={stock.used ? 'Mark as unused' : 'Mark as used'}
                              disabled={actionLoading[`stock-${stock.id}`]}
                            >
                              {actionLoading[`stock-${stock.id}`] ? '⏳' : stock.used ? '↩️' : '✅'}
                            </button>
                            <button
                              className="action-btn delete"
                              onClick={() => openDeleteModal(stock)}
                              title="Delete stock"
                              disabled={actionLoading[`stock-${stock.id}`]}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedStocks.has(stock.id) && (
                        <tr>
                          <td colSpan={11} style={{ padding: '0', background: '#f9fafb' }}>
                            <div style={{ padding: '24px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                  <h4 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 16px 0', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
                                    📋 Basic Information
                                  </h4>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontWeight: '600', color: '#64748b' }}>Stock ID:</span>
                                    <span>#{stock.id}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontWeight: '600', color: '#64748b' }}>Batch Number:</span>
                                    <span>{stock.batch}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                    <span style={{ fontWeight: '600', color: '#64748b' }}>Pieces:</span>
                                    <span>{stock.piece}</span>
                                  </div>
                                </div>
                                
                                {/* UPDATED: Product Information Card */}
                                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                  <h4 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 16px 0', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
                                    📦 Product Information
                                  </h4>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontWeight: '600', color: '#64748b' }}>Product Name:</span>
                                    <span>{stock.product_name || 'N/A'}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontWeight: '600', color: '#64748b' }}>Product Quantity:</span>
                                    <span>{stock.product_quantity !== undefined ? stock.product_quantity : 'N/A'}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                    <span style={{ fontWeight: '600', color: '#64748b' }}>Product Unit:</span>
                                    <span>{stock.product_unit || 'N/A'}</span>
                                  </div>
                                </div>
                                
                                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                  <h4 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 16px 0', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
                                    👤 Management Info
                                  </h4>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontWeight: '600', color: '#64748b' }}>Added by:</span>
                                    <span>{stock.user_name}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontWeight: '600', color: '#64748b' }}>Created:</span>
                                    <span>{formatDate(stock.created_at)}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                    <span style={{ fontWeight: '600', color: '#64748b' }}>Updated:</span>
                                    <span>{formatDate(stock.updated_at)}</span>
                                  </div>
                                </div>
                                
                                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                  <h4 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 16px 0', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
                                    📊 Status Information
                                  </h4>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontWeight: '600', color: '#64748b' }}>Archive Status:</span>
                                    <span className={`cell-badge ${stock.archive ? 'status-disabled' : 'status-enabled'}`}>
                                      {getArchiveStatusDisplay(stock.archive)}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontWeight: '600', color: '#64748b' }}>Usage Status:</span>
                                    <span className={`cell-badge ${stock.used ? 'status-disabled' : 'status-enabled'}`}>
                                      {getUsedStatusDisplay(stock.used)}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                    <span style={{ fontWeight: '600', color: '#64748b' }}>Category:</span>
                                    <span className={`cell-badge ${stock.category === 'finished product' ? 'position-admin' : 'position-staff'}`}>
                                      {stock.category}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {filteredAndSortedStocks.length === 0 && (
                    <tr>
                      <td colSpan={11} className="table-body-cell">
                        <div className="table-empty">
                          <div className="table-empty-icon">📦</div>
                          <div className="table-empty-text">No stock items found</div>
                          <div className="table-empty-subtext">
                            {searchTerm || categoryFilter !== 'all' || archiveFilter !== 'all' || usedFilter !== 'all'
                              ? 'Try adjusting your search or filters' 
                              : 'Add your first stock item to get started'}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Delete Stock Confirmation Modal */}
      {showDeleteModal && stockToDelete && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Delete Stock</h3>
              <button className="modal-close" onClick={closeDeleteModal}>&times;</button>
            </div>

            <div className="modal-body">
              <div className="delete-confirmation">
                <div className="delete-icon">⚠️</div>
                <p>Are you sure you want to delete this stock item?</p>
                <p><strong>Batch: {stockToDelete.batch}</strong></p>
                <p><strong>Product: {stockToDelete.product_name}</strong></p>
                <p className="delete-warning">This action cannot be undone.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="table-btn table-btn-secondary"
                onClick={closeDeleteModal}
                disabled={actionLoading[`stock-${stockToDelete.id}`]}
              >
                Cancel
              </button>
              <button
                className="table-btn table-btn-primary"
                onClick={() => handleDeleteStock(stockToDelete)}
                disabled={actionLoading[`stock-${stockToDelete.id}`]}
                style={{ background: '#dc2626' }}
              >
                {actionLoading[`stock-${stockToDelete.id}`] ? 'Deleting...' : 'Delete Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Batch Confirmation Modal */}
      {showBatchDeleteModal && batchToDelete && (
        <div className="modal-overlay" onClick={closeBatchDeleteModal}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Delete Batch</h3>
              <button className="modal-close" onClick={closeBatchDeleteModal}>&times;</button>
            </div>

            <div className="modal-body">
              <div className="delete-confirmation">
                <div className="delete-icon">⚠️</div>
                <p>Are you sure you want to delete this entire batch?</p>
                <p><strong>Batch: {batchToDelete}</strong></p>
                <p>This will delete ALL stock items in this batch.</p>
                <p className="delete-warning">This action cannot be undone.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="table-btn table-btn-secondary"
                onClick={closeBatchDeleteModal}
                disabled={actionLoading[`batch-delete-${batchToDelete}`]}
              >
                Cancel
              </button>
              <button
                className="table-btn table-btn-primary"
                onClick={() => handleDeleteBatch(batchToDelete)}
                disabled={actionLoading[`batch-delete-${batchToDelete}`]}
                style={{ background: '#dc2626' }}
              >
                {actionLoading[`batch-delete-${batchToDelete}`] ? 'Deleting...' : 'Delete Batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Main component wrapped with error boundary
const StockPage: React.FC = () => {
  return (
    <StockErrorBoundary>
      <StockPageContent />
    </StockErrorBoundary>
  )
}

export default StockPage