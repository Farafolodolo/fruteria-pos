import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Banknote,
  CreditCard,
  Delete,
  Landmark,
  Loader2,
  Phone,
  RefreshCw,
} from 'lucide-react'
import { Modal } from './Modal'
import { fmtMoney, fromCents, toCents } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { PaymentMethod } from '@/lib/types'
import { useCurrency } from '@/lib/useCurrency'

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

const MXN_BILLS = [50, 100, 200, 500]
const USD_BILLS = [1, 5, 10, 20, 50, 100]
const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'del']

export function PaymentModal({ open, total, busy, error, onClose, onConfirm }: Props) {
  const [currency, setCurrency] = useState<'MXN' | 'USD'>('MXN')
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [buffer, setBuffer] = useState('')
  const [phone, setPhone] = useState('')

  const {
    rate,
    rateInfo,
    usdTotal,
    loading: currencyLoading,
    error: currencyError,
    reload,
  } = useCurrency(total, currency)

  useEffect(() => {
    if (open) {
      setMethod('CASH')
      setBuffer('')
      setPhone('')
      setCurrency('MXN')
    }
  }, [open])

  const press = (k: string) =>
    setBuffer((b) => {
      if (k === 'del') return b.slice(0, -1)
      if (k === '.') return b.includes('.') ? b : (b || '0') + '.'
      if (/\.\d{2}$/.test(b) || b.length >= 8) return b
      return b === '0' ? k : b + k
    })

  // Cálculos en la divisa activa
  const isUsd = currency === 'USD'
  const activeBills = isUsd ? USD_BILLS : MXN_BILLS
  const activeTotal = isUsd ? usdTotal : total

  // Monto recibido ingresado por el cajero
  const rawReceived = method === 'CASH' ? parseFloat(buffer) || 0 : activeTotal

  // Cálculos de cambio y validación de cobro suficiente
  let ok = false
  let change = 0
  let equivalentMxnChange = 0

  if (isUsd) {
    // Modo USD: validamos contra activeTotal en USD
    ok = !currencyLoading && !currencyError && (method !== 'CASH' || rawReceived >= activeTotal)
    change = Number((rawReceived - activeTotal).toFixed(2))
    equivalentMxnChange = Number((change * rate).toFixed(2))
  } else {
    // Modo MXN (nacional): enteros en centavos
    ok = method !== 'CASH' || toCents(rawReceived) >= toCents(total)
    change = fromCents(toCents(rawReceived) - toCents(total))
  }

  const submit = () => {
    if (!ok || busy || currencyLoading || (isUsd && currencyError)) return

    // Si se cobra en USD, convertimos el pago al equivalente en MXN para que el backend
    // registre la venta correctamente y no rechace la operación (amountPaid >= total)
    let amountPaidInMxn = rawReceived
    if (isUsd) {
      amountPaidInMxn =
        method === 'CASH'
          ? fromCents(Math.round(rawReceived * rate * 100))
          : total
    }

    onConfirm({
      method,
      amountPaid: amountPaidInMxn,
      phone: phone.replace(/\D/g, ''),
    })
  }

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
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="space-y-4">
        {/* Selector de Divisa */}
        <div className="flex items-center justify-between rounded-xl bg-panel-2 px-3 py-2 border border-line">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Moneda de cobro:
          </span>
          <div className="flex items-center gap-1 rounded-lg bg-ink p-1">
            <button
              type="button"
              onClick={() => {
                setCurrency('MXN')
                setBuffer('')
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition',
                currency === 'MXN'
                  ? 'bg-leaf text-black shadow'
                  : 'text-slate-400 hover:text-white'
              )}>
              🇲🇽 MXN
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrency('USD')
                setBuffer('')
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition',
                currency === 'USD'
                  ? 'bg-emerald-400 text-black shadow'
                  : 'text-slate-400 hover:text-white'
              )}>
              💵 USD
            </button>
          </div>
        </div>

        {/* Tarjeta de Total a Pagar */}
        <div className="rounded-2xl bg-ink p-4 space-y-2">
          <div className="flex items-end justify-between">
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Total a pagar {isUsd ? '(USD)' : ''}
            </span>
            {isUsd && currencyLoading ? (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 size={24} className="animate-spin text-emerald-400" />
                <span className="text-base font-semibold">Cotizando divisa...</span>
              </div>
            ) : isUsd ? (
              <div className="text-right">
                <span className="num text-5xl font-extrabold text-leaf">
                  ${usdTotal.toFixed(2)}
                </span>
                <span className="ml-2 text-xl font-bold text-slate-400">USD</span>
              </div>
            ) : (
              <span className="num text-5xl font-extrabold text-leaf">
                {fmtMoney(total)}
              </span>
            )}
          </div>

          {/* Subtítulo informativo en modo USD */}
          {isUsd && !currencyLoading && !currencyError && (
            <div className="flex flex-wrap items-center justify-between border-t border-line/50 pt-2 text-xs text-slate-400">
              <span>
                Equivalente original: <b className="text-slate-200">{fmtMoney(total)} MXN</b>
              </span>
              <span className="flex items-center gap-1.5">
                T.C: <b className="text-emerald-300">1 USD = ${rate.toFixed(2)} MXN</b>
                {rateInfo?.source === 'manual_override' && (
                  <span className="rounded bg-mango/25 px-1.5 py-0.5 text-[10px] font-extrabold text-mango">
                    TASA MANUAL
                  </span>
                )}
                {rateInfo?.source === 'cache' && (
                  <span className="rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] text-slate-300">
                    CACHÉ
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Alerta de Error en Microservicio de Divisas */}
        {isUsd && currencyError && (
          <div className="flex items-center justify-between rounded-xl border border-red-500/40 bg-red-500/15 p-3 text-sm text-red-200">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="shrink-0 text-red-400" />
              <span>{currencyError}</span>
            </div>
            <div className="flex shrink-0 gap-2 ml-2">
              <button
                type="button"
                onClick={() => reload()}
                className="flex items-center gap-1 rounded-lg bg-red-500/30 px-2.5 py-1 text-xs font-bold text-red-200 hover:bg-red-500/50">
                <RefreshCw size={12} /> Reintentar
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrency('MXN')
                  setBuffer('')
                }}
                className="rounded-lg bg-panel-2 px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-line">
                Cobrar en MXN
              </button>
            </div>
          </div>
        )}

        {/* Métodos de Pago */}
        <div className="grid grid-cols-3 gap-2">
          {METHODS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMethod(id)}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl py-3 font-bold transition',
                method === id
                  ? 'bg-leaf text-black'
                  : 'bg-panel-2 text-slate-300 hover:bg-line'
              )}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>

        {/* Interfaz de Efectivo */}
        {method === 'CASH' ? (
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-3">
              <div className="rounded-2xl bg-ink p-4">
                <p className="text-xs text-slate-500">
                  Recibido {isUsd ? '(USD)' : '(MXN)'}
                </p>
                <p className="num text-4xl font-bold">
                  {buffer ? `$${buffer} ${isUsd ? 'USD' : ''}` : `$0 ${isUsd ? 'USD' : ''}`}
                </p>
              </div>

              {/* Botones de Billetes Rápidos */}
              <div
                className={cn(
                  'grid gap-2',
                  isUsd ? 'grid-cols-7' : 'grid-cols-5'
                )}>
                {activeBills.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBuffer(String(b))}
                    className="num rounded-xl bg-emerald-500/15 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/30 active:scale-95">
                    ${b}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setBuffer(
                      isUsd
                        ? activeTotal.toFixed(2)
                        : total.toFixed(2).replace(/\.00$/, '')
                    )
                  }
                  className="rounded-xl bg-mango/20 py-3 text-xs font-bold text-mango hover:bg-mango/30 active:scale-95">
                  Exacto
                </button>
              </div>

              {/* Tarjeta de Cambio o Falta */}
              <div
                className={cn(
                  'rounded-2xl p-4 text-center',
                  ok ? 'bg-emerald-500/10' : 'bg-red-500/10'
                )}>
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  {ok ? 'Cambio' : 'Falta'}
                </p>
                <p
                  className={cn(
                    'num text-5xl font-extrabold',
                    ok ? 'text-leaf' : 'text-red-400'
                  )}>
                  {isUsd
                    ? `$${Math.abs(change).toFixed(2)} USD`
                    : fmtMoney(Math.abs(change))}
                </p>
                {isUsd && ok && change > 0 && (
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    ≈ {fmtMoney(equivalentMxnChange)} MXN de cambio equivalente
                  </p>
                )}
              </div>
            </div>

            {/* Teclado Numérico */}
            <div className="grid grid-cols-3 gap-2 self-start">
              {KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-label={k === 'del' ? 'Borrar' : k}
                  onClick={() => press(k)}
                  className="num grid h-14 w-16 place-items-center rounded-xl bg-panel-2 text-xl font-bold hover:bg-line active:scale-95">
                  {k === 'del' ? <Delete size={20} /> : k}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setBuffer('')}
                className="col-span-3 h-11 rounded-xl bg-panel-2 text-sm font-semibold text-slate-400 hover:bg-line">
                Limpiar
              </button>
            </div>
          </div>
        ) : (
          <p className="rounded-2xl bg-panel-2 p-4 text-center text-slate-300">
            Cobro exacto de{' '}
            <b className="num text-leaf">
              {isUsd ? `$${usdTotal.toFixed(2)} USD` : fmtMoney(total)}
            </b>{' '}
            por {method === 'CARD' ? 'terminal bancaria' : 'transferencia'}.
            {isUsd && (
              <span className="block text-xs text-slate-400 mt-1">
                (Equivalente a {fmtMoney(total)} MXN a T.C. ${rate.toFixed(2)})
              </span>
            )}
          </p>
        )}

        {/* WhatsApp para Ticket Digital */}
        <label className="flex items-center gap-3 rounded-xl border border-line bg-ink px-4 py-3">
          <Phone size={18} className="text-slate-500" />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="WhatsApp del cliente (10 dígitos, opcional)"
            className="num w-full bg-transparent text-sm outline-none placeholder:text-slate-600"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-red-500/15 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {/* Botón de Confirmar Cobro */}
        <button
          type="submit"
          disabled={!ok || busy || currencyLoading || (isUsd && Boolean(currencyError))}
          className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-xl font-extrabold text-black transition hover:brightness-110 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-30">
          {busy || currencyLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            'Confirmar cobro (Enter)'
          )}
        </button>
      </form>
    </Modal>
  )
}
