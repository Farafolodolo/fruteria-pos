/**
 * Capa de abstracción de báscula digital.
 *
 *  - Modo SERIAL: Web Serial API (Chrome/Edge) para básculas Torrey / Rhino por USB-RS232.
 *  - Modo EMULADOR: báscula simulada con ruido y estabilización, para pruebas sin hardware.
 *
 * El estado vive en un store externo (useSyncExternalStore) para no re-renderizar toda la app
 * a cada lectura (~8 Hz).
 */
import { useSyncExternalStore } from 'react'

export type ScaleMode = 'emulator' | 'serial'

export interface ScaleState {
  mode: ScaleMode
  connected: boolean
  kg: number
  stable: boolean
  baud: number
  error: string | null
  serialSupported: boolean
}

/**
 * Extrae el peso (kg) de una trama de báscula. Soporta formatos habituales:
 *   "  1.350 kg", "ST,GS,+001.350kg", "W 01.350", "0350 g", "2.5 lb", "1,350"
 * Devuelve null si la trama no contiene un número.
 */
export function parseScaleFrame(frame: string): number | null {
  const m = frame.match(/([-+]?\d+(?:[.,]\d+)?)\s*(kg|g|lb)?/i)
  if (!m) return null
  const value = parseFloat(m[1].replace(',', '.'))
  if (!Number.isFinite(value)) return null
  const unit = m[2]?.toLowerCase()
  const kg = unit === 'g' ? value / 1000 : unit === 'lb' ? value * 0.45359237 : value
  return Math.max(0, Math.round(kg * 1000) / 1000)
}

let state: ScaleState = {
  mode: 'emulator',
  connected: false,
  kg: 0,
  stable: true,
  baud: 9600,
  error: null,
  serialSupported: typeof navigator !== 'undefined' && 'serial' in navigator,
}
const listeners = new Set<() => void>()
const set = (p: Partial<ScaleState>) => {
  state = { ...state, ...p }
  listeners.forEach((l) => l())
}

// ---------------- Emulador ----------------
let emuTarget = 0
let emuTimer: ReturnType<typeof setInterval> | null = null
let emuStableTicks = 0

function emuTick() {
  const diff = emuTarget - state.kg
  if (Math.abs(diff) < 0.004) {
    emuStableTicks++
    if (emuStableTicks >= 4) {
      set({ kg: emuTarget, stable: true })
      if (emuTimer) clearInterval(emuTimer)
      emuTimer = null
      return
    }
  } else emuStableTicks = 0
  // Converge con "oscilación" de plato como una báscula real
  const jitter = Math.abs(diff) > 0.01 ? (Math.random() - 0.5) * Math.min(0.06, Math.abs(diff)) : 0
  const next = Math.max(0, state.kg + diff * 0.38 + jitter)
  set({ kg: Math.round(next * 1000) / 1000, stable: false })
}

export function setEmulatorWeight(kg: number) {
  if (state.mode !== 'emulator') return
  emuTarget = Math.max(0, Math.round(kg * 1000) / 1000)
  emuStableTicks = 0
  set({ stable: false })
  emuTimer ??= setInterval(emuTick, 110)
}

// ---------------- Serial ----------------
let port: SerialPort | null = null
let reading = false
let history: number[] = []

async function readLoop(p: SerialPort) {
  const decoder = new TextDecoder()
  let buf = ''
  reading = true
  try {
    while (reading && p.readable) {
      const reader = p.readable.getReader()
      try {
        while (reading) {
          const { value, done } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const frames = buf.split(/[\r\n\x03\x02]+/)
          buf = frames.pop() ?? ''
          for (const f of frames) {
            const kg = parseScaleFrame(f)
            if (kg === null) continue
            history = [...history.slice(-2), kg]
            const stable = history.length >= 3 && history.every((h) => h === history[0]) && !/\bUS\b/.test(f)
            set({ kg, stable })
          }
        }
      } finally {
        reader.releaseLock()
      }
    }
  } catch (e) {
    set({ error: e instanceof Error ? e.message : 'Error de lectura serial' })
  } finally {
    if (reading) await disconnectScale()
  }
}

export async function connectScale(baud = state.baud) {
  if (!state.serialSupported) {
    set({ error: 'Web Serial no disponible. Usa Chrome o Edge (HTTPS/localhost).' })
    return
  }
  try {
    const p = await navigator.serial.requestPort()
    await p.open({ baudRate: baud, dataBits: 8, stopBits: 1, parity: 'none' })
    port = p
    history = []
    if (emuTimer) clearInterval(emuTimer)
    emuTimer = null
    set({ mode: 'serial', connected: true, baud, error: null, kg: 0, stable: false })
    void readLoop(p)
  } catch (e) {
    if ((e as DOMException)?.name !== 'NotFoundError') {
      set({ error: e instanceof Error ? e.message : 'No se pudo abrir el puerto' })
    }
  }
}

export async function disconnectScale() {
  reading = false
  try { await port?.close() } catch { /* ya cerrado */ }
  port = null
  emuTarget = 0
  set({ mode: 'emulator', connected: false, kg: 0, stable: true })
}

export const setScaleBaud = (baud: number) => set({ baud })

export function useScale(): ScaleState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}
