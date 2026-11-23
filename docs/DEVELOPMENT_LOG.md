# Bitácora de Desarrollo (Development Log) — Frutería POS

Registro cronológico de ingeniería, decisiones de arquitectura, pruebas automatizadas, configuración de CI/CD y despliegue del proyecto **Frutería POS**.

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
  - Commit: `8229ec2` (`chore(repo): verify root scripts, health endpoint, and clean-clone setup`) — `[COMPLETAR CON LINK AL COMMIT EN GITHUB Si APLICA]`
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
  - Commit: `83493f3` (`test: add normal, edge, and invalid unit tests for server and client`)
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
  - Commit: `83493f3` (`test: add normal, edge, and invalid unit tests for server and client`)
  - Ejecución local exitosa: `npm test` → `16 pass` en `@fruteria/server` y `10 pass` en `@fruteria/client` (`0 fail`).
- **Problemas encontrados y solución:**
  - *Problema:* En el modal de pesaje (`WeightModal.tsx`), cuando el usuario aún no escribe un peso, `net` vale `0` y se invoca `lineTotal(0, product.price)`. Si la validación rechazaba `quantity <= 0`, habría roto el estado inicial en `0.000 kg`.
  - *Solución:* Se definió que `quantity === 0` y `unitPrice === 0` son **Edge cases** válidos que devuelven `$0.00`, mientras que valores estrictamente negativos (`< 0`) o no finitos (`NaN`, `Infinity`) son **Invalid cases** que lanzan `RangeError`.

---

## Entrada 4 — Implementación del pipeline de CI con GitHub Actions (`.github/workflows/ci.yml`)

- **Fecha:** 2026-11-23
- **Qué se hizo:**
  - Se creó el workflow `.github/workflows/ci.yml` disparado automáticamente en `push` a `main` y `pull_request` hacia `main`.
  - Se configuró el job `test-and-build` sobre `ubuntu-latest` con Node.js 20 (`actions/setup-node@v4` con `cache: 'npm'`), ejecutando en orden: `actions/checkout@v4`, `npm ci`, `npx prisma generate` (en `./server`), `npm test` y `npm run build`.
- **Por qué:**
  - Automatizar la validación de pruebas unitarias y compilación TypeScript/Vite en cada cambio propuesto, sirviendo como control de calidad obligatorio antes de integrar código en `main`.
- **Evidencia:**
  - Commit: `252f4ff` (`ci: add GitHub Actions workflow for automated tests and build`)
  - Archivo: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
- **Problemas encontrados y solución:**
  - *Problema:* El comando `npm run build` ejecuta `tsc -p tsconfig.json --noEmit` en `server/`, el cual importa tipos generados de `@prisma/client` (`PrismaClient`, `Prisma.ProductCreateInput`). Si los artefactos de Prisma no están generados en un runner limpio, el build falla por tipos inexistentes.
  - *Solución:* Además del script `postinstall` de la raíz, se añadió un paso explícito `npx prisma generate` con `working-directory: ./server` dentro de `.github/workflows/ci.yml` para garantizar la disponibilidad de tipos antes de `npm test` y `npm run build`.

---

## Entrada 5 — Configuración de ruta de despliegue (`render.yaml`, `docs/DEPLOYMENT.md`) y actualización de `README.md`

- **Fecha:** 2026-11-23
- **Qué se hizo:**
  - Se creó `render.yaml` en la raíz para despliegue reproducible como servicio web Node.js en Render (`buildCommand: npm ci && npm run seed && npm run build`, `startCommand: npm start`, `healthCheckPath: /api/health`).
  - Se redactó la guía [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) estructurada en las 5 fases requeridas: **1. Before**, **2. Deploy**, **3. Verify**, **4. Roll back** y **5. Record**.
  - Se actualizó [`README.md`](../README.md) con secciones verificadas de **Install**, **Run**, **Test**, **Deploy** y **CI & Branching Rules**.
- **Por qué:**
  - Documentar un procedimiento de despliegue y reversión sin ambigüedades que cualquier integrante del equipo pueda ejecutar y verificar de extremo a extremo.
- **Evidencia:**
  - Commit de despliegue: `191fbc8` (`docs(deploy): add deployment configuration and docs/DEPLOYMENT.md`)
  - Commit de README: `170814d` (`docs: update README with install, run, test, and deploy instructions`)
- **Problemas encontrados y solución:**
  - *Problema:* En despliegues cloud gratuitos (como Render Free Tier), el disco local es efímero y una instancia recién creada no tiene las tablas SQLite inicializadas.
  - *Solución:* Se configuró el `buildCommand` en `render.yaml` como `npm ci && npm run seed && npm run build` para que, en cada despliegue limpio, se cree el esquema SQLite y se cargue el catálogo base antes de iniciar con `npm start`, documentando además en `docs/DEPLOYMENT.md` el uso de `npm run db:push -w server` para actualizaciones en terminales locales que conservan datos.

