# 💵 Frutería POS - Microservicio de Divisas (`currency-service`)

Microservicio REST desarrollado en **Express**, **TypeScript** y validado con **Zod**, diseñado para la consulta en tiempo real y conversión de tipos de cambio (USD / MXN), integración con ExchangeRate-API, contingencia offline y conexión con el punto de venta `fruteria-pos`.

---

## 🚀 Características Principales

- **Consumo de API Externa**: Consume ExchangeRate-API (`v6.exchangerate-api.com`) con fallback automático a `open.er-api.com` cuando no se dispone de clave de API.
- **Caché en Memoria**: Almacenamiento temporal de tipos de cambio por 10 minutos para optimizar tiempos de respuesta y no agotar la cuota de peticiones.
- **Modo de Contingencia Offline**: Endpoint protegido para fijar manualmente el tipo de cambio cuando la sucursal experimenta fallos de conectividad.
- **Validación Estricta**: Esquemas de validación con Zod asegurando montos positivos y monedas válidas.
- **Seguridad**:
  - Middleware de autenticación por Bearer Token y `x-api-key`.
  - Middleware global de captura de errores sin filtrado de stack traces (`error.stack`) al cliente.
  - Soporte CORS para comunicación con el frontend.

---

## 📋 Requisitos Previos

- **Node.js**: v20 o superior
- **npm**: v10 o superior

---

## ⚙️ Instalación y Configuración

### 1. Navegar a la carpeta del microservicio
```bash
cd currency-service
```

### 2. Instalar dependencias
```bash
npm install
```
*(Nota: Si ejecutas `npm install` desde la raíz del repositorio, las dependencias de este microservicio se instalarán automáticamente gracias a los workspaces de npm).*

### 3. Configurar variables de entorno
Copia la plantilla de variables de entorno:
```bash
# En Windows (PowerShell):
Copy-Item .env.example .env

# En Linux / macOS / Git Bash:
cp .env.example .env
```

Contenido de `.env`:
```env
PORT=3002
EXCHANGE_API_KEY=
ADMIN_TOKEN=fruteria-admin-secret-2026
```
> **Nota para evaluadores**: Si `EXCHANGE_API_KEY` se deja vacía, el microservicio consumirá automáticamente el endpoint público gratuito de `https://open.er-api.com/v6/latest/USD`, por lo que **no se requiere registrar ninguna tarjeta ni API Key para probarlo**.

---

## 🏃 Modo de Ejecución

### En desarrollo (con recarga automática):
```bash
npm run dev
```

### En producción:
```bash
npm start
```

### Verificación de tipos TypeScript:
```bash
npm run typecheck
```

Por defecto, el servicio se iniciará en `http://localhost:3002`.

---

## 📡 Tabla de Endpoints de la API

| Método | Endpoint | Cabeceras Requeridas | Códigos de Estado | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Ninguna | `200 OK` | Verificación de estado del microservicio. |
| `GET` | `/api/v1/rates/usd-mxn` | Ninguna | `200 OK`<br>`502 Bad Gateway` | Obtiene el tipo de cambio actual USD -> MXN con caché de 10 minutos. |
| `POST` | `/api/v1/convert` | `Content-Type: application/json` | `200 OK`<br>`400 Bad Request`<br>`502 Bad Gateway` | Convierte un monto entre MXN y USD. |
| `POST` | `/api/v1/rates/override` | `Authorization: Bearer <TOKEN>` o `x-api-key: <TOKEN>`<br>`Content-Type: application/json` | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized` | Fija manualmente la tasa de cambio para contingencia offline. |
| `DELETE` | `/api/v1/rates/override` | `Authorization: Bearer <TOKEN>` o `x-api-key: <TOKEN>` | `200 OK`<br>`401 Unauthorized` | Elimina la tasa manual y vuelve a consultar la API externa/caché. |

---

## 🧪 Ejemplos de Peticiones cURL para Pruebas

### 1. Obtener tipo de cambio actual (USD -> MXN)
```bash
curl -X GET http://localhost:3002/api/v1/rates/usd-mxn
```

**Respuesta Exitosa (200 OK):**
```json
{
  "from": "USD",
  "to": "MXN",
  "rate": 20.45,
  "lastUpdated": "Wed, 29 Oct 2026 00:00:01 +0000",
  "source": "api"
}
```

---

### 2. Conversión de divisas (MXN a USD)
```bash
curl -X POST http://localhost:3002/api/v1/convert \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "from": "MXN", "to": "USD"}'
```

**Respuesta Exitosa (200 OK):**
```json
{
  "originalAmount": 100,
  "from": "MXN",
  "to": "USD",
  "rate": 0.0489,
  "result": 4.89
}
```

---

### 3. Conversión de divisas con error de validación (Monto negativo)
```bash
curl -X POST http://localhost:3002/api/v1/convert \
  -H "Content-Type: application/json" \
  -d '{"amount": -20, "from": "MXN", "to": "USD"}'
```

**Respuesta de Error (400 Bad Request):**
```json
{
  "error": "ValidationError",
  "message": "Invalid conversion parameters",
  "details": [
    {
      "code": "too_small",
      "minimum": 0,
      "type": "number",
      "inclusive": false,
      "exact": false,
      "message": "amount must be a number greater than 0",
      "path": ["amount"]
    }
  ]
}
```

---

### 4. Override de tasa manual sin token (Rechazo 401 Unauthorized)
```bash
curl -X POST http://localhost:3002/api/v1/rates/override \
  -H "Content-Type: application/json" \
  -d '{"manualRate": 20.50}'
```

**Respuesta (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing token"
}
```

---

### 5. Override de tasa manual autorizado (200 OK)
```bash
curl -X POST http://localhost:3002/api/v1/rates/override \
  -H "Authorization: Bearer fruteria-admin-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{"manualRate": 20.50}'
```

**Respuesta Exitosa (200 OK):**
```json
{
  "message": "Manual exchange rate set successfully",
  "manualRate": 20.5,
  "updatedAt": "2026-10-28T23:45:00.000Z"
}
```

---

### 6. Peticiones Interactivas en VS Code
También se incluye el archivo listo para ejecutar `requests.http` compatible con la extensión **REST Client** de VS Code o el cliente HTTP de JetBrains / WebStorm.

---

## 🛡️ Formato de Errores Globales

Todas las respuestas de error respetan una estructura JSON uniforme y **nunca exponen trazas de pila (stack traces)** al cliente:

```json
{
  "error": "InternalServerError",
  "message": "Something went wrong"
}
```

Si la API externa falla o no responde, el servicio responde adecuadamente:
```json
{
  "error": "ExternalApiError",
  "message": "Failed to fetch exchange rates"
}
```
con código HTTP `502 Bad Gateway`.

