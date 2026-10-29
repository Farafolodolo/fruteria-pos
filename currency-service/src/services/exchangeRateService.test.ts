import test from 'node:test'
import assert from 'node:assert/strict'
import { exchangeRateService } from './exchangeRateService'

test('ExchangeRateService: Establecer tasa manual fija (override)', async () => {
  exchangeRateService.setManualOverride(20.0)
  const rateInfo = await exchangeRateService.getUsdMxnRate()

  assert.equal(rateInfo.rate, 20.0)
  assert.equal(rateInfo.from, 'USD')
  assert.equal(rateInfo.to, 'MXN')
  assert.equal(rateInfo.source, 'manual_override')
  assert.ok(rateInfo.lastUpdated)
})

test('ExchangeRateService: Convertir MXN a USD con tasa manual de 20.00', async () => {
  exchangeRateService.setManualOverride(20.0)
  const result = await exchangeRateService.convert(100, 'MXN', 'USD')

  assert.equal(result.originalAmount, 100)
  assert.equal(result.from, 'MXN')
  assert.equal(result.to, 'USD')
  assert.equal(result.rate, 0.05) // 1 / 20 = 0.05
  assert.equal(result.result, 5.0) // 100 * 0.05 = 5.00
})

test('ExchangeRateService: Convertir USD a MXN con tasa manual de 20.00', async () => {
  exchangeRateService.setManualOverride(20.0)
  const result = await exchangeRateService.convert(25, 'USD', 'MXN')

  assert.equal(result.originalAmount, 25)
  assert.equal(result.from, 'USD')
  assert.equal(result.to, 'MXN')
  assert.equal(result.rate, 20.0)
  assert.equal(result.result, 500.0)
})

test('ExchangeRateService: Convertir misma moneda retorna monto idéntico', async () => {
  const result = await exchangeRateService.convert(50, 'USD', 'USD')

  assert.equal(result.originalAmount, 50)
  assert.equal(result.from, 'USD')
  assert.equal(result.to, 'USD')
  assert.equal(result.rate, 1)
  assert.equal(result.result, 50)
})

test('ExchangeRateService: Limpiar override restablece manualRate a null', () => {
  exchangeRateService.clearManualOverride()
  const info = exchangeRateService.getManualOverride()
  assert.equal(info.manualRate, null)
  assert.equal(info.updatedAt, null)
})

