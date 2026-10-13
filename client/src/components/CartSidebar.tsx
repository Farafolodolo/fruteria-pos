import { Minus, Pencil, Plus, ShoppingBasket, Trash2 } from 'lucide-react'
import type { CartLine } from '@/lib/types'
import { calcLine } from '@/lib/cart'
import { fmtMoney, fmtKg } from '@/lib/money'
import { cn, productEmoji } from '@/lib/utils'

interface Props {
  lines: CartLine[]
  totals: { subtotal: number; discount: number; total: number; count: number }
  lastAdded: string | null
  onQty: (uid: string, qty: number) => void
  onEditWeight: (line: CartLine) => void
  onRemove: (uid: string) => void
  onPay: () => void
  onClear: () => void
}

export function CartSidebar({ lines, totals, lastAdded, onQty, onEditWeight, onRemove, onPay, onClear }: Props) {
  return (
    <aside className="flex h-full w-full flex-col rounded-3xl border border-line bg-panel" aria-label="Compra actual">
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="flex items-center gap-2 text-lg font-bold"><ShoppingBasket className="text-leaf" /> Compra actual</h2>
        {lines.length > 0 && (
          <button onClick={onClear} className="text-xs font-semibold text-slate-400 hover:text-red-400">Cancelar (Esc)</button>
        )}
      </header>

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {lines.length === 0 && (
          <li className="grid h-full place-items-center text-center text-slate-500">
            <div><div className="mb-2 text-5xl">🧺</div>Escanea o toca un producto<br />para comenzar</div>
          </li>
        )}
        {lines.map((l) => {
          const c = calcLine(l)
          const w = l.product.soldBy === 'WEIGHT'
          return (
            <li key={l.uid} className={cn('rounded-2xl bg-panel-2 p-3', lastAdded === l.uid && 'flash')}>
              <div className="flex items-start gap-2">
                <span className="text-2xl">{productEmoji(l.product)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{l.product.name}</p>
                  <p className="num text-xs text-slate-400">
                    {w ? fmtKg(l.quantity) : `${l.quantity} pz`} × {fmtMoney(l.product.price)}/{w ? 'kg' : 'pz'}
                    {l.discountPercent > 0 && <span className="ml-1 rounded bg-mango px-1 font-bold text-black">-{l.discountPercent}%</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="num font-bold text-white">{fmtMoney(c.net)}</p>
                  {c.discount > 0 && <p className="num text-xs text-slate-500 line-through">{fmtMoney(c.gross)}</p>}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                {w ? (
                  <button onClick={() => onEditWeight(l)} className="flex items-center gap-1 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-leaf">
                    <Pencil size={13} /> Re-pesar
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button aria-label="Menos" onClick={() => onQty(l.uid, l.quantity - 1)} className="grid h-9 w-9 place-items-center rounded-lg bg-ink hover:bg-line"><Minus size={16} /></button>
                    <span className="num w-10 text-center font-bold">{l.quantity}</span>
                    <button aria-label="Más" onClick={() => onQty(l.uid, l.quantity + 1)} className="grid h-9 w-9 place-items-center rounded-lg bg-ink hover:bg-line"><Plus size={16} /></button>
                  </div>
                )}
                <button aria-label={`Eliminar ${l.product.name}`} onClick={() => onRemove(l.uid)}
                  className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-red-500/20 hover:text-red-400"><Trash2 size={17} /></button>
              </div>
            </li>
          )
        })}
      </ul>

      <footer className="space-y-1 border-t border-line p-5">
        <div className="num flex justify-between text-sm text-slate-400"><span>Subtotal ({totals.count})</span><span>{fmtMoney(totals.subtotal)}</span></div>
        {totals.discount > 0 && (
          <div className="num flex justify-between text-sm text-mango"><span>Descuento remate</span><span>-{fmtMoney(totals.discount)}</span></div>
        )}
        <div className="flex items-end justify-between pt-1">
          <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">Total</span>
          <span className="num text-5xl font-extrabold text-leaf">{fmtMoney(totals.total)}</span>
        </div>
        <button onClick={onPay} disabled={!lines.length}
          className="mt-3 h-16 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-xl font-extrabold text-black shadow-lg shadow-emerald-900/50 transition hover:brightness-110 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-30">
          COBRAR (F2)
        </button>
      </footer>
    </aside>
  )
}
