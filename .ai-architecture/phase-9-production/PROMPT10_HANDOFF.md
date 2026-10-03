# PROMPT 10 — Handoff from Phase 9 (Production Hardening)

Read with `.ai-architecture/CURRENT_STATE.json` (phase 9). Phase 9 status: **CONDITIONALLY READY** —
everything implementable is hardened and verified on real local processes; go-live depends on
external identity provisioning, deployment of this branch and an authenticated production smoke.
Binding invariants from `phase-8-copilots/PROMPT9_HANDOFF.md` §12, `phase-7-proactive/PROMPT8_HANDOFF.md`
§13 and `phase-6-safety/PROMPT7_HANDOFF.md` §13 still apply.

## 0. Owner decision (2026-10-02)

The owner deferred, by explicit decision: (a) Entra ID provisioning and (b) distinguishing the demo
and production environments — the platform is still in development, not in clinical production.
Items 1 and 18 of §17 and blockers 1–2 of §18 are therefore **deferred, not open requests**.
Practical consequence while deferred: a Railway environment with `NODE_ENV=production` is treated
as tier `demo` only if it carries `DEMO_DATASET_ID=synthetic-v1` (or `CLINICOS_ENV=demo`); without
it, it is tier `production` and refuses simulator/demo flags at startup (today's production env sets
none of them, so nothing changes). To run the simulator on the "production" Railway env during
development, add `DEMO_DATASET_ID=synthetic-v1` (+ the demo auth variables) there.

## 1. Production architecture

`PRODUCTION_ARCHITECTURE.md`. Browser (Vercel `clinicos__`, MSAL) → Backend (Railway, Express,
**1 replica**) → Postgres; Backend → AI runtime (Railway, FastAPI/Agno) → Azure OpenAI
(`gpt-6.1-sol`), Google STT. Request path: Entra JWT → `oid` mapping → ACTIVE policy (per request)
→ capability route gate → resident scope → application.

## 2. Exact startup / deployment commands

```bash
# backend (Railway, from root railway.json)
npm install --include=dev --no-audit --no-fund && npm run build:backend   # build
npm run db:migrate            # pre-deploy: prisma migrate deploy --config=../prisma.config.ts (backend/)
node backend/dist/server.js   # start → [config] validation → listen
# runtime: Dockerfile, python -m clinicos_ai.main
# deploy: merge to main (backend + runtime auto); demo: railway up --detach --project bddf5d1b-ee83-4362-8238-a79721f795e5 --service clinicos-backend --environment demo
# frontend: vercel deploy --prod --archive=tgz --yes   (repo root, global vercel)
```

Local: `PORT=3099 NODE_ENV=development AUTH_MODE=demo ROLE_SIMULATOR_ENABLED=true FRONTEND_URL=http://127.0.0.1:5199 node --import tsx src/server.ts` (backend/), `VITE_API_URL=http://127.0.0.1:3099 npx vite --port 5199 --strictPort` (frontend/).

## 3. Environment prerequisites (go-live)

Backend: `CLINICOS_ENV=production`, `AUTH_MODE=entra`, `ENTRA_TENANT_ID`, `ENTRA_AUDIENCE`,
`DATABASE_URL`, `AI_RUNTIME_URL`, `AI_RUNTIME_SERVICE_TOKEN` (≥24), `FRONTEND_URL` (https only — drop
the current `http://localhost…` entry), `METRICS_TOKEN` (≥24). Must NOT be set: `ROLE_SIMULATOR_*`,
`ALLOW_PRODUCTION_DEMO_AUTH`, `DEMO_DATASET_ID`, `AUTHZ_ENFORCEMENT=off`, `AUTHZ_UNMAPPED_ROUTES=allow`
(startup refuses them). Frontend build: `VITE_API_URL`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_TENANT_ID`,
`VITE_ENTRA_API_SCOPE`. Runtime: `AZURE_OPENAI_*`, `AI_*_MODEL`, STT keys, same service token.
Full table: `SECRETS_AND_CONFIGURATION.md`.

## 4. Identity / auth flow

`IDENTITY_AND_SESSION.md`. `ai/auth.ts#requireOperator` → `lib/entra-auth.ts#authenticateEntra`
(RS256, issuer, audience, exp, `oid`) → `User.entraObjectId` → `Operator`; `authz/request-context.ts#ensureAuthorization`
per request. Simulator: `authz/simulator.ts` (never on tier production; `POST /auth/simulator/logout`
revokes). Frontend: `lib/entraAuth.ts` (`acquireApiToken`, `renewApiTokenSilently` every 4 min,
`clearEntraSession` at logout), `lib/operatorSession.ts` (`operatorHeaders`, `updateAccessToken`).

