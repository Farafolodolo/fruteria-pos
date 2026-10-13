import { useCallback, useEffect, useRef, useState } from 'react'
import { Apple, Keyboard, Search, X } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useCart } from '@/lib/cart'
import { sound } from '@/lib/sound'
import { STORE } from '@/lib/ticket'
import { fmtKg, lineTotal, percentOff } from '@/lib/money'
import type { CartLine, PaymentMethod, Product, SaleDTO, TicketData } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ProductGrid } from '@/components/ProductGrid'
import { CartSidebar } from '@/components/CartSidebar'
import { WeightModal } from '@/components/WeightModal'
import { PaymentModal } from '@/components/PaymentModal'
import { TicketModal } from '@/components/TicketModal'
import { ScaleBadge, ScalePanel } from '@/components/ScalePanel'
import { PrintActions } from '@/components/PrintActions'
import { useBarcodeScanner } from '@/lib/useBarcodeScanner'

type ModalState = { k: 'weight'; product: Product; line?: CartLine } | { k: 'pay' } | null
interface Toast { id: number; msg: string; kind: 'ok' | 'err' }

function Clock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="num text-right leading-tight">
      <p className="text-lg font-bold">{now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
      <p className="text-[11px] text-slate-400">{now.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
    </div>
  )
}

export default function App() {
  const cart = useCart()
  const [products, setProducts] = useState<Product[]>([])
  const [bestSellers, setBestSellers] = useState<Product[]>([])
  const [tab, setTab] = useState('FRUTAS')
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [ticket, setTicket] = useState<TicketData | null>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const notify = useCallback((msg: string, kind: Toast['kind'] = 'ok') => {
    const id = Date.now()
    setToast({ id, msg, kind })
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 2200)
  }, [])

  const load = useCallback(async () => {
    try {
      const [all, best] = await Promise.all([
        api.get<Product[]>('/products'),
        api.get<Product[]>('/products/best-sellers'),
      ])
      setProducts(all)
      setBestSellers(best)
      setLoadError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'No se pudo conectar con el servidor local')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const pick = useCallback((p: Product) => {
    if (p.soldBy === 'WEIGHT') {
      setModal({ k: 'weight', product: p })
    } else {
      cart.add(p, 1)
      sound.add()
      notify(`${p.name} agregado`)
    }
  }, [cart.add, notify])

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setQuery(''); return }
    if (e.key !== 'Enter') return
    const code = query.trim()
    if (!code) return
    const exact = products.find((p) => p.barcode === code || p.plu === code)
    const matches = products.filter((p) => p.name.toLowerCase().includes(code.toLowerCase()))
    const target = exact ?? (matches.length === 1 ? matches[0] : undefined)
    if (target) {
      sound.scan()
      pick(target)
      setQuery('')
    } else {
      sound.error()
      notify(matches.length ? 'Selecciona un producto de la lista' : `Código ${code} no encontrado`, 'err')
    }
  }

  // Lector físico (keyboard wedge) aunque el foco no esté en el buscador
  useBarcodeScanner({
    enabled: !modal && !ticket,
    onScan: (code) => {
      const p = products.find((x) => x.barcode === code || x.plu === code)
      if (p) { sound.scan(); pick(p) } else { sound.error(); notify(`Código ${code} no encontrado`, 'err') }
    },
  })

  const confirmWeight = (netKg: number) => {
    if (modal?.k !== 'weight') return
    const { product, line } = modal
    if (line) {
      cart.setQuantity(line.uid, netKg)
    } else {
      cart.add(product, netKg)
    }
    sound.add()
    notify(`${product.name} ${fmtKg(netKg)}`)
    setModal(null)
  }

  const pay = async (p: { method: PaymentMethod; amountPaid: number; phone: string }) => {
    setPaying(true)
    setPayError(null)
    try {
      const sale = await api.post<SaleDTO>('/sales', {
        items: cart.lines.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
          discountPercent: l.discountPercent,
        })),
        paymentMethod: p.method,
        amountPaid: p.amountPaid,
        customerPhone: p.phone.length >= 8 ? p.phone : null,
      })
      setTicket({
        folio: sale.folio,
        date: sale.createdAt,
        items: cart.lines.map((l) => {
          const gross = lineTotal(l.quantity, l.product.price)
          return {
            name: l.product.name,
            quantity: l.quantity,
            unit: l.product.soldBy === 'WEIGHT' ? 'kg' : 'pz',
            unitPrice: l.product.price,
            gross,
            discount: percentOff(gross, l.discountPercent),
          }
        }),
        subtotal: sale.subtotal,
        discount: sale.discount,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        amountPaid: sale.amountPaid,
        changeGiven: sale.changeGiven,
        customerPhone: sale.customerPhone,
      })
      cart.clear()
      setModal(null)
      sound.success()
      load()
    } catch (e) {
      sound.error()
      setPayError(e instanceof ApiError || e instanceof Error ? e.message : 'Error al cobrar')
    } finally {
      setPaying(false)
    }
  }

  const cancelSale = () => {
    if (cart.lines.length && window.confirm('¿Cancelar la venta actual?')) cart.clear()
  }

  // Atajos de teclado: F1 buscar · F2 cobrar · Esc cancelar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); searchRef.current?.focus() }
      else if (e.key === 'F2') {
        e.preventDefault()
        if (!modal && !ticket && cart.lines.length) { setPayError(null); setModal({ k: 'pay' }) }
      } else if (e.key === 'Escape' && !modal && !ticket) cancelSale()
      else if (e.key === 'Enter' && ticket) { e.preventDefault(); setTicket(null); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <header className="flex items-center gap-4 rounded-2xl border border-line bg-panel/80 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-black"><Apple size={22} /></span>
          <div className="leading-tight">
            <h1 className="text-lg font-extrabold tracking-tight">{STORE.name}</h1>
            <p className="text-[11px] text-slate-400">Punto de Venta</p>
          </div>
        </div>

        <label className="relative mx-auto flex max-w-2xl flex-1 items-center">
          <Search size={18} className="absolute left-4 text-slate-500" />
          <input
            ref={searchRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder="Buscar por nombre, código de barras o PLU (F1)…"
            aria-label="Búsqueda universal"
            className="h-12 w-full rounded-xl border border-line bg-ink pl-11 pr-10 text-base outline-none transition focus:border-leaf focus:ring-2 focus:ring-emerald-500/30"
          />
          {query && (
            <button aria-label="Limpiar búsqueda" onClick={() => setQuery('')} className="absolute right-3 text-slate-500 hover:text-white"><X size={18} /></button>
          )}
        </label>

        <div className="hidden items-center gap-1 text-[11px] text-slate-500 xl:flex">
          <Keyboard size={14} /> F1 Buscar · F2 Cobrar · F4 Merma · Esc Cancelar
        </div>
        <ScaleBadge />
        <Clock />
      </header>

      {loadError && (
        <p role="alert" className="rounded-xl bg-red-500/15 px-4 py-2 text-sm text-red-300">
          ⚠️ {loadError}. ¿Está corriendo el servidor (npm run dev)?
        </p>
      )}

      <main className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_400px]">
        <section className="flex min-h-0 flex-col">
          <ProductGrid products={products} bestSellers={bestSellers} query={query} tab={tab} onTab={setTab} onPick={(p) => { pick(p); if (query) setQuery('') }} />
        </section>
        <CartSidebar
          lines={cart.lines}
          totals={cart.totals}
          lastAdded={cart.lastAdded}
          onQty={cart.setQuantity}
          onRemove={cart.remove}
          onEditWeight={(line) => setModal({ k: 'weight', product: line.product, line })}
          onPay={() => { setPayError(null); setModal({ k: 'pay' }) }}
          onClear={cancelSale}
        />
      </main>

      <WeightModal
        product={modal?.k === 'weight' ? modal.product : null}
        initialKg={modal?.k === 'weight' ? modal.line?.quantity : undefined}
        discountPercent={modal?.k === 'weight' ? modal.line?.discountPercent : 0}
        onClose={() => setModal(null)}
        onConfirm={confirmWeight}
        scaleSlot={({ setGrossKg }) => <ScalePanel onReading={setGrossKg} />}
      />
      <PaymentModal
        open={modal?.k === 'pay'}
        total={cart.totals.total}
        busy={paying}
        error={payError}
        onClose={() => setModal(null)}
        onConfirm={pay}
      />
      <TicketModal ticket={ticket} onClose={() => setTicket(null)} extraActions={(t, w) => <PrintActions ticket={t} width={w} />} />

      {toast && (
        <div role="status" className={cn(
          'pop pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full px-6 py-3 text-sm font-bold shadow-2xl',
          toast.kind === 'ok' ? 'bg-leaf text-black' : 'bg-red-500 text-white',
        )}>
          {toast.kind === 'ok' ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}
    </div>
  )
}
