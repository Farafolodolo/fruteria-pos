import { Router } from 'express'
import { z } from 'zod'
import { handler } from '../lib/http'
import { buildCashCut } from '../lib/cashCut'

export const reportsRouter = Router()

// GET /api/reports/cut?type=X|Z&date=YYYY-MM-DD
reportsRouter.get('/cut', handler(async (req, res) => {
  const q = z
    .object({
      type: z.enum(['X', 'Z']).default('X'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
    .parse(req.query)
  res.json(await buildCashCut(q.type, q.date))
}))
