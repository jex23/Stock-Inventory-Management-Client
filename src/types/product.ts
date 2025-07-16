// types/product.ts

// Stock Unit Types - matching API enum exactly (using const object for erasableSyntaxOnly compatibility)
export const StockUnit = {
  KG: 'kg',
  G: 'g',
  MG: 'mg',
  LB: 'lb',
  OZ: 'oz',
  L: 'l',
  ML: 'ml',
  PCS: 'pcs',
  BOX: 'box',
  PACK: 'pack',
  SACK: 'sack',
  BOTTLE: 'bottle',
  CAN: 'can',
  JAR: 'jar',
  ROLL: 'roll'
} as const

// Type for StockUnit values
export type StockUnit = typeof StockUnit[keyof typeof StockUnit]

// Product Types - Now includes unit and quantity
export interface Product {
  id: number
  name: string
  price: number
  unit: StockUnit
  quantity: number
}

export interface ProductCreate {
  name: string
  price: number
  unit?: StockUnit    // Optional with default 'pcs'
  quantity?: number   // Optional with default 0.00
}

export interface ProductUpdate {
  name?: string
  price?: number
  unit?: StockUnit
  quantity?: number
}

export interface ProductResponse extends Product {
  // Same as Product since no additional fields
}

// Updated stats to include quantity information
export interface ProductStats {
  total: number
  totalValue: number
  averagePrice: number
  highestPrice: number
  lowestPrice: number
  totalQuantity: number
  averageQuantity: number
}

// API Response types
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ProductListResponse {
  products: Product[]
  total: number
}

// Enhanced filter interface
export interface ProductFilters {
  search?: string
  minPrice?: number
  maxPrice?: number
  unit?: StockUnit
  minQuantity?: number
  maxQuantity?: number
}

// Helper function to get unit display names
export const getUnitDisplayName = (unit: StockUnit): string => {
  const unitNames: Record<StockUnit, string> = {
    [StockUnit.KG]: 'Kilograms (kg)',
    [StockUnit.G]: 'Grams (g)',
    [StockUnit.MG]: 'Milligrams (mg)',
    [StockUnit.LB]: 'Pounds (lb)',
    [StockUnit.OZ]: 'Ounces (oz)',
    [StockUnit.L]: 'Liters (l)',
    [StockUnit.ML]: 'Milliliters (ml)',
    [StockUnit.PCS]: 'Pieces (pcs)',
    [StockUnit.BOX]: 'Boxes',
    [StockUnit.PACK]: 'Packs',
    [StockUnit.SACK]: 'Sacks',
    [StockUnit.BOTTLE]: 'Bottles',
    [StockUnit.CAN]: 'Cans',
    [StockUnit.JAR]: 'Jars',
    [StockUnit.ROLL]: 'Rolls'
  }
  return unitNames[unit] || unit
}

// Helper function to get short unit display
export const getUnitShortName = (unit: StockUnit): string => {
  return unit
}

// Helper function to get all unit values (replacement for Object.values(StockUnit))
export const getAllUnits = (): StockUnit[] => {
  return Object.values(StockUnit)
}