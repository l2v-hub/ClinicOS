# QA Gate — Phase 9 (production hardening + provider-agnostic AI + OpenAI cutover prep)

- Branch: `feat/phase9-hardening` @ `1bfdd0b1` (1 commit on top of `origin/main`)
- QA session: independent (did not write or coordinate the code). Date: 2026-10-02
- Contracts (Phase 0): `artifacts/task-validation/phase-9-production-hardening/task-contract.md` (AC1-AC9),
  `phase-9-provider-agnostic-ai/task-contract.md` (AC1-AC7), `phase-9b-openai-railway-cutover/task-contract.md` (AC1-AC6).
  No GitHub issue. Implementer reports all say `PARTIAL` (9B AC6 real OpenAI/Railway cutover external-blocked: no `OPENAI_API_KEY`).

## Phase table

| Phase           | Result                                                    | Evidence                                           |
| --------------- | --------------------------------------------------------- | -------------------------------------------------- |
| 0 Contract      | 22 ACs across 3 contracts read; gate asserts against them | task-contract.md x3                                |
| 1 Diff review   | PASS (no correctness bug; Low hygiene findings)           | findings below                                     |
| 2 Build & tests | PASS                                                      | `logs/`                                            |
| 3 Playwright    | PASS 15/15                                                | `playwright/` (11 PNG, trace.zip, ai-off-gui.json) |
| 4 Security      | PASS (no blocking finding; 2 Low notes)                   | checklist below                                    |

## Phase 1 — Diff review (code only; artifacts/ and .ai-architecture/ prose skipped)

Scope: backend/src (deployment tier + config validation, /ready, /metrics, correlation, simulator logout,
AI_ENABLED master switch, Gemini provider removed), clinicos-ai-runtime (provider contract/registry,
OpenAI Responses adapter, STT providers, cost/budget, ai-health), frontend 3 files (Entra silent renewal,
server-side simulator logout), scripts/production, CI workflow. **No Prisma schema / migration change**
(`git diff --stat -- prisma backend/prisma` empty). `VITE_API_URL` untouched.

Findings (none blocks):

| #   | Sev           | File:line                                                                                                                                                 | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Low           | backend/src/lib/observability.ts:140-141                                                                                                                  | Orphan JSDoc ("Record one AI provider/runtime call") stacked above `AiCallMeta`; belongs to `recordAiCall`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| F2  | Low           | backend/src/ai/audit-store.ts:38                                                                                                                          | `import` placed mid-file after type declarations (works under ESM hoisting; style).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| F3  | Low           | backend/src/proactive/engine.ts:492-498, 754-757, 825-828, 848-853, 869-871; backend/src/skills/interpreter.ts:61-64; backend/src/ai/audit-store.ts:17-18 | Unrelated prettier reformatting mixed into functional hunks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| F4  | Low/behaviour | backend/src/ai/assistant/service.ts:471, 566; backend/src/proactive/engine.ts:812                                                                         | LLM plan/compose now gated on `*_ENABLED && AI_RUNTIME_URL` (model env vars removed). A deployment that had `AI_ASSISTANT_*_ENABLED=true` but no `*_MODEL` (previously = off) will now call the runtime. Intended by provider-agnostic AC2; check Railway flags at merge.                                                                                                                                                                                                                                                                                                                                  |
| F5  | Medium/ops    | backend/src/server.ts:34-46 + lib/deployment.ts                                                                                                           | Startup now `process.exit(1)` on config errors when `NODE_ENV=production`. Backend auto-deploys on merge to main: any current Railway var that is now an error (e.g. non-https non-loopback `FRONTEND_URL`, `AI_RUNTIME_URL` without token, `METRICS_TOKEN` <24 chars, demo flags with derived tier `production`) makes the new deploy fail (previous keeps serving). Implementer claims legacy config verified with 0 errors (RAILWAY_OPENAI_CONFIGURATION.md §4.1) — not independently verifiable here (prod vars not read by design). Run `validateDeploymentConfig` against Railway vars before merge. |

No leftover debug code (`console.log` additions are the structured logger, shutdown messages, and test capture only).

## Phase 2 — Build & tests (run by this QA session)

