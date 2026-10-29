import { Router } from 'express'
import { z } from 'zod'
import { exchangeRateService } from '../services/exchangeRateService'
import { requireAdminAuth } from '../middlewares/auth'
import { ValidationError } from '../errors/HttpError'

export const ratesRouter = Router()

const overrideSchema = z.object({
  manualRate: z.number().gt(0, { message: 'manualRate must be a number greater than 0' }),
})

// GET /api/v1/rates/usd-mxn
ratesRouter.get('/usd-mxn', async (_req, res, next) => {
  try {
    const rateData = await exchangeRateService.getUsdMxnRate()
    res.status(200).json(rateData)
  } catch (error) {
    next(error)
  }
})

// POST /api/v1/rates/override (Endpoint protegido)
ratesRouter.post('/override', requireAdminAuth, async (req, res, next) => {
  try {
    const parseResult = overrideSchema.safeParse(req.body)
    if (!parseResult.success) {
      throw new ValidationError(
        'manualRate must be a positive number',
        parseResult.error.issues
      )
    }

    const { manualRate } = parseResult.data
    exchangeRateService.setManualOverride(manualRate)

    res.status(200).json({
      message: 'Manual exchange rate set successfully',
      manualRate,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/v1/rates/override (Endpoint protegido para limpiar la tasa manual)
ratesRouter.delete('/override', requireAdminAuth, (_req, res) => {
  exchangeRateService.clearManualOverride()
  res.status(200).json({
    message: 'Manual override removed, returned to dynamic exchange rates',
  })
})

