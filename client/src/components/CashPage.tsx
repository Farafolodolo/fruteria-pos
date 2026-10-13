import { useCallback, useEffect, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Banknote, Loader2, Printer, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { fmtMoney } from '@/lib/money'
import { STORE } from '@/lib/ticket'
import { cn } from '@/lib/utils'
import { sound } from '@/lib/sound'

interface Movement {
  id: string
  type: 'INFLOW' | 'OUTFLOW'
  amount: number
  category: string
  note: string
  createdAt: string
}

interface Cut {
  type: 'X' | 'Z'
  date: string
  generatedAt: string
  sales: {
    count: number; subtotal: number; discount: number; total: number; averageTicket: number
    byMethod: Record<'CASH' | 'CARD' | 'TRANSFER', { count: number; total: number }>
  }
  cash: { openingFloat: number; cashSales: number; otherInflows: number; outflows: number; expectedInDrawer: number }
  waste: { count: number; totalLoss: number }
  profit: { grossProfit: number; afterWaste: number; marginPercent: number }
  topProducts: { name: string; quantity: number; revenue: number }[]
}

const CATEGORIES = [
  { id: 'PROVEEDOR_MERCANCIA', label: '🚚 Proveedor', type: 'OUTFLOW' },
  { id: 'GASTO_LOCAL', label: '🧾 Gasto local', type: 'OUTFLOW' },
  { id: 'RETIRO', label: '💼 Retiro', type: 'OUTFLOW' },
  { id: 'FONDO_INICIAL', label: '🏦 Fondo inicial', type: 'INFLOW' },
] as const

const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]))

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'red' | 'green' | 'amber' }) {
  return (
    <div className={cn('flex justify-between py-1', strong && 'border-t border-line pt-2 text-lg font-extrabold')}>
      <span className={cn(!strong && 'text-slate-400')}>{label}</span>
      <span className={cn('num', tone === 'red' && 'text-red-300', tone === 'green' && 'text-leaf', tone === 'amber' && 'text-mango')}>{value}</span>
    </div>
  )
}

