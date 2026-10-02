# Railway — OpenAI API Direct configuration (Phase 9B)

Status (2026-10-02): **configuration contract ready and tested; cutover NOT applied** —
`OPENAI_API_KEY` is not set on any Railway service. Production still runs the legacy Azure
configuration (and the pre-Phase-9 runtime code until this branch is merged).

## 1. Where

Railway project `bddf5d1b-ee83-4362-8238-a79721f795e5` (environments `production`, `demo`).

| Service                        | Role                                                                       | AI variables                                                                                         |
| ------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `clinicos-ai-runtime`          | **the only place where provider secrets live** (FastAPI/Agno, server-side) | all variables of §2                                                                                  |
| `clinicos-backend`             | clinical API, calls the runtime over HTTPS with `AI_RUNTIME_SERVICE_TOKEN` | `AI_ENABLED`, `AI_RUNTIME_URL`, `AI_RUNTIME_SERVICE_TOKEN`, feature flags (§3) — **no provider key** |
| Vercel `clinicos__` (frontend) | browser                                                                    | **none** — never `OPENAI_*` in `VITE_*` / `NEXT_PUBLIC_*`                                            |

Architecture mapping of the prompt's "Railway backend": provider calls are made by the server-side
runtime service; the browser only talks to `clinicos-backend`, which talks to the runtime. The key
never reaches the backend process either.

Path: Railway → project → environment → service `clinicos-ai-runtime` → **Variables**.

## 2. Runtime variables (`clinicos-ai-runtime`)

