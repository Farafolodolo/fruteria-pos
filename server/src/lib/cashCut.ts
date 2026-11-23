import { prisma } from '../db'
import { dayRange } from './http'
import { fromCents, lineTotal, sumMoney, toCents } from './money'

export type PaymentKey = 'CASH' | 'CARD' | 'TRANSFER'

export interface CashCutSaleItemInput {
  productId: string
  productName: string
  quantity: number
  subtotal: number
  discount: number
  product: { cost: number }
}

export interface CashCutSaleInput {
  paymentMethod: PaymentKey
  subtotal: number
  discount: number
  total: number
  items: CashCutSaleItemInput[]
}

export interface CashCutMovementInput {
  type: 'INFLOW' | 'OUTFLOW'
  amount: number
  category: string
}

export interface CashCutWasteInput {
  estimatedLoss: number
}

/**
 * Función pura de cálculo de corte de caja X / Z (sin dependencia de BD).
 */
export function computeCashCut<M extends CashCutMovementInput>(
  type: 'X' | 'Z',
  date: string,
  sales: CashCutSaleInput[],
  movements: M[],
  waste: CashCutWasteInput[],
) {
  if (type !== 'X' && type !== 'Z') {
    throw new RangeError('Tipo de corte inválido: debe ser X o Z')
  }
  for (const m of movements) {
    if (!Number.isFinite(m.amount) || m.amount < 0) {
      throw new RangeError('Monto de movimiento de caja inválido')
    }
  }
  for (const w of waste) {
    if (!Number.isFinite(w.estimatedLoss) || w.estimatedLoss < 0) {
      throw new RangeError('Pérdida estimada de merma inválida')
    }
  }

  const byMethod: Record<PaymentKey, { count: number; total: number }> = {
    CASH: { count: 0, total: 0 },
    CARD: { count: 0, total: 0 },
    TRANSFER: { count: 0, total: 0 },
  }
  for (const s of sales) {
    byMethod[s.paymentMethod].count++
    byMethod[s.paymentMethod].total = sumMoney([byMethod[s.paymentMethod].total, s.total])
  }

  // Utilidad bruta = venta neta - costo de lo vendido
  let netSalesCents = 0
  let costCents = 0
  const products = new Map<string, { name: string; quantity: number; revenue: number }>()
  for (const s of sales) {
    for (const i of s.items) {
      const net = toCents(i.subtotal) - toCents(i.discount)
      netSalesCents += net
      costCents += toCents(lineTotal(i.quantity, i.product.cost))
      const row = products.get(i.productId) ?? { name: i.productName, quantity: 0, revenue: 0 }
      row.quantity = Math.round((row.quantity + i.quantity) * 1000) / 1000
      row.revenue = fromCents(toCents(row.revenue) + net)
      products.set(i.productId, row)
    }
  }
  const grossProfit = fromCents(netSalesCents - costCents)

  const sum = (pred: (m: M) => boolean) => sumMoney(movements.filter(pred).map((m) => m.amount))
  const openingFloat = sum((m) => m.category === 'FONDO_INICIAL')
  const otherInflows = sum((m) => m.type === 'INFLOW' && m.category !== 'FONDO_INICIAL')
  const outflows = sum((m) => m.type === 'OUTFLOW')
  // Efectivo esperado = fondo + entradas + ventas en efectivo (neto de cambio) - salidas
  const expectedInDrawer = fromCents(
    toCents(openingFloat) + toCents(otherInflows) + toCents(byMethod.CASH.total) - toCents(outflows),
  )

  const total = sumMoney(sales.map((s) => s.total))
  const wasteLoss = sumMoney(waste.map((w) => w.estimatedLoss))

  return {
    type,
    date,
    generatedAt: new Date().toISOString(),
    sales: {
      count: sales.length,
      subtotal: sumMoney(sales.map((s) => s.subtotal)),
      discount: sumMoney(sales.map((s) => s.discount)),
      total,
      averageTicket: sales.length ? fromCents(Math.round(toCents(total) / sales.length)) : 0,
      byMethod,
    },
    cash: { openingFloat, cashSales: byMethod.CASH.total, otherInflows, outflows, expectedInDrawer },
    waste: { count: waste.length, totalLoss: wasteLoss },
    profit: {
      grossProfit,
      /** Utilidad bruta menos pérdida por merma */
      afterWaste: fromCents(toCents(grossProfit) - toCents(wasteLoss)),
      marginPercent: netSalesCents > 0 ? Math.round((grossProfit / fromCents(netSalesCents)) * 10000) / 100 : 0,
    },
    topProducts: [...products.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    movements,
  }
}

/**
 * Calcula el corte de caja de un día (hora local del servidor).
 * Corte X: informativo, puede repetirse durante el turno.
 * Corte Z: cierre del día (mismos cálculos, etiquetado como cierre).
 */
export async function buildCashCut(type: 'X' | 'Z', date?: string) {
  const { from, to } = dayRange(date)

  const [sales, movements, waste] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: from, lt: to } },
      include: { items: { include: { product: true } } },
    }),
    prisma.cashMovement.findMany({ where: { createdAt: { gte: from, lt: to } }, orderBy: { createdAt: 'asc' } }),
    prisma.wasteRecord.findMany({ where: { recordedAt: { gte: from, lt: to } }, include: { product: true } }),
  ])

  return computeCashCut(type, from.toISOString().slice(0, 10), sales, movements, waste)
}
