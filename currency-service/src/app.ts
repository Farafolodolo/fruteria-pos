import express from 'express'
import cors from 'cors'
import { ratesRouter } from './routes/rates'
import { convertRouter } from './routes/convert'
import { errorHandler } from './middlewares/errorHandler'

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json())

  // Health check
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'currency-service' })
  })

  // Endpoints principales
  app.use('/api/v1/rates', ratesRouter)
  app.use('/api/v1/convert', convertRouter)

  // Manejador 404
  app.use((_req, res) => {
    res.status(404).json({
      error: 'NotFound',
      message: 'Resource not found',
    })
  })

  // Middleware global de manejo de errores (oculta stack traces)
  app.use(errorHandler)

  return app
}