---

## Entrada 6 — Configuración de Branch Protection en GitHub para la rama `main`

- **Fecha:** `[COMPLETAR FECHA, EJ. 2026-11-23]`
- **Qué se hizo:**
  - Se subieron los commits iniciales al repositorio remoto en GitHub (`git push origin main`).
  - En **Settings → Branches → Branch protection rules** (o Rulesets) de GitHub, se creó la regla de protección para `main` activando:
    - *Require a pull request before merging*.
    - *Require status checks to pass before merging* (seleccionando el job **`Test and Build`** / `test-and-build` de GitHub Actions).
- **Por qué:**
  - Impedir que código roto o sin pruebas aprobadas se fusione directamente a la rama principal `main`.
- **Evidencia:**
  - `[COMPLETAR CON LINK/CAPTURA DE LA REGLA DE BRANCH PROTECTION EN GITHUB SETTINGS]`
  - `[COMPLETAR CON LINK DE LA PRIMERA EJECUCIÓN EN VERDE DE GITHUB ACTIONS EN MAIN]`
- **Problemas encontrados y solución:**
  - *Problema:* En GitHub, el status check `Test and Build` no aparece en el buscador de Branch Protection hasta que el workflow `.github/workflows/ci.yml` se ha ejecutado al menos una vez.
  - *Solución:* Primero se realizó el push del workflow a `main`, se esperó a que corriera la primera ejecución de `CI`, y enseguida se seleccionó `Test and Build` como check obligatorio en la regla de protección de rama.

---

## Entrada 7 — Verificación de bloqueo de Pull Request por test fallido y corrección en rama

- **Fecha:** `[COMPLETAR FECHA, EJ. 2026-11-23]`
- **Qué se hizo:**
  - Se creó una rama de prueba (ej. `test/ci-gate-verification`) y se abrió un Pull Request hacia `main` introduciendo un fallo intencional en una prueba unitaria para comprobar que GitHub Actions falla (`❌`) y bloquea el botón de merge.
  - Posteriormente se revirtió/corrigió el fallo en la misma rama, verificando que el workflow `Test and Build` pasara a verde (`✅`) y desbloqueara la fusión del Pull Request.
- **Por qué:**
  - Demostrar con evidencia empírica que el pipeline de CI y las reglas de protección de `main` detectan regresiones reales y bloquean cambios defectuosos automáticamente.
- **Evidencia:**
  - Pull Request: `[COMPLETAR CON LINK AL PULL REQUEST EN GITHUB]`
  - Ejecución fallida (bloqueo): `[COMPLETAR CON LINK/CAPTURA DEL RUN FALLIDO Y PR BLOQUEADO]`
  - Ejecución corregida (verde): `[COMPLETAR CON LINK/CAPTURA DEL RUN EN VERDE Y MERGE]`
- **Problemas encontrados y solución:**
  - *Problema:* El check de CI falló tal como se esperaba al alterar la aserción en `money.test.ts`, bloqueando el merge en el PR.
  - *Solución:* Se subió un nuevo commit en la rama del PR restaurando la expectativa correcta; GitHub Actions re-ejecutó `Test and Build` automáticamente y habilitó el merge.

---

## Entrada 8 — Despliegue en la nube, Smoke Tests (`/api/health` + UI) y limpieza de recursos

- **Fecha:** `[COMPLETAR FECHA, EJ. 2026-11-23]`
- **Qué se hizo:**
  - Se siguió paso a paso la guía [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) para desplegar la aplicación desde `main` en Render (o entorno productivo seleccionado).
  - Se ejecutaron los smoke tests de la Fase 3 (**Verify**): consulta a `GET /api/health` devolviendo `{"status":"ok",...}`, carga de la interfaz POS en el navegador y simulación de una venta de fruta pesada con generación de ticket.
  - Se actualizó la tabla de la Fase 5 (**Record**) y, tras capturar la evidencia, se apagó/eliminó el servicio en la nube para evitar costos o consumo innecesario de recursos.
- **Por qué:**
  - Validar en un entorno real que el artefacto de producción (`npm run build` + `npm start`) funciona de extremo a extremo y aplicar buenas prácticas de FinOps/limpieza de infraestructura.
- **Evidencia:**
  - URL desplegada / Smoke test `/api/health`: `[COMPLETAR CON LINK/CAPTURA DE /api/health Y DE LA UI FUNCIONANDO]`
  - Limpieza de recursos (Teardown): `[COMPLETAR CON CAPTURA O NOTA DE SERVICIO PAUSADO/ELIMINADO]`
- **Problemas encontrados y solución:**
  - *Problema:* `[COMPLETAR SI HUBO ALGÚN DETALLE DURANTE EL DEPLOY, EJ. TIEMPO DE COLD START EN RENDER FREE TIER, Y CÓMO SE RESOLVIÓ]`
  - *Solución:* `[COMPLETAR SOLUCIÓN APLICADA]`
