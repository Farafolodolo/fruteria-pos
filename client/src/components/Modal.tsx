import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            'pop fixed left-1/2 top-1/2 z-50 max-h-[94vh] w-[94vw] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto',
            'rounded-3xl border border-line bg-panel p-6 shadow-2xl shadow-black/60',
            className,
          )}
        >
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-xl font-bold tracking-tight">{title}</Dialog.Title>
            <Dialog.Close className="rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Cerrar">
              <X size={20} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
