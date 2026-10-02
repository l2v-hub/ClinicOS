# Phase 9 — Production Architecture

Harden, don't redesign: P1–P8 are unchanged in shape. Phase 9 adds an identity boundary that is
production-safe, a deployment tier, startup validation, readiness, correlation/metrics, and
operational drills. Everything below is verified on local real processes (see `E2E_TEST_REPORT.md`).

## 1. Runtime topology (unchanged)

```
Browser (Vercel SPA, clinicos__)          ── HTTPS ──▶  Backend (Railway, Express, 1 replica)
  MSAL (Entra) or Role Simulator (demo)                   │  Prisma ─▶ Postgres (Railway)
                                                          │  HTTPS + Bearer service token
                                                          ▼
                                            AI runtime (Railway, FastAPI/Agno, Python)
                                              Azure OpenAI (gpt-6.1-sol) · Google STT · Gemini
```

## 2. Request path (production target)

```
Authenticated Principal (Entra JWT, RS256, tenant JWKS)        backend/src/lib/entra-auth.ts
  → Identity Mapping (oid → User → Operator, server-side)       authenticateEntra()
  → Role/Capability Policy (ACTIVE AuthzPolicyVersion, per request) authz/request-context.ts
  → Capability route gate (catalogued routes, unmapped = 403)  authz/route-gate.ts
  → Resident Scope (registered_by_me | all)                    access-scope/resident-access-scope.ts
  → Application (routes / Tool Layer / Skills / Proactive / Copilot / Voice)
```

The identity SOURCE is the only thing that differs between environments (`ai/auth.ts#requireOperator`):

| Tier (`lib/deployment.ts`) | Identity sources allowed                                                      | How the tier is derived                                                                    |
| -------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `production`               | Entra JWT only (`AUTH_MODE=entra`); unset → clinical API 503                  | `CLINICOS_ENV=production`, or `NODE_ENV=production` without `DEMO_DATASET_ID=synthetic-v1` |
| `demo`                     | Role Simulator (signed session) / demo headers on 2 synthetic ids, time-boxed | `NODE_ENV=production` + `DEMO_DATASET_ID=synthetic-v1`                                     |
| `staging`                  | as production (explicit `CLINICOS_ENV=staging`)                               | explicit                                                                                   |
| `development` / `test`     | Simulator, demo headers, Entra                                                | `NODE_ENV`                                                                                 |

## 3. Phase 9 components

| Component              | File / symbol                                                                                                   | Purpose                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Deployment tier        | `backend/src/lib/deployment.ts#deploymentTier`, `isRealProduction`                                              | single source for "is this real production"                    |
| Startup validation     | `lib/deployment.ts#validateDeploymentConfig`, `server.ts`                                                       | dangerous config → exit(1) before listen (NODE_ENV=production) |
| Simulator isolation    | `authz/simulator.ts#simulatorEnabled`, `ai/auth.ts#operatorAuthMode`, `productionDemoAuthEnabled`               | never on tier `production`                                     |
| Simulator logout       | `authz/simulator.ts#revokeSimulatorToken`, `POST /auth/simulator/logout`                                        | server-side session end                                        |
| Entra renewal / logout | `frontend/src/lib/entraAuth.ts#renewApiTokenSilently`, `clearEntraSession`; `App.tsx`                           | silent refresh every 4 min, MSAL cache cleared at logout       |
| Correlation + metrics  | `lib/observability.ts` (`requestObservability`, `metricsHandler`, `recordAiCall`, `recordFallback`, `logEvent`) | X-Request-Id, JSON access log, Prometheus text                 |
| Readiness              | `lib/readiness.ts#readinessHandler`, `GET /ready`                                                               | DB + policy; AI informative only                               |
| Graceful shutdown      | `server.ts#shutdown`                                                                                            | SIGTERM → ready=503, drain ≤10 s, prisma disconnect            |
| Runtime hardening      | `clinicos-ai-runtime/clinicos_ai/api/app.py#_auth`, `_correlation`; `clinicos_ai/correlation.py`                | constant-time token, generic errors, correlation id            |
| Seed guard             | `backend/src/seed.ts#buildPrisma`                                                                               | demo seed refused on tier production                           |
| Drills                 | `scripts/production/{load-test,recovery-drill,ai-off-gui-check,ai-runtime-stub}.mjs`                            | load, recovery, AI-off GUI                                     |

## 4. Invariants kept from P1–P8

One assistant / skill engine / Tool Layer / voice / proactive engine; profiles never grant;
«Conferma» is the only commit path; policy read per request (no snapshot at login); audit
append-only; unmapped routes 403; impossible vitals 400; untrusted-data rule unchanged
(no prompt was modified in Phase 9 → provider filter check not required).

## 5. Scaling constraint (unchanged, now explicit)

In-process state: skill workflows (30 min TTL), GUI idempotency (24 h), voice idempotency, rate
limiters, briefing cache, simulator revocation list, metrics. **Run exactly one backend replica.**
Horizontal scaling requires moving these to Postgres/Redis (see `PROMPT10_HANDOFF.md` §residual).

## 6. AI abstraction layer (provider-agnostic, Phase 9)

`Application / Agno / Skills → AI abstraction layer (contract.generate) → provider registry →
OpenAI | Azure | Gemini | Claude | OpenAI-compatible/local | test`, and `Voice layer → STT contract →
STT registry → OpenAI | Google | Azure | test`. The backend talks to the runtime over HTTP and is
vendor-free (dead Gemini SDK provider and `@google/genai` removed; import availability = runtime
configured; master switch `AI_ENABLED`). Details: `PROVIDER_ABSTRACTION.md`,
`PROVIDER_CAPABILITY_MATRIX.json`.
