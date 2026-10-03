# Phase 9 — Secrets and Configuration

## 1. Secret inventory (names only — values never written anywhere in the repo)

| Secret                                          | Where it lives                                                                                 | Consumer                 | Rotation                                                                                              |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                  | Railway (backend)                                                                              | backend / Prisma         | Railway Postgres credentials rotate → redeploy                                                        |
| `AI_RUNTIME_SERVICE_TOKEN`                      | Railway (backend + runtime, same value)                                                        | backend → runtime Bearer | set new value on BOTH services, redeploy runtime then backend (≈1 min of AI fallback, GUI unaffected) |
| `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT` | Railway (runtime only)                                                                         | runtime                  | Azure key 1/2 swap, update runtime var                                                                |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY`             | Railway (backend: import; runtime: STT)                                                        | AI import / STT          | provider console                                                                                      |
| `MISTRAL_API_KEY`, `AZURE_DOCINTEL_API_KEY`     | Railway (runtime)                                                                              | OCR                      | provider console                                                                                      |
| `ROLE_SIMULATOR_SECRET`                         | Railway **demo** only (64 chars)                                                               | simulator HMAC           | change → all demo sessions end                                                                        |
| `AI_GATEWAY_CONTEXT_SECRET`                     | Railway (backend)                                                                              | gateway context signing  | change → in-flight contexts invalid                                                                   |
| `METRICS_TOKEN` (new, ≥24 chars)                | Railway (backend), scraper                                                                     | `/metrics`               | change in both places                                                                                 |
| Entra                                           | none (public client + JWKS) — `ENTRA_TENANT_ID`, `ENTRA_AUDIENCE` are identifiers, not secrets | backend                  | n/a                                                                                                   |

Key Vault is not in use; Railway variables are the secret store (encrypted at rest, per
environment). No new platform introduced.

## 2. Verification (2026-10-01)

| Check                                                                                      | Result                                                                                                                      | Evidence                                                    |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Committed secrets (tracked files, patterns sk-, api keys, private keys, DSN with password) | none real — only placeholders/test fixtures                                                                                 | explorer scan; `scripts/security/scan-frontend-secrets.mjs` |
| Frontend bundle                                                                            | 0 findings in `frontend/src`; built `dist/` contains none of the server secret names; no `.map` files                       | build + grep                                                |
| Frontend env                                                                               | only `VITE_API_URL`, `VITE_ENTRA_*` (public identifiers)                                                                    | `entraAuth.ts`                                              |
| Logs                                                                                       | config validation prints names only; runtime logs exception TYPE only for plan/compose; structured logs drop sensitive keys | tests `logging…`, runtime `GenericErrorBodyTests`           |
| Prompts                                                                                    | no secret enters any prompt (service token is a header)                                                                     | code review                                                 |
| `.gitignore`                                                                               | now also ignores `.env.production/.development/.staging/.test`                                                              | `.gitignore`                                                |

## 3. Configuration by environment

| Variable                                              | development          | test          | demo (Railway)                   | production (Railway)                                           |
| ----------------------------------------------------- | -------------------- | ------------- | -------------------------------- | -------------------------------------------------------------- |
| `CLINICOS_ENV`                                        | unset → development  | unset → test  | unset → demo (synthetic marker)  | unset → production (recommended: set explicitly)               |
| `AUTH_MODE`                                           | demo                 | demo          | demo                             | **entra** (today unset → API 503)                              |
| `ROLE_SIMULATOR_ENABLED`                              | true                 | true          | true (+ALLOW_PRODUCTION, SECRET) | must be unset (startup error)                                  |
| `AUTHZ_ENFORCEMENT` / `AUTHZ_UNMAPPED_ROUTES`         | default enforce/deny | same          | same                             | same; `off`/`allow` = startup error                            |
| `AI_RUNTIME_URL` + token                              | optional             | stub          | prod runtime                     | prod runtime                                                   |
| `SKILLS_INTERPRETER`                                  | agno if runtime      | deterministic | agno                             | agno (`deterministic` = AI kill switch)                        |
| `VOICE_CHANNEL_ENABLED`                               | opt-in               | opt-in        | true                             | true (false = voice kill switch)                               |
| `PROACTIVE_DISABLED_EVENTS`, `AI_ASSISTANT_*_ENABLED` |                      |               |                                  | feature flags                                                  |
| `METRICS_TOKEN`                                       | optional             | test value    | recommended                      | recommended (unset → /metrics 404)                             |
| `ACCESS_LOG`                                          | off                  | off           | default on (NODE_ENV=production) | default on                                                     |
| `SKILLS_AGNO_TIMEOUT_MS`                              | 20000                | 1000 in tests | 20000                            | 20000                                                          |
| `FRONTEND_URL(S)`                                     | localhost            | —             | demo Vercel                      | prod Vercel (today also `http://localhost…` → warning, remove) |

