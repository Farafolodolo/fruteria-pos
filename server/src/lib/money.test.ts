import test from 'node:test'
import assert from 'node:assert/strict'
import { lineTotal, percentOff, roundQty, sumMoney, toCents, round2 } from './money'

test('lineTotal: 1.350 kg x $28.00 = $37.80', () => {
  assert.equal(lineTotal(1.35, 28), 37.8)
})

test('lineTotal: redondeo half-up a centavos con 3 decimales de peso', () => {
  // 0.333 kg x $22 = 7.326 -> 7.33
  assert.equal(lineTotal(0.333, 22), 7.33)
  // 1.345 kg x $89 = 119.705 -> 119.71
  assert.equal(lineTotal(1.345, 89), 119.71)
})

test('lineTotal: piezas enteras', () => {
  assert.equal(lineTotal(3, 19), 57)
  assert.equal(lineTotal(12, 3.5), 42)
})

test('roundQty: evita ruido de flotantes', () => {
  assert.equal(roundQty(0.1 + 0.2), 0.3)
  assert.equal(roundQty(1.3454), 1.345)
})

test('percentOff: remate 30% y 50%', () => {
  assert.equal(percentOff(37.8, 30), 11.34)
  assert.equal(percentOff(119.71, 50), 59.86) // 59.855 -> 59.86
  assert.equal(percentOff(100, 0), 0)
})

test('sumMoney: sin deriva de flotantes', () => {
  assert.equal(sumMoney([0.1, 0.2]), 0.3)
  assert.equal(sumMoney([19.99, 0.01]), 20)
})

test('toCents / round2', () => {
  assert.equal(toCents(1.005), 101)
  assert.equal(round2(2.675), 2.68)
})
