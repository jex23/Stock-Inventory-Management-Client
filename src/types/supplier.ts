// Supplier Types
export interface Supplier {
  id: number
  name: string
  contact_num: string
  email_add: string
  address: string
}

export interface SupplierCreate {
  name: string
  contact_num: string
  email_add: string
  address: string
}

export interface SupplierUpdate {
  name?: string
  contact_num?: string
  email_add?: string
  address?: string
}

export interface SupplierResponse {
  id: number
  name: string
  contact_num: string
  email_add: string
  address: string
}

// API Response Types
export interface SupplierApiResponse {
  data: Supplier[]
  total: number
  page: number
  limit: number
}

export interface SupplierStats {
  total: number
  active: number
  topRated: number
  performanceScore: number
}

// Form and UI Types
export interface SupplierFormData {
  name: string
  contact_num: string
  email_add: string
  address: string
}

export interface SupplierTableColumn {
  key: string
  label: string
  sortable: boolean
  width?: string
}

export interface SupplierFilter {
  search: string
  sortBy: 'id' | 'name' | 'email_add' | 'contact_num'
  sortOrder: 'asc' | 'desc'
}

// Error Types
export interface SupplierError {
  message: string
  field?: string
  code?: string
}