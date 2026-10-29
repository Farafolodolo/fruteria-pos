import type { Request, Response, NextFunction } from 'express'
import { config } from '../config'

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || (req.headers['authorization'] as string | undefined)
  const apiKeyHeader = req.headers['x-api-key'] as string | undefined

  let token: string | undefined

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim()
  } else if (typeof apiKeyHeader === 'string') {
    token = apiKeyHeader.trim()
  }

  if (!token || token !== config.adminToken) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing token',
    })
    return
  }

  next()
}

