import test from 'node:test'
import assert from 'node:assert/strict'
import { requireAdminAuth } from './middlewares/auth'
import { config } from './config'

test('AuthMiddleware: Rechaza 401 si falta header de autenticación', () => {
  let statusReceived: number | undefined
  let jsonReceived: any

  const req = { headers: {} } as any
  const res = {
    status: (s: number) => {
      statusReceived = s
      return {
        json: (d: any) => {
          jsonReceived = d
        },
      }
    },
  } as any
  let nextCalled = false
  const next = () => {
    nextCalled = true
  }

  requireAdminAuth(req, res, next)

  assert.equal(nextCalled, false)
  assert.equal(statusReceived, 401)
  assert.equal(jsonReceived?.error, 'Unauthorized')
  assert.equal(jsonReceived?.message, 'Invalid or missing token')
})

test('AuthMiddleware: Rechaza 401 si el Bearer token es incorrecto', () => {
  let statusReceived: number | undefined
  let jsonReceived: any

  const req = { headers: { authorization: 'Bearer token-falso-xyz' } } as any
  const res = {
    status: (s: number) => {
      statusReceived = s
      return {
        json: (d: any) => {
          jsonReceived = d
        },
      }
    },
  } as any
  let nextCalled = false
  const next = () => {
    nextCalled = true
  }

  requireAdminAuth(req, res, next)

  assert.equal(nextCalled, false)
  assert.equal(statusReceived, 401)
  assert.equal(jsonReceived?.error, 'Unauthorized')
})

test('AuthMiddleware: Acepta Bearer token correcto y llama a next()', () => {
  const req = { headers: { authorization: `Bearer ${config.adminToken}` } } as any
  const res = {} as any
  let nextCalled = false
  const next = () => {
    nextCalled = true
  }

  requireAdminAuth(req, res, next)

  assert.equal(nextCalled, true)
})

test('AuthMiddleware: Acepta header x-api-key correcto y llama a next()', () => {
  const req = { headers: { 'x-api-key': config.adminToken } } as any
  const res = {} as any
  let nextCalled = false
  const next = () => {
    nextCalled = true
  }

  requireAdminAuth(req, res, next)

  assert.equal(nextCalled, true)
})
