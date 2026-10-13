import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { ZodError } from 'zod'

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

/** Express 4 no captura promesas rechazadas: este wrapper las envía al error handler. */
export const handler =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next)
  }

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Datos inválidos', details: err.flatten() })
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message })
  }
  const code = (err as { code?: string })?.code
  if (code === 'P2002') return res.status(409).json({ error: 'Valor duplicado (código de barras o PLU ya existe)' })
  if (code === 'P2025') return res.status(404).json({ error: 'Registro no encontrado' })
  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
}

/** Rango [inicio, fin) del día local. `date` en formato YYYY-MM-DD (por defecto hoy). */
export function dayRange(date?: string): { from: Date; to: Date } {
  const base = date ? new Date(`${date}T00:00:00`) : new Date()
  const from = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const to = new Date(from)
  to.setDate(to.getDate() + 1)
  return { from, to }
}