## 5. Test identity strategy (no secrets)

- Local/CI: Role Simulator identities `SIM-ADMIN`, `SIM-SUPERVISOR-1`, `SIM-DOCTOR-1`, `SIM-NURSE-1`,
  `SIM-OSS-1` (synthetic, `seed-assistant-demo.mts` provisions them).
- Entra in tests: local RSA key + JWKS server, `ENTRA_JWKS_URL` override (`phase9-production.test.ts`,
  `patient-documents-entra.test.ts`) — no tenant secret involved.
- Production smoke: dedicated test users in the tenant mapped to synthetic operators with explicit
  `entraObjectId` and policy assignments; credentials held by the organisation, never in the repo.

## 6. Roles / capabilities / resident scope

Policy: `AuthzPolicyVersion` (ACTIVE), registry `authz/capability-registry.json`, matrix
`phase-2-authorization/ROLE_CAPABILITY_MATRIX.json`; roles oss, nurse, doctor, supervisor, administrator.
Scope: `access-scope/resident-access-scope.ts` (operators `registered_by_me`, admin/manager `all`).
Unmapped routes → 403 `capability_unmapped`.

## 7. Entry points

| Area       | Entry                                                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool Layer | `backend/src/tools/http.ts#createToolRouter`, `/tools/*`, registry `tools/index.ts`                                                                  |
| Skills     | `skills/http.ts` (`/skills/converse`, `/skills/session`, `/skills/workflows/:id`), `skills/engine.ts`, `skills/interpreter.ts#createAgnoInterpreter` |
| Assistant  | frontend `components/assistant/AssistantMode.tsx`, `assistantApi.ts`; legacy `/ai/assistant`                                                         |
| Voice      | `/skills/voice/*`, `voice/stt.ts`; frontend `components/assistant/voice/*`                                                                           |
| Proactive  | `proactive/http.ts` (`/skills/proactive/inbox                                                                                                        | briefing                                             | ack                                                     | seen | open`), `proactive/engine.ts` |
| Copilot    | `copilot/http.ts` (`/skills/copilot/home                                                                                                             | round`), `copilot/profiles.ts`, `role-profiles.json` |
| Ops        | `GET /health`, `GET /ready`, `GET /metrics`, `GET /auth/status`, `GET /auth/me`                                                                      |
| Runtime    | `clinicos-ai-runtime/clinicos_ai/api/app.py` (`/v1/assistant/skill-route                                                                             | plan                                                 | compose`, `/v1/voice/transcribe`, `/v1/runtime/health`) |

## 8. Feature flags (≠ authorization)

`VOICE_CHANNEL_ENABLED`, `SKILLS_INTERPRETER=deterministic`, `AI_ASSISTANT_LLM_ENABLED` /
`_PLAN_` / `_COMPOSE_`, `PROACTIVE_DISABLED_EVENTS`, `AI_DISABLED_ACTIONS`, `ROLE_SIMULATOR_ENABLED`
(dev/demo only), `ACCESS_LOG`, `SKILLS_AGNO_TIMEOUT_MS`. Runbook §6.

## 9. Audit verification

`AiAuditEvent` append-only (3 triggers). Skill turns: `requestId = skill-<workflowId>`, actions
`skill:<id>:request|execute`; voice `voice:transcribe`; GUI ops `recordOperationalAudit`. Link to the
HTTP request via log line `{"evt":"audit","req":…,"auditRequestId":…}`. Runbook §7.

## 10. Observability / health

`OBSERVABILITY.md`: `X-Request-Id` end-to-end, JSON logs `evt:http|ai_call|audit`, Prometheus
`/metrics` (token), recommended alerts. `/health` liveness (Railway healthcheck), `/ready` readiness
(DB + policy, 2 s checks, AI informative only), graceful SIGTERM (10 s).

