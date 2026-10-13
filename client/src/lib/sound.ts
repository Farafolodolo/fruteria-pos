/** Feedback sonoro (WebAudio, sin archivos externos) */
let ctx: AudioContext | null = null

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.08) {
  ctx ??= new AudioContext()
  const t0 = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + dur)
}

export const sound = {
  /** Beep de escaneo */
  scan: () => { try { tone(1800, 0, 0.09, 'square', 0.05) } catch { /* sin audio */ } },
  /** Producto agregado */
  add: () => { try { tone(660, 0, 0.08); tone(880, 0.07, 0.1) } catch { /* sin audio */ } },
  /** Venta cobrada */
  success: () => { try { tone(523, 0, 0.12); tone(659, 0.1, 0.12); tone(784, 0.2, 0.2) } catch { /* sin audio */ } },
  /** Error / no encontrado */
  error: () => { try { tone(180, 0, 0.25, 'sawtooth', 0.07) } catch { /* sin audio */ } },
}