export function CashPage({ notify }: { notify: (msg: string, kind?: 'ok' | 'err') => void }) {
  const [movements, setMovements] = useState<Movement[]>([])
  const [cut, setCut] = useState<Cut | null>(null)
  const [cutType, setCutType] = useState<'X' | 'Z'>('X')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['id']>('PROVEEDOR_MERCANCIA')
  const [amountText, setAmountText] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async (t: 'X' | 'Z' = cutType) => {
    const [m, c] = await Promise.all([api.get<Movement[]>('/cash'), api.get<Cut>(`/reports/cut?type=${t}`)])
    setMovements(m)
    setCut(c)
  }, [cutType])

  useEffect(() => { refresh().catch((e) => notify(e.message, 'err')) }, [refresh, notify])

  const amount = parseFloat(amountText.replace(',', '.')) || 0
  const type = CATEGORIES.find((c) => c.id === category)!.type

  const submit = async () => {
    if (amount <= 0) return
    setBusy(true)
    try {
      await api.post('/cash', { type, amount, category, note })
      sound.add()
      notify(type === 'OUTFLOW' ? `Salida registrada: ${fmtMoney(amount)}` : `Entrada registrada: ${fmtMoney(amount)}`)
      setAmountText('')
      setNote('')
      await refresh()
    } catch (e) {
      sound.error()
      notify(e instanceof Error ? e.message : 'No se pudo registrar', 'err')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    await api.del(`/cash/${id}`)
    await refresh()
  }

  return (
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_440px]">
      <section className="flex min-h-0 flex-col gap-3">
        <div className="rounded-3xl border border-line bg-panel p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Banknote className="text-leaf" /> Registrar movimiento de caja</h2>
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                className={cn('rounded-xl py-3 text-sm font-bold transition', category === c.id ? 'bg-leaf text-black' : 'bg-panel-2 text-slate-300 hover:bg-line')}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-[160px_1fr_auto]">
            <label className="flex items-center rounded-xl border border-line bg-ink px-3 focus-within:border-leaf">
              <span className="num text-slate-500">$</span>
              <input inputMode="decimal" aria-label="Monto" value={amountText}
                onChange={(e) => setAmountText(e.target.value.replace(/[^0-9.,]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="150.00" className="num h-12 w-full bg-transparent px-2 text-xl font-bold outline-none" />
            </label>
            <input aria-label="Nota" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Nota (ej. pago proveedor de tostadas)" className="h-12 rounded-xl border border-line bg-ink px-4 outline-none focus:border-leaf" />
            <button onClick={submit} disabled={busy || amount <= 0}
              className={cn('flex h-12 items-center justify-center gap-2 rounded-xl px-6 font-extrabold text-black transition active:scale-95 disabled:opacity-30',
                type === 'OUTFLOW' ? 'bg-mango hover:brightness-110' : 'bg-leaf hover:brightness-110')}>
              {busy ? <Loader2 className="animate-spin" /> : type === 'OUTFLOW' ? 'Registrar salida' : 'Registrar entrada'}
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-line bg-panel p-5">
          <h2 className="mb-2 font-bold">Movimientos de hoy</h2>
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {movements.length === 0 && <li className="py-8 text-center text-slate-500">Sin movimientos. Registra el fondo inicial para empezar.</li>}
            {movements.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-xl bg-panel-2 p-3">
                {m.type === 'OUTFLOW' ? <ArrowUpCircle className="text-mango" /> : <ArrowDownCircle className="text-leaf" />}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{CAT_LABEL[m.category] ?? m.category}</p>
                  <p className="truncate text-xs text-slate-400">{m.note || '—'} · {new Date(m.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className={cn('num text-lg font-bold', m.type === 'OUTFLOW' ? 'text-mango' : 'text-leaf')}>
                  {m.type === 'OUTFLOW' ? '-' : '+'}{fmtMoney(m.amount)}
                </span>
                <button aria-label="Eliminar movimiento" onClick={() => remove(m.id)} className="rounded-lg p-2 text-slate-500 hover:bg-red-500/20 hover:text-red-400"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <aside className="flex min-h-0 flex-col rounded-3xl border border-line bg-panel p-5" aria-label="Corte de caja">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Corte de caja</h2>
          <div role="group" aria-label="Tipo de corte" className="flex gap-1 rounded-xl bg-ink p-1">
            {(['X', 'Z'] as const).map((t) => (
              <button key={t} onClick={() => { setCutType(t); refresh(t) }}
                className={cn('rounded-lg px-4 py-1.5 text-sm font-extrabold', cutType === t ? 'bg-leaf text-black' : 'text-slate-300 hover:bg-panel-2')}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {cut ? (
          <>
            <div className="print-area min-h-0 flex-1 overflow-y-auto rounded-2xl bg-ink p-4 text-sm">
              <p className="text-center text-base font-extrabold">{STORE.name}</p>
              <p className="mb-2 text-center text-xs text-slate-400">
                CORTE {cut.type} · {new Date(cut.generatedAt).toLocaleString('es-MX')}
              </p>

              <p className="mt-2 text-xs font-bold uppercase tracking-wider text-leaf">Ventas ({cut.sales.count})</p>
              <Row label="Efectivo" value={`${fmtMoney(cut.sales.byMethod.CASH.total)} (${cut.sales.byMethod.CASH.count})`} />
              <Row label="Tarjeta" value={`${fmtMoney(cut.sales.byMethod.CARD.total)} (${cut.sales.byMethod.CARD.count})`} />
              <Row label="Transferencia" value={`${fmtMoney(cut.sales.byMethod.TRANSFER.total)} (${cut.sales.byMethod.TRANSFER.count})`} />
              <Row label="Descuentos remate" value={`-${fmtMoney(cut.sales.discount)}`} tone="amber" />
              <Row label="Ticket promedio" value={fmtMoney(cut.sales.averageTicket)} />
              <Row label="TOTAL VENTAS" value={fmtMoney(cut.sales.total)} strong tone="green" />

              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-leaf">Efectivo en cajón</p>
              <Row label="Fondo inicial" value={fmtMoney(cut.cash.openingFloat)} />
              <Row label="+ Ventas en efectivo" value={fmtMoney(cut.cash.cashSales)} />
              <Row label="+ Otras entradas" value={fmtMoney(cut.cash.otherInflows)} />
              <Row label="− Salidas / gastos" value={`-${fmtMoney(cut.cash.outflows)}`} tone="amber" />
              <Row label="EFECTIVO ESPERADO" value={fmtMoney(cut.cash.expectedInDrawer)} strong tone="green" />

              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-leaf">Mermas y utilidad</p>
              <Row label={`Mermas (${cut.waste.count})`} value={`-${fmtMoney(cut.waste.totalLoss)}`} tone="red" />
              <Row label={`Utilidad bruta (${cut.profit.marginPercent}%)`} value={fmtMoney(cut.profit.grossProfit)} />
              <Row label="Utilidad tras merma" value={fmtMoney(cut.profit.afterWaste)} strong tone={cut.profit.afterWaste >= 0 ? 'green' : 'red'} />

              {cut.topProducts.length > 0 && (
                <>
                  <p className="mt-3 text-xs font-bold uppercase tracking-wider text-leaf">Top productos</p>
                  {cut.topProducts.map((p) => (
                    <Row key={p.name} label={p.name} value={fmtMoney(p.revenue)} />
                  ))}
                </>
              )}
              {cut.type === 'Z' && <p className="mt-3 text-center text-xs font-bold text-mango">— CIERRE DEL DÍA —</p>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => refresh()} className="h-12 rounded-xl bg-panel-2 font-bold hover:bg-line">Actualizar</button>
              <button onClick={() => window.print()} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-leaf font-extrabold text-black hover:bg-emerald-400">
                <Printer size={18} /> Imprimir
              </button>
            </div>
          </>
        ) : (
          <p className="grid flex-1 place-items-center text-slate-500"><Loader2 className="animate-spin" /></p>
        )}
      </aside>
    </div>
  )
}
