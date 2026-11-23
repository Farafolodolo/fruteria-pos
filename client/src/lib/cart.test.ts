import test from 'node:test'
import assert from 'node:assert/strict'
import { addCartLine, calcCartTotals, calcLine, updateCartLineQty } from './cart'
import { lineTotal, percentOff } from './money'
import { whatsappMessage, whatsappUrl } from './ticket'
import type { Product, TicketData } from './types'

const platano: Product = {
  id: 'prod-weight-1',
  barcode: null,
  plu: '4011',
  name: 'Plátano Tabasco',
  category: 'FRUTAS',
  soldBy: 'WEIGHT',
  price: 22,
  cost: 14,
  stock: 38.5,
  minStock: 8,
  imageUrl: null,
  isActive: true,
}

const coca: Product = {
  id: 'prod-unit-1',
  barcode: '7501055363057',
  plu: null,
  name: 'Coca-Cola 600ml',
  category: 'ABARROTES',
  soldBy: 'UNIT',
  price: 20,
  cost: 15.5,
  stock: 48,
  minStock: 24,
  imageUrl: null,
  isActive: true,
}

const baseTicket: TicketData = {
  folio: 12,
  date: '2026-11-23T12:00:00.000Z',
  subtotal: 69.7,
  discount: 0,
  total: 69.7,
  paymentMethod: 'CASH',
  amountPaid: 100,
  changeGiven: 30.3,
  customerPhone: '6141234567',
  items: [
    { name: 'Plátano Tabasco', quantity: 1.35, unit: 'kg', unitPrice: 22, gross: 29.7, discount: 0 },
    { name: 'Coca-Cola 600ml', quantity: 2, unit: 'pz', unitPrice: 20, gross: 40, discount: 0 },
  ],
}

// ============================================================================
// NORMAL CASES
// ============================================================================

test('[NORMAL] addCartLine y calcCartTotals: acumula piezas (UNIT) y separa bolsas pesadas (WEIGHT)', () => {
  let lines = addCartLine([], coca, 1).lines
  lines = addCartLine(lines, coca, 2).lines
  assert.equal(lines.length, 1)
  assert.equal(lines[0].quantity, 3)

  lines = addCartLine(lines, platano, 1.35).lines
  lines = addCartLine(lines, platano, 0.5).lines
  // Cada pesada de fruta es una línea independiente
  assert.equal(lines.length, 3)

  const totals = calcCartTotals(lines)
  // 3 x $20 ($60.00) + 1.35 kg x $22 ($29.70) + 0.5 kg x $22 ($11.00) = $100.70
  assert.equal(totals.subtotal, 100.7)
  assert.equal(totals.discount, 0)
  assert.equal(totals.total, 100.7)
  assert.equal(totals.count, 3)
})

test('[NORMAL] whatsappMessage y whatsappUrl: formatea ticket y antepone prefijo 52 a 10 dígitos', () => {
  const msg = whatsappMessage(baseTicket)
  assert.match(msg, /Ticket #00012/)
  assert.match(msg, /Plátano Tabasco/)
  assert.match(msg, /1\.350 kg/)
  const url = whatsappUrl(baseTicket)
  assert.ok(url.startsWith('https://wa.me/526141234567?text='))
})

// ============================================================================
// EDGE CASES
// ============================================================================

test('[EDGE] carrito vacío, cantidades en 0 o sub-gramo y modo remate (30% y 50%)', () => {
  assert.deepEqual(calcCartTotals([]), { subtotal: 0, discount: 0, total: 0, count: 0 })

  // Cantidad 0 o que redondea a 0.000 kg no agrega línea
  assert.equal(addCartLine([], platano, 0).lines.length, 0)
  assert.equal(addCartLine([], platano, 0.0001).lines.length, 0)

  // Modo remate 50% en producto pesado con 0.001 kg y 1.350 kg
  const { lines } = addCartLine([], platano, 1.35, 50)
  const calc = calcLine(lines[0])
  assert.equal(calc.gross, 29.7)
  assert.equal(calc.discount, 14.85)
  assert.equal(calc.net, 14.85)
})

test('[EDGE] updateCartLineQty en 0 elimina la línea y whatsappUrl limpia caracteres o teléfono vacío', () => {
  const { lines } = addCartLine([], coca, 2)
  const uid = lines[0].uid
  const updated = updateCartLineQty(lines, uid, 5)
  assert.equal(updated[0].quantity, 5)

  const afterZero = updateCartLineQty(updated, uid, 0)
  assert.equal(afterZero.length, 0)

  const noPhoneUrl = whatsappUrl({ ...baseTicket, customerPhone: null })
  assert.ok(noPhoneUrl.startsWith('https://wa.me/?text='))

  const formattedPhoneUrl = whatsappUrl({ ...baseTicket, customerPhone: '(614) 123-4567' })
  assert.ok(formattedPhoneUrl.startsWith('https://wa.me/526141234567?text='))
})

// ============================================================================
// INVALID CASES
// ============================================================================

test('[INVALID] carrito y utilidades de cliente: rechazan pesos negativos, precios negativos o NaN', () => {
  assert.throws(() => addCartLine([], platano, -1.2), RangeError)
  assert.throws(() => addCartLine([], platano, Number.NaN), RangeError)
  assert.throws(() => addCartLine([], { ...platano, price: -22 }, 1), RangeError)
  assert.throws(() => updateCartLineQty([], 'l1', Number.NaN), RangeError)
  assert.throws(() => lineTotal(-0.25, 22), RangeError)
  assert.throws(() => lineTotal(1, -22), RangeError)
  assert.throws(() => percentOff(-50, 30), RangeError)
})
