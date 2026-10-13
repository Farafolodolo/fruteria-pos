import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Minus, Plus, Search, Trash2, Undo2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { Product } from '@/lib/types'
import { fmtMoney, lineTotal, roundQty } from '@/lib/money'
import { cn, norm, productEmoji } from '@/lib/utils'
import { sound } from '@/lib/sound'

interface WasteRecordDTO {
  id: string
  quantity: number
  reason: string
  estimatedLoss: number
  recordedAt: string
  product: Product
}

const REASONS = [
  { id: 'MADURACION', label: 'Maduración', emoji: '🍌' },
  { id: 'PODRIDO', label: 'Podrido', emoji: '🤢' },
  { id: 'GOLPEADO', label: 'Golpeado', emoji: '💥' },
  { id: 'CADUCADO', label: 'Caducado', emoji: '📅' },
]

interface Props {
  products: Product[]
  onChanged: () => void
  notify: (msg: string, kind?: 'ok' | 'err') => void
}

export function WastePage({ products, onChanged, notify }: Props) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)
  const [qtyText, setQtyText] = useState('')
  const [reason, setReason] = useState('MADURACION')
  const [busy, setBusy] = useState(false)
  const [records, setRecords] = useState<WasteRecordDTO[]>([])
  const [totalLoss, setTotalLoss] = useState(0)

  const loadToday = useCallback(async () => {
    const r = await api.get<{ records: WasteRecordDTO[]; totalLoss: number }>('/waste')
    setRecords(r.records)
    setTotalLoss(r.totalLoss)
  }, [])
  useEffect(() => { loadToday().catch(() => undefined) }, [loadToday])

  const list = useMemo(() => {
    const q = norm(query.trim())
    return products.filter((p) => !q || norm(p.name).includes(q) || p.plu?.includes(q) || p.barcode?.includes(q))
  }, [products, query])

  const weight = selected?.soldBy === 'WEIGHT'
  const qty = roundQty(parseFloat(qtyText.replace(',', '.')) || 0)
  const loss = selected ? lineTotal(qty, selected.cost) : 0
  const valid = !!selected && qty > 0 && qty <= selected.stock && (weight || Number.isInteger(qty))

  const choose = (p: Product) => { setSelected(p); setQtyText(''); }
  const bump = (d: number) => setQtyText(String(roundQty(Math.max(0, qty + d))))

  const submit = async () => {
    if (!selected || !valid) return
    setBusy(true)
    try {
      await api.post('/waste', { productId: selected.id, quantity: qty, reason })
      sound.add()
      notify(`Merma registrada: ${selected.name} ${weight ? qty.toFixed(3) + ' kg' : qty + ' pz'}`)
      setSelected(null)
      setQtyText('')
      await loadToday()
      onChanged()
    } catch (e) {
      sound.error()
      notify(e instanceof Error ? e.message : 'No se pudo registrar', 'err')
    } finally {
      setBusy(false)
    }
  }

  const undo = async (id: string) => {
    try {
      await api.del(`/waste/${id}`)
      notify('Merma revertida, stock devuelto')
      await loadToday()
      onChanged()
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo revertir', 'err')
    }
  }

  return (
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_420px]">
      <section className="flex min-h-0 flex-col rounded-3xl border border-line bg-panel p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Trash2 className="text-mango" /> 1. Selecciona el producto en mal estado</h2>
        <label className="relative mb-3 flex items-center">
          <Search size={18} className="absolute left-4 text-slate-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar producto…" aria-label="Buscar producto de merma"
            className="h-12 w-full rounded-xl border border-line bg-ink pl-11 pr-4 outline-none focus:border-mango" />
        </label>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-4">
          {list.map((p) => (
            <button key={p.id} onClick={() => choose(p)}
              className={cn('flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition hover:-translate-y-0.5 active:scale-95',
                selected?.id === p.id ? 'border-mango bg-mango/15' : 'border-line bg-panel-2 hover:border-mango/60')}>
              <span className="text-3xl">{productEmoji(p)}</span>
              <span className="line-clamp-2 text-sm font-semibold leading-tight">{p.name}</span>
              <span className="num text-[11px] text-slate-500">stock {p.stock.toFixed(p.soldBy === 'WEIGHT' ? 3 : 0)} {p.soldBy === 'WEIGHT' ? 'kg' : 'pz'}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="flex min-h-0 flex-col gap-3">
        <div className="rounded-3xl border border-line bg-panel p-5">
          <h2 className="mb-3 text-lg font-bold">2. Cantidad y motivo</h2>
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl bg-panel-2 p-3">
                <span className="text-4xl">{productEmoji(selected)}</span>
                <div>
                  <p className="font-bold">{selected.name}</p>
                  <p className="num text-xs text-slate-400">Costo {fmtMoney(selected.cost)}/{weight ? 'kg' : 'pz'} · Stock {selected.stock}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button aria-label="Disminuir" onClick={() => bump(weight ? -0.1 : -1)} className="grid h-14 w-14 place-items-center rounded-xl bg-panel-2 hover:bg-line"><Minus /></button>
                <input autoFocus aria-label={weight ? 'Peso de la merma en kg' : 'Piezas de merma'} inputMode="decimal" value={qtyText}
                  onChange={(e) => setQtyText(e.target.value.replace(/[^0-9.,]/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder={weight ? '0.000 kg' : '0 pz'}
                  className="num h-14 min-w-0 flex-1 rounded-xl border border-line bg-ink text-center text-3xl font-bold text-mango outline-none focus:border-mango" />
                <button aria-label="Aumentar" onClick={() => bump(weight ? 0.1 : 1)} className="grid h-14 w-14 place-items-center rounded-xl bg-panel-2 hover:bg-line"><Plus /></button>
              </div>
              {weight && (
                <div className="grid grid-cols-4 gap-2">
                  {[0.1, 0.25, 0.5, 1].map((k) => (
                    <button key={k} onClick={() => bump(k)} className="rounded-xl bg-mango/15 py-2.5 text-sm font-bold text-mango hover:bg-mango/30 active:scale-95">+{k < 1 ? k * 1000 + ' g' : '1 kg'}</button>
                  ))}
                </div>
              )}
              {qty > selected.stock && <p role="alert" className="text-sm text-red-400">Excede el stock registrado.</p>}

              <div className="grid grid-cols-2 gap-2">
                {REASONS.map((r) => (
                  <button key={r.id} onClick={() => setReason(r.id)}
                    className={cn('rounded-xl py-3 text-sm font-bold transition', reason === r.id ? 'bg-mango text-black' : 'bg-panel-2 text-slate-300 hover:bg-line')}>
                    {r.emoji} {r.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-ink p-4">
                <span className="text-sm text-slate-400">Pérdida estimada (a costo)</span>
                <span className="num text-3xl font-extrabold text-red-400">{fmtMoney(loss)}</span>
              </div>

              <button onClick={submit} disabled={!valid || busy}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-mango text-lg font-extrabold text-black transition hover:brightness-110 active:scale-[.98] disabled:opacity-30">
                {busy ? <Loader2 className="animate-spin" /> : 'Registrar merma'}
              </button>
            </div>
          ) : (
            <p className="grid h-40 place-items-center text-center text-slate-500">Elige un producto de la lista</p>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-line bg-panel p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">Mermas de hoy</h2>
            <span className="num rounded-full bg-red-500/15 px-3 py-1 text-sm font-bold text-red-300">-{fmtMoney(totalLoss)}</span>
          </div>
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {records.length === 0 && <li className="py-6 text-center text-sm text-slate-500">Sin mermas registradas hoy 🎉</li>}
            {records.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl bg-panel-2 p-3 text-sm">
                <span className="text-xl">{productEmoji(r.product)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.product.name}</p>
                  <p className="num text-xs text-slate-400">
                    {r.product.soldBy === 'WEIGHT' ? r.quantity.toFixed(3) + ' kg' : r.quantity + ' pz'} · {r.reason} · {new Date(r.recordedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="num font-bold text-red-300">-{fmtMoney(r.estimatedLoss)}</span>
                <button aria-label="Revertir merma" onClick={() => undo(r.id)} className="rounded-lg p-2 text-slate-500 hover:bg-white/10 hover:text-white"><Undo2 size={16} /></button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
