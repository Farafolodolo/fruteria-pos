# API local

Base: `http://localhost:3001/api` · JSON · errores `{ "error": "mensaje" }` (400 validación, 404, 409 duplicado).

## Productos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/products?category=&q=&includeInactive=1` | Catálogo (por defecto sólo activos) |
| GET | `/products/lookup?code=` | Coincidencia exacta por código de barras o PLU |
| GET | `/products/best-sellers?limit=12` | Más vendidos por líneas de venta |
| GET | `/products/low-stock` | `stock <= minStock` |
| GET | `/products/:id` | Detalle |
| POST | `/products` | Crear (abarrotes por pieza requieren `barcode`) |
| PUT | `/products/:id` | Actualizar parcial |
| POST | `/products/:id/stock` | `{ "delta": 5.5 }` ajuste de inventario |
| DELETE | `/products/:id` | Baja lógica (`isActive=false`) |

## Ventas

`POST /sales`

```json
{
  "items": [
    { "productId": "…", "quantity": 1.345, "discountPercent": 30 },
    { "productId": "…", "quantity": 2 }
  ],
  "paymentMethod": "CASH",
  "amountPaid": 100,
  "customerPhone": "6141234567"
}
```

- El servidor **recalcula** precios, descuentos y total con la BD.
- Productos `UNIT` exigen cantidad entera; `CASH` exige `amountPaid >= total`; tarjeta/transferencia cobran exacto.
- Asigna `folio` consecutivo y descuenta stock en una sola transacción.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/sales?date=YYYY-MM-DD` | Ventas del día (hoy por defecto) |
| GET | `/sales/:id` | Venta con partidas |

## Merma

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/waste` | `{ productId, quantity, reason }` con `reason` ∈ MADURACION, PODRIDO, GOLPEADO, CADUCADO. Pérdida = cantidad × **costo**; descuenta stock. |
| GET | `/waste?date=` | `{ records, totalLoss }` |
| DELETE | `/waste/:id` | Revierte y devuelve el stock |

## Caja

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/cash` | `{ type: INFLOW\|OUTFLOW, amount, category, note }`; `category` ∈ PROVEEDOR_MERCANCIA, GASTO_LOCAL, FONDO_INICIAL, RETIRO (el fondo inicial sólo es entrada) |
| GET | `/cash?date=` | Movimientos del día |
| DELETE | `/cash/:id` | Elimina un movimiento |

## Reportes

`GET /reports/cut?type=X|Z&date=YYYY-MM-DD`

```
efectivo esperado = fondo inicial + otras entradas + ventas en efectivo − salidas
utilidad bruta    = venta neta − costo de lo vendido
```

Devuelve ventas por método de pago, descuentos, ticket promedio, bloque de caja, mermas, utilidad (y tras merma), top 5 productos y movimientos.
