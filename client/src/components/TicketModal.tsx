import { MessageCircle, Printer, Share2 } from 'lucide-react'
import { useState } from 'react'
import { Modal } from './Modal'
import type { TicketData } from '@/lib/types'
import { METHOD_LABEL, STORE, fmtQtyTicket, whatsappMessage, whatsappUrl } from '@/lib/ticket'
import { fmtMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

interface Props {
  ticket: TicketData | null
  onClose: () => void
  /** Slot para acciones extra (ej. impresión ESC/POS por USB) */
  extraActions?: (ticket: TicketData, width: 58 | 80) => React.ReactNode
}

export function TicketModal({ ticket, onClose, extraActions }: Props) {
  const [width, setWidth] = useState<58 | 80>(80)

  const share = async () => {
    if (!ticket) return
    try {
      await navigator.share({ title: `Ticket #${ticket.folio}`, text: whatsappMessage(ticket) })
    } catch { /* cancelado por el usuario */ }
  }

  return (
    <Modal open={!!ticket} onClose={onClose} title="✅ Venta registrada" className="max-w-3xl">
      {ticket && (
        <div className="grid gap-5 md:grid-cols-[auto_1fr]">
          <div className="flex justify-center rounded-2xl bg-ink p-4">
            <div
              className="print-area bg-white p-3 font-mono text-[11px] leading-snug text-black shadow-xl"
              style={{ width: width === 58 ? '58mm' : '80mm', maxWidth: '100%' }}
            >
              <div className="text-center">
                <p className="text-sm font-bold">{STORE.name}</p>
                <p>{STORE.address}</p>
                <p>{STORE.phone}</p>
              </div>
              <hr className="my-1 border-dashed border-black" />
              <p>Folio: {String(ticket.folio).padStart(5, '0')}</p>
              <p>{new Date(ticket.date).toLocaleString('es-MX')}</p>
              <hr className="my-1 border-dashed border-black" />
              {ticket.items.map((i, idx) => (
                <div key={idx} className="mb-1">
                  <p className="font-bold">{i.name}</p>
                  <div className="flex justify-between">
                    <span>{fmtQtyTicket(i)} x {fmtMoney(i.unitPrice)}</span>
                    <span>{fmtMoney(i.gross)}</span>
                  </div>
                  {i.discount > 0 && (
                    <div className="flex justify-between"><span>  Remate</span><span>-{fmtMoney(i.discount)}</span></div>
                  )}
                </div>
              ))}
              <hr className="my-1 border-dashed border-black" />
              <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(ticket.subtotal)}</span></div>
              {ticket.discount > 0 && <div className="flex justify-between"><span>Descuento</span><span>-{fmtMoney(ticket.discount)}</span></div>}
              <div className="flex justify-between text-sm font-bold"><span>TOTAL</span><span>{fmtMoney(ticket.total)}</span></div>
              <div className="flex justify-between"><span>{METHOD_LABEL[ticket.paymentMethod]}</span><span>{fmtMoney(ticket.amountPaid)}</span></div>
              <div className="flex justify-between"><span>Cambio</span><span>{fmtMoney(ticket.changeGiven)}</span></div>
              <hr className="my-1 border-dashed border-black" />
              <p className="text-center">{STORE.footer}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-2xl bg-panel-2 p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-slate-400">Total cobrado</p>
              <p className="num text-4xl font-extrabold text-leaf">{fmtMoney(ticket.total)}</p>
              {ticket.paymentMethod === 'CASH' && (
                <p className="num mt-1 text-lg text-mango">Cambio {fmtMoney(ticket.changeGiven)}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Ancho de papel">
              {([58, 80] as const).map((w) => (
                <button key={w} onClick={() => setWidth(w)}
                  className={cn('rounded-xl py-2 text-sm font-bold transition', width === w ? 'bg-leaf text-black' : 'bg-panel-2 text-slate-300 hover:bg-line')}>
                  Papel {w} mm
                </button>
              ))}
            </div>

            <button onClick={() => window.print()}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-panel-2 font-bold hover:bg-line">
              <Printer size={18} /> Imprimir ticket
            </button>
            {extraActions?.(ticket, width)}
            <a href={whatsappUrl(ticket)} target="_blank" rel="noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] font-bold text-black transition hover:brightness-110">
              <MessageCircle size={18} /> Enviar por WhatsApp
            </a>
            {typeof navigator.share === 'function' && (
              <button onClick={share} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-panel-2 text-sm font-semibold hover:bg-line">
                <Share2 size={16} /> Compartir…
              </button>
            )}
            <button onClick={onClose} autoFocus
              className="mt-auto h-14 rounded-2xl bg-leaf text-lg font-extrabold text-black hover:bg-emerald-400">
              Nueva venta (Enter)
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
