import { Router } from 'express'
import { z } from 'zod'
import { exchangeRateService } from '../services/exchangeRateService'
import { ValidationError } from '../errors/HttpError'

export const convertRouter = Router()

const convertSchema = z.object({
  amount: z.number().gt(0, { message: 'amount must be a number greater than 0' }),
  from: z.enum(['MXN', 'USD'], {
    message: "from currency must be either 'MXN' or 'USD'",
  }),
  to: z.enum(['MXN', 'USD'], {
    message: "to currency must be either 'MXN' or 'USD'",
  }),
})

// POST /api/v1/convert
convertRouter.post('/', async (req, res, next) => {
  try {
    const parseResult = convertSchema.safeParse(req.body)
    if (!parseResult.success) {
      throw new ValidationError(
        'Invalid conversion parameters',
        parseResult.error.issues
      )
    }

    const { amount, from, to } = parseResult.data
    const conversion = await exchangeRateService.convert(amount, from, to)

    res.status(200).json(conversion)
  } catch (error) {
    next(error)
  }
})

