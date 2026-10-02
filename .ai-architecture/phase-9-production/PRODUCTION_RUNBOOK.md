# ClinicOS — Production Runbook (Phase 9)

URLs: backend `https://clinicos-backend-production-df88.up.railway.app`, demo backend
`https://clinicos-backend-demo.up.railway.app`, frontend `https://clinicos-eosin.vercel.app` (Vercel
project `clinicos__`). Railway project `bddf5d1b-ee83-4362-8238-a79721f795e5` (environments
`production`, `demo`; services `clinicos-backend`, `clinicos-ai-runtime`, `Postgres`).

## 1. Deploy

| What                 | How                                                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend + migrations | merge to `main` → GitHub Action "Deploy Backend to Railway" (pre-deploy `prisma migrate deploy`). Watch: `gh run watch <id> --exit-status`                  |
| AI runtime           | merge to `main` touching `clinicos-ai-runtime/**` → "Deploy AI Runtime"                                                                                     |
| Demo backend         | `railway up --detach --project bddf5d1b-ee83-4362-8238-a79721f795e5 --service clinicos-backend --environment demo` (clean origin/main worktree, short path) |
| Frontend             | repo root: `vercel deploy --prod --archive=tgz --yes` (global `vercel`, not npx)                                                                            |

A deploy whose configuration is unsafe stops at startup with `[config] … ERRORE …` in the deploy
logs; Railway keeps serving the previous deployment. Fix the variable and redeploy.

## 2. Health / readiness

```bash
B=https://clinicos-backend-production-df88.up.railway.app
curl -s $B/health                 # liveness {"status":"ok"} — Railway healthcheck
curl -s $B/ready                  # {"status":"ready","checks":{"database":"ok","policy":"ok"},"ai":{…}}
curl -s $B/auth/status            # identity mode (entra | demo | disabled), simulator flag
curl -s -H "Authorization: Bearer $METRICS_TOKEN" $B/metrics | grep clinicos_
```

`/ready` 503 + `database: fail` → DB incident (§5). AI never makes `/ready` fail.

## 3. Configuration

Set with `railway variables --set "NAME=value" --service clinicos-backend --environment production`
(or the GitHub workflow `railway-set-var.yml`), then redeploy. Reference: SECRETS_AND_CONFIGURATION.md.
Go-live identity: `AUTH_MODE=entra`, `ENTRA_TENANT_ID`, `ENTRA_AUDIENCE`, `CLINICOS_ENV=production`,
`METRICS_TOKEN`; frontend build vars `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_TENANT_ID`,
`VITE_ENTRA_API_SCOPE` (Vercel → redeploy frontend). Remove the `http://localhost…` origin from
`FRONTEND_URL` in production.

## 4. Secret rotation

- Runtime service token: set the SAME new `AI_RUNTIME_SERVICE_TOKEN` on runtime and backend,
  redeploy runtime first, then backend. Between the two, AI degrades to deterministic (GUI fine).
- Provider keys (Azure/Google/Mistral): rotate in the provider console (key 1/2), update runtime
  variable, redeploy runtime.
- `ROLE_SIMULATOR_SECRET` (demo only): change → all demo sessions end.
- `METRICS_TOKEN`: update backend + scraper together.
- DB credentials: Railway Postgres → regenerate → `DATABASE_URL` reference updates → redeploy.

## 5. Incidents

| Symptom                                             | Check                                                                                                                     | Action                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Clinical API 503 `auth_disabled`                    | `/auth/status` mode                                                                                                       | `AUTH_MODE` unset/invalid → set `entra` (+ ENTRA vars)                |
| 503 `auth_configuration_missing`                    | ENTRA vars                                                                                                                | set `ENTRA_TENANT_ID`, `ENTRA_AUDIENCE`                               |
| 401 `token_invalid` for everyone                    | tenant/audience mismatch, JWKS reachability                                                                               | verify `ENTRA_AUDIENCE` = API app id URI; `ENTRA_ISSUER` default v2.0 |
| 403 `identity_not_mapped`                           | `User.entraObjectId`                                                                                                      | map the user's `oid` (DB-ops)                                         |
| 503 `authz_unavailable` / `/ready` policy fail      | DB / `AuthzPolicyVersion` active row                                                                                      | restore DB; never disable enforcement                                 |
| DB outage                                           | `/ready` database fail; Railway Postgres status                                                                           | wait/restore; backend recovers without restart (drill R4)             |
| AI outage / 429 / content filter                    | `clinicos_ai_calls_total{outcome!="ok"}`, runtime logs `agnos provider call … status=failure`, `/v1/assistant/llm-health` | nothing breaks: deterministic + GUI. If prolonged → disable AI (§6)   |
| STT down                                            | `/skills/voice/status`, runtime `stt … outcome=`                                                                          | disable voice (§6); typing works                                      |
| Railway "Application not found" / pre-deploy failed | Railway status                                                                                                            | Railway-side: wait for `/health` 200, `gh run rerun <id>` once        |

