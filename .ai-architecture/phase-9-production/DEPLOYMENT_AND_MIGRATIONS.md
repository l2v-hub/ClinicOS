# Phase 9 — Deployment and Migrations

## 1. Pipeline (real, as configured)

| Service                                          | Trigger                                                                                                                                                                       | Build                                                                                           | Pre-deploy                                                                  | Start                         | Health                           |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------- | -------------------------------- |
| Backend (Railway `clinicos-backend`, production) | push to `main` touching `backend/**`, `prisma/**`, `railway.json`, `package.json` → `.github/workflows/deploy-backend.yml` (`railway up --ci`)                                | `npm install --include=dev --no-audit --no-fund && npm run build:backend` (root `railway.json`) | `npm run db:migrate` = `prisma migrate deploy --config=../prisma.config.ts` | `node backend/dist/server.js` | `/health`, restart ON_FAILURE ×3 |
| AI runtime (`clinicos-ai-runtime`)               | push to `main` touching `clinicos-ai-runtime/**` → `deploy-runtime.yml`                                                                                                       | Dockerfile (`python:3.11-slim`)                                                                 | —                                                                           | `python -m clinicos_ai.main`  | `/v1/runtime/health`             |
| Backend demo env                                 | **manual**: `railway up --detach --project bddf5d1b-ee83-4362-8238-a79721f795e5 --service clinicos-backend --environment demo` from a clean origin/main worktree (short path) | same                                                                                            | same                                                                        | same                          | same                             |
| Frontend (Vercel `clinicos__`)                   | **manual**: `vercel deploy --prod --archive=tgz --yes` from repo root                                                                                                         | `tsc -b && vite build`                                                                          | —                                                                           | static                        | —                                |

Phase 9 startup order inside the backend process: config validation (exit 1 on errors in
NODE_ENV=production) → listen → AI status log → retention sweep + import worker.

## 2. Clean deployment (executed locally, 2026-10-01)

`checkout (worktree from origin/main) → npm install → prisma generate → migrate deploy (fresh DB)
→ seed (synthetic, non-production only) → start → /ready → smoke`:

| Step                                                                                                  | Result                                                          |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `npm install` (workspaces) on a fresh worktree                                                        | OK                                                              |
| `prisma migrate deploy` on 6 fresh UTF8 databases                                                     | 51/51 migrations applied each time, `migrate status` up to date |
| Startup with the REAL demo variable set (`railway run … --environment demo`, DB/PORT/CORS overridden) | started, `/ready` 200, tier demo                                |
| Startup with a production-shaped env (names of the real prod set)                                     | 0 config errors (unit test)                                     |
| `/ready` → smoke (E2E suites, AI-off GUI)                                                             | see E2E_TEST_REPORT.md                                          |

Undocumented/local-only state found: none required at runtime. Notes: `backend/nixpacks.toml` is
dead config (Railpack is used); `deploy-backend.yml` header comment says the start command runs
migrations (it is the pre-deploy step); `prisma/test.prisma` / `prisma/test.txt` are stray files.

## 3. Migrations

- 51 versioned folders in `prisma/migrations/`, deterministic SQL, applied in lexical order.
  P1–P8 schema changes: `20260930090000_authz_policy_versions`, `20261001090000_ai_audit_append_only`
  (Phases 3–8 added no tables: workflows/proactive/voice state is in memory or audit rows).
- Clean-environment repeatable: yes (6 fresh DBs).
- **Drift (pre-existing, not introduced by Phase 9):** `20260829210000_bound_consegne_feed` creates
  5 `Consegna` indexes with `DESC` columns; `schema.prisma` lines 540–544 declare them ascending.
  `prisma migrate diff` (DB built from migrations → schema) proposes DROP/CREATE of those 5 indexes.
  Impact: none at runtime; a future `prisma migrate dev` would emit an unwanted migration.
  Fix (no DB change, needs approval because it edits `schema.prisma`): `@@index([createdAt(sort:
Desc), id(sort: Desc)])` etc. for the 5 indexes.
- Demo data in migrations (historical, already applied in production):
  `20260902193000_seed_demo_room_occupancy` (Room/Bed/assignments), `20260902133000_backfill_demo_fiscal_codes`
  (updates `MRN-DEMO-*` only). No demo identities (`SIM-*`, `SEED-OP-*`, users) are created by
  migrations. Demo seeds (`backend/src/seed.ts`, `scripts/*/seed-*.mts`) are never run on deploy;
  `seed.ts` now refuses tier production.
- Audit append-only: `AiAuditEvent` UPDATE/DELETE/TRUNCATE raise 23514 (purge = DB-ops procedure).

## 4. Rollback / forward-fix

- Code: Railway → Deployments → redeploy the previous successful deployment (instant); or revert
  the commit on `main` (auto-deploys). Frontend: `vercel rollback` / promote previous deployment.
- Schema: migrations are forward-only. Phase 9 adds none. For a bad migration: write a new
  corrective migration (forward fix); never edit an applied migration; restore from Railway
  Postgres backups only for data loss.
- Config: a bad variable that trips validation stops the new deploy before it serves traffic
  (Railway keeps the previous one) — fix the variable, redeploy.
- Runtime and backend are independently deployable; the backend tolerates the old runtime (no
  new runtime endpoint is required; correlation header is ignored by an old runtime).

## 5. Provider-agnostic runtime deployment (Phase 9)

- No schema change, no migration. Runtime and backend remain independently deployable; the backend
  reads the runtime's new `ai` metadata optionally (old runtime = no metadata, no failure).
- The new runtime evaluated against the REAL production runtime variables: legacy mode, all 6 roles
  resolved, 0 validation errors → deployable without touching variables.
- Strict startup validation applies only when `AI_PROVIDER` (or `AI_STRICT_CONFIG=true`) is set.
- CI `ai-runtime-tests.yml` now also installs `openai>=1.30` (already a declared runtime dependency)
  for the OpenAI adapter contract tests (local stub, no network).
- Backend dependency `@google/genai` removed (dead code); lockfile updated.
