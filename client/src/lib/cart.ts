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

let counter = 0
const uid = () => `l${Date.now().toString(36)}${counter++}`

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([])
  const [lastAdded, setLastAdded] = useState<string | null>(null)

  const add = useCallback((product: Product, quantity: number, discountPercent = 0) => {
    const q = roundQty(quantity)
    if (q <= 0) return
    setLines((prev) => {
      // Piezas: se acumulan en la misma línea. Pesados: cada pesada es una línea (bolsas distintas).
      const same = product.soldBy === 'UNIT'
        ? prev.find((l) => l.product.id === product.id && l.discountPercent === discountPercent)
        : undefined
      if (same) {
        setLastAdded(same.uid)
        return prev.map((l) => (l.uid === same.uid ? { ...l, quantity: roundQty(l.quantity + q) } : l))
      }
      const line: CartLine = { uid: uid(), product, quantity: q, discountPercent }
      setLastAdded(line.uid)
      return [...prev, line]
    })
  }, [])

  const setQuantity = useCallback((lineUid: string, quantity: number) => {
    const q = roundQty(quantity)
    setLines((prev) =>
      q <= 0 ? prev.filter((l) => l.uid !== lineUid) : prev.map((l) => (l.uid === lineUid ? { ...l, quantity: q } : l)),
    )
    setLastAdded(lineUid)
  }, [])

  const remove = useCallback((lineUid: string) => setLines((p) => p.filter((l) => l.uid !== lineUid)), [])
  const clear = useCallback(() => setLines([]), [])

  const totals = useMemo(() => {
    const calcs = lines.map(calcLine)
    const subtotal = sumMoney(calcs.map((c) => c.gross))
    const discount = sumMoney(calcs.map((c) => c.discount))
    return { subtotal, discount, total: fromCents(toCents(subtotal) - toCents(discount)), count: lines.length }
  }, [lines])

  return { lines, add, setQuantity, remove, clear, totals, lastAdded }
}