## 11. Migrations

51 forward-only migrations; none added in Phase 9; clean apply verified ×6. Pre-existing drift:
5 `Consegna` DESC indexes vs ascending in `schema.prisma` (fix = schema annotation, needs approval).

## 12. Test / smoke commands

```bash
# backend (backend/), disposable Postgres only
NODE_ENV=test AUTH_MODE=demo AI_PROVIDER=mock DATABASE_URL=<local> npx tsx --test --test-concurrency=1 src/__tests__/phase9-production.test.ts
NODE_ENV=test AUTH_MODE=demo AI_PROVIDER=mock DATABASE_URL=<local> node --import tsx --test --test-concurrency=1 $(find src -name "*.test.ts" | sort)
# runtime
cd clinicos-ai-runtime && python -m unittest discover -s tests -p "test_*.py"
# frontend
cd frontend && npm test && npm run build
# browser (Vite :5199, backend :3099; real Agno: railway run … --environment demo -- env DATABASE_URL=<local> PORT=3099 FRONTEND_URL=http://127.0.0.1:5199 AI_RATE_LIMIT_PER_MIN=600 …)
node scripts/{copilot,proactive,safety,assistant,voice}/<name>-browser-e2e.mjs --front http://127.0.0.1:5199 --api http://127.0.0.1:3099 --out <dir>
#   seeds: assistant + proactive (copilot/proactive/safety/assistant); assistant + voice (voice); fresh DB for proactive and voice
# ops drills
node scripts/production/{ai-runtime-stub,load-test,recovery-drill,ai-off-gui-check}.mjs …   # see PRODUCTION_RUNBOOK §9
```

## 13. Load baseline

`LOAD_TEST_REPORT.md`: ~90 rps mixed on one local process, 0 % errors at c=10/40; GUI p95 ≤ 275 ms
at c=40; Copilot home and Assistant turn saturate first (p95 1.3 s / 2.0 s at c=40); 0 AI calls from
polling; per-operator limiter 60/min returns 429 to runaway clients.

## 14. Behaviour when AI is unavailable

Deterministic interpreter (same skills, same previews, same «Conferma»), structured Assistant
answers, briefing facts without summary, voice disabled with a reason; classic GUI unchanged.
Verified: backend AI-resilience test, drill R3, `ai-off-gui-check` 15/15.

## 15. Release-critical invariants

1. Tier production ⇒ no simulator, no demo identities (code + startup refusal).
2. Identity only from verified claims / signed session; client role/scope never trusted.
3. Authorization per request; no permission snapshot at login.
4. «Conferma» is the only commit path; one confirmation = at most one write.
5. AI failure never writes and never reports success.
6. No secret/PHI in logs, metrics, prompts or client.
7. `/ready` never depends on AI; `/health` never depends on DB.
8. One backend replica while state is in memory.
9. Audit append-only; telemetry never replaces audit.

## 16. Role-by-role acceptance paths (production smoke script for Prompt 10)

| Role          | Path                                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OSS           | login → home (OSS copilot, no therapy) → round → «registra parametri» on own resident → preview → Conferma → reading + audit; therapy request → DENIED |
| Nurse         | login → inbox «Da vedere» → signal → vitals skill → Conferma; voice «pressione 120 su 80» → transcript review → preview → Conferma (one write)         |
| Doctor        | login → resident summary → prescription preparation (HIGH_RISK preview) → Conferma                                                                     |
| Supervisor    | login → facility view (scope all) → briefing (≤1 AI call) → handover                                                                                   |
| Administrator | login → policy page (view/impact/apply) → no clinical feed, clinical write denied                                                                      |
| Any           | out-of-scope resident → 403 `resident_out_of_scope`; logout → token unusable (simulator) / cache cleared (Entra)                                       |

## 17. Residual risks

