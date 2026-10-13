export type SoldBy = 'WEIGHT' | 'UNIT'
export type Category = 'FRUTAS' | 'VERDURAS' | 'ABARROTES' | 'LACTEOS' | 'OTROS'
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER'

export interface Product {
  id: string
  barcode: string | null
  plu: string | null
  name: string
  category: Category
  soldBy: SoldBy
  price: number
  cost: number
  stock: number
  minStock: number
  imageUrl: string | null
  isActive: boolean
}

export interface CartLine {
  uid: string
  product: Product
  /** kg (WEIGHT) o piezas (UNIT) */
  quantity: number
  /** Descuento % (modo Remate) */
  discountPercent: number
}

export interface SaleDTO {
  id: string
  folio: number
  subtotal: number
  discount: number
  total: number
  paymentMethod: PaymentMethod
  amountPaid: number
  changeGiven: number
  customerPhone: string | null
  createdAt: string
}

/** Datos listos para imprimir / compartir un ticket */
export interface TicketData {
  folio: number
  date: string
  items: {
    name: string
    quantity: number
    unit: 'kg' | 'pz'
    unitPrice: number
    gross: number
    discount: number
  }[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: PaymentMethod
  amountPaid: number
  changeGiven: number
  customerPhone: string | null
}
