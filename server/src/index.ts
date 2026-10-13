import { createApp } from './app'

const PORT = Number(process.env.PORT ?? 3001)

createApp().listen(PORT, '0.0.0.0', () => {
  console.log(`🍎 Frutería POS API escuchando en http://localhost:${PORT}`)
})
