# Deployment Guide — Frutería POS

This document defines the standardized 5-stage deployment process (**Before → Deploy → Verify → Roll back → Record**) for **Frutería POS**. In production mode, the Express server (`@fruteria/server`) serves both the REST API (`/api/*`) and the compiled React static bundle (`client/dist`), backed by Prisma and SQLite.

---

## 1. Before (Pre-Deployment Checklist)

Before initiating any deployment, complete every item in this checklist:

1. **Prerequisites & Runtime**
   - **Node.js**: `>= 20.x` (LTS recommended, matching `.github/workflows/ci.yml`).
   - **npm**: `>= 10.x` (supports npm workspaces `server` and `client`).

2. **Clean Local & CI Verification**
   - Confirm that the target commit is merged into `main` via Pull Request.
   - Verify that the GitHub Actions workflow **CI (`test-and-build`)** is green (`✅`) on `main`.
   - Run the clean validation suite locally:
     ```bash
     npm ci
     npm test
     npm run build
     ```

3. **Environment Variables Configuration**
   Copy `.env.example` to `.env` (only if overriding defaults) and confirm the target platform variables:

   | Variable | Default | Required | Description |
   |----------|---------|----------|-------------|
   | `PORT` | `3001` | No (injected by Render/cloud) | HTTP port where Express listens (`0.0.0.0`). |
   | `NODE_ENV` | `development` | Yes (`production` in deploy) | Execution environment mode. |
   | `DATABASE_URL` | `file:./dev.db` | No (defaults in `schema.prisma`) | SQLite database file path relative to `server/prisma/`. |

4. **Zero-Secrets & Repository Hygiene Audit**
   - Never commit `.env`, API keys, credentials, or local `.db` files to Git.
   - Verify no sensitive or ignored files are tracked:
     ```bash
     git status
     git ls-files -- ".env*" "*.db"
     ```
     *(Only `.env.example` should appear).*

5. **Database Snapshot (If Updating an Existing Instance)**
   - For an existing local/on-premise terminal, back up the SQLite file before deploying:
     ```bash
     cp server/prisma/dev.db server/prisma/dev.db.bak-$(date +%Y%m%d%H%M)
     ```

---

## 2. Deploy (Step-by-Step Procedure)

### Option A: Cloud Deployment on Render (Recommended for Team Demo & Staging)

The repository includes a declarative [`render.yaml`](../render.yaml) Blueprint at the project root.

1. Sign in to [Render](https://dashboard.render.com/) and click **New + → Blueprint** (or **New + → Web Service**).
2. Connect the GitHub repository `fruteria-pos` and select the `main` branch.
3. If configuring manually as a **Web Service**, enter the following exact settings:
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm ci && npm run seed && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Health Check Path**: `/api/health`
   - **Environment Variables**:
     - `NODE_ENV` = `production`
     - `DATABASE_URL` = `file:./dev.db`
4. Click **Deploy Web Service** and wait for the build and startup logs to report:
   `🍎 Frutería POS API escuchando en http://localhost:<PORT>`

> **Cost & Resource Note**: On Render's `free` plan, the service automatically spins down after 15 minutes of inactivity and uses ephemeral disk storage. If you provision a paid instance or persistent disk during testing, **delete or suspend the service in Render Dashboard → Settings → Delete Service** immediately after evaluation to avoid unexpected charges.

### Option B: On-Premise / Local POS Terminal Production Build

1. Clone the repository and switch to `main`:
   ```bash
   git clone https://github.com/Farafolodolo/fruteria-pos.git
   cd fruteria-pos
   ```
2. Install exact locked dependencies and generate the Prisma client:
   ```bash
   npm ci
   ```
3. Initialize the database schema (and optionally seed initial catalog on first install):
   ```bash
   # First-time setup (creates schema + demo catalog):
   npm run seed

   # Subsequent deployments (preserves existing data):
   npm run db:push -w server
   ```
4. Compile backend types and build the production frontend bundle (`client/dist`):
   ```bash
   npm run build
   ```
5. Start the production server:
   ```bash
   npm start
   ```
   The unified app (UI + API) is now served on `http://localhost:3001`.

---

## 3. Verify (Post-Deployment Smoke Tests)

Immediately after every deployment, run the following 4 smoke tests before marking the release as healthy:

1. **Health Endpoint Check (`/api/health`)**
   ```bash
   curl -s http://localhost:3001/api/health
   ```
   *(Replace `http://localhost:3001` with your Render URL `https://<your-app>.onrender.com` for cloud deploys).*
   - **Expected Output**: HTTP `200 OK` with JSON payload containing `"status": "ok"`:
     ```json
     {"status":"ok","ok":true,"time":"2026-11-23T17:10:00.000Z"}
     ```

2. **Frontend UI & Static Bundle Check**
   - Open the root URL (`/` in browser).
   - Verify the POS terminal loads with the 4 tabs (**Frutas**, **Verduras**, **Abarrotes**, **Más Vendidos**) and the **Modo emulador** indicator in the header.

3. **Core POS Business Flow Check**
   - Click **Plátano Tabasco** (`$22.00/kg`), enter `1.350 kg` in the weight modal, and confirm the calculated total is **$29.70**.
   - Click **Cobrar (F2)**, choose **Efectivo**, select `$50`, confirm change is **$20.30**, and complete the sale.
   - Verify the receipt modal displays a consecutive folio number and allows WhatsApp/Print preview.

4. **Logs & Error Monitoring**
   - Inspect the Render runtime logs (or terminal output) to verify there are no HTTP `500` errors, Prisma exceptions, or missing static asset (`404`) warnings.

---

## 4. Roll back (Recovery & Revert Procedure)

If any verification step in Stage 3 fails, execute a rollback immediately:

### 1. Instant Platform Rollback (Render)
1. Open the service in the **Render Dashboard** and navigate to **Events** (or **Deploys**).
2. Locate the last known working deployment marked **Live / Deployed**.
3. Click **Rollback to this deploy** to restore the previous container image and build artifact within seconds.

### 2. Git Repository Rollback
1. Create a revert commit for the faulty merge or commit on a fix branch:
   ```bash
   git checkout -b fix/rollback-release
   git revert -m 1 <faulty-commit-sha>
   git push origin fix/rollback-release
   ```
2. Open a Pull Request into `main`, wait for the **CI (`test-and-build`)** check to pass, and merge to trigger a clean redeploy.

### 3. Database Restoration (On-Premise SQLite)
If a deployment corrupted local data, stop the server and restore the backup created in Stage 1:
```bash
cp server/prisma/dev.db.bak-<timestamp> server/prisma/dev.db
npm start
```

---

## 5. Record (Release & Deployment Log)

Every deployment or rollback must be recorded in the table below:

| Date (YYYY-MM-DD) | Version / Tag | Commit SHA | Environment | Responsible | Status | Notes |
|-------------------|---------------|------------|-------------|-------------|--------|-------|
| 2026-11-23 | `v1.0.0` | `cb8bc72` | Local Dev | Team | ✅ Success | Initial POS baseline with SQLite & hardware emulator |
| 2026-11-23 | `v1.1.0-rc1` | `252f4ff` | CI / Staging | Team | ✅ Verified | Added `/api/health`, static `client/dist` serving, 26 unit tests, and GitHub Actions CI |
| `[YYYY-MM-DD]` | `v1.1.0` | `[COMMIT_SHA]` | Render Cloud | `[YOUR_NAME]` | `[✅ Live / ⏹️ Teardown]` | `[Add deployed URL, smoke test result, and resource teardown note]` |
