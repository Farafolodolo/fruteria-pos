import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { dayRange, handler } from '../lib/http'
import { fromCents, toCents } from '../lib/money'

export const cashRouter = Router()

export const CASH_CATEGORIES = ['PROVEEDOR_MERCANCIA', 'GASTO_LOCAL', 'FONDO_INICIAL', 'RETIRO'] as const

const movementSchema = z
  .object({
    type: z.enum(['INFLOW', 'OUTFLOW']),
    amount: z.number().positive(),
    category: z.enum(CASH_CATEGORIES),
    note: z.string().trim().max(200).default(''),
  })
  .refine((m) => m.category !== 'FONDO_INICIAL' || m.type === 'INFLOW', {
    message: 'El fondo inicial es una entrada',
    path: ['type'],
  })

// POST /api/cash -> ej. pago de $150 al proveedor de tostadas
cashRouter.post('/', handler(async (req, res) => {
  const body = movementSchema.parse(req.body)
  const created = await prisma.cashMovement.create({
    data: { ...body, amount: fromCents(toCents(body.amount)) },
  })
  res.status(201).json(created)
}))

// GET /api/cash?date=YYYY-MM-DD
cashRouter.get('/', handler(async (req, res) => {
  const { from, to } = dayRange(req.query.date as string | undefined)
  res.json(
    await prisma.cashMovement.findMany({
      where: { createdAt: { gte: from, lt: to } },
      orderBy: { createdAt: 'desc' },
    }),
  )
}))

cashRouter.delete('/:id', handler(async (req, res) => {
  await prisma.cashMovement.delete({ where: { id: req.params.id } })
  res.status(204).end()
}))
