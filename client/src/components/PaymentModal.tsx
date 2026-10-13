import { useEffect, useState } from 'react'
import { Banknote, CreditCard, Delete, Landmark, Loader2, Phone } from 'lucide-react'
import { Modal } from './Modal'
import { fmtMoney, fromCents, toCents } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { PaymentMethod } from '@/lib/types'

interface Props {
  open: boolean
  total: number
  busy: boolean
  error: string | null
  onClose: () => void
  onConfirm: (p: { method: PaymentMethod; amountPaid: number; phone: string }) => void
}

const METHODS: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: 'CASH', label: 'Efectivo', icon: Banknote },
  { id: 'CARD', label: 'Tarjeta', icon: CreditCard },
  { id: 'TRANSFER', label: 'Transferencia', icon: Landmark },
]
const BILLS = [50, 100, 200, 500]
const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'del']

export function PaymentModal({ open, total, busy, error, onClose, onConfirm }: Props) {
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [buffer, setBuffer] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    if (open) { setMethod('CASH'); setBuffer(''); setPhone('') }
  }, [open])

  const press = (k: string) =>
    setBuffer((b) => {
      if (k === 'del') return b.slice(0, -1)
      if (k === '.') return b.includes('.') ? b : (b || '0') + '.'
      if (/\.\d{2}$/.test(b) || b.length >= 8) return b
      return b === '0' ? k : b + k
    })

  const received = method === 'CASH' ? parseFloat(buffer) || 0 : total
  const change = fromCents(toCents(received) - toCents(total))
  const ok = method !== 'CASH' || toCents(received) >= toCents(total)

  const submit = () => ok && !busy && onConfirm({ method, amountPaid: received, phone: phone.replace(/\D/g, '') })

  // Teclado físico: dígitos, punto, Backspace (efectivo) y Enter (cobrar)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      const isInput = (e.target as HTMLElement)?.tagName === 'INPUT'
      if (e.key === 'Enter' && !isInput) {
        e.preventDefault()
        submit()
        return
      }
      if (isInput || method !== 'CASH') return
      if (/^[0-9.]$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('del')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <Modal open={open} onClose={onClose} title="Cobrar" className="max-w-2xl">
      <form onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-4">
        <div className="flex items-end justify-between rounded-2xl bg-ink p-4">
          <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">Total a pagar</span>
          <span className="num text-5xl font-extrabold text-leaf">{fmtMoney(total)}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {METHODS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setMethod(id)}
              className={cn('flex items-center justify-center gap-2 rounded-xl py-3 font-bold transition',
                method === id ? 'bg-leaf text-black' : 'bg-panel-2 text-slate-300 hover:bg-line')}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>

        {method === 'CASH' ? (
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-3">
              <div className="rounded-2xl bg-ink p-4">
                <p className="text-xs text-slate-500">Recibido</p>
                <p className="num text-4xl font-bold">{buffer ? `$${buffer}` : '$0'}</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {BILLS.map((b) => (
                  <button key={b} type="button" onClick={() => setBuffer(String(b))}
                    className="num rounded-xl bg-emerald-500/15 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/30 active:scale-95">${b}</button>
                ))}
                <button type="button" onClick={() => setBuffer(total.toFixed(2).replace(/\.00$/, ''))}
                  className="rounded-xl bg-mango/20 py-3 text-xs font-bold text-mango hover:bg-mango/30 active:scale-95">Exacto</button>
              </div>
              <div className={cn('rounded-2xl p-4 text-center', ok ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
                <p className="text-xs uppercase tracking-wider text-slate-400">{ok ? 'Cambio' : 'Falta'}</p>
                <p className={cn('num text-5xl font-extrabold', ok ? 'text-leaf' : 'text-red-400')}>{fmtMoney(Math.abs(change))}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 self-start">
              {KEYS.map((k) => (
                <button key={k} type="button" aria-label={k === 'del' ? 'Borrar' : k} onClick={() => press(k)}
                  className="num grid h-14 w-16 place-items-center rounded-xl bg-panel-2 text-xl font-bold hover:bg-line active:scale-95">
                  {k === 'del' ? <Delete size={20} /> : k}
                </button>
              ))}
              <button type="button" onClick={() => setBuffer('')}
                className="col-span-3 h-11 rounded-xl bg-panel-2 text-sm font-semibold text-slate-400 hover:bg-line">Limpiar</button>
            </div>
          </div>
        ) : (
          <p className="rounded-2xl bg-panel-2 p-4 text-center text-slate-300">
            Cobro exacto de <b className="num text-leaf">{fmtMoney(total)}</b> por {method === 'CARD' ? 'terminal bancaria' : 'transferencia'}.
          </p>
        )}

        <label className="flex items-center gap-3 rounded-xl border border-line bg-ink px-4 py-3">
          <Phone size={18} className="text-slate-500" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel"
            placeholder="WhatsApp del cliente (10 dígitos, opcional)"
            className="num w-full bg-transparent text-sm outline-none placeholder:text-slate-600" />
        </label>

        {error && <p role="alert" className="rounded-xl bg-red-500/15 p-3 text-sm text-red-300">{error}</p>}

        <button type="submit" disabled={!ok || busy}
          className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-xl font-extrabold text-black transition hover:brightness-110 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-30">
          {busy ? <Loader2 className="animate-spin" /> : 'Confirmar cobro (Enter)'}
        </button>
      </form>
    </Modal>
  )
}
