# Bitácora de Desarrollo (Development Log) — Frutería POS

Registro cronológico de ingeniería, decisiones de arquitectura, pruebas automatizadas, configuración de CI/CD y despliegue en la nube del proyecto **Frutería POS**.

---

## Entrada 1 — Auditoría de entorno limpio, scripts de producción y endpoint `/api/health`

- **Fecha:** 2026-11-23
- **Qué se hizo:**
  - Se auditó la configuración de workspaces en `package.json` (raíz), `server/package.json` y `client/package.json`.
  - Se agregó el script `"start": "npm run start -w server"` en el `package.json` raíz para ejecución directa en producción.
  - Se actualizó `server/src/app.ts` para que `GET /api/health` devuelva `{ status: "ok", ok: true, time: "<ISO-8601>" }` y sirva automáticamente los archivos estáticos compilados de `client/dist` con fallback SPA para rutas no pertenecientes a `/api`.
  - Se reforzó `.gitignore` (excluyendo `.env.*` con excepción de `!.env.example`, además de `*.db`, `dist/` y `node_modules/`) y se creó `.env.example` sin secretos.
- **Por qué:**
  - Garantizar que cualquier desarrollador o contenedor de CI/despliegue pueda clonar el repositorio desde cero (`git clone` → `npm ci` → `npm test` → `npm run build` → `npm start`) sin depender de archivos `.env` con secretos ni servidores externos, y que el backend sirva la aplicación completa en un solo puerto en producción.
