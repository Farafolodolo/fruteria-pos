import { config } from '../config'
import { ExternalApiError } from '../errors/HttpError'

export interface RateResponse {
  from: 'USD'
  to: 'MXN'
  rate: number
  lastUpdated: string
  source: 'api' | 'cache' | 'manual_override'
}

export interface ConvertResponse {
  originalAmount: number
  from: 'MXN' | 'USD'
  to: 'MXN' | 'USD'
  rate: number
  result: number
}

interface RateCache {
  rate: number
  lastUpdated: string
  timestamp: number
}

export class ExchangeRateService {
  private cache: RateCache | null = null
  private manualRate: number | null = null
  private manualRateUpdatedAt: string | null = null

  public setManualOverride(rate: number): void {
    this.manualRate = rate
    this.manualRateUpdatedAt = new Date().toISOString()
  }

  public clearManualOverride(): void {
    this.manualRate = null
    this.manualRateUpdatedAt = null
  }

  public getManualOverride(): { manualRate: number | null; updatedAt: string | null } {
    return {
      manualRate: this.manualRate,
      updatedAt: this.manualRateUpdatedAt,
    }
  }

  public async getUsdMxnRate(): Promise<RateResponse> {
    // 1. Si existe una tasa manual activa (modo de contingencia offline)
    if (this.manualRate !== null) {
      return {
        from: 'USD',
        to: 'MXN',
        rate: this.manualRate,
        lastUpdated: this.manualRateUpdatedAt || new Date().toISOString(),
        source: 'manual_override',
      }
    }

    // 2. Si existe tasa válida en caché (10 minutos)
    const now = Date.now()
    if (this.cache && now - this.cache.timestamp < config.cacheTtlMs) {
      return {
        from: 'USD',
        to: 'MXN',
        rate: this.cache.rate,
        lastUpdated: this.cache.lastUpdated,
        source: 'cache',
      }
    }

    // 3. Consulta a la API externa con fallback automático y manejo de errores 502
    try {
      const primaryUrl = config.exchangeApiKey
        ? `https://v6.exchangerate-api.com/v6/${config.exchangeApiKey}/latest/USD`
        : `https://open.er-api.com/v6/latest/USD`

      let fetchedRate: number | null = null
      let fetchedLastUpdated = new Date().toISOString()

      try {
        const response = await fetch(primaryUrl, { signal: AbortSignal.timeout(6000) })
        if (response.ok) {
          const data = (await response.json()) as any
          const rate = data.conversion_rates?.MXN ?? data.rates?.MXN
          if (typeof rate === 'number' && rate > 0) {
            fetchedRate = rate
            fetchedLastUpdated = data.time_last_update_utc || data.time_last_update_iso || new Date().toISOString()
          }
        }
      } catch (err) {
        console.warn('[ExchangeRateService] Error al consultar API principal:', err)
      }

      // Si la API con clave falló o no devolvió tasa válida, intentar fallback a open.er-api.com
      if (fetchedRate === null && config.exchangeApiKey) {
        try {
          const fallbackUrl = 'https://open.er-api.com/v6/latest/USD'
          const fallbackRes = await fetch(fallbackUrl, { signal: AbortSignal.timeout(6000) })
          if (fallbackRes.ok) {
            const fbData = (await fallbackRes.json()) as any
            const rate = fbData.rates?.MXN ?? fbData.conversion_rates?.MXN
            if (typeof rate === 'number' && rate > 0) {
              fetchedRate = rate
              fetchedLastUpdated = fbData.time_last_update_utc || new Date().toISOString()
            }
          }
        } catch (fbErr) {
          console.warn('[ExchangeRateService] Error en fallback de open.er-api:', fbErr)
        }
      }

      if (fetchedRate === null) {
        throw new ExternalApiError('Failed to fetch exchange rates')
      }

      // Guardar en caché en memoria
      this.cache = {
        rate: fetchedRate,
        lastUpdated: fetchedLastUpdated,
        timestamp: now,
      }

      return {
        from: 'USD',
        to: 'MXN',
        rate: fetchedRate,
        lastUpdated: fetchedLastUpdated,
        source: 'api',
      }
    } catch (error) {
      if (error instanceof ExternalApiError) {
        throw error
      }
      throw new ExternalApiError('Failed to fetch exchange rates')
    }
  }

  public async convert(
    amount: number,
    from: 'MXN' | 'USD',
    to: 'MXN' | 'USD'
  ): Promise<ConvertResponse> {
    if (from === to) {
      return {
        originalAmount: amount,
        from,
        to,
        rate: 1,
        result: Math.round(amount * 100) / 100,
      }
    }

    const { rate: usdMxnRate } = await this.getUsdMxnRate()

    let rate: number
    let result: number

    if (from === 'USD' && to === 'MXN') {
      // 1 USD = usdMxnRate MXN
      rate = usdMxnRate
      result = Math.round(amount * usdMxnRate * 100) / 100
    } else {
      // 1 MXN = (1 / usdMxnRate) USD
      // Mostramos tasa con hasta 4 o 6 decimales según convención de divisas
      rate = Math.round((1 / usdMxnRate) * 10000) / 10000
      result = Math.round((amount / usdMxnRate) * 100) / 100
    }

    return {
      originalAmount: amount,
      from,
      to,
      rate,
      result,
    }
  }
}

export const exchangeRateService = new ExchangeRateService()

