import test from 'node:test'
import assert from 'node:assert/strict'
import { parseScaleFrame } from './scale'
import { buildEscPos, encode } from './escpos'

test('parseScaleFrame: formatos Torrey / Rhino comunes', () => {
  assert.equal(parseScaleFrame('  1.350 kg'), 1.35)
  assert.equal(parseScaleFrame('ST,GS,+001.350kg'), 1.35)
  assert.equal(parseScaleFrame('W 01.350'), 1.35)
  assert.equal(parseScaleFrame('0350 g'), 0.35)
  assert.equal(parseScaleFrame('1,350'), 1.35)
  assert.equal(parseScaleFrame('2.0 lb'), 0.907)
  assert.equal(parseScaleFrame('sin numero'), null)
})

test('encode: acentos y ñ en CP858', () => {
  assert.deepEqual(encode('Ñandú'), [0xa5, 0x61, 0x6e, 0x64, 0xa3])
})

test('buildEscPos: init, corte y ancho de columnas', () => {
  const t = {
    folio: 7, date: new Date().toISOString(), subtotal: 37.8, discount: 0, total: 37.8,
    paymentMethod: 'CASH' as const, amountPaid: 50, changeGiven: 12.2, customerPhone: null,
    items: [{ name: 'Jitomate Saladet', quantity: 1.35, unit: 'kg' as const, unitPrice: 28, gross: 37.8, discount: 0 }],
  }
  const b58 = buildEscPos(t, 58)
  const b80 = buildEscPos(t, 80)
  assert.deepEqual([...b58.slice(0, 2)], [0x1b, 0x40])
  assert.deepEqual([...b58.slice(-4)], [0x1d, 0x56, 0x42, 0x00])
  assert.ok(b80.length > b58.length)
})
