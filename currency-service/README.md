# 💵 Currency Microservice (`currency-service`)

A dedicated REST microservice built with **Express**, **TypeScript**, and **Zod** for real-time exchange rates (USD / MXN), third-party API integration with fallback, offline contingency rate override, and seamless connection with the `fruteria-pos` main system.

---

## 🚀 Key Features

- **Third-Party API Consumption**: Consumes ExchangeRate-API with automatic fallback to `https://open.er-api.com/v6/latest/USD` when no API key is provided.
- **In-Memory Caching**: 10-minute cache window to preserve API rate limits and deliver fast responses.
- **Offline Contingency Mode**: Protected admin endpoint to manually set exchange rates if internet connectivity drops.
- **Strict Input Validation**: Zod schema validation ensuring positive numbers and valid currency codes.
- **Security & Error Sanitization**:
  - Bearer Token and `x-api-key` header authentication.
  - Global error handler that prevents leaking any stack traces (`error.stack`) or internal server details.
  - CORS enabled for client application requests.

---

## 📋 Prerequisites

- **Node.js**: >= 20.0.0
- **npm**: >= 10.0.0

---

## ⚙️ Installation & Configuration

### 1. Navigate to the microservice directory
```bash
cd currency-service
```

### 2. Install dependencies
```bash
npm install
```
*(Note: Running `npm install` from the repository root also installs this package via npm workspaces).*

### 3. Environment Variables
Copy the example environment file:
```bash
# Windows (PowerShell):
Copy-Item .env.example .env

# Linux / macOS / Git Bash:
cp .env.example .env
```

Configuration in `.env`:
```env
PORT=3002
EXCHANGE_API_KEY=
ADMIN_TOKEN=fruteria-admin-secret-2026
```
> **Peer Evaluation Note**: If `EXCHANGE_API_KEY` is left blank, the microservice automatically defaults to the free public endpoint `https://open.er-api.com/v6/latest/USD`. No API registration or credit card is required.

---

## 🏃 Execution

### Development mode (with hot-reload):
```bash
npm run dev
```

### Run tests:
```bash
npm test
```

### Type checking:
```bash
npm run typecheck
```

By default, the microservice runs on `http://localhost:3002`.

---

## 📡 API Endpoints Specification

| Method | Endpoint | Required Headers | Status Codes | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | *None* | `200 OK` | Service health status. |
| `GET` | `/api/v1/rates/usd-mxn` | *None* | `200 OK`<br>`502 Bad Gateway` | Returns current USD -> MXN rate with 10-min in-memory cache. |
| `POST` | `/api/v1/convert` | `Content-Type: application/json` | `200 OK`<br>`400 Bad Request`<br>`502 Bad Gateway` | Converts an amount between MXN and USD. |
| `POST` | `/api/v1/rates/override` | `Authorization: Bearer <ADMIN_TOKEN>` or `x-api-key: <ADMIN_TOKEN>`<br>`Content-Type: application/json` | `200 OK`<br>`400 Bad Request`<br>`401 Unauthorized` | **Protected**: Manually overrides exchange rate for offline use. |
| `DELETE` | `/api/v1/rates/override` | `Authorization: Bearer <ADMIN_TOKEN>` or `x-api-key: <ADMIN_TOKEN>` | `200 OK`<br>`401 Unauthorized` | **Protected**: Clears manual override and resumes dynamic rates. |

---

## 🧪 Testing with cURL

### 1. Get current exchange rate (USD -> MXN)
```bash
curl -X GET http://localhost:3002/api/v1/rates/usd-mxn
```

**Response (200 OK):**
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

### 2. Convert currency (MXN to USD)
```bash
curl -X POST http://localhost:3002/api/v1/convert \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "from": "MXN", "to": "USD"}'
```

**Response (200 OK):**
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

### 3. Convert currency with validation error (Negative amount)
```bash
curl -X POST http://localhost:3002/api/v1/convert \
  -H "Content-Type: application/json" \
  -d '{"amount": -20, "from": "MXN", "to": "USD"}'
```

**Error Response (400 Bad Request):**
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

### 4. Protected endpoint without credentials (401 Unauthorized)
```bash
curl -X POST http://localhost:3002/api/v1/rates/override \
  -H "Content-Type: application/json" \
  -d '{"manualRate": 20.50}'
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing token"
}
```

---

### 5. Protected endpoint with valid credentials (200 OK)
```bash
curl -X POST http://localhost:3002/api/v1/rates/override \
  -H "Authorization: Bearer fruteria-admin-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{"manualRate": 20.50}'
```

**Response (200 OK):**
```json
{
  "message": "Manual exchange rate set successfully",
  "manualRate": 20.5,
  "updatedAt": "2026-10-28T23:45:00.000Z"
}
```

---

### 6. Interactive Testing via VS Code
Use the pre-configured collection [`requests.http`](requests.http) with the **REST Client** extension for VS Code or IntelliJ HTTP client.

---

## 🛡️ Error Response Standards

All error responses strictly omit stack traces and follow clean JSON schemas:

```json
{
  "error": "InternalServerError",
  "message": "Something went wrong"
}
```

When the upstream external rate API is unreachable:
```json
{
  "error": "ExternalApiError",
  "message": "Failed to fetch exchange rates"
}
```
with HTTP status `502 Bad Gateway`.
