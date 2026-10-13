/** Mismo algoritmo exacto (enteros) que el servidor: server/src/lib/money.ts */
const clean = (n: number) => Number(n.toFixed(6))
export const toCents = (amount: number) => Math.round(clean(amount * 100))
export const fromCents = (cents: number) => Math.round(cents) / 100
export const roundQty = (q: number) => Math.round(clean(q * 1000)) / 1000

export function lineTotal(quantity: number, unitPrice: number): number {
  const grams = Math.round(roundQty(quantity) * 1000)
  return fromCents(Math.round((grams * toCents(unitPrice)) / 1000))
}

export function percentOff(amount: number, percent: number): number {
  const p = Math.min(Math.max(percent, 0), 100)
  return fromCents(Math.round((toCents(amount) * p) / 100))
}

export const sumMoney = (values: number[]) => fromCents(values.reduce((a, v) => a + toCents(v), 0))

const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
export const fmtMoney = (n: number) => mxn.format(n)

export const fmtKg = (kg: number) => `${kg.toFixed(3)} kg`

export const fmtQty = (soldBy: 'WEIGHT' | 'UNIT', q: number) =>
  soldBy === 'WEIGHT' ? fmtKg(q) : `${q} pz`
