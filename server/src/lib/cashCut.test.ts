import test from 'node:test'
import assert from 'node:assert/strict'
import { computeCashCut } from './cashCut'

test('[NORMAL] computeCashCut: calcula corte X/Z con ventas por método, utilidad bruta, merma y efectivo en cajón', () => {
  const cut = computeCashCut(
    'Z',
    '2026-11-23',
    [
      {
        paymentMethod: 'CASH',
        subtotal: 50,
        discount: 5,
        total: 45,
        items: [
          {
            productId: 'p1',
            productName: 'Plátano Tabasco',
            quantity: 2,
            subtotal: 50,
            discount: 5,
            product: { cost: 14 }, // costo = 2 * 14 = 28, venta neta = 45 -> utilidad = 17
          },
        ],
      },
      {
        paymentMethod: 'CARD',
        subtotal: 100,
        discount: 0,
        total: 100,
        items: [
          {
            productId: 'p2',
            productName: 'Aguacate Hass',
            quantity: 1,
            subtotal: 100,
            discount: 0,
            product: { cost: 64 }, // costo = 64, venta neta = 100 -> utilidad = 36
          },
        ],
      },
    ],
    [
      { type: 'INFLOW', amount: 500, category: 'FONDO_INICIAL' },
      { type: 'INFLOW', amount: 50, category: 'OTRO' },
      { type: 'OUTFLOW', amount: 120, category: 'PROVEEDOR_MERCANCIA' },
    ],
    [{ estimatedLoss: 13 }],
  )

  assert.equal(cut.type, 'Z')
  assert.equal(cut.sales.count, 2)
  assert.equal(cut.sales.subtotal, 150)
  assert.equal(cut.sales.discount, 5)
  assert.equal(cut.sales.total, 145)
  assert.equal(cut.sales.averageTicket, 72.5)
  assert.equal(cut.sales.byMethod.CASH.total, 45)
  assert.equal(cut.sales.byMethod.CARD.total, 100)
  // Efectivo esperado = 500 (fondo) + 50 (entradas) + 45 (ventas efectivo) - 120 (salidas) = 475
  assert.equal(cut.cash.expectedInDrawer, 475)
  // Utilidad bruta = 17 + 36 = 53; tras merma (13) = 40
  assert.equal(cut.profit.grossProfit, 53)
  assert.equal(cut.profit.afterWaste, 40)
  assert.equal(cut.topProducts[0].name, 'Aguacate Hass')
})

test('[EDGE] computeCashCut: turno sin ventas ni movimientos devuelve promedios y márgenes en 0', () => {
  const cut = computeCashCut('X', '2026-11-23', [], [], [])
  assert.equal(cut.sales.count, 0)
  assert.equal(cut.sales.total, 0)
  assert.equal(cut.sales.averageTicket, 0)
  assert.equal(cut.cash.expectedInDrawer, 0)
  assert.equal(cut.profit.grossProfit, 0)
  assert.equal(cut.profit.afterWaste, 0)
  assert.equal(cut.profit.marginPercent, 0)
  assert.deepEqual(cut.topProducts, [])
})

test('[INVALID] computeCashCut: rechaza tipo de corte inválido o montos negativos/NaN', () => {
  assert.throws(
    () => computeCashCut('INVALID' as 'X', '2026-11-23', [], [], []),
    RangeError,
  )
  assert.throws(
    () =>
      computeCashCut(
        'X',
        '2026-11-23',
        [],
        [{ type: 'INFLOW', amount: -100, category: 'FONDO_INICIAL' }],
        [],
      ),
    RangeError,
  )
  assert.throws(
    () => computeCashCut('X', '2026-11-23', [], [], [{ estimatedLoss: Number.NaN }]),
    RangeError,
  )
})
