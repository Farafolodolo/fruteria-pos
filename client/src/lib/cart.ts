import { useCallback, useMemo, useState } from 'react'
import type { CartLine, Product } from './types'
import { lineTotal, percentOff, roundQty, sumMoney, fromCents, toCents } from './money'

export interface LineCalc {
  gross: number
  discount: number
  net: number
}

export const calcLine = (l: CartLine): LineCalc => {
  const gross = lineTotal(l.quantity, l.product.price)
  const discount = percentOff(gross, l.discountPercent)
  return { gross, discount, net: fromCents(toCents(gross) - toCents(discount)) }
}

export function calcCartTotals(lines: CartLine[]) {
  const calcs = lines.map(calcLine)
  const subtotal = sumMoney(calcs.map((c) => c.gross))
  const discount = sumMoney(calcs.map((c) => c.discount))
  return {
    subtotal,
    discount,
    total: fromCents(toCents(subtotal) - toCents(discount)),
    count: lines.length,
  }
}

let counter = 0
const uid = () => `l${Date.now().toString(36)}${counter++}`

export function addCartLine(
  prev: CartLine[],
  product: Product,
  quantity: number,
  discountPercent = 0,
): { lines: CartLine[]; lastAdded: string | null } {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new RangeError('La cantidad a agregar al carrito debe ser un número finito no negativo')
  }
  if (!Number.isFinite(product.price) || product.price < 0) {
    throw new RangeError('El precio del producto debe ser un número finito no negativo')
  }
  const q = roundQty(quantity)
  if (q <= 0) return { lines: prev, lastAdded: null }

  // Piezas: se acumulan en la misma línea. Pesados: cada pesada es una línea (bolsas distintas).
  const same =
    product.soldBy === 'UNIT'
      ? prev.find((l) => l.product.id === product.id && l.discountPercent === discountPercent)
      : undefined
  if (same) {
    return {
      lines: prev.map((l) => (l.uid === same.uid ? { ...l, quantity: roundQty(l.quantity + q) } : l)),
      lastAdded: same.uid,
    }
  }
  const line: CartLine = { uid: uid(), product, quantity: q, discountPercent }
  return { lines: [...prev, line], lastAdded: line.uid }
}

export function updateCartLineQty(prev: CartLine[], lineUid: string, quantity: number): CartLine[] {
  if (!Number.isFinite(quantity)) {
    throw new RangeError('La cantidad debe ser un número finito')
  }
  const q = roundQty(quantity)
  return q <= 0
    ? prev.filter((l) => l.uid !== lineUid)
    : prev.map((l) => (l.uid === lineUid ? { ...l, quantity: q } : l))
}

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([])
  const [lastAdded, setLastAdded] = useState<string | null>(null)

  const add = useCallback((product: Product, quantity: number, discountPercent = 0) => {
    const q = roundQty(quantity)
    if (q <= 0) return
    setLines((prev) => {
      const res = addCartLine(prev, product, q, discountPercent)
      if (res.lastAdded) setLastAdded(res.lastAdded)
      return res.lines
    })
  }, [])

  const setQuantity = useCallback((lineUid: string, quantity: number) => {
    setLines((prev) => updateCartLineQty(prev, lineUid, quantity))
    setLastAdded(lineUid)
  }, [])

  const remove = useCallback((lineUid: string) => setLines((p) => p.filter((l) => l.uid !== lineUid)), [])
  const clear = useCallback(() => setLines([]), [])

  const totals = useMemo(() => calcCartTotals(lines), [lines])

  return { lines, add, setQuantity, remove, clear, totals, lastAdded }
}
