import type { TicketData } from './types'
import { METHOD_LABEL, STORE, fmtQtyTicket } from './ticket'

/** Generador de comandos ESC/POS para impresoras térmicas de 58 mm (32 cols) y 80 mm (48 cols). */

const ESC = 0x1b
const GS = 0x1d
const LF = 0x0a

/** Mapa Unicode -> CP858 (Latin-1 + €) para acentos y ñ */
const CP858: Record<string, number> = {
  á: 0xa0, é: 0x82, í: 0xa1, ó: 0xa2, ú: 0xa3, ñ: 0xa4, Ñ: 0xa5, '¿': 0xa8, '¡': 0xad,
  ü: 0x81, Á: 0xb5, É: 0x90, Í: 0xd6, Ó: 0xe0, Ú: 0xe9, '€': 0xd5, '×': 0x78,
}

export const colsFor = (width: 58 | 80) => (width === 58 ? 32 : 48)

export function encode(text: string): number[] {
  const out: number[] = []
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    if (code < 0x80) out.push(code)
    else out.push(CP858[ch] ?? 0x3f) // '?'
  }
  return out
}

const money = (n: number) => `$${n.toFixed(2)}`

const pad2 = (left: string, right: string, cols: number) => {
  const space = Math.max(1, cols - left.length - right.length)
  return left + ' '.repeat(space) + right
}

export function buildEscPos(t: TicketData, width: 58 | 80 = 80): Uint8Array {
  const cols = colsFor(width)
  const bytes: number[] = []
  const raw = (...b: number[]) => bytes.push(...b)
  const line = (s = '') => { bytes.push(...encode(s), LF) }
  const rule = () => line('-'.repeat(cols))

  raw(ESC, 0x40) // init
  raw(ESC, 0x74, 19) // tabla de caracteres CP858

  raw(ESC, 0x61, 1) // centrar
  raw(ESC, 0x45, 1, GS, 0x21, 0x11) // negritas + doble tamaño
  line(STORE.name.slice(0, Math.floor(cols / 2)))
  raw(GS, 0x21, 0x00, ESC, 0x45, 0)
  line(STORE.address)
  line(STORE.phone)
  raw(ESC, 0x61, 0)
  rule()
  const d = new Date(t.date)
  line(pad2(`Folio: ${String(t.folio).padStart(5, '0')}`, d.toLocaleDateString('es-MX'), cols))
  line(pad2('Hora:', d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }), cols))
  rule()

  for (const i of t.items) {
    line(i.name.slice(0, cols))
    line(pad2(`  ${fmtQtyTicket(i)} x ${money(i.unitPrice)}`, money(i.gross), cols))
    if (i.discount > 0) line(pad2('  Remate', `-${money(i.discount)}`, cols))
  }

  rule()
  line(pad2('Subtotal', money(t.subtotal), cols))
  if (t.discount > 0) line(pad2('Descuento', `-${money(t.discount)}`, cols))
  raw(ESC, 0x45, 1, GS, 0x21, 0x01) // negritas + doble alto
  line(pad2('TOTAL', money(t.total), cols))
  raw(GS, 0x21, 0x00, ESC, 0x45, 0)
  line(pad2(METHOD_LABEL[t.paymentMethod], money(t.amountPaid), cols))
  line(pad2('Cambio', money(t.changeGiven), cols))
  rule()
  raw(ESC, 0x61, 1)
  line(STORE.footer)
  raw(ESC, 0x61, 0)
  raw(LF, LF, LF)
  raw(GS, 0x56, 0x42, 0x00) // corte parcial con avance
  return new Uint8Array(bytes)
}

/** Pulso para abrir el cajón de dinero (pin 2) */
export const openDrawerBytes = () => new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xfa])
