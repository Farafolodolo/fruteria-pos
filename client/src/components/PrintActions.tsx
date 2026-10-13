import { useState } from 'react'
import { Download, Usb } from 'lucide-react'
import type { TicketData } from '@/lib/types'
import { buildEscPos } from '@/lib/escpos'

let printerPort: SerialPort | null = null

async function sendToPrinter(data: Uint8Array) {
  if (!printerPort) {
    const p = await navigator.serial.requestPort()
    await p.open({ baudRate: 9600 })
    printerPort = p
  }
  const writer = printerPort.writable!.getWriter()
  try {
    await writer.write(data)
  } finally {
    writer.releaseLock()
  }
}

/** Acciones ESC/POS para el modal del ticket: imprimir por USB-serial o descargar el .bin crudo */
export function PrintActions({ ticket, width }: { ticket: TicketData; width: 58 | 80 }) {
  const [msg, setMsg] = useState<string | null>(null)
  const supported = 'serial' in navigator

  const print = async () => {
    try {
      await sendToPrinter(buildEscPos(ticket, width))
      setMsg('Enviado a la impresora ✓')
    } catch (e) {
      printerPort = null
      setMsg(e instanceof Error ? e.message : 'No se pudo imprimir')
    }
  }

  const download = () => {
    const blob = new Blob([buildEscPos(ticket, width) as BlobPart], { type: 'application/octet-stream' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `ticket-${ticket.folio}-${width}mm.escpos`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button onClick={print} disabled={!supported} title={supported ? '' : 'Requiere Chrome/Edge'}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-panel-2 text-sm font-semibold hover:bg-line disabled:opacity-40">
          <Usb size={16} /> ESC/POS USB
        </button>
        <button onClick={download}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-panel-2 text-sm font-semibold hover:bg-line">
          <Download size={16} /> Bytes .escpos
        </button>
      </div>
      {msg && <p role="status" className="text-center text-xs text-slate-400">{msg}</p>}
    </div>
  )
}
