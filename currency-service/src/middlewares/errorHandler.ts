import type { Request, Response, NextFunction } from 'express'
import { HttpError } from '../errors/HttpError'

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      error: err.errorName,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    })
    return
  }

  // Registro interno de errores para observabilidad del servidor
  console.error('[CurrencyService Internal Error]:', err)

  // Respuesta al cliente segura sin filtrar stack traces
  res.status(500).json({
    error: 'InternalServerError',
    message: 'Something went wrong',
  })
}