## 6. Kill switches (feature flags ≠ authorization; GUI always keeps working)

| Disable                      | Variable (backend unless noted)                                                      | Effect                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Voice                        | `VOICE_CHANNEL_ENABLED=false`                                                        | mic disabled with reason «Voce non attiva in questo ambiente»             |
| Proactive events             | `PROACTIVE_DISABLED_EVENTS=<ids>`; briefing AI: `AI_ASSISTANT_COMPOSE_ENABLED=false` | fewer signals / facts-only briefing                                       |
| Assistant LLM (plan/compose) | `AI_ASSISTANT_LLM_ENABLED=false` (and `_PLAN_`/`_COMPOSE_`)                          | structured answers                                                        |
| All AI interpretation        | `SKILLS_INTERPRETER=deterministic` (or unset `AI_RUNTIME_URL`)                       | deterministic Assistant, GUI unchanged (verified: ai-off-gui-check 15/15) |
| Specific AI actions          | `AI_DISABLED_ACTIONS=<ids>`                                                          |                                                                           |
| Role Simulator               | unset `ROLE_SIMULATOR_ENABLED` (impossible to enable on tier production)             |                                                                           |

## 7. Logs, metrics, audit

- Logs: `railway logs --service clinicos-backend --environment production`; JSON lines
  `evt:http|ai_call|audit` correlated by `req`. Find a request: `railway logs … | grep <X-Request-Id>`.
- Runtime: `railway logs --service clinicos-ai-runtime …` → `correlationId=<same id>`.
- Audit verification (read-only SQL via `railway connect Postgres`):
  `SELECT "createdAt","operatorId","actionType","outcome" FROM "AiAuditEvent" WHERE "requestId" = 'skill-<workflowId>' ORDER BY 1;`
  Append-only check (read-only): `SELECT tgname FROM pg_trigger WHERE tgrelid = '"AiAuditEvent"'::regclass AND NOT tgisinternal;`
  must list `AiAuditEvent_no_update`, `AiAuditEvent_no_delete`, `AiAuditEvent_no_truncate`.

## 8. Rollback / forward fix

Railway → service → Deployments → previous → Redeploy. Frontend: Vercel → Promote previous.
Migrations are forward-only (write a corrective migration). Config errors are caught at startup.

## 9. Drills (local / staging only — never production data)

```bash
# disposable Postgres → migrate → seed synthetic data, then:
node scripts/production/ai-runtime-stub.mjs --port 8799 --latency 400 --token <t>
node scripts/production/load-test.mjs --base http://127.0.0.1:3199 --duration 60 --concurrency 10 --metrics-token <m> --out <dir>
node scripts/production/recovery-drill.mjs --port 3299 --db <local url> --pg-ctl <pg_ctl> --pg-data <dir> --stub http://127.0.0.1:8799 --out <dir>
node scripts/production/ai-off-gui-check.mjs --front http://127.0.0.1:5299 --api http://127.0.0.1:3399 --out <dir>
```

## 10. Common diagnostics

`/auth/status` (mode), `/ready` (deps), `/metrics` (`clinicos_http_error_codes_total` taxonomy),
deploy log `[config]` lines (names only), `X-Request-Id` on every response for support tickets.

## 11. AI provider operations (provider-agnostic layer)

All on the runtime service `clinicos-ai-runtime` (Railway variables → redeploy runtime). The backend
never changes.