| Variable                                                                | Value                                           | Secret?    | Required                                                                            |
| ----------------------------------------------------------------------- | ----------------------------------------------- | ---------- | ----------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`                                                        | from platform.openai.com                        | **secret** | yes                                                                                 |
| `AI_PROVIDER`                                                           | `openai`                                        | no         | yes (turns on strict validation)                                                    |
| `AI_MODEL_DEFAULT`                                                      | `gpt-5.6-luna`                                  | no         | **yes** — covers VISION (document import); the prompt's list alone fails validation |
| `AI_MODEL_FAST`                                                         | `gpt-5.6-luna`                                  | no         | recommended                                                                         |
| `AI_MODEL_COMMAND_PARSER`                                               | `gpt-5.6-luna`                                  | no         | recommended                                                                         |
| `AI_MODEL_SUMMARY`                                                      | `gpt-5.6-luna`                                  | no         | recommended                                                                         |
| `AI_MODEL_REASONING`                                                    | `gpt-5.6-sol`                                   | no         | recommended                                                                         |
| `STT_PROVIDER`                                                          | `openai`                                        | no         | yes for OpenAI voice                                                                |
| `STT_MODEL`                                                             | `gpt-transcribe`                                | no         | yes for OpenAI voice                                                                |
| `STT_REALTIME_ENABLED`                                                  | `false`                                         | no         | optional (true = startup refused: not implemented)                                  |
| `STT_REALTIME_MODEL`                                                    | `gpt-live-transcribe`                           | no         | optional                                                                            |
| `STT_VOCABULARY_HINT`                                                   | short vocabulary (≤ 300 chars)                  | no         | optional                                                                            |
| `AI_FALLBACK_ENABLED` / `AI_FALLBACK_PROVIDER`                          | `false` / empty                                 | no         | optional                                                                            |
| `AI_PROVIDER_SDK_RETRIES`                                               | `0`                                             | no         | optional                                                                            |
| `AI_TIMEOUT_SECONDS_<ROLE>`                                             | e.g. `30`                                       | no         | optional (defaults 30/30/30/60/300)                                                 |
| `AI_DAILY_TOKEN_BUDGET`                                                 | `0` (off) or a token count                      | no         | optional — **hard** guard                                                           |
| `AI_PRICING_JSON`                                                       | USD per 1M tokens per model, per minute for STT | no         | optional (enables USD estimates)                                                    |
| `AI_DAILY_SOFT_BUDGET_USD` / `AI_MONTHLY_SOFT_BUDGET_USD`               | e.g. `1` / `5`                                  | no         | optional — **alert only**, not a billing cap                                        |
| `AI_RUNTIME_SERVICE_TOKEN`                                              | shared with the backend                         | **secret** | yes (already set)                                                                   |
| `AI_OCR_PROVIDER`, `AI_OCR_MODEL`, `MISTRAL_OCR_URL`, `MISTRAL_API_KEY` | unchanged OCR scope                             | key secret | unchanged                                                                           |

Prompt-name mapping (no second configuration system): `AI_MAX_RETRIES=2` → `AI_PROVIDER_SDK_RETRIES`
(interactive calls: 0, the backend falls back) and `AI_MAX_RETRIES` (document extraction, ≤ 5);
`AI_REQUEST_TIMEOUT_MS` → `AI_TIMEOUT_SECONDS_<ROLE>`; `VOICE_ENABLED` → backend
`VOICE_CHANNEL_ENABLED`; `PROACTIVE_AI_ENABLED` → backend `AI_ASSISTANT_COMPOSE_ENABLED` (AI briefing
summary) + `PROACTIVE_DISABLED_EVENTS`.

### Legacy (optional, not needed by the OpenAI path)

`AGNOS_LLM_*`, `AI_EXTRACTION_*`, `AI_REPAIR_MODEL`, `AI_AGENT_*`, `AI_STT_MODEL`, `AZURE_OPENAI_ENDPOINT`,
`AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_STT_API_VERSION`.
Ignored for the LLM/STT roles once `AI_PROVIDER` is set. Keep them while you want a one-variable
rollback (`AI_PROVIDER=azure` or unset `AI_PROVIDER`). **Exception:** the OCR role currently uses
Mistral hosted on the Azure resource (`MISTRAL_OCR_URL` + Azure key fallback) — owner decision
«OCR invariato»; do not delete `AZURE_OPENAI_API_KEY` while that OCR endpoint is in use.

## 3. Backend variables (`clinicos-backend`)

`AI_ENABLED` (master switch, default true), `AI_RUNTIME_URL`, `AI_RUNTIME_SERVICE_TOKEN` (secret),
`VOICE_CHANNEL_ENABLED`, `AI_ASSISTANT_LLM_ENABLED`/`_PLAN_`/`_COMPOSE_ENABLED`, `AI_RATE_LIMIT_PER_MIN`,
`VOICE_STT_RATE_LIMIT_PER_MIN`, `METRICS_TOKEN`. No provider name, model or key. Variables no longer
read after this branch: `GEMINI_API_KEY`, `AI_MODEL`, `AI_STRUCTURED_MODEL`, `AI_AGENT_MODEL`,
`AI_ASSISTANT_PLAN_MODEL`, `AI_ASSISTANT_COMPOSE_MODEL`.

## 4. Cutover procedure (when the key exists)

1. Merge this branch → runtime and backend auto-deploy with the legacy config (verified: 0 errors).
2. `clinicos-ai-runtime` → Variables: add `OPENAI_API_KEY` + §2 values (raw editor, one change set).
3. Railway redeploys the runtime. Startup validation is strict: a wrong/missing value makes the NEW
   deployment fail and the previous one keeps serving — read the deploy log `ai-config ERRORE …`.
4. Verify (no secret printed):
   `curl -s https://<runtime>/v1/runtime/ai-health` → `status ok`, roles `openai:gpt-5.6-luna|sol`,
   `stt.model gpt-transcribe`, `realtime.enabled false`;
   `railway run --service clinicos-ai-runtime --environment production -- python -m tools.openai_smoke`
   (from `clinicos-ai-runtime/`) → all checks PASS;
   backend `/metrics` → `clinicos_ai_calls_total{provider="openai"}`.
5. Smoke through the app (Assistant read, «registra pressione … a questo ospite» → preview → Conferma,
   one voice utterance).
6. Rollback: unset `AI_PROVIDER` (legacy Azure) or set `AI_PROVIDER=azure`; emergency: backend
   `AI_ENABLED=false` (classic GUI only).

## 5. Rotate `OPENAI_API_KEY`

Create the new key (OpenAI console) → update the variable on `clinicos-ai-runtime` → redeploy →
`/v1/runtime/ai-health` + smoke → revoke the old key. The key is read per request by the adapter;
nothing else stores it.

## 6. Disable AI temporarily

Backend `AI_ENABLED=false` (redeploy backend): no AI/STT call, classic GUI and CRUD unchanged (tested
15/15). Runtime `AI_ENABLED=false` additionally refuses provider calls (defence in depth, tested).

## 7. Local development

`clinicos-ai-runtime/.env.example` lists placeholders; copy to `.env.local` (git-ignored, as are
`.env`, `.env.*.local`, `.env.production`, …) and export it, or run with the cloud values:
`railway run --service clinicos-ai-runtime --environment demo -- python -m clinicos_ai.main`.
Configuration precedence: process environment (Railway variables in the cloud, exported/`railway run`
locally) → safe non-secret defaults in code. No secret has a default; no key is hard-coded.
