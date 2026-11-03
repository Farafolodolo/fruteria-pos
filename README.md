# 🍎 Frutería POS & Currency Microservice

A local-first Point of Sale (POS) system integrated with a dedicated **USD/MXN Currency Conversion Microservice**, built for grocery stores and fruit markets.

---

## ⚡ Quick Start (Run in 3 Steps)

### Prerequisites
- **Node.js** >= 20.0.0
- **npm** >= 10.0.0

### Step 1: Clone and Install
```bash
git clone https://github.com/Farafolodolo/fruteria-pos.git
cd fruteria-pos
npm install
```
*(Workspace packages `client`, `server`, and `currency-service` will install dependencies automatically).*

### Step 2: Environment Configuration & Database Setup
```bash
# 1. Setup Currency Service environment file
cp currency-service/.env.example currency-service/.env

# 2. Initialize SQLite database & seed default demo data
npm run seed
```
> **Note for evaluators:** `EXCHANGE_API_KEY` in `currency-service/.env` is optional. If left empty, the microservice automatically falls back to the public `open.er-api.com` endpoint. No API registration or credit card is required.

### Step 3: Run All Services
```bash
npm run dev
```

All 3 applications will launch concurrently:
| Application | URL | Purpose |
| :--- | :--- | :--- |
| **POS Web Client** | http://localhost:5173 | React Touch POS interface |
| **Main Backend** | http://localhost:3001 | Express + Prisma + SQLite inventory & sales API |
| **Currency Microservice** | http://localhost:3002 | Real-time exchange rate & conversion microservice |

---

## 💵 Currency Microservice (`currency-service`)

A dedicated REST microservice built with **Express**, **TypeScript**, and **Zod** that consumes external exchange rates and provides currency conversions and offline overrides.

### Endpoints Specification

| Method | Endpoint | Headers Required | Status Codes | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | *None* | `200 OK` | Healthcheck indicator. |
| `GET` | `/api/v1/rates/usd-mxn` | *None* | `200 OK`, `502 Bad Gateway` | Returns current USD to MXN rate with a 10-minute in-memory cache. |
| `POST` | `/api/v1/convert` | `Content-Type: application/json` | `200 OK`, `400 Bad Request`, `502 Bad Gateway` | Converts amounts between `MXN` and `USD`. |
| `POST` | `/api/v1/rates/override` | `Authorization: Bearer <ADMIN_TOKEN>` or `x-api-key: <ADMIN_TOKEN>` | `200 OK`, `400 Bad Request`, `401 Unauthorized` | **Protected endpoint**: Manually sets a fixed rate for offline contingency. |
| `DELETE` | `/api/v1/rates/override` | `Authorization: Bearer <ADMIN_TOKEN>` or `x-api-key: <ADMIN_TOKEN>` | `200 OK`, `401 Unauthorized` | **Protected endpoint**: Clears the manual override and returns to dynamic API rates. |

---

## 🧪 Testing the Checklist (Evidence 3 Peer Evaluation)

### Automated Test Suite
Run all unit and integration tests across all workspaces:
```bash
npm test
```
Run typecheck across all packages:
```bash
npm run typecheck
```

### Manual API Testing (cURL Examples)

#### 1. Fetch current exchange rate (USD -> MXN) [Indicator #3, #4, #9]
```bash
curl -X GET http://localhost:3002/api/v1/rates/usd-mxn
```
*Expected response (200 OK):*
```json
{
  "from": "USD",
  "to": "MXN",
  "rate": 20.45,
  "lastUpdated": "...",
  "source": "api"
}
```

#### 2. Convert currency with validation [Indicator #3, #4, #5]
```bash
# Success (200 OK)
curl -X POST http://localhost:3002/api/v1/convert \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "from": "MXN", "to": "USD"}'

# Input Validation Error (400 Bad Request)
curl -X POST http://localhost:3002/api/v1/convert \
  -H "Content-Type: application/json" \
  -d '{"amount": -50, "from": "MXN", "to": "USD"}'
```

#### 3. Protected Endpoint: Reject without credentials [Indicator #4, #6]
```bash
# Rejected (401 Unauthorized)
curl -X POST http://localhost:3002/api/v1/rates/override \
  -H "Content-Type: application/json" \
  -d '{"manualRate": 20.50}'
```
*Expected response (401 Unauthorized):*
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing token"
}
```

#### 4. Protected Endpoint: Accept with valid credentials [Indicator #6, #7]
```bash
# Authorized (200 OK)
curl -X POST http://localhost:3002/api/v1/rates/override \
  -H "Authorization: Bearer fruteria-admin-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{"manualRate": 20.50}'
```

#### 5. Interactive Test Collection [Indicator #11]
You can also run all pre-configured tests with VS Code REST Client or IntelliJ HTTP Client by opening:
[`currency-service/requests.http`](currency-service/requests.http)

---

## 💻 POS Client Integration [Indicator #10]

The main React application (`client/`) consumes the currency microservice inside the checkout modal:
1. Open http://localhost:5173.
2. Click any fruit/product to add it to the cart.
3. Click **COBRAR (F2)** to open the payment modal.
4. Toggle the currency button to **`💵 USD`**.
5. The client fetches the current exchange rate and converts the total to USD in real-time, calculating bills and change.

---

## 🛡️ Security & Error Handling [Indicator #7, #8]
- All sensitive credentials and tokens are kept in environment variables (`.env`).
- `.env` files are ignored by `.gitignore` and `.env.example` templates are provided.
- Global error handler ensures **no stack traces or internal details are ever leaked to the client**:
  ```json
  {
    "error": "InternalServerError",
    "message": "Something went wrong"
  }
  ```

---

## 📁 Repository Structure

```text
fruteria-pos/
├── package.json              # Root npm workspaces configuration
├── client/                   # Vite + React 19 + TypeScript + Tailwind POS frontend
│   └── src/
│       ├── components/PaymentModal.tsx  # Consumes the currency microservice
│       └── lib/useCurrency.ts           # Hook communicating with currency-service
├── server/                   # Express + Prisma + SQLite core inventory/sales backend
└── currency-service/         # Express + TypeScript + Zod currency microservice
    ├── .env.example          # Environment variables template
    ├── requests.http         # Ready-to-run HTTP test collection
    ├── README.md             # Microservice detailed documentation
    └── src/
        ├── app.ts            # Express app & error handler
        ├── routes/           # Rates and Convert routes
        └── services/         # External API client, cache & override logic
```

---

## 📜 Available Scripts

- `npm run dev`: Starts `server`, `client`, and `currency-service` concurrently.
- `npm run dev -w currency-service`: Starts only the currency microservice.
- `npm run seed`: Resets and seeds the SQLite database with initial demo products.
- `npm test`: Runs automated test suites across all packages.
- `npm run typecheck`: Runs TypeScript type checking across all packages.
- `npm run build`: Builds all workspaces for production.
