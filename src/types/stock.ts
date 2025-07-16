// Stock Types (Updated to match database schema changes)

// Enums - Updated to match API exactly
export type StockUnit = 
  | 'kg' | 'g' | 'mg' | 'lb' | 'oz' 
  | 'l' | 'ml' 
  | 'pcs' | 'box' | 'pack' | 'sack' 
  | 'bottle' | 'can' | 'jar' | 'roll'

export type StockCategory = 'finished product' | 'raw material'

// UPDATED: Main Stock Interface (quantity and unit removed from stock, now in product)
export interface Stock {
  id: number
  batch: string
  piece: number
  // REMOVED: quantity and unit (now in Product table)
  category: StockCategory
  archive: boolean
  product_id: number
  supplier_id: number
  users_id: number
  used: boolean
  created_at: string
  updated_at: string
  // Related data
  product_name?: string
  product_unit?: StockUnit      // ADDED: From Product table
  product_quantity?: number     // ADDED: From Product table
  supplier_name?: string
  user_name?: string
}

// UPDATED: StockCreate (quantity and unit removed)
export interface StockCreate {
  batch: string
  piece: number
  // REMOVED: quantity and unit (now managed through Product table)
  category: StockCategory
  product_id: number
  supplier_id: number
  users_id: number
}

// UPDATED: StockUpdate (quantity and unit removed)
export interface StockUpdate {
  batch?: string
  piece?: number
  // REMOVED: quantity and unit (now managed through Product table)
  category?: StockCategory
  product_id?: number
  supplier_id?: number
  users_id?: number
  archive?: boolean
  used?: boolean
}

// UPDATED: StockResponse (quantity and unit removed, product fields added)
export interface StockResponse {
  id: number
  batch: string
  piece: number
  // REMOVED: quantity and unit
  category: StockCategory
  archive: boolean
  product_id: number
  supplier_id: number
  users_id: number
  used: boolean
  created_at: string
  updated_at: string
  product_name?: string
  product_unit?: StockUnit      // ADDED: From Product table
  product_quantity?: number     // ADDED: From Product table
  supplier_name?: string
  user_name?: string
}

// UPDATED: Form Data Interface (quantity and unit removed)
export interface StockFormData {
  batch: string
  piece: number
  // REMOVED: quantity and unit (now managed through Product table)
  category: StockCategory
  product_id: number
  supplier_id: number
  users_id: number
}

// UPDATED: Statistics Interface (added total_product_quantity)
export interface StockStats {
  total_stocks: number
  active_stocks: number
  archived_stocks: number
  used_stocks: number
  finished_products: number
  raw_materials: number
  total_product_quantity: number  // ADDED: From Product table sum
}

// Filter Interface (kept same)
export interface StockFilter {
  search: string
  category?: StockCategory | 'all'
  archive?: boolean | 'all'
  used?: boolean | 'all'
  product_id?: number | 'all'
  supplier_id?: number | 'all'
  sortBy: 'id' | 'batch' | 'created_at'  // UPDATED: removed quantity
  sortOrder: 'asc' | 'desc'
}

// UPDATED: ProductOption (now includes unit and quantity)
export interface ProductOption {
  id: number
  name: string
  price: number
  unit: StockUnit      // ADDED
  quantity: number     // ADDED
}

// SupplierOption (unchanged)
export interface SupplierOption {
  id: number
  name: string
}

// UserOption (unchanged)
export interface UserOption {
  id: number
  first_name: string
  last_name: string
  full_name: string
}

// API Response Types (unchanged)
export interface StockApiResponse {
  data: Stock[]
  total: number
  page: number
  limit: number
}

// UPDATED: Table Configuration (removed quantity column)
export interface StockTableColumn {
  key: string
  label: string
  sortable: boolean
  width?: string
}

// Error Types (unchanged)
export interface StockError {
  message: string
  field?: string
  code?: string
}

// Unit Options for Dropdown (unchanged)
export const STOCK_UNITS: { value: StockUnit; label: string; category: string }[] = [
  // Weight units
  { value: 'kg', label: 'Kilogram (kg)', category: 'Weight' },
  { value: 'g', label: 'Gram (g)', category: 'Weight' },
  { value: 'mg', label: 'Milligram (mg)', category: 'Weight' },
  { value: 'lb', label: 'Pound (lb)', category: 'Weight' },
  { value: 'oz', label: 'Ounce (oz)', category: 'Weight' },
  
  // Volume units
  { value: 'l', label: 'Liter (l)', category: 'Volume' },
  { value: 'ml', label: 'Milliliter (ml)', category: 'Volume' },
  
  // Quantity units
  { value: 'pcs', label: 'Pieces (pcs)', category: 'Quantity' },
  { value: 'box', label: 'Box', category: 'Container' },
  { value: 'pack', label: 'Pack', category: 'Container' },
  { value: 'sack', label: 'Sack', category: 'Container' },
  { value: 'bottle', label: 'Bottle', category: 'Container' },
  { value: 'can', label: 'Can', category: 'Container' },
  { value: 'jar', label: 'Jar', category: 'Container' },
  { value: 'roll', label: 'Roll', category: 'Container' }
]

// Category Options (unchanged)
export const STOCK_CATEGORIES: { value: StockCategory; label: string }[] = [
  { value: 'finished product', label: 'Finished Product' },
  { value: 'raw material', label: 'Raw Material' }
]

// NEW: Batch-related interfaces to match API
export interface BatchStockItem {
  piece: number
  // REMOVED: quantity and unit (these are now in Product table)
  category: StockCategory
  product_id: number
  supplier_id: number
}

export interface BatchStockCreate {
  items: BatchStockItem[]
  users_id?: number
}

export interface BatchResponse {
  batch_number: string
  items_created: number
  items: StockResponse[]
}

export interface BatchSummary {
  batch_number: string
  total_items: number
  total_product_quantity: number  // UPDATED: Now from Product table
  categories: Record<string, number>
  created_at: string
  user_name: string
  items: StockResponse[]
}

export interface BatchInfo {
  batch_number: string
  total_items: number
  total_product_quantity: number  // UPDATED: Now from Product table
  categories: Record<string, number>
  created_at: string
  user_name: string
  is_archived?: boolean
}

export interface BatchArchiveRequest {
  archive: boolean
}

export interface BatchArchiveResponse {
  message: string
  batch_number: string
  items_updated: number
  archive_status: boolean
}

// Helper function to get unit display name (unchanged)
export const getUnitDisplayName = (unit: StockUnit): string => {
  const unitOption = STOCK_UNITS.find(u => u.value === unit)
  return unitOption ? unitOption.label : unit
}

// Helper function to get short unit display (unchanged)
export const getUnitShortName = (unit: StockUnit): string => {
  return unit
}

// Helper function to get all unit values (unchanged)
export const getAllUnits = (): StockUnit[] => {
  return STOCK_UNITS.map(unit => unit.value)
}

// NEW: Helper function to format product quantity with unit
export const formatProductQuantity = (quantity?: number, unit?: StockUnit): string => {
  if (quantity === undefined || unit === undefined) {
    return 'N/A'
  }
  return `${quantity} ${getUnitShortName(unit)}`
}

// NEW: Helper function to check if stock has product info
export const hasProductInfo = (stock: Stock): boolean => {
  return stock.product_unit !== undefined && stock.product_quantity !== undefined
}

// Export convenience type aliases
export type StockItem = Stock
export type CreateStock = StockCreate
export type UpdateStock = StockUpdate
export type StockFormInput = StockFormData
export type StockStatistics = StockStats