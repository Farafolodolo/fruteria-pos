import { Fragment, useEffect, useMemo, useState } from 'react'
import { Minus, Plus, RotateCcw, Weight } from 'lucide-react'
import type { Product } from '@/lib/types'
import { Modal } from './Modal'
import { fmtMoney, lineTotal, percentOff, roundQty, fromCents, toCents } from '@/lib/money'
import { cn, productEmoji } from '@/lib/utils'

interface Props {
  product: Product | null
  initialKg?: number
  discountPercent?: number
  /** Slot para integraciones (ej. báscula serial / emulador) */
  scaleSlot?: (api: { setGrossKg: (kg: number) => void }) => React.ReactNode
  onClose: () => void
  onConfirm: (netKg: number) => void
}

const STEPS = [
  { label: '+100 g', kg: 0.1 },
  { label: '+250 g', kg: 0.25 },
  { label: '+500 g', kg: 0.5 },
  { label: '+1 kg', kg: 1 },
]
const TARES = [
  { label: 'Sin tara', g: 0 },
  { label: 'Bolsa 8 g', g: 8 },
  { label: 'Bolsa grande 15 g', g: 15 },
  { label: 'Charola 40 g', g: 40 },
]

export function WeightModal({ product, initialKg, discountPercent = 0, scaleSlot, onClose, onConfirm }: Props) {
  const [grossText, setGrossText] = useState('')
  const [tareG, setTareG] = useState(0)

  useEffect(() => {
    if (product) {
      setGrossText(initialKg ? initialKg.toFixed(3) : '')
      setTareG(0)
    }
  }, [product, initialKg])

  const gross = roundQty(parseFloat(grossText.replace(',', '.')) || 0)
  const net = Math.max(0, roundQty(gross - tareG / 1000))
  const total = useMemo(() => (product ? lineTotal(net, product.price) : 0), [net, product])
  const discount = percentOff(total, discountPercent)
  const final = fromCents(toCents(total) - toCents(discount))

  const addKg = (kg: number) => setGrossText(roundQty(gross + kg).toFixed(3))

  return (
    <Modal open={!!product} onClose={onClose} title="Pesar producto">
      {product && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (net > 0) onConfirm(net)
          }}
          className="space-y-4"
        >
          <div className="flex items-center gap-4 rounded-2xl bg-panel-2 p-4">
            <span className="text-5xl">{productEmoji(product)}</span>
            <div className="flex-1">
              <p className="text-lg font-bold">{product.name}</p>
              <p className="num text-sm text-slate-400">{fmtMoney(product.price)} / kg {product.plu && `· PLU ${product.plu}`}</p>
            </div>
            {discountPercent > 0 && (
              <span className="rounded-full bg-mango px-3 py-1 text-sm font-bold text-black">REMATE -{discountPercent}%</span>
            )}
          </div>

          {scaleSlot?.({ setGrossKg: (kg) => setGrossText(roundQty(kg).toFixed(3)) })}

          <div>
            <label htmlFor="gross-kg" className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-400">
              <Weight size={16} /> Peso bruto (kg, admite decimales)
            </label>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Menos 100 g" onClick={() => setGrossText(Math.max(0, roundQty(gross - 0.1)).toFixed(3))}
                className="grid h-14 w-14 place-items-center rounded-xl bg-panel-2 hover:bg-line"><Minus /></button>
              <input
                id="gross-kg"
                autoFocus
                inputMode="decimal"
                value={grossText}
                onChange={(e) => setGrossText(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="0.000"
                className="num h-14 min-w-0 flex-1 rounded-xl border border-line bg-ink px-4 text-center text-3xl font-bold text-leaf outline-none focus:border-leaf"
              />
              <button type="button" aria-label="Más 100 g" onClick={() => addKg(0.1)}
                className="grid h-14 w-14 place-items-center rounded-xl bg-panel-2 hover:bg-line"><Plus /></button>
              <button type="button" aria-label="Reiniciar peso" onClick={() => setGrossText('')}
                className="grid h-14 w-14 place-items-center rounded-xl bg-panel-2 text-slate-400 hover:bg-line"><RotateCcw size={18} /></button>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {STEPS.map((s) => (
                <button key={s.label} type="button" onClick={() => addKg(s.kg)}
                  className="rounded-xl bg-emerald-500/15 py-3 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/30 active:scale-95">
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium text-slate-400">Tara (envase / bolsa)</p>
            <div className="flex flex-wrap items-center gap-2">
              {TARES.map((t) => (
                <button key={t.label} type="button" onClick={() => setTareG(t.g)}
                  className={cn('rounded-lg px-3 py-2 text-xs font-semibold transition',
                    tareG === t.g ? 'bg-mango text-black' : 'bg-panel-2 text-slate-300 hover:bg-line')}>
                  {t.label}
                </button>
              ))}
              <label className="ml-auto flex items-center gap-1 text-xs text-slate-400">
                Otra:
                <input aria-label="Tara en gramos" inputMode="numeric" value={tareG || ''} placeholder="0"
                  onChange={(e) => setTareG(Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0))}
                  className="num w-16 rounded-lg border border-line bg-ink px-2 py-1 text-right text-sm text-white outline-none focus:border-mango" /> g
              </label>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-ink p-4 text-center">
            <Fragment>
              <div><p className="text-xs text-slate-500">Bruto</p><p className="num text-lg font-semibold">{gross.toFixed(3)} kg</p></div>
              <div><p className="text-xs text-slate-500">Tara</p><p className="num text-lg font-semibold text-mango">-{(tareG / 1000).toFixed(3)} kg</p></div>
              <div><p className="text-xs text-slate-500">Neto</p><p className="num text-lg font-bold text-leaf">{net.toFixed(3)} kg</p></div>
            </Fragment>
            <p className="num col-span-3 border-t border-line pt-3 text-sm text-slate-400">
              {net.toFixed(3)} kg × {fmtMoney(product.price)} ={' '}
              <span className="text-2xl font-extrabold text-white">{fmtMoney(final)}</span>
              {discount > 0 && <span className="ml-2 text-mango line-through opacity-70">{fmtMoney(total)}</span>}
            </p>
          </div>

          <button type="submit" disabled={net <= 0}
            className="h-14 w-full rounded-2xl bg-leaf text-lg font-extrabold text-black transition hover:bg-emerald-400 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-30">
            Agregar a la compra (Enter)
          </button>
        </form>
      )}
    </Modal>
  )
}