- **Evidencia:**
  - Commit [`8229ec2`](https://github.com/Farafolodolo/fruteria-pos/commit/8229ec2): `chore(repo): verify root scripts, health endpoint, and clean-clone setup`
  - Archivos: [`package.json`](../package.json), [`server/src/app.ts`](../server/src/app.ts), [`.gitignore`](../.gitignore), [`.env.example`](../.env.example).
- **Problemas encontrados y solución:**
  - *Problema:* El `package.json` raíz no contaba con el script `npm start`, `server/src/app.ts` respondía `404 {"error":"Ruta no encontrada"}` al solicitar `/` en producción porque no servía `client/dist`, y `/api/health` solo incluía `{ ok: true }` sin la propiedad estándar `{ status: "ok" }`.
  - *Solución:* Se añadió `npm start` en la raíz, se incorporó detección de `client/dist` mediante `fs.existsSync` + `express.static` en `server/src/app.ts`, y se incluyó `status: "ok"` en `/api/health` manteniendo `ok: true` por retrocompatibilidad.

---

## Entrada 2 — Refactorización de lógica de negocio pura y validación defensiva de entradas

- **Fecha:** 2026-11-23
- **Qué se hizo:**
  - En `server/src/lib/money.ts` y `client/src/lib/money.ts`, se incorporaron validaciones estrictas (`RangeError`) frente a números no finitos (`NaN`, `Infinity`), pesos negativos y precios/costos negativos, además de crear la función pura `calculateChange(total, amountPaid, paymentMethod)`.
  - En `server/src/lib/cashCut.ts`, se extrajo la función pura `computeCashCut(type, date, sales, movements, waste)` separando el cálculo financiero del corte X/Z de las consultas Prisma en `buildCashCut`.
  - En `client/src/lib/cart.ts`, se extrajeron las funciones puras `addCartLine`, `updateCartLineQty` y `calcCartTotals` para poder probar toda la lógica del carrito sin requerir renderizado DOM de React.
- **Por qué:**
  - Permitir que las pruebas unitarias verifiquen el 100 % de las reglas financieras del POS (corte de caja, cambio, descuentos de remate y carrito híbrido peso/pieza) en milisegundos y sin requerir una base de datos SQLite levantada ni navegador.
- **Evidencia:**
  - Commit [`83493f3`](https://github.com/Farafolodolo/fruteria-pos/commit/83493f3): `test: add normal, edge, and invalid unit tests for server and client`
  - Archivos: [`server/src/lib/money.ts`](../server/src/lib/money.ts), [`server/src/lib/cashCut.ts`](../server/src/lib/cashCut.ts), [`client/src/lib/money.ts`](../client/src/lib/money.ts), [`client/src/lib/cart.ts`](../client/src/lib/cart.ts).
- **Problemas encontrados y solución:**
  - *Problema:* Originalmente `buildCashCut` ejecutaba `prisma.sale.findMany` directamente y `useCart` acoplaba la acumulación de líneas a `useState`, lo que impedía probar casos borde e inválidos en `npm test` sin levantar base de datos; asimismo, `lineTotal(-1, 28)` devolvía un importe negativo en vez de lanzar un error.
  - *Solución:* Se separó la capa de cálculo puro (`computeCashCut`, `addCartLine`, `updateCartLineQty`, `calcCartTotals`, `calculateChange`) manteniendo intacta la firma pública de `buildCashCut` y `useCart`, y se añadieron guardas `RangeError` para entradas negativas o `NaN`.

---

## Entrada 3 — Ampliación de la suite de pruebas unitarias (Normal, Edge e Invalid cases)

- **Fecha:** 2026-11-23
- **Qué se hizo:**
  - Se amplió la suite de pruebas de 10 a **26 pruebas unitarias** distribuidas en 4 archivos (`server/src/lib/money.test.ts`, `server/src/lib/cashCut.test.ts`, `client/src/lib/cart.test.ts` y `client/src/lib/hardware.test.ts`).
  - Se etiquetaron y cubrieron explícitamente las 3 categorías:
    - **Normal cases (10 tests):** totales por kilo y por pieza, cálculo de cambio (`CASH`, `CARD`, `TRANSFER`), margen de utilidad, corte de caja X/Z con ventas mixtas y merma, acumulación de piezas vs. separación de bolsas pesadas en carrito, tramas de báscula `Torrey/Rhino`, `CP858`/`ESC/POS` y URL de ticket para WhatsApp.
    - **Edge cases (10 tests):** cantidades en `0`, pesadas mínimas de `0.001 kg` (1 gramo), redondeo *half-up* en fronteras de medio centavo (`0.333 kg × $22`, `1.345 kg × $89`), modo remate (`30%`, `50%`, `100%` y saturación `>100%`), corte de caja en turno vacío (`0` ventas), carrito vacío y eliminación de línea al actualizar cantidad a `0`.
    - **Invalid cases (6 suites con múltiples aserciones):** pesos negativos, precios negativos, entradas `NaN`/`Infinity`, pago en efectivo insuficiente (`amountPaid < total`), tipo de corte inválido, montos de caja/merma negativos y tramas seriales corruptas (`ERR_OVERLOAD`, cadenas vacías, pesos negativos de tara).
- **Por qué:**
  - Cumplir con el estándar de calidad y cobertura de pruebas unitarias automatizadas para prevenir regresiones en cálculos monetarios e integraciones de hardware del POS.
- **Evidencia:**
  - Commit [`83493f3`](https://github.com/Farafolodolo/fruteria-pos/commit/83493f3): `test: add normal, edge, and invalid unit tests for server and client`
  - Ejecución local y en CI: `npm test` → `16 pass` en `@fruteria/server` y `10 pass` en `@fruteria/client` (`0 fail`).
- **Problemas encontrados y solución:**
  - *Problema:* En el modal de pesaje (`WeightModal.tsx`), cuando el usuario aún no escribe un peso, `net` vale `0` y se invoca `lineTotal(0, product.price)`. Si la validación rechazaba `quantity <= 0`, habría roto el estado inicial en `0.000 kg`.
  - *Solución:* Se definió que `quantity === 0` y `unitPrice === 0` son **Edge cases** válidos que devuelven `$0.00`, mientras que valores estrictamente negativos (`< 0`) o no finitos (`NaN`, `Infinity`) son **Invalid cases** que lanzan `RangeError`.

---

## Entrada 4 — Implementación del pipeline de CI con GitHub Actions (`.github/workflows/ci.yml`)

- **Fecha:** 2026-11-23
- **Qué se hizo:**
  - Se creó el workflow `.github/workflows/ci.yml` disparado automáticamente en `push` a `main` y `pull_request` hacia `main`.
  - Se configuró el job `test-and-build` (**`Test and Build`**) sobre `ubuntu-latest` con Node.js 20 (`actions/setup-node@v4` con `cache: 'npm'`), ejecutando en orden: `actions/checkout@v4`, `npm ci`, `npx prisma generate` (en `./server`), `npm test` y `npm run build`.
- **Por qué:**
  - Automatizar la validación de pruebas unitarias y compilación TypeScript/Vite en cada cambio propuesto, sirviendo como control de calidad obligatorio antes de integrar código en `main`.
- **Evidencia:**
  - Commit [`252f4ff`](https://github.com/Farafolodolo/fruteria-pos/commit/252f4ff): `ci: add GitHub Actions workflow for automated tests and build`
  - Archivo: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
  - Historial de ejecuciones: [GitHub Actions — Workflow CI](https://github.com/Farafolodolo/fruteria-pos/actions)
- **Problemas encontrados y solución:**
  - *Problema:* El comando `npm run build` ejecuta `tsc -p tsconfig.json --noEmit` en `server/`, el cual importa tipos generados de `@prisma/client` (`PrismaClient`, `Prisma.ProductCreateInput`). Si los artefactos de Prisma no están generados en un runner limpio, el build falla por tipos inexistentes.
  - *Solución:* Además del script `postinstall` de la raíz, se añadió un paso explícito `npx prisma generate` con `working-directory: ./server` dentro de `.github/workflows/ci.yml` para garantizar la disponibilidad de tipos antes de `npm test` y `npm run build`.

---

## Entrada 5 — Configuración de ruta de despliegue (`render.yaml`, `docs/DEPLOYMENT.md`) y actualización de `README.md`

- **Fecha:** 2026-11-23
- **Qué se hizo:**
  - Se creó `render.yaml` en la raíz para despliegue reproducible como servicio web Node.js en Render (`buildCommand: npm ci --include=dev && npm run seed && npm run build`, `startCommand: npm start`, `healthCheckPath: /api/health`).
  - Se redactó la guía [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) estructurada en las 5 fases requeridas: **1. Before**, **2. Deploy**, **3. Verify**, **4. Roll back** y **5. Record**.
  - Se actualizó [`README.md`](../README.md) con secciones verificadas de **Install**, **Run**, **Test**, **Deploy** y **CI & Branching Rules**.
- **Por qué:**
  - Documentar un procedimiento de despliegue y reversión sin ambigüedades que cualquier integrante del equipo pueda ejecutar y verificar de extremo a extremo.
- **Evidencia:**
  - Commit de despliegue [`191fbc8`](https://github.com/Farafolodolo/fruteria-pos/commit/191fbc8): `docs(deploy): add deployment configuration and docs/DEPLOYMENT.md`
  - Commit de README [`170814d`](https://github.com/Farafolodolo/fruteria-pos/commit/170814d): `docs: update README with install, run, test, and deploy instructions`
  - Commit inicial de bitácora [`071d5ba`](https://github.com/Farafolodolo/fruteria-pos/commit/071d5ba): `docs: initialize development log with initial technical entries`
- **Problemas encontrados y solución:**
  - *Problema:* En despliegues cloud gratuitos (como Render Free Tier), el disco local es efímero y una instancia recién creada no tiene las tablas SQLite inicializadas.
  - *Solución:* Se configuró el comando de build para que, en cada despliegue limpio, ejecute `npm run seed` (`prisma db push` + `tsx prisma/seed.ts`) creando el esquema SQLite y cargando el catálogo base antes de iniciar con `npm start`.

---

## Entrada 6 — Configuración de Branch Protection en GitHub para la rama `main`

- **Fecha:** 2026-11-23
- **Qué se hizo:**
  - Se subieron los commits iniciales al repositorio remoto en GitHub (`git push origin main`).
  - En **Settings → Branches → Branch protection rules** de GitHub, se creó la regla de protección para `main` activando:
    - *Require a pull request before merging* (con al menos 1 revisión aprobada).
    - *Require status checks to pass before merging* (seleccionando el job **`CI / Test and Build`** de GitHub Actions).
- **Por qué:**
  - Impedir que código roto, sin revisión o sin pruebas aprobadas se fusione directamente a la rama principal `main`.
- **Evidencia:**
  - Regla activa verificada en [Pull Request #1](https://github.com/Farafolodolo/fruteria-pos/pull/1), donde GitHub exige `Review required` y el status check `CI / Test and Build (pull_request)` antes de habilitar el botón `Merge pull request`:
  
  ![Bloqueo de merge por Branch Protection y check de CI](./images/imagen%20de%20merge%20con%20conflictos.png)

- **Problemas encontrados y solución:**
  - *Problema:* En GitHub, el status check `Test and Build` no aparece en el buscador de Branch Protection hasta que el workflow `.github/workflows/ci.yml` se ha ejecutado al menos una vez.
  - *Solución:* Primero se realizó el push del commit [`252f4ff`](https://github.com/Farafolodolo/fruteria-pos/commit/252f4ff) a `main`, se esperó a que terminara la primera ejecución del workflow `CI`, y enseguida se seleccionó `Test and Build` como check obligatorio en la regla de protección de `main`.

---

## Entrada 7 — Verificación de bloqueo de Pull Request por test fallido y corrección en rama

- **Fecha:** 2026-11-23
- **Qué se hizo:**
  - Se creó la rama `feat/strict-cart-validation` y se introdujo en el commit [`7a5ff7c`](https://github.com/Farafolodolo/fruteria-pos/commit/7a5ff7c) (`test: simulate failing validation check for CI verification`) un fallo intencional en `calcLine` (`client/src/lib/cart.ts`), omitiendo la resta del descuento de remate sobre el total neto.
  - Se abrió el [Pull Request #1](https://github.com/Farafolodolo/fruteria-pos/pull/1) hacia `main` y se comprobó que GitHub Actions falló en 23s (`❌ CI / Test and Build (pull_request) — Failing after 23s`), bloqueando el merge (`Merging is blocked`).
  - Posteriormente se subió el commit [`b798757`](https://github.com/Farafolodolo/fruteria-pos/commit/b798757) (`fix: resolve failing validation check so CI passes`) restaurando la resta del descuento en `calcLine`. El workflow de CI volvió a correr automáticamente, pasó en verde en 21s (`✅ All checks have passed`) y permitió realizar el merge a `main` en el commit [`5f9ea59`](https://github.com/Farafolodolo/fruteria-pos/commit/5f9ea59).
- **Por qué:**
  - Demostrar con evidencia empírica que el pipeline de CI y las reglas de protección de `main` detectan regresiones reales en la lógica de negocio y bloquean cambios defectuosos automáticamente.
- **Evidencia:**
  - Pull Request: [PR #1 — `feat/strict-cart-validation`](https://github.com/Farafolodolo/fruteria-pos/pull/1)
  - Commit con fallo simulado: [`7a5ff7c`](https://github.com/Farafolodolo/fruteria-pos/commit/7a5ff7c)
  - Commit con corrección: [`b798757`](https://github.com/Farafolodolo/fruteria-pos/commit/b798757)
  - Merge commit en `main`: [`5f9ea59`](https://github.com/Farafolodolo/fruteria-pos/commit/5f9ea59)
  - **Captura 1 — PR bloqueado por check fallido en CI (`Failing after 23s`):**

    ![PR bloqueado por fallo en CI Test and Build](./images/imagen%20de%20merge%20con%20conflictos.png)

  - **Captura 2 — PR desbloqueado tras el commit de corrección (`Successful in 21s`):**

    ![PR aprobado con todos los checks en verde](./images/imagen%20de%20merge%20sin%20conflictos.png)

- **Problemas encontrados y solución:**
  - *Problema:* La prueba unitaria `[EDGE] carrito vacío, cantidades en 0 o sub-gramo y modo remate (30% y 50%)` falló en GitHub Actions (`AssertionError: 29.7 !== 14.85`) al no descontar el 50 % de remate en `calcLine`, bloqueando la integración del PR.
  - *Solución:* Se corrigió la expresión `fromCents(toCents(gross) - toCents(discount))` en `client/src/lib/cart.ts` y se hizo push a la misma rama `feat/strict-cart-validation`; GitHub Actions re-ejecutó `Test and Build`, validó las 26 pruebas unitarias en verde y habilitó el botón `Merge pull request`.

---

## Entrada 8 — Despliegue en la nube (Render), Smoke Tests (`/api/health` + UI) y limpieza de recursos

- **Fecha:** 2026-11-23
- **Qué se hizo:**
  - Se desplegó la aplicación en **Render** (servicio `fruteria-pos-1`, URL `https://fruteria-pos-1.onrender.com`) desde la rama `main` (commit [`5f9ea59`](https://github.com/Farafolodolo/fruteria-pos/commit/5f9ea59)).
  - Se ejecutaron los smoke tests definidos en la Fase 3 (**Verify**) de [`docs/DEPLOYMENT.md`](DEPLOYMENT.md):
    1. Verificación del endpoint `GET https://fruteria-pos-1.onrender.com/api/health`, obteniendo HTTP `200 OK` con `{"status":"ok","ok":true,"time":"2026-11-23T18:03:35.248Z"}`.
    2. Verificación de la interfaz web en `https://fruteria-pos-1.onrender.com/`, comprobando la carga del catálogo sembrado en SQLite (Aguacate Hass, Fresa, Limón con semilla, Manzana Gala, etc.), el indicador `Modo emulador` y el carrito interactivo.
  - Se registró el release en la tabla de la Fase 5 (**Record**) de [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) y, una vez tomadas las evidencias, se suspendió/apagó el servicio para evitar consumo innecesario de recursos en la nube.
- **Por qué:**
  - Validar en un entorno cloud real que el artefacto de producción (`npm run build` + `npm start`) funciona de extremo a extremo sirviendo tanto la API Express/Prisma como el frontend compilado de React, y aplicar buenas prácticas de gestión de infraestructura.
- **Evidencia:**
  - URL desplegada: `https://fruteria-pos-1.onrender.com`
  - **Captura 1 — Build y Deploy exitosos en Render (`Deploy succeeded | Live` en `1m 27s` sobre commit `5f9ea59`):**

    ![Build y deploy exitosos en Render](./images/imagen%20de%20la%20build%20correcta%20en%20render.png)

  - **Captura 2 — Smoke Test del endpoint `/api/health` en producción:**

    ![Endpoint /api/health respondiendo status ok en Render](./images/health%20funcionando.png)

  - **Captura 3 — Smoke Test de la interfaz gráfica POS funcionando en producción:**

    ![Interfaz gráfica de Frutería POS funcionando en Render](./images/imagen%20de%20la%20UI%20funcionando.png)

- **Problemas encontrados y solución:**
  - *Problema:* En el primer intento de despliegue en Render (tanto por Web Service como por Blueprint), el paso `npm run seed` falló con `npm error code 127` (`command failed: sh -c tsx prisma/seed.ts`) y no se creaba la base de datos SQLite de Prisma. La causa raíz fue que al tener `NODE_ENV=production` en las variables de entorno de Render, `npm ci` omite por defecto la instalación de `devDependencies` (donde se encuentran `tsx`, `prisma`, `typescript` y `vite`).
  - *Solución:* Se actualizó el **Build Command** a `npm ci --include=dev && npm run seed && npm run build` (tanto en Render Dashboard como en `render.yaml` y `docs/DEPLOYMENT.md`). Con `--include=dev`, Render instaló todas las herramientas de compilación y seed, creó y pobló la base de datos SQLite y completó el despliegue en `1m 27s`.
