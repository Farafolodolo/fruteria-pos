import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { HttpError, dayRange, handler } from '../lib/http'
import { lineTotal, roundQty, sumMoney } from '../lib/money'

export const wasteRouter = Router()

export const WASTE_REASONS = ['MADURACION', 'PODRIDO', 'GOLPEADO', 'CADUCADO'] as const

const wasteSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  reason: z.enum(WASTE_REASONS),
})

// POST /api/waste -> registra merma, descuenta inventario y estima la pérdida al COSTO
wasteRouter.post('/', handler(async (req, res) => {
  const body = wasteSchema.parse(req.body)

  const record = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: body.productId } })
    if (!product) throw new HttpError(404, 'Producto no encontrado')
    const quantity = roundQty(body.quantity)
    if (product.soldBy === 'UNIT' && !Number.isInteger(quantity)) {
      throw new HttpError(400, `${product.name} se cuenta por pieza (cantidad entera)`)
    }
    if (quantity > product.stock) {
      throw new HttpError(400, `La merma (${quantity}) excede el stock registrado (${product.stock})`)
    }
    await tx.product.update({ where: { id: product.id }, data: { stock: roundQty(product.stock - quantity) } })
    return tx.wasteRecord.create({
      data: {
        productId: product.id,
        quantity,
        reason: body.reason,
        estimatedLoss: lineTotal(quantity, product.cost),
      },
      include: { product: true },
    })
  })

  res.status(201).json(record)
}))

// GET /api/waste?date=YYYY-MM-DD
wasteRouter.get('/', handler(async (req, res) => {
  const { from, to } = dayRange(req.query.date as string | undefined)
  const records = await prisma.wasteRecord.findMany({
    where: { recordedAt: { gte: from, lt: to } },
    orderBy: { recordedAt: 'desc' },
    include: { product: true },
  })
  res.json({ records, totalLoss: sumMoney(records.map((r) => r.estimatedLoss)) })
}))

// DELETE /api/waste/:id -> deshace el registro y devuelve el stock
wasteRouter.delete('/:id', handler(async (req, res) => {
  await prisma.$transaction(async (tx) => {
    const rec = await tx.wasteRecord.findUnique({ where: { id: req.params.id } })
    if (!rec) throw new HttpError(404, 'Registro no encontrado')
    const product = await tx.product.findUniqueOrThrow({ where: { id: rec.productId } })
    await tx.product.update({ where: { id: product.id }, data: { stock: roundQty(product.stock + rec.quantity) } })
    await tx.wasteRecord.delete({ where: { id: rec.id } })
  })
  res.status(204).end()
}))