| #   | Risk                                                                                | Severity             | Mitigation / owner                                                       |
| --- | ----------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------ |
| 1   | No IdP configured in production (clinical API 503 today)                            | **blocker**          | organisation: Entra app registration + vars + user mapping               |
| 2   | Phase 9 not deployed (prod lacks `/ready`, metrics, correlation)                    | high                 | merge branch → auto deploy backend/runtime; manual demo + Vercel         |
| 3   | Entra access token valid until `exp` after logout (no server revocation, no CAE)    | medium               | short token lifetime / Conditional Access                                |
| 4   | R-07 `preferred_username` auto-link                                                 | medium               | decide before rollout; pre-map privileged accounts                       |
| 5   | In-memory state ⇒ single replica                                                    | medium               | Postgres/Redis stores before scaling                                     |
| 6   | No external metrics scraper / alerting                                              | medium               | choose provider; rules in OBSERVABILITY §4                               |
| 7   | Audit retention unbounded; legal retention decisions                                | medium               | organisation / DB-ops                                                    |
| 8   | Prod CORS contains `http://localhost…`                                              | low                  | remove from `FRONTEND_URL`                                               |
| 9   | Graceful shutdown verified by code review only (SIGTERM not deliverable on Windows) | low                  | verify on Railway redeploy logs (`[shutdown]`)                           |
| 10  | Runtime Docker image runs as root                                                   | low                  | add non-root USER, verify upload dir perms                               |
| 11  | Exact token usage not reported by runtime (chars proxy)                             | low                  | return provider `usage`                                                  |
| 12  | `Consegna` index drift                                                              | low                  | schema annotation (approval)                                             |
| 13  | Classic Note/Consegne scope (R7-2)                                                  | product              | decision pending                                                         |
| 14  | Azure STT deployment missing (PR #393); Google STT active                           | product/infra        |                                                                          |
| 15  | No DB `statement_timeout`                                                           | low                  | set on the role/connection                                               |
| 16  | Entra logout ends the local MSAL cache only, not the IdP SSO session                | low                  | `logoutRedirect` for shared tablets (product decision)                   |
| 17  | `seed.ts` guard reads the env of the machine running it, not the target DB          | low                  | never run seeds with a production `DATABASE_URL`                         |
| 18  | Tier derived while `CLINICOS_ENV` unset (demo marker would flip it)                 | medium until go-live | set `CLINICOS_ENV=production` on Railway prod (startup warns until then) |

## 18. External blockers

1. Entra ID: app registration (SPA + API scope), tenant id, audience, user `oid` mapping —
   not provisioned (verified by variable names on Railway production and Vercel production).
2. Authenticated production smoke requires (1) + deployment of this branch.
3. Metrics/alerting backend not chosen.
4. Legal: DPIA / residency / retention decisions (PRIVACY_AND_RETENTION §4).

## 19. File / symbol references (Phase 9 changes)

`backend/src/lib/deployment.ts` (`deploymentTier`, `isRealProduction`, `validateDeploymentConfig`),
`backend/src/lib/observability.ts` (`requestObservability`, `metricsHandler`, `recordAiCall`,
`classifyAiFailure`, `recordFallback`, `logEvent`, `routeShape`, `correlationHeaders`,
`currentRequestId`), `backend/src/lib/readiness.ts` (`readinessHandler`, `setReadinessDeps`,
`markShuttingDown`), `backend/src/server.ts` (validation, `shutdown`), `backend/src/app.ts`
(`/ready`, `/metrics`, middleware order), `backend/src/ai/auth.ts` (`operatorAuthMode`,
`productionDemoAuthEnabled`), `backend/src/authz/simulator.ts` (`simulatorEnabled`,
`revokeSimulatorToken`, `verifySimulatorToken`), `backend/src/routes/authz.ts` (`POST /auth/simulator/logout`),
`backend/src/ai/audit-store.ts#recordAuditEvent` (audit link line), `backend/src/skills/interpreter.ts`
(`agnoTimeoutMs`, instrumentation), `backend/src/ai/assistant/runtime-client.ts#runtimePost`,
`backend/src/voice/stt.ts` (instrumentation), `backend/src/proactive/engine.ts` (briefing kind),
`backend/src/seed.ts` (tier guard), `frontend/src/lib/entraAuth.ts`, `frontend/src/lib/operatorSession.ts`,
`frontend/src/App.tsx` (`tokenRenewalRef`, `handleLogout`), `clinicos-ai-runtime/clinicos_ai/correlation.py`,
`clinicos_ai/api/app.py` (`_auth`, `_correlation`, generic errors), `clinicos_ai/agents/assistant.py`,
`clinicos_ai/voice/stt.py`, tests `backend/src/__tests__/phase9-production.test.ts`,
`clinicos-ai-runtime/tests/test_phase9_hardening.py`, scripts `scripts/production/*.mjs`.

## 20. Provider-agnostic AI / STT (Phase 9, provider abstraction)

Authoritative description: `PROVIDER_ABSTRACTION.md`; machine-readable matrix:
`PROVIDER_CAPABILITY_MATRIX.json` (generated: `cd clinicos-ai-runtime && python -m tools.capability_matrix --out ../.ai-architecture/phase-9-production/PROVIDER_CAPABILITY_MATRIX.json`).

| Item                   | Path / symbol                                                                                                                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI contract            | `clinicos-ai-runtime/clinicos_ai/models/contract.py` — `ModelRole`, `AIRequest`, `AIResponse`, `Usage`, `AIProvider`, `generate()`, `BUDGET`, `usage_from_metrics()`                                                         |
| Normalized errors      | `models/errors.py` — `AI_ERROR_CODES`, `ai_error_code()`, `classify_exception()`                                                                                                                                             |
| Provider registry      | `models/provider_registry.py` — `PROVIDERS`, `ProviderEntry`, `normalize_provider()`, `has_credentials()`                                                                                                                    |
| Role resolver / config | `models/configuration.py` — `load_runtime_config()` (new mode `AI_PROVIDER` / legacy), `ROLES`, `LEGACY_ROLE_ALIASES`                                                                                                        |
| Validation             | `models/validation.py` — `validate_ai_config()`, `strict_mode()`; startup in `api/app.py#_log_model_config`                                                                                                                  |
| OpenAI Direct adapter  | `models/providers/openai.py` (`_OpenAIRunner`, `completion_from_response`); STT `voice/providers/openai.py`                                                                                                                  |
| Test provider          | `models/providers/fake.py` (`route_for`, `AI_TEST_FAULT`), `voice/providers/fake.py`                                                                                                                                         |
| STT contract           | `voice/stt.py` — `transcribe()`, `stt_model()`, `TranscriptResult`, `SttError`, adapters `voice/providers/*`                                                                                                                 |
| Runtime endpoints      | `/v1/runtime/health`, `/v1/runtime/ai-health` (no provider call), responses carry `ai` metadata                                                                                                                              |
| Backend                | vendor-free: `backend/src/lib/ai-flags.ts` (`aiEnabled`, `aiRuntimeConfigured`), `ai/config.ts` (import = runtime/vision), metrics in `lib/observability.ts` (`recordAiCall(…, AiCallMeta)`, `aiMetaOf`, `runtimeErrorMeta`) |
| Benchmark              | `cd clinicos-ai-runtime && python -m tools.benchmark.run [--suites …] [--pace-ms N] --out report.json` (fixtures `tools/benchmark/fixtures.json`, `skills.json`)                                                             |
| Switch acceptance      | `node scripts/production/provider-switch-acceptance.mjs --db <local> --python <venv python> --out <dir>`                                                                                                                     |
| Contract tests         | `clinicos-ai-runtime/tests/test_provider_agnostic.py`, stub `tests/openai_stub.py`, `tools/openai_stub_server.py`                                                                                                            |

Config variables, switch procedure, fallback policy, onboarding contract: `PROVIDER_ABSTRACTION.md` §1, §5–7.
Secrets expectation: `OPENAI_API_KEY` only on the runtime service (Railway variable), never in backend,
frontend, logs, prompts or repo. Resilience tests: runtime `ErrorAndUsageNormalizationTests`,
backend `phase9-production.test.ts` («AI resilience», «provider metadata», «AI_ENABLED=false»).
Cost baseline: `PERFORMANCE_AND_COST_BUDGET.md` §5.

**Owner decisions / external items for the provider switch**

1. Set `OPENAI_API_KEY` on `clinicos-ai-runtime` (production) — not set as of 2026-10-02.
2. After deploy: `AI_PROVIDER=openai` + `AI_MODEL_DEFAULT=<model id available to the key>`; optional
   `STT_PROVIDER=openai` + `STT_MODEL`. Then real smoke: `GET /v1/runtime/ai-health` + benchmark.
3. OpenAI data-processing / residency settings for the organisation (DPA) before real clinical data.

Release-critical invariants added: business code never names a vendor (CouplingGuardTests); one switch
selects the provider; capability mismatch / missing credentials fail at startup in strict mode;
no hidden SDK retries; fallback explicit and marked; provider output never authorizes anything.

## 21. Phase 9B — OpenAI Direct on Railway (final configuration)

**Current primary provider (target, configuration-ready): OpenAI API Direct.** Azure is NOT the
architecture and must not be assumed by Prompt 10. Reality on 2026-10-02: the cutover variables are
NOT yet applied because `OPENAI_API_KEY` does not exist on Railway; production runs the legacy Azure
config (and the pre-Phase-9 runtime code until this branch is merged).

| Item                               | Value / path                                                                                                                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Runtime architecture               | Browser → `clinicos-backend` (Railway) → `clinicos-ai-runtime` (Railway, provider registry → OpenAIProvider) → OpenAI; voice: backend → runtime STT registry → OpenAI `/audio/transcriptions`                                        |
| Railway configuration doc          | `RAILWAY_OPENAI_CONFIGURATION.md` (variables, secrets, rotation, verification, rollback)                                                                                                                                             |
| Role mapping                       | FAST, COMMAND_PARSER, SUMMARY, VISION (via `AI_MODEL_DEFAULT`) → `gpt-5.6-luna`; REASONING → `gpt-5.6-sol`                                                                                                                           |
| STT                                | `STT_PROVIDER=openai`, `STT_MODEL=gpt-transcribe`; realtime `STT_REALTIME_ENABLED=false`, `STT_REALTIME_MODEL=gpt-live-transcribe` (not implemented → enabling it fails validation); `gpt-4o-mini-transcribe` flagged as deprecated  |
| Adapter                            | `clinicos-ai-runtime/clinicos_ai/models/providers/openai.py` (Responses API, AsyncOpenAI `max_retries=0`, `store=False`), `voice/providers/openai.py`; no Azure import / endpoint / api-version                                      |
| Cost                               | `clinicos_ai/models/cost.py` (`AI_PRICING_JSON`, `AI_DAILY/MONTHLY_SOFT_BUDGET_USD`, `COSTS`), hard guard `AI_DAILY_TOKEN_BUDGET`; telemetry in runtime log, `/v1/runtime/ai-health.cost`, backend `clinicos_ai_estimated_usd_total` |
| AI-off                             | backend `AI_ENABLED=false` (and runtime `AI_ENABLED=false`, no provider call)                                                                                                                                                        |
| Provider switch                    | `AI_PROVIDER=test` (or another provider) → redeploy runtime; back with `AI_PROVIDER=openai`                                                                                                                                          |
| STT switch                         | `STT_PROVIDER=test                                                                                                                                                                                                                   | google | azure`+`STT_MODEL` |
| Secret rotation                    | `RAILWAY_OPENAI_CONFIGURATION.md` §5                                                                                                                                                                                                 |
| Smoke                              | `python -m tools.openai_smoke` (runtime, real with `railway run`); `node scripts/production/provider-switch-acceptance.mjs` (process-level, stub)                                                                                    |
| Provider health                    | `GET <runtime>/v1/runtime/ai-health` (no provider call), `/v1/assistant/llm-health` (provider-agnostic)                                                                                                                              |
| Tests                              | `clinicos-ai-runtime/tests/test_openai_cutover.py` (10), `test_provider_agnostic.py` (20)                                                                                                                                            |
| Azure runtime dependency remaining | 1 — OCR role (Mistral on the Azure resource; owner decision «OCR invariato»)                                                                                                                                                         |

**Release acceptance path after the key is set** (each with evidence): ai-health ok → openai_smoke all
PASS (real) → app: Assistant read (luna) → «registra pressione 120/80 a questo ospite» → preview →
Conferma → reading + audit → voice utterance (gpt-transcribe → luna → preview) → AI_ENABLED=false check
→ re-enable. Blockers: `OPENAI_API_KEY`; verify that the key can use `gpt-5.6-luna`, `gpt-5.6-sol`,
`gpt-transcribe`; OpenAI DPA/residency decision before real clinical data.
