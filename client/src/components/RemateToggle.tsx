import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: number
  onChange: (v: number) => void
}

const OPTIONS = [30, 50]

/** Toggle de Modo Remate: descuento express para fruta/verdura muy madura */
export function RemateToggle({ value, onChange }: Props) {
  const on = value > 0
  return (
    <div
      role="group"
      aria-label="Modo remate"
      className={cn(
        'flex items-center gap-1 rounded-xl border p-1 transition',
        on ? 'border-mango bg-mango/15 shadow-[0_0_20px_rgba(245,158,11,.25)]' : 'border-line bg-panel-2',
      )}
    >
      <button
        type="button"
        aria-pressed={on}
        onClick={() => onChange(on ? 0 : 30)}
        className={cn(
          'flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-extrabold transition',
          on ? 'bg-mango text-black' : 'text-slate-300 hover:bg-line',
        )}
      >
        <Flame size={14} /> REMATE {on ? 'ON' : 'OFF'}
      </button>
      {on &&
        OPTIONS.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={cn(
              'num rounded-lg px-2.5 py-2 text-xs font-bold transition',
              value === o ? 'bg-black text-mango' : 'text-mango hover:bg-mango/20',
            )}
          >
            -{o}%
          </button>
        ))}
    </div>
  )
}
