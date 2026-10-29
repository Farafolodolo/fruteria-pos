import dotenv from 'dotenv'

dotenv.config()

export const config = {
  port: Number(process.env.PORT || 3002),
  exchangeApiKey: process.env.EXCHANGE_API_KEY?.trim() || '',
  adminToken: process.env.ADMIN_TOKEN?.trim() || 'fruteria-admin-secret-2026',
  cacheTtlMs: 10 * 60 * 1000, // 10 minutos de caché en memoria
}

