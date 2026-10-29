import { createApp } from './app'
import { config } from './config'

const app = createApp()

app.listen(config.port, '0.0.0.0', () => {
  console.log(`💵 Frutería POS - Microservicio de Divisas iniciado en http://localhost:${config.port}`)
})

