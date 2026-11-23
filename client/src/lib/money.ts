/** Mismo algoritmo exacto (enteros) que el servidor: server/src/lib/money.ts */
const clean = (n: number) => {
  if (!Number.isFinite(n)) {
    throw new RangeError('El valor numérico debe ser finito')
  }
  return Number(n.toFixed(6))
}
export const toCents = (amount: number) => Math.round(clean(amount * 100))
export const fromCents = (cents: number) => {
  if (!Number.isFinite(cents)) {
    throw new RangeError('Los centavos deben ser un número finito')
  }
  return Math.round(cents) / 100
}
export const roundQty = (q: number) => Math.round(clean(q * 1000)) / 1000

export function lineTotal(quantity: number, unitPrice: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice) || quantity < 0 || unitPrice < 0) {
    throw new RangeError('La cantidad y el precio unitario deben ser números finitos no negativos')
  }
  const grams = Math.round(roundQty(quantity) * 1000)
  return fromCents(Math.round((grams * toCents(unitPrice)) / 1000))
}

export function percentOff(amount: number, percent: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(percent) || amount < 0) {
    throw new RangeError('El importe y porcentaje deben ser números válidos y el importe no negativo')
  }
  const p = Math.min(Math.max(percent, 0), 100)
  return fromCents(Math.round((toCents(amount) * p) / 100))
}

export const sumMoney = (values: number[]) => fromCents(values.reduce((a, v) => a + toCents(v), 0))

const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
export const fmtMoney = (n: number) => mxn.format(n)

export const fmtKg = (kg: number) => `${kg.toFixed(3)} kg`

export const fmtQty = (soldBy: 'WEIGHT' | 'UNIT', q: number) =>
  soldBy === 'WEIGHT' ? fmtKg(q) : `${q} pz`
