import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { HttpError, dayRange, handler } from '../lib/http'
import { fromCents, lineTotal, percentOff, roundQty, sumMoney, toCents } from '../lib/money'

export const salesRouter = Router()

const saleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().positive(),
        /** Descuento por línea en % (modo Remate: 30 / 50) */
        discountPercent: z.number().min(0).max(100).default(0),
      }),
    )
    .min(1, 'La venta no tiene productos'),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER']),
  amountPaid: z.number().nonnegative(),
  customerPhone: z.string().trim().min(8).max(20).nullish(),
})

// POST /api/sales -> el servidor recalcula TODO con los precios de la BD (no confía en el cliente)
salesRouter.post('/', handler(async (req, res) => {
  const body = saleSchema.parse(req.body)

  const sale = await prisma.$transaction(async (tx) => {
    const ids = [...new Set(body.items.map((i) => i.productId))]
    const products = await tx.product.findMany({ where: { id: { in: ids } } })
    const byId = new Map(products.map((p) => [p.id, p]))

    const lines = body.items.map((item) => {
      const product = byId.get(item.productId)
      if (!product || !product.isActive) throw new HttpError(400, `Producto no disponible: ${item.productId}`)
      const quantity = roundQty(item.quantity)
      if (product.soldBy === 'UNIT' && !Number.isInteger(quantity)) {
        throw new HttpError(400, `${product.name} se vende por pieza (cantidad entera)`)
      }
      if (quantity <= 0) throw new HttpError(400, `Cantidad inválida para ${product.name}`)
      const gross = lineTotal(quantity, product.price)
      const discount = percentOff(gross, item.discountPercent)
      return { product, quantity, gross, discount }
    })

    const subtotal = sumMoney(lines.map((l) => l.gross))
    const discount = sumMoney(lines.map((l) => l.discount))
    const total = fromCents(toCents(subtotal) - toCents(discount))

    let amountPaid = body.amountPaid
    if (body.paymentMethod === 'CASH') {
      if (toCents(amountPaid) < toCents(total)) throw new HttpError(400, 'El efectivo recibido es menor al total')
    } else {
      amountPaid = total // tarjeta/transferencia: pago exacto
    }
    const changeGiven = fromCents(toCents(amountPaid) - toCents(total))

    const last = await tx.sale.aggregate({ _max: { folio: true } })
    const folio = (last._max.folio ?? 0) + 1

    const created = await tx.sale.create({
      data: {
        folio,
        subtotal,
        discount,
        total,
        paymentMethod: body.paymentMethod,
        amountPaid,
        changeGiven,
        customerPhone: body.customerPhone ?? null,
        items: {
          create: lines.map((l) => ({
            productId: l.product.id,
            productName: l.product.name,
            quantity: l.quantity,
            unitPrice: l.product.price,
            subtotal: l.gross,
            discount: l.discount,
          })),
        },
      },
      include: { items: true },
    })

    for (const l of lines) {
      await tx.product.update({
        where: { id: l.product.id },
        data: { stock: roundQty(l.product.stock - l.quantity) },
      })
      l.product.stock = roundQty(l.product.stock - l.quantity) // acumula si el producto aparece en varias líneas
    }
    return created
  })

  res.status(201).json(sale)
}))

// GET /api/sales?date=YYYY-MM-DD
salesRouter.get('/', handler(async (req, res) => {
  const { from, to } = dayRange(req.query.date as string | undefined)
  res.json(
    await prisma.sale.findMany({
      where: { createdAt: { gte: from, lt: to } },
      orderBy: { folio: 'desc' },
      include: { items: true },
    }),
  )
}))

salesRouter.get('/:id', handler(async (req, res) => {
  const sale = await prisma.sale.findUnique({ where: { id: req.params.id }, include: { items: true } })
  if (!sale) throw new HttpError(404, 'Venta no encontrada')
  res.json(sale)
}))