## 4. Startup validation (`backend/src/lib/deployment.ts#validateDeploymentConfig`)

Errors (NODE_ENV=production → `process.exit(1)` before listen; Railway keeps the previous deploy):
invalid `CLINICOS_ENV`; missing `DATABASE_URL`; `AUTH_MODE=entra` without tenant/audience;
non-https `ENTRA_JWKS_URL` on hosted tiers; `AUTH_MODE=demo`, simulator or demo-auth flags or the
synthetic marker on tier production; simulator in NODE_ENV=production without a ≥32-char secret;
`AUTHZ_ENFORCEMENT=off` / `AUTHZ_UNMAPPED_ROUTES=allow` on hosted tiers; CORS `*` or non-loopback
`http://` origin; `AI_RUNTIME_URL` without token; non-integer timeouts; `AI_MAX_RETRIES>5`;
`METRICS_TOKEN` < 24 chars.

Startup is also refused when the tier is production even if `NODE_ENV` is not `production`.

Warnings: `CLINICOS_ENV` unset on NODE_ENV=production (derived tier); `AUTH_MODE` unset (API 503); loopback CORS origin on hosted tier; runtime token < 24;
runtime URL not https outside `*.railway.internal`; no runtime (deterministic mode); no
`METRICS_TOKEN`.

Verified against the REAL variable sets: production (names, values masked) → 0 errors, warnings
`AUTH_MODE` unset + loopback origin + no METRICS_TOKEN; demo env injected by `railway run` → 0
errors (backend :3099 started). Tests: `config: …` (2 tests, 15 dangerous cases).

## 5. Provider-agnostic AI configuration (runtime service) — Phase 9

| Variable                                                                                       | Purpose                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `AI_PROVIDER`                                                                                  | the single LLM switch (openai, azure, google/gemini, anthropic/claude, openai-like/local, test, mock); set ⇒ strict startup validation |
| `AI_MODEL_DEFAULT`, `AI_MODEL_<ROLE>`                                                          | models per logical role (COMMAND_PARSER, REASONING, SUMMARY, FAST, VISION); `provider:model` overrides the provider for that role      |
| `AI_TEMPERATURE_DEFAULT`, `AI_TEMPERATURE_<ROLE>`, `AI_TIMEOUT_SECONDS_<ROLE>`                 | optional per-role tuning                                                                                                               |
| `STT_PROVIDER`, `STT_MODEL`                                                                    | the voice switch (legacy `AI_STT_MODEL=provider:model` still read)                                                                     |
| `AI_FALLBACK_ENABLED`, `AI_FALLBACK_PROVIDER`, `AI_FALLBACK_MODEL_*`                           | explicit fallback (off)                                                                                                                |
| `AI_DAILY_TOKEN_BUDGET`, `AI_PROVIDER_SDK_RETRIES`, `AI_MAX_OUTPUT_TOKENS`, `AI_STRICT_CONFIG` | cost/retry guards, strictness in legacy mode                                                                                           |
| `OPENAI_API_KEY` (+ `OPENAI_BASE_URL`, `OPENAI_ORG_ID`)                                        | OpenAI Direct credential — **not yet set on Railway**                                                                                  |

Secret names are vendor-specific only in the adapter/config layer (`provider_registry.PROVIDERS[*].credential_env`).
Backend: `AI_ENABLED` (master switch, default true); `GEMINI_API_KEY`, `AI_MODEL`, `AI_STRUCTURED_MODEL`,
`AI_AGENT_MODEL`, `AI_ASSISTANT_PLAN_MODEL`, `AI_ASSISTANT_COMPOSE_MODEL` are **no longer read** by the
backend (safe to delete from the backend service after deploy). `AI_PROVIDER=mock` in the backend only
selects the in-process CI mock for import.
