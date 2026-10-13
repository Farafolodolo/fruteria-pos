import * as Tabs from '@radix-ui/react-tabs'
import { AlertTriangle, Flame } from 'lucide-react'
import { useMemo } from 'react'
import type { Product } from '@/lib/types'
import { fmtMoney } from '@/lib/money'
import { cn, norm, productEmoji } from '@/lib/utils'

interface Props {
  products: Product[]
  bestSellers: Product[]
  query: string
  tab: string
  onTab: (t: string) => void
  onPick: (p: Product) => void
  /** Si es > 0 las frutas/verduras muestran el precio de remate */
  remate?: number
}

export const TABS = [
  { id: 'FRUTAS', label: '🍎 Frutas' },
  { id: 'VERDURAS', label: '🥬 Verduras' },
  { id: 'ABARROTES', label: '🛒 Abarrotes' },
  { id: 'BEST', label: '🔥 Más Vendidos' },
]

export const isPerishable = (p: Product) => p.category === 'FRUTAS' || p.category === 'VERDURAS'

function Card({ p, onPick, remate }: { p: Product; onPick: (p: Product) => void; remate: number }) {
  const low = p.stock <= p.minStock
  const off = remate > 0 && isPerishable(p)
  const price = off ? Math.round(p.price * (100 - remate)) / 100 : p.price
  return (
    <button
      type="button"
      onClick={() => onPick(p)}
      className={cn(
        'group relative flex flex-col items-center gap-1 rounded-2xl border border-line bg-panel p-3 text-center transition',
        'hover:-translate-y-0.5 hover:border-leaf hover:bg-panel-2 hover:shadow-lg hover:shadow-emerald-900/30 active:scale-95',
        off && 'border-mango/60',
      )}
    >
      <span className="text-4xl drop-shadow transition group-hover:scale-110">{productEmoji(p)}</span>
      <span className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight">{p.name}</span>
      <span className={cn('num text-lg font-bold', off ? 'text-mango' : 'text-leaf')}>
        {fmtMoney(price)}
        <span className="text-xs font-medium text-slate-400">/{p.soldBy === 'WEIGHT' ? 'kg' : 'pz'}</span>
      </span>
      <span className="num text-[11px] text-slate-500">
        {p.plu ? `PLU ${p.plu}` : p.barcode?.slice(-6)} · {p.stock.toFixed(p.soldBy === 'WEIGHT' ? 1 : 0)}
      </span>
      {low && <AlertTriangle size={14} className="absolute right-2 top-2 text-mango" aria-label="Stock bajo" />}
      {off && <span className="absolute left-2 top-2 rounded bg-mango px-1.5 text-[10px] font-extrabold text-black">-{remate}%</span>}
      {p.soldBy === 'WEIGHT' && <span className="absolute bottom-2 right-2 text-[10px] text-slate-600">⚖</span>}
    </button>
  )
}

export function ProductGrid({ products, bestSellers, query, tab, onTab, onPick, remate = 0 }: Props) {
  const q = norm(query.trim())
  const searching = q.length > 0

  const results = useMemo(
    () =>
      searching
        ? products.filter((p) => norm(p.name).includes(q) || p.barcode?.includes(q) || p.plu?.includes(q))
        : [],
    [products, q, searching],
  )

  const byTab = (id: string) =>
    id === 'BEST'
      ? bestSellers
      : id === 'ABARROTES'
        ? products.filter((p) => ['ABARROTES', 'LACTEOS', 'OTROS'].includes(p.category))
        : products.filter((p) => p.category === id)

  const grid = (list: Product[]) =>
    list.length ? (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {list.map((p) => <Card key={p.id} p={p} onPick={onPick} remate={remate} />)}
      </div>
    ) : (
      <p className="grid h-48 place-items-center text-slate-500">Sin productos</p>
    )

  if (searching) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <p className="mb-3 text-sm text-slate-400">{results.length} resultado(s) para “{query}”</p>
        {grid(results)}
      </div>
    )
  }

  return (
    <Tabs.Root value={tab} onValueChange={onTab} className="flex min-h-0 flex-1 flex-col">
      <Tabs.List className="mb-3 flex gap-2 overflow-x-auto" aria-label="Categorías">
        {TABS.map((t) => (
          <Tabs.Trigger
            key={t.id}
            value={t.id}
            className={cn(
              'flex items-center gap-1 whitespace-nowrap rounded-xl px-5 py-3 text-sm font-bold transition',
              'bg-panel text-slate-300 hover:bg-panel-2',
              'data-[state=active]:bg-leaf data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-900/50',
            )}
          >
            {t.id === 'BEST' && <Flame size={16} />}
            {t.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {TABS.map((t) => (
        <Tabs.Content key={t.id} value={t.id} className="min-h-0 flex-1 overflow-y-auto pr-1 outline-none">
          {grid(byTab(t.id))}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  )
}
