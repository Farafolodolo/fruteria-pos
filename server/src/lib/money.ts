/**
 * Aritmética financiera y de peso con redondeo exacto.
 *
 * Los flotantes de JS (0.1 + 0.2 !== 0.3) son peligrosos con dinero, así que
 * todo cálculo se hace en enteros:
 *   - peso/cantidad en miligramos-equivalentes (cantidad * 1000)
 *   - dinero en centavos
 * El redondeo es "half-up" a centavos, igual que una calculadora de mostrador.
 */

/** Absorbe el ruido binario (100.49999999999999 -> 100.5) antes de redondear */
const clean = (n: number): number => Number(n.toFixed(6))

/** Pesos -> centavos enteros */
export const toCents = (amount: number): number => Math.round(clean(amount * 100))

/** Centavos -> pesos con 2 decimales exactos */
export const fromCents = (cents: number): number => Math.round(cents) / 100

/** Redondea a 2 decimales (dinero) */
export const round2 = (n: number): number => fromCents(toCents(n))

/** Redondea cantidad a 3 decimales (gramos) */
export const roundQty = (q: number): number => Math.round(clean(q * 1000)) / 1000

/** Importe bruto de una línea: cantidad (3 dec.) x precio unitario -> pesos (2 dec.) */
export function lineTotal(quantity: number, unitPrice: number): number {
  const grams = Math.round(roundQty(quantity) * 1000)
  const cents = Math.round((grams * toCents(unitPrice)) / 1000)
  return fromCents(cents)
}

/** Monto de descuento por porcentaje (0-100) sobre un importe */
export function percentOff(amount: number, percent: number): number {
  const p = Math.min(Math.max(percent, 0), 100)
  return fromCents(Math.round((toCents(amount) * p) / 100))
}

/** Suma de importes sin deriva de flotantes */
export function sumMoney(values: number[]): number {
  return fromCents(values.reduce((acc, v) => acc + toCents(v), 0))
}

/** Margen de utilidad en % (sobre precio de venta) */
export function marginPercent(price: number, cost: number): number {
  if (price <= 0) return 0
  return Math.round(((price - cost) / price) * 10000) / 100
}
