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
const clean = (n: number): number => {
  if (!Number.isFinite(n)) {
    throw new RangeError('El valor numérico debe ser finito')
  }
  return Number(n.toFixed(6))
}

/** Pesos -> centavos enteros */
export const toCents = (amount: number): number => Math.round(clean(amount * 100))

/** Centavos -> pesos con 2 decimales exactos */
export const fromCents = (cents: number): number => {
  if (!Number.isFinite(cents)) {
    throw new RangeError('Los centavos deben ser un número finito')
  }
  return Math.round(cents) / 100
}

/** Redondea a 2 decimales (dinero) */
export const round2 = (n: number): number => fromCents(toCents(n))

/** Redondea cantidad a 3 decimales (gramos) */
export const roundQty = (q: number): number => Math.round(clean(q * 1000)) / 1000

/** Importe bruto de una línea: cantidad (3 dec.) x precio unitario -> pesos (2 dec.) */
export function lineTotal(quantity: number, unitPrice: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice) || quantity < 0 || unitPrice < 0) {
    throw new RangeError('La cantidad y el precio unitario deben ser números finitos no negativos')
  }
  const grams = Math.round(roundQty(quantity) * 1000)
  const cents = Math.round((grams * toCents(unitPrice)) / 1000)
  return fromCents(cents)
}

/** Monto de descuento por porcentaje (0-100) sobre un importe */
export function percentOff(amount: number, percent: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(percent) || amount < 0) {
    throw new RangeError('El importe y porcentaje deben ser números válidos y el importe no negativo')
  }
  const p = Math.min(Math.max(percent, 0), 100)
  return fromCents(Math.round((toCents(amount) * p) / 100))
}

/** Suma de importes sin deriva de flotantes */
export function sumMoney(values: number[]): number {
  return fromCents(values.reduce((acc, v) => acc + toCents(v), 0))
}

/** Margen de utilidad en % (sobre precio de venta) */
export function marginPercent(price: number, cost: number): number {
  if (!Number.isFinite(price) || !Number.isFinite(cost) || cost < 0) {
    throw new RangeError('Precio y costo deben ser números finitos y costo no negativo')
  }
  if (price <= 0) return 0
  return Math.round(((price - cost) / price) * 10000) / 100
}

/** Calcula el cambio a entregar según método de pago, validando pago suficiente en efectivo */
export function calculateChange(
  total: number,
  amountPaid: number,
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' = 'CASH',
): number {
  if (!Number.isFinite(total) || !Number.isFinite(amountPaid) || total < 0 || amountPaid < 0) {
    throw new RangeError('Total y monto pagado deben ser números finitos no negativos')
  }
  if (paymentMethod !== 'CASH') {
    return 0
  }
  if (toCents(amountPaid) < toCents(total)) {
    throw new RangeError('El efectivo recibido es menor al total')
  }
  return fromCents(toCents(amountPaid) - toCents(total))
}
