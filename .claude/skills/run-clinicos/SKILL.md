---
name: run-clinicos
description: Run, start, build, serve, or screenshot the ClinicOS full-stack app (React/Vite frontend + Express/Prisma backend + Postgres) locally on this Windows machine. Use to launch the app, drive it headlessly, verify a change works in the real running UI, or capture screenshots of a route/dashboard.
---

# Run ClinicOS

ClinicOS is a full-stack clinic app: **frontend** (React + Vite, `:5173`),
**backend** (Express + Prisma, `:3001`), **Postgres 16** (`:5432`, Podman
container `clinicos-postgres`). You launch the three tiers, then drive the SPA
with **Playwright Chromium** via `.claude/skills/run-clinicos/driver.mjs`.

All paths below are relative to the repo root (`C:\Workspace\DG_SE_DEV\ClinicOS`).
Commands are Git Bash (the Bash tool). The app opens on a **role-selection gate** —
the driver clicks past it for you.

## Prerequisites (already satisfied on this machine)

- Node 20, npm 11. Podman 5.7 with the `clinicos-postgres` container.
- Playwright is installed at the repo `node_modules` (no-save) and Chromium is
  downloaded to `~/AppData/Local/ms-playwright/`. If `driver.mjs` ever reports
  `Cannot find package 'playwright'` or a missing browser, reinstall:
  ```bash
  cd "C:/Workspace/DG_SE_DEV/ClinicOS"
  NODE_OPTIONS=--max-old-space-size=4096 npm install --no-save --ignore-scripts playwright
  node node_modules/playwright/cli.js install chromium
  ```
  The `--max-old-space-size` bump is required — a plain `npm install` here
  OOM-crashes resolving this monorepo (see Gotchas).

## Start the three tiers

```bash
cd "C:/Workspace/DG_SE_DEV/ClinicOS"

# 1. Postgres — container already exists; just start it (idempotent).
podman start clinicos-postgres

# 2. Prisma client (skip if node_modules/.prisma/client already exists).
npm run db:generate

# 3. Backend on :3001  — run each dev server in the BACKGROUND (they block).
npm run dev:backend     # tsx watch; loads backend/.env (PORT=3001)

# 4. Frontend on :5173
npm run dev:frontend    # vite; VITE_API_URL=http://localhost:3001
```

Backend and frontend are long-running — launch them with the Bash tool's
`run_in_background: true`. Give each ~6 s to come up.

## Run (agent path) — drive & screenshot

`driver.mjs` is the harness. It assumes backend `:3001` + frontend `:5173` are up.

```bash
cd "C:/Workspace/DG_SE_DEV/ClinicOS"

# API + frontend reachability (no browser). Prints patient row count.
node .claude/skills/run-clinicos/driver.mjs smoke
#   -> OK  backend /health=ok  /patients=10 rows  frontend=200

# Screenshot the operator dashboard (clicks the "Operatore" role gate first).
MSYS_NO_PATHCONV=1 node .claude/skills/run-clinicos/driver.mjs \
  shot / .claude/skills/run-clinicos/out.png desktop operatore

# Args: shot <route> <out.png> <viewport> <role> <clicks>
#   viewport = desktop (1366x768, default) | tablet (1024x768)
#   role     = operatore | admin | (omit to stay on the role gate)
#   clicks   = "Label A>>Label B" — visible-text clicks after the role gate.
#              Nav is in-app state (not URL routes), so reach inner pages by clicking.
```

Inner pages (in-app nav — verified):

```bash
# Pazienti list
MSYS_NO_PATHCONV=1 node .claude/skills/run-clinicos/driver.mjs \
  shot / .claude/skills/run-clinicos/pazienti.png desktop operatore "Pazienti"

# Patient detail — click the sidebar item, then a patient by "Last, First"
MSYS_NO_PATHCONV=1 node .claude/skills/run-clinicos/driver.mjs \
  shot / .claude/skills/run-clinicos/detail.png desktop operatore "Pazienti>>Moretti, Elena"
```

**Always prefix a screenshot command with `MSYS_NO_PATHCONV=1`** — Git Bash
otherwise rewrites the leading-`/` route into a Windows path and you screenshot
the wrong URL (see Gotchas). Then `Read` the PNG to inspect it.

`driver.mjs` prints `bodyChars` and `consoleErrors` after each shot — a body
under ~100 chars means the page did not render. A correctly rendered operator
dashboard reports ~650 chars and 0 console errors.
`.claude/skills/run-clinicos/screenshot-operatore.png` is committed as a
reference of the expected dashboard.

## Build (production gate)

CLAUDE.md requires this to pass before committing frontend work:

```bash
cd "C:/Workspace/DG_SE_DEV/ClinicOS"
NODE_OPTIONS=--max-old-space-size=4096 npm run build:frontend   # tsc -b && vite build
```

## Run (human path)

`npm run dev` (repo root) runs both dev servers together via `concurrently`,
then you open `http://localhost:5173` in a browser and click a role. Useless for
a headless agent — use the driver instead.

## Gotchas

- **Git Bash mangles the `/` route.** `driver.mjs shot /` becomes
  `http://localhost:5173/C:/Program Files/Git/` because MSYS path-converts the
  bare `/`. Prefix the command with `MSYS_NO_PATHCONV=1` (done above).
- **`npm install` OOMs on this monorepo** — `FATAL ERROR: ... JavaScript heap
  out of memory`. Always set `NODE_OPTIONS=--max-old-space-size=4096`.
- **The app opens on a role-selection screen** (Amministratore / Operatore), not
  the dashboard. Pass a `role` arg so the driver clicks through; without it you
  screenshot the login card (~258 body chars).
- **Two `.env` files, two ports.** Root `.env` has `PORT=4000`; `backend/.env`
  has `PORT=3001`. The backend loads `.env` from its own cwd (`dotenv/config` in
  `backend/src/lib/prisma.ts`), so `npm run dev:backend` (which sets cwd via
  `--prefix backend`) correctly listens on **3001** — which is what the frontend
  hardcodes (`VITE_API_URL=http://localhost:3001`). Do **not** start the backend
  from the repo root with a bare `tsx`; it would pick up root `PORT=4000` and the
  frontend's data calls would 404.
- **Dual container engine.** A Podman container and a `docker-compose.exe`
  shim both exist; `podman compose up` shells to docker-compose and fails with
  `container name "clinicos-postgres" is already in use`. Use `podman start
  clinicos-postgres` for the existing container. First-time create only:
  `podman compose up -d postgres`.

## Troubleshooting

- `/patients` returns `[]` or smoke shows `0 rows` → DB not seeded:
  `npm run db:seed` (compiles to `backend/dist/seed.js`; run `npm run build:backend` first if `dist` is missing).
- Backend log `DATABASE_URL is required` → Postgres not started or `backend/.env`
  missing. `podman start clinicos-postgres`, confirm `backend/.env` exists.
- Screenshot is the role card, not the dashboard → you omitted the `role` arg.
- `driver.mjs` hangs on `goto` → frontend/backend not up yet; check the
  background task logs and re-run after both have booted.
