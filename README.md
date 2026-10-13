# 🍎 Frutería POS

Punto de Venta **local-first** para frutería y abarrotes con venta híbrida **por peso (kg / gramos)** y **por pieza / código de barras**. Funciona 100 % sin internet: un servidor local (Express + SQLite) y una interfaz React pensada para pantalla táctil y atajos de teclado.

![stack](https://img.shields.io/badge/React-19-61dafb) ![ts](https://img.shields.io/badge/TypeScript-5.7-3178c6) ![vite](https://img.shields.io/badge/Vite-6-646cff) ![tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8) ![prisma](https://img.shields.io/badge/Prisma-6-2d3748) ![sqlite](https://img.shields.io/badge/SQLite-local-003b57)

---

## ⚡ Instalación en un solo paso

Requisitos: **Node.js ≥ 20** (probado en 22).

```bash
git clone https://github.com/Farafolodolo/fruteria-pos.git
cd fruteria-pos
npm install && npm run seed && npm run dev
```

| Servicio | URL |
|----------|-----|
| Interfaz POS | http://localhost:5173 |
| API local | http://localhost:3001/api/health |

- `npm install` instala ambos workspaces y genera el cliente de Prisma (`postinstall`).
- `npm run seed` crea `server/prisma/dev.db` (SQLite) y la puebla con productos mexicanos reales, ventas demo y fondo inicial. **Es destructivo**: reinicia los datos.
- `npm run dev` levanta API (puerto 3001) y cliente Vite (5173) con recarga en caliente.

Otros scripts: `npm test` · `npm run typecheck` · `npm run build`.

---

## 🖥️ Vista de la Terminal POS (esquema)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🍏 Frutería La Fresca │ 🔍 Buscar nombre / código de barras / PLU (F1)      │Venta│Merma│Caja│
│                       │                                    [REMATE OFF] ● Modo emulador 12:41│
├───────────────────────────────────────────────────────────────┬─────────────────────────────┤
│ [🍎 Frutas] [🥬 Verduras] [🛒 Abarrotes] [🔥 Más Vendidos]     │ 🧺 Compra actual            │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                   │                             │
│ │   🍌   │ │   🍋   │ │   🥑   │ │   🍎   │                   │ 🍌 Plátano Tabasco          │
│ │Plátano │ │ Limón  │ │Aguacate│ │Manzana │                   │   1.350 kg × $22.00/kg      │
│ │$22/kg  │ │$38/kg  │ │$89/kg  │ │$52/kg  │                   │                    $29.70   │
│ │PLU 4011│ │PLU 4048│ │PLU 4225│ │PLU 4133│                   │ 🥤 Coca-Cola 600ml          │
│ └────────┘ └────────┘ └────────┘ └────────┘                   │   [-] 2 [+] × $20.00/pz     │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                   │                    $40.00   │
│ │   🍊   │ │   🍉   │ │   🥭   │ │   🍓   │                   │                             │
│ │ ...    │ │ ...    │ │ ...    │ │ ...    │                   │ Subtotal (2)       $69.70   │
│ └────────┘ └────────┘ └────────┘ └────────┘                   │ TOTAL              $69.70   │
│                                                               │ [   COBRAR (F2)   ]         │
└───────────────────────────────────────────────────────────────┴─────────────────────────────┘
```

### Modal de pesaje

```
┌──────────────────────── Pesar producto ─────────────────────────┐
│ 🍅 Jitomate Saladet            $28.00 / kg · PLU 4087           │
│ ● Modo emulador   [ 1.350 kg  ESTABLE ]   ▬▬▬▬●▬▬▬▬ (slider)    │
│ Peso bruto (kg)  [-] [  1.358  ] [+] [↺]                        │
│ [+100 g] [+250 g] [+500 g] [+1 kg]                              │
│ Tara: (Sin tara) (Bolsa 8 g) (Bolsa grande 15 g) (Charola 40 g) │
│ Bruto 1.358 kg | Tara -0.008 kg | Neto 1.350 kg                 │
│ 1.350 kg × $28.00 = $37.80                                      │
│ [        Agregar a la compra (Enter)        ]                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Arquitectura

```
                ┌──────────────────────────── Navegador (Chrome / Edge) ───────────────────────────┐
                │  React 19 + TS + Tailwind 4 + Radix UI + Lucide                                  │
                │                                                                                  │
                │  App.tsx ── vistas: Venta │ Merma │ Caja        atajos: F1 F2 F3 F4 Esc          │
                │    │                                                                             │
                │    ├─ lib/cart.ts ........ carrito + totales exactos (enteros)                   │
                │    ├─ lib/scale.ts ....... Web Serial (Torrey/Rhino) + EMULADOR  ──► USB/RS-232  │
                │    ├─ lib/useBarcodeScanner ... lector "keyboard wedge" por temporización        │
                │    ├─ lib/escpos.ts ...... bytes ESC/POS 58/80 mm ──► impresora térmica (Serial) │
                │    ├─ lib/ticket.ts ...... ticket HTML imprimible + mensaje WhatsApp / Web Share │
                │    └─ lib/sound.ts ....... beeps WebAudio (escaneo, agregado, cobro, error)      │
                └───────────────────────────────┬──────────────────────────────────────────────────┘
                                                │ fetch /api/*  (proxy de Vite en dev)
                                                ▼
                ┌──────────────────────── Servidor local :3001 (Node + Express + TS) ──────────────┐
                │  routes/products  routes/sales  routes/waste  routes/cash  routes/reports        │
                │  lib/money.ts ... aritmética en centavos / gramos con redondeo half-up           │
                │  lib/cashCut.ts .. corte X / Z                                                   │
                │  zod: validación  ·  Prisma Client: acceso a datos  (transacciones)              │
                └───────────────────────────────┬──────────────────────────────────────────────────┘
                                                ▼
                                   server/prisma/dev.db  (SQLite, un solo archivo)
```

### Estructura del repositorio

```
fruteria-pos/
├─ package.json              # npm workspaces + scripts raíz
├─ client/                   # Vite + React
│  └─ src/
│     ├─ App.tsx
│     ├─ components/         # ProductGrid, CartSidebar, WeightModal, PaymentModal, TicketModal,
│     │                      # ScalePanel, PrintActions, RemateToggle, WastePage, CashPage, Modal
│     └─ lib/                # cart, money, scale, escpos, ticket, sound, api, useBarcodeScanner
└─ server/
   ├─ prisma/ schema.prisma · seed.ts
   └─ src/ app.ts · index.ts · db.ts · lib/ · routes/
```

---

## 🗄️ Modelo de datos

```
Product ──< SaleItem >── Sale            Product ──< WasteRecord         CashMovement
 id, barcode?, plu?, name,                id, folio, subtotal,            id, productId, quantity,       id, type (INFLOW|OUTFLOW),
 category, soldBy (WEIGHT|UNIT),          discount, total,                reason, estimatedLoss,         amount, category, note,
 price, cost, stock, minStock,            paymentMethod, amountPaid,      recordedAt                     createdAt
 imageUrl?, isActive                      changeGiven, customerPhone?
```

Detalles en [`server/prisma/schema.prisma`](server/prisma/schema.prisma). Notas:

- `stock`, `quantity`: `Float` con 3 decimales efectivos (24.500 kg / 12.0 pz).
- **Folio**: SQLite sólo permite `autoincrement` en la llave primaria, por lo que `folio` es `Int @unique` asignado como `max + 1` **dentro de la transacción** de venta.
- `SaleItem.subtotal` es el importe **bruto** de la línea y `SaleItem.discount` el monto descontado (neto = subtotal − discount). Se guarda `productName` como instantánea para el ticket.

---

## 🧮 Precisión financiera

Los flotantes de JavaScript no son seguros para dinero (`0.1 + 0.2 ≠ 0.3`). Todo cálculo usa **enteros**:

- Cantidad → gramos enteros (`round(qty × 1000)`), dinero → centavos.
- Importe de línea: `round( gramos × precio_en_centavos / 1000 )` (half-up).
- `1.350 kg × $28.00 = $37.80`, `0.333 kg × $22 = $7.33`, `1.345 kg × $89 = $119.71`.
- **El servidor recalcula todo** con los precios de la base de datos; el cliente nunca decide el total.

Cubierto por pruebas (`npm test`).

---

## ✅ Funcionalidades

| Módulo | Qué hace |
|--------|----------|
| **Terminal POS** | Pestañas Frutas / Verduras / Abarrotes / Más Vendidos, búsqueda universal (nombre, código de barras, PLU), carrito en vivo con edición rápida, alertas de stock bajo. |
| **Pesaje** | Modal con +100 g / +250 g / +500 g / +1 kg, entrada decimal, **tara** (bolsa, charola, personalizada), báscula serial o emulador con lectura en tiempo real. |
| **Cobro** | Teclado numérico, billetes rápidos $50/$100/$200/$500, botón *Exacto*, cambio instantáneo, efectivo / tarjeta / transferencia. |
| **Ticket** | Vista previa térmica 58 / 80 mm, impresión del navegador, **ESC/POS** por USB-serial o archivo `.escpos`, **WhatsApp** con emojis y Web Share. |
| **Remate** | Toggle en cabecera: −30 % / −50 % exprés en frutas y verduras; el descuento queda registrado por línea. |
| **Merma** (F4) | Selección del producto, peso o piezas, motivo (maduración, podrido, golpeado, caducado), pérdida al costo, descuento de inventario y deshacer. |
| **Caja y gastos** (F3) | Fondo inicial, pagos a proveedor, gastos, retiros. **Corte X / Z** con ventas por método, efectivo esperado en cajón, mermas y utilidad. |

### ⌨️ Atajos

| Tecla | Acción |
|-------|--------|
| `F1` | Buscar (vuelve a Venta) |
| `F2` | Cobrar |
| `F3` | Caja y corte |
| `F4` | Merma |
| `Esc` | Cancelar venta / cerrar modal / volver a Venta |
| `Enter` | Confirmar (búsqueda, peso, cobro, nueva venta) |

---

## 🔌 Hardware

Consulta [`docs/HARDWARE.md`](docs/HARDWARE.md) para báscula, lector de códigos e impresora. Resumen:

- **Báscula Torrey / Rhino** vía Web Serial (Chrome / Edge, `localhost` o HTTPS). Sin hardware, usa el **emulador** interactivo.
- **Lector de código de barras** USB en modo teclado: se detecta por velocidad de tecleo, no requiere configuración.
- **Impresora térmica ESC/POS** 58 / 80 mm (CP858 para acentos y ñ).

## 📚 API

Referencia de endpoints en [`docs/API.md`](docs/API.md).

---

## 🌿 Flujo de trabajo Git

Cada hito se desarrolló en una rama temática con *Conventional Commits* y se fusionó a `main` con `--no-ff`:

```
setup/project-scaffolding        feat/db-sqlite-prisma           feat/backend-api-engine
feat/pos-terminal-ui             feat/scale-and-scanner-integration
feat/waste-and-discount-system   feat/cash-flow-and-reports      docs/production-readme
```

```bash
git log --oneline --graph
```

## 🧯 Solución de problemas

| Problema | Solución |
|----------|----------|
| La UI muestra “¿Está corriendo el servidor?” | Ejecuta `npm run dev` (levanta ambos procesos) y revisa que el puerto 3001 esté libre. |
| `prisma generate` falla tras clonar | `npm run db:generate -w server` |
| Quiero reiniciar los datos | `npm run seed` |
| El botón de báscula está deshabilitado | Web Serial sólo existe en Chrome / Edge sobre `localhost` o HTTPS. |
| Los acentos salen mal en el ticket térmico | Verifica que la impresora soporte CP858 (tabla 19 en ESC/POS). |

## 📝 Licencia

MIT — úsalo y adáptalo para tu negocio.
