import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateChange,
  fromCents,
  lineTotal,
  marginPercent,
  percentOff,
  round2,
  roundQty,
  sumMoney,
  toCents,
} from './money'

// ============================================================================
// NORMAL CASES
// ============================================================================

test('[NORMAL] lineTotal: 1.350 kg x $28.00 = $37.80', () => {
  assert.equal(lineTotal(1.35, 28), 37.8)
})

test('[NORMAL] lineTotal: piezas enteras', () => {
  assert.equal(lineTotal(3, 19), 57)
  assert.equal(lineTotal(12, 3.5), 42)
})

test('[NORMAL] calculateChange: cambio en efectivo, tarjeta y transferencia', () => {
  assert.equal(calculateChange(69.7, 100, 'CASH'), 30.3)
  assert.equal(calculateChange(69.7, 69.7, 'CASH'), 0)
  assert.equal(calculateChange(119.71, 119.71, 'CARD'), 0)
  assert.equal(calculateChange(250, 250, 'TRANSFER'), 0)
})

test('[NORMAL] marginPercent: cálculo estándar de margen sobre precio de venta', () => {
  // Precio $28, costo $17 -> (11 / 28) * 100 = 39.29%
  assert.equal(marginPercent(28, 17), 39.29)
  // Precio $20, costo $15 -> 25%
  assert.equal(marginPercent(20, 15), 25)
})

test('[NORMAL] sumMoney: suma de múltiples partidas sin deriva de flotantes', () => {
  assert.equal(sumMoney([0.1, 0.2]), 0.3)
  assert.equal(sumMoney([19.99, 0.01]), 20)
  assert.equal(sumMoney([37.8, 40, 119.71]), 197.51)
})

// ============================================================================
// EDGE CASES
// ============================================================================

test('[EDGE] lineTotal: redondeo half-up a centavos con 3 decimales de peso', () => {
  // 0.333 kg x $22 = 7.326 -> 7.33
  assert.equal(lineTotal(0.333, 22), 7.33)
  // 1.345 kg x $89 = 119.705 -> 119.71
  assert.equal(lineTotal(1.345, 89), 119.71)
})

test('[EDGE] lineTotal: cantidad en 0 y decimales pequeños (0.001 kg = 1 gramo)', () => {
  assert.equal(lineTotal(0, 89), 0)
  assert.equal(lineTotal(1.5, 0), 0)
  // 0.001 kg (1 g) x $89.00/kg = $0.089 -> $0.09
  assert.equal(lineTotal(0.001, 89), 0.09)
  // 0.001 kg (1 g) x $14.00/kg = $0.014 -> $0.01
  assert.equal(lineTotal(0.001, 14), 0.01)
})

test('[EDGE] roundQty, toCents y round2: evita ruido de flotantes en fronteras de redondeo', () => {
  assert.equal(roundQty(0.1 + 0.2), 0.3)
  assert.equal(roundQty(1.3454), 1.345)
  assert.equal(roundQty(0.0005), 0.001)
  assert.equal(toCents(1.005), 101)
  assert.equal(round2(2.675), 2.68)
  assert.equal(fromCents(0), 0)
})

test('[EDGE] percentOff: descuentos de remate (30%, 50%, 0%, 100% y saturación)', () => {
  assert.equal(percentOff(37.8, 30), 11.34)
  assert.equal(percentOff(119.71, 50), 59.86) // 59.855 -> 59.86
  assert.equal(percentOff(100, 0), 0)
  assert.equal(percentOff(100, 100), 100)
  assert.equal(percentOff(50, 150), 50) // acotado a 100%
  assert.equal(percentOff(50, -20), 0) // acotado a 0%
})

test('[EDGE] sumMoney y marginPercent: arreglo vacío y precio de venta en 0', () => {
  assert.equal(sumMoney([]), 0)
  assert.equal(marginPercent(0, 10), 0)
})

// ============================================================================
// INVALID CASES
// ============================================================================

test('[INVALID] lineTotal: rechaza pesos negativos, precios negativos y NaN', () => {
  assert.throws(() => lineTotal(-0.5, 28), RangeError)
  assert.throws(() => lineTotal(1.2, -28), RangeError)
  assert.throws(() => lineTotal(Number.NaN, 28), RangeError)
  assert.throws(() => lineTotal(1, Number.POSITIVE_INFINITY), RangeError)
})

test('[INVALID] calculateChange: rechaza pago en efectivo insuficiente o montos inválidos', () => {
  assert.throws(() => calculateChange(69.7, 50, 'CASH'), {
    name: 'RangeError',
    message: /menor al total/,
  })
  assert.throws(() => calculateChange(-10, 50, 'CASH'), RangeError)
  assert.throws(() => calculateChange(50, -10, 'CASH'), RangeError)
  assert.throws(() => calculateChange(Number.NaN, 50, 'CASH'), RangeError)
})

test('[INVALID] funciones monetarias: rechazan entradas corruptas (NaN / Infinity / negativos)', () => {
  assert.throws(() => toCents(Number.NaN), RangeError)
  assert.throws(() => fromCents(Number.POSITIVE_INFINITY), RangeError)
  assert.throws(() => roundQty(Number.NaN), RangeError)
  assert.throws(() => percentOff(-10, 30), RangeError)
  assert.throws(() => percentOff(100, Number.NaN), RangeError)
  assert.throws(() => marginPercent(28, -5), RangeError)
})
