import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { errorMiddleware } from './lib/http'
import { productsRouter } from './routes/products'
import { salesRouter } from './routes/sales'
import { wasteRouter } from './routes/waste'
import { cashRouter } from './routes/cash'
import { reportsRouter } from './routes/reports'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDistPath = path.resolve(__dirname, '../../client/dist')

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get('/api/health', (_req, res) =>
    res.json({ status: 'ok', ok: true, time: new Date().toISOString() }),
  )
  app.use('/api/products', productsRouter)
  app.use('/api/sales', salesRouter)
  app.use('/api/waste', wasteRouter)
  app.use('/api/cash', cashRouter)
  app.use('/api/reports', reportsRouter)

  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath))
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next()
      res.sendFile(path.join(clientDistPath, 'index.html'))
    })
  }

  app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }))
  app.use(errorMiddleware)
  return app
}
