// Finished Product Category Types (Based on Real Database Schema)
export interface FinishedProductCategory {
  id: number
  name: string
}

export interface FinishedProductCategoryCreate {
  name: string
}

export interface FinishedProductCategoryUpdate {
  name?: string
}

export interface FinishedProductCategoryResponse {
  id: number
  name: string
}

// Form and UI Types
export interface FinishedProductCategoryFormData {
  name: string
}

// Stats (simplified - calculated from real data)
export interface FinishedProductCategoryStats {
  total: number
  recentlyAdded: number
}

// API Response Types
export interface FinishedProductCategoryApiResponse {
  data: FinishedProductCategory[]
  total: number
  page: number
  limit: number
}

// Table and Filter Types
export interface FinishedProductCategoryTableColumn {
  key: string
  label: string
  sortable: boolean
  width?: string
}

export interface FinishedProductCategoryFilter {
  search: string
  sortBy: 'id' | 'name'
  sortOrder: 'asc' | 'desc'
}

// Error Types
export interface FinishedProductCategoryError {
  message: string
  field?: string
  code?: string
}

// Export convenience type aliases
export type Category = FinishedProductCategory
export type CategoryCreate = FinishedProductCategoryCreate
export type CategoryUpdate = FinishedProductCategoryUpdate
export type CategoryResponse = FinishedProductCategoryResponse
export type CategoryFormData = FinishedProductCategoryFormData
export type CategoryStats = FinishedProductCategoryStats
export type CategoryFilter = FinishedProductCategoryFilter