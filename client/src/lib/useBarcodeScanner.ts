import { useEffect, useRef } from 'react'

interface Options {
  onScan: (code: string) => void
  /** Tiempo máximo entre teclas para considerarlas de un lector (ms) */
  maxGap?: number
  minLength?: number
  enabled?: boolean
}

const isEditable = (el: EventTarget | null) => {
  const t = el as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}

/**
 * Detecta lectores de código de barras tipo "keyboard wedge": teclean el código muy rápido
 * (< ~35 ms entre caracteres) y terminan con Enter. Distingue de la escritura humana por la
 * velocidad, así funciona aunque el foco no esté en el buscador. Si el foco está en un input
 * el propio input recibe los caracteres (el buscador ya maneja Enter).
 */
export function useBarcodeScanner({ onScan, maxGap = 35, minLength = 4, enabled = true }: Options) {
  const cb = useRef(onScan)
  cb.current = onScan

  useEffect(() => {
    if (!enabled) return
    let buffer = ''
    let last = 0
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const now = performance.now()
      if (now - last > maxGap) buffer = ''
      last = now

      if (e.key === 'Enter') {
        if (buffer.length >= minLength && !isEditable(e.target)) {
          e.preventDefault()
          cb.current(buffer)
        }
        buffer = ''
        return
      }
      if (e.key.length === 1) buffer += e.key
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [enabled, maxGap, minLength])
}
