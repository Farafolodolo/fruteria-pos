import { useEffect } from 'react'
import { Cable, PackageMinus, Unplug } from 'lucide-react'
import {
  connectScale, disconnectScale, setEmulatorWeight, setScaleBaud, useScale,
} from '@/lib/scale'
import { cn } from '@/lib/utils'

/** Indicador compacto para la cabecera */
export function ScaleBadge() {
  const s = useScale()
  return (
    <button
      type="button"
      onClick={() => (s.connected ? disconnectScale() : connectScale())}
      title={s.connected ? 'Clic para desconectar' : 'Clic para conectar báscula USB/RS-232'}
      className={cn(
        'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition',
        s.connected ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/40 bg-amber-500/10 text-amber-300',
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', s.connected ? 'bg-emerald-400' : 'bg-amber-400')} />
      {s.connected ? 'Báscula serial conectada' : 'Modo emulador'}
    </button>
  )
}

const PRESETS = [0.25, 0.5, 0.75, 1.35, 2]

/** Panel de báscula dentro del modal de pesaje */
export function ScalePanel({ onReading }: { onReading: (kg: number) => void }) {
  const s = useScale()

  // Lectura en tiempo real -> peso bruto cuando la balanza se estabiliza con producto
  useEffect(() => {
    if (s.stable && s.kg > 0) onReading(s.kg)
  }, [s.stable, s.kg])

  // Al cerrar el modal se "retira" el producto del plato emulado
  useEffect(() => () => setEmulatorWeight(0), [])

  return (
    <div className="rounded-2xl border border-line bg-ink p-4" aria-label="Báscula">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className={cn(
          'flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold',
          s.connected ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300',
        )}>
          <span className={cn('h-2 w-2 animate-pulse rounded-full', s.connected ? 'bg-emerald-400' : 'bg-amber-400')} />
          {s.connected ? `Báscula serial conectada · ${s.baud} baud` : 'Modo emulador'}
        </span>
        <div className="flex items-center gap-2">
          {!s.connected && (
            <select aria-label="Baudrate" value={s.baud} onChange={(e) => setScaleBaud(Number(e.target.value))}
              className="rounded-lg border border-line bg-panel-2 px-2 py-1 text-xs">
              {[2400, 4800, 9600, 19200].map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          )}
          {s.connected ? (
            <button type="button" onClick={() => disconnectScale()} className="flex items-center gap-1 rounded-lg bg-panel-2 px-3 py-1.5 text-xs font-semibold hover:bg-line">
              <Unplug size={14} /> Desconectar
            </button>
          ) : (
            <button type="button" disabled={!s.serialSupported} onClick={() => connectScale()}
              title={s.serialSupported ? '' : 'Requiere Chrome/Edge'}
              className="flex items-center gap-1 rounded-lg bg-panel-2 px-3 py-1.5 text-xs font-semibold hover:bg-line disabled:opacity-40">
              <Cable size={14} /> Conectar Torrey / Rhino
            </button>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between rounded-xl bg-black/40 px-4 py-3">
        <span className={cn('num text-5xl font-bold tracking-tight', s.stable ? 'text-leaf' : 'text-mango')}>
          {s.kg.toFixed(3)}<span className="ml-1 text-xl text-slate-500">kg</span>
        </span>
        <span className={cn('rounded-md px-2 py-1 text-[11px] font-extrabold', s.stable ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300')}>
          {s.stable ? 'ESTABLE' : 'ESTABILIZANDO…'}
        </span>
      </div>

      {s.error && <p role="alert" className="mt-2 text-xs text-red-300">{s.error}</p>}

      {!s.connected && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={5} step={0.005} aria-label="Peso del emulador"
              value={s.kg} onChange={(e) => setEmulatorWeight(Number(e.target.value))}
              className="h-2 flex-1 accent-emerald-500" />
            <button type="button" onClick={() => setEmulatorWeight(0)}
              className="flex items-center gap-1 rounded-lg bg-panel-2 px-3 py-1.5 text-xs font-semibold hover:bg-line">
              <PackageMinus size={14} /> Quitar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="self-center text-xs text-slate-500">Colocar en plato:</span>
            {PRESETS.map((kg) => (
              <button key={kg} type="button" onClick={() => setEmulatorWeight(kg)}
                className="num rounded-lg bg-panel-2 px-3 py-1.5 text-xs font-semibold hover:bg-line">{kg.toFixed(3)} kg</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
