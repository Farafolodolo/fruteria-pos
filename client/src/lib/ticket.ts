import type { PaymentMethod, TicketData } from './types'
import { fmtMoney } from './money'

export const STORE = {
  name: 'Frutería La Fresca',
  address: 'Av. Principal #123, Centro',
  phone: 'Tel. 614 000 0000',
  footer: '¡Gracias por su compra!',
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
}

export const fmtQtyTicket = (i: TicketData['items'][number]) =>
  i.unit === 'kg' ? `${i.quantity.toFixed(3)} kg` : `${i.quantity} pz`

/** Mensaje de WhatsApp con emojis y detalle de compra */
export function whatsappMessage(t: TicketData): string {
  const d = new Date(t.date)
  const lines = [
    `🍎 *${STORE.name}*`,
    `🧾 Ticket #${String(t.folio).padStart(5, '0')}`,
    `📅 ${d.toLocaleDateString('es-MX')} ${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
    '',
    ...t.items.map((i) => {
      const net = i.gross - i.discount
      const detail = `${fmtQtyTicket(i)} × ${fmtMoney(i.unitPrice)}/${i.unit}`
      return `▪️ ${i.name}\n    ${detail} = *${fmtMoney(net)}*${i.discount > 0 ? ' 🏷️ remate' : ''}`
    }),
    '',
    `💰 Subtotal: ${fmtMoney(t.subtotal)}`,
    ...(t.discount > 0 ? [`🏷️ Descuento: -${fmtMoney(t.discount)}`] : []),
    `✅ *TOTAL: ${fmtMoney(t.total)}*`,
    `💳 ${METHOD_LABEL[t.paymentMethod]}${t.paymentMethod === 'CASH' ? ` · Recibido ${fmtMoney(t.amountPaid)} · Cambio ${fmtMoney(t.changeGiven)}` : ''}`,
    '',
    `🙏 ${STORE.footer}`,
  ]
  return lines.join('\n')
}

/** wa.me con código de país México por defecto cuando son 10 dígitos */
export function whatsappUrl(t: TicketData): string {
  let phone = (t.customerPhone ?? '').replace(/\D/g, '')
  if (phone.length === 10) phone = `52${phone}`
  const text = encodeURIComponent(whatsappMessage(t))
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`
}