| Command                                                                                               | Result                                                                                                                                                                                                      | Log                           |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `frontend: npx tsc --noEmit -p tsconfig.app.json`                                                     | EXIT 0                                                                                                                                                                                                      | logs/frontend-tsc.log         |
| `frontend: npm run build`                                                                             | EXIT 0                                                                                                                                                                                                      | logs/frontend-build.log       |
| `backend: npx tsc --noEmit -p tsconfig.json`                                                          | EXIT 0                                                                                                                                                                                                      | logs/backend-tsc.log          |
| runtime `unittest discover` (rtvenv)                                                                  | 228 tests OK                                                                                                                                                                                                | logs/runtime-unittest.log     |
| backend `phase9-production.test.ts` + `ai/__tests__/config.test.ts` (local PG 127.0.0.1:54339/p9test) | 25/25 pass, 0 fail                                                                                                                                                                                          | logs/backend-phase9-tests.log |
| frontend `npm test`                                                                                   | 1001 tests, 992 pass, 9 fail = baseline (6 multi-patient parameters UI, 1 new-patient wizard CF, 1 assessmentCatalogUi, 1 calendar weekly/monthly therapy) — none touches App.tsx/entraAuth/operatorSession | logs/frontend-unit.log        |

## Phase 3 — Playwright (UI change: logout ends session server-side; classic GUI with AI disabled)

Stack: backend :3399 (`AI_ENABLED=false`, demo + Role Simulator, local PG p9e2e) + Vite :5299; both stopped afterwards.
`node scripts/production/ai-off-gui-check.mjs` → **15/15 PASS** (logs/playwright-ai-off-gui.log):
G0 /ready reports runtime+voice disabled; G1 Pazienti, Terapia, Parametri, Consegne, Agenda, Note, Farmaci, Turno render, no 5xx;
G2 Assistant answers deterministically (200, NEEDS_CLARIFICATION), no false write, mic explained as unavailable;
**G3 token captured before logout: 200 before, 401 after** (server-side revocation); G4 no console errors.
Artifacts: `playwright/G1-*.png`, `G2-assistant-deterministic.png`, `G3-after-logout.png`, `trace.zip`, `ai-off-gui.json`.
Note: the Entra silent-renewal / MSAL cache clear path has no browser evidence (needs a real tenant); covered by code review only.

## Phase 4 — Security checklist

| Check            | Result                                                                                                                                                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secrets          | PASS — only placeholders (`sk-test-*`, `sk-switch-test-not-real`, `sk-cutover-SENTINEL-*`, `p9-*-token-*`). Public Railway hostnames only.                                                                                                                        |
| PHI              | PASS — synthetic fixtures/demo identities only.                                                                                                                                                                                                                   |
| Logging          | PASS — `logEvent` redacts sensitive keys, routes collapse ids, no query strings; runtime logs exception type only (previous message leak removed); provider errors normalized, key never in messages.                                                             |
| Input validation | PASS — X-Request-Id regex-bounded (8-64 chars) both sides; /metrics bearer constant-time; logout parses Bearer, idempotent 204, token ≤512 + HMAC-verified before revocation; revocation map bounded (10k).                                                       |
| AuthZ            | PASS — simulator and demo auth fail closed on tier `production` regardless of flags (simulator.ts:83, auth.ts:68/91); seed refuses real prod; /metrics 404 without token; runtime service-token compare now `hmac.compare_digest`.                                |
| Injection/XSS    | PASS — /ready uses tagged `$queryRaw\`SELECT 1\``(no interpolation); no`dangerouslySetInnerHTML`.                                                                                                                                                                 |
| Dependencies     | PASS — `@google/genai` (+ transitive google/protobuf deps) removed; bumps body-parser 1.20.8, express 4.22.3, brace-expansion 5.0.12, fast-uri 3.1.8 (patch) and multer 2.4.0, qs 6.16.0 (**minor**, semver-compatible). CI adds `openai>=1.30` to runtime tests. |
| Config           | PASS — CORS not widened (non-https origin = error, loopback = warning on hosted tiers); prod flags tightened; `.gitignore` adds `.env.*`.                                                                                                                         |

Low notes: S1 `GET /v1/runtime/ai-health` (clinicos-ai-runtime/clinicos_ai/api/app.py:234) is unauthenticated like the existing
`/v1/runtime/health`, and additionally exposes model ids, credentials-present booleans and the cost/budget snapshot (spend figures).
No secrets, but consider service-token gating if the runtime has a public domain. S2 `/ready` (backend/src/lib/readiness.ts) is
anonymous and reveals tier/authMode/AI flags — acceptable for a readiness probe.

## Verdict

**READY FOR QA**

No correctness bug, all builds/tests green (baseline-only frontend failures), Playwright 15/15, no security blocker.
Carry into QA/merge decision: F5 (verify Railway backend vars against the new fail-fast validation before merge — backend
auto-deploys), F4 (assistant LLM flags), S1, and the implementer's own status `PARTIAL` (9B AC6 real OpenAI smoke/cutover
external-blocked). This is not "done": no issue closed, nothing merged or deployed.
