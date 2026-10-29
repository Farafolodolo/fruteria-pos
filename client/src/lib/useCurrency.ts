import { useState, useEffect, useCallback } from 'react'
import { fetchUsdMxnRate, convertCurrency, type RateInfo } from './currencyApi'

export function useCurrency(totalMxn: number, currency: 'MXN' | 'USD') {
  const [rateInfo, setRateInfo] = useState<RateInfo | null>(null)
  const [usdTotal, setUsdTotal] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadUsdTotal = useCallback(async () => {
    if (totalMxn <= 0) {
      setUsdTotal(0)
      return
    }

    setLoading(true)
    setError(null)
    try {
      // 1. Consultar endpoint de conversión del microservicio
      const conversion = await convertCurrency(totalMxn, 'MXN', 'USD')
      setUsdTotal(conversion.result)

      // 2. Consultar / sincronizar tipo de cambio actual y fuente
      const rateData = await fetchUsdMxnRate()
      setRateInfo(rateData)
    } catch (err: any) {
      console.error('[useCurrency] Error al conectar con microservicio de divisas:', err)
      setError(
        err?.message ||
          'No se pudo conectar con el microservicio de divisas (puerto 3002). Verifica que esté encendido.'
      )
    } finally {
      setLoading(false)
    }
  }, [totalMxn])

  useEffect(() => {
    if (currency === 'USD') {
      loadUsdTotal()
    } else {
      setError(null)
    }
  }, [currency, loadUsdTotal])

  return {
    rateInfo,
    rate: rateInfo?.rate ?? (usdTotal > 0 ? Number((totalMxn / usdTotal).toFixed(2)) : 20.0),
    usdTotal,
    loading,
    error,
    reload: loadUsdTotal,
  }
}