| Task                      | Action                                                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Switch provider           | `AI_PROVIDER=<openai                                                                                                                                              | azure | google | anthropic | openai-like | test>`+`AI_MODEL_DEFAULT` (+ credentials). Strict validation refuses an incoherent config at startup (previous deploy keeps serving) |
| Switch one role's model   | `AI_MODEL_<ROLE>=<model>` or `<provider:model>` (COMMAND_PARSER, REASONING, SUMMARY, FAST, VISION)                                                                |
| Rotate OpenAI key         | new key in OpenAI console → `OPENAI_API_KEY` → redeploy runtime → revoke old key                                                                                  |
| Disable all AI (keep GUI) | backend `AI_ENABLED=false` (redeploy backend) — or runtime down: backend falls back automatically                                                                 |
| Disable STT only          | backend `VOICE_CHANNEL_ENABLED=false`, or unset `STT_PROVIDER/STT_MODEL` on the runtime                                                                           |
| OpenAI outage / 5xx       | automatic deterministic fallback; optionally `AI_FALLBACK_ENABLED=true`, `AI_FALLBACK_PROVIDER=azure`, `AI_FALLBACK_MODEL_DEFAULT=gpt-6.1-sol` (privacy decision) |
| Provider rate limit       | metric `clinicos_ai_calls_total{outcome="rate_limited"}` / runtime `status=RATE_LIMIT`; raise provider quota, lower `AI_RATE_LIMIT_PER_MIN`, or enable fallback   |
| Restore OpenAI            | set `AI_FALLBACK_ENABLED=false` / `AI_PROVIDER=openai`, redeploy                                                                                                  |
| Back to Azure (legacy)    | unset `AI_PROVIDER` (AGNOS_LLM_* still configured) or `AI_PROVIDER=azure`                                                                                         |
| Inspect                   | `GET <runtime>/v1/runtime/ai-health`; runtime log `ai call role=… provider=… status=…`; backend `/metrics` `clinicos_ai_*{provider=…}`                            |
| Cost spike                | `clinicos_ai_tokens_total` by kind/provider → set `AI_DAILY_TOKEN_BUDGET`, lower `AI_MAX_OUTPUT_TOKENS`, check briefing cooldown and per-operator rate limit      |
| Benchmark a provider      | `cd clinicos-ai-runtime && python -m tools.benchmark.run --pace-ms 2000 --out report.json` with the provider's variables (synthetic fixtures)                     |
| Switch acceptance         | `node scripts/production/provider-switch-acceptance.mjs --db <local> --python <venv python>`                                                                      |

## 12. Railway + OpenAI Direct (Phase 9B) — see `RAILWAY_OPENAI_CONFIGURATION.md`

| Task                    | Railway action (service `clinicos-ai-runtime` unless noted)                                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add / rotate OpenAI key | Variables → `OPENAI_API_KEY` → redeploy → `/v1/runtime/ai-health` + `python -m tools.openai_smoke` → revoke old key                                                                                                              |
| Switch LLM provider     | `AI_PROVIDER` + that provider's credential variables (e.g. `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`)                                                                                                                                |
| Switch model            | only `AI_MODEL_<ROLE>` / `AI_MODEL_DEFAULT`                                                                                                                                                                                      |
| Switch STT              | `STT_PROVIDER` / `STT_MODEL`                                                                                                                                                                                                     |
| Disable all AI          | backend service `AI_ENABLED=false` (and/or runtime `AI_ENABLED=false`)                                                                                                                                                           |
| Disable voice           | backend `VOICE_CHANNEL_ENABLED=false`                                                                                                                                                                                            |
| Enable realtime STT     | only after it is implemented, tested and costed: `STT_REALTIME_ENABLED=true` (today: refused at startup)                                                                                                                         |
| Cost check              | `/v1/runtime/ai-health` → `cost` (estimated USD today/month, soft limits), runtime log `ai-budget soft limit exceeded`, backend `clinicos_ai_tokens_total`, `clinicos_ai_estimated_usd_total`, `clinicos_ai_audio_seconds_total` |
| Real smoke              | `railway run --project bddf5d1b-ee83-4362-8238-a79721f795e5 --service clinicos-ai-runtime --environment production -- python -m tools.openai_smoke --out smoke.json` (from `clinicos-ai-runtime/`)                               |
