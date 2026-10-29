export interface RateInfo {
  from: 'USD'
  to: 'MXN'
  rate: number
  lastUpdated: string
  source: 'api' | 'cache' | 'manual_override'
}

export interface ConvertResult {
  originalAmount: number
  from: 'MXN' | 'USD'
  to: 'MXN' | 'USD'
  rate: number
  result: number
}

const API_BASE = (import.meta.env.VITE_CURRENCY_API_URL as string | undefined) || 'http://localhost:3002'

export async function fetchUsdMxnRate(): Promise<RateInfo> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 4000)

  try {
    let res: Response
    try {
      res = await fetch(`${API_BASE}/api/v1/rates/usd-mxn`, {
        signal: controller.signal,
      })
    } catch {
      // Fallback automático por proxy de Vite si la llamada directa no responde
      res = await fetch('/currency-api/api/v1/rates/usd-mxn', {
        signal: controller.signal,
      })
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Error del microservicio: HTTP ${res.status}`)
    }

    return (await res.json()) as RateInfo
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function convertCurrency(
  amount: number,
  from: 'MXN' | 'USD',
  to: 'MXN' | 'USD'
): Promise<ConvertResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 4000)

  try {
    let res: Response
    const body = JSON.stringify({ amount, from, to })
    const headers = { 'Content-Type': 'application/json' }

    try {
      res = await fetch(`${API_BASE}/api/v1/convert`, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      })
    } catch {
      res = await fetch('/currency-api/api/v1/convert', {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      })
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Error al convertir divisa: HTTP ${res.status}`)
    }

    return (await res.json()) as ConvertResult
  } finally {
    clearTimeout(timeoutId)
  }
}

