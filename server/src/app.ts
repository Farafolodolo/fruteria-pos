import express from 'express'
import cors from 'cors'
import { errorMiddleware } from './lib/http'
import { productsRouter } from './routes/products'
import { salesRouter } from './routes/sales'

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }))
  app.use('/api/products', productsRouter)
  app.use('/api/sales', salesRouter)

  app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }))
  app.use(errorMiddleware)
  return app
}
