# Phase 9 — AI Resilience (Azure OpenAI / Agno / STT)

Principle: degraded AI never breaks the core clinical software; no false success; no duplicate
write; the classic GUI is the fallback.

## 1. Azure OpenAI configuration (runtime)

- Endpoint/deployment configurable: `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, per-role
  `AI_<ROLE>_MODEL=azure:<deployment>` (deployment name ≠ model id is supported), API key auth
  (`AZURE_OPENAI_API_KEY`). Current: `azure:gpt-6.1-sol` (memory 2026-09-30).
- Transport: Agno `AzureOpenAI` (openai SDK, default 2 retries — not verified locally, agno not
  installed in the test venv) and raw HTTPS for structured extraction (no retry).
- Timeouts: Agnos role `AGNOS_LLM_TIMEOUT_MS` (30 s), other roles `AI_<ROLE>_TIMEOUT_SECONDS` /
  `AI_PROVIDER_TIMEOUT_SECONDS` (300 s, document jobs), job cap `AI_JOB_MAX_DURATION_SECONDS`.
- 429/5xx: classified RATE_LIMIT / PROVIDER_ERROR; no `Retry-After` honouring; no circuit breaker
  (not useful at one replica with backend-side fallback and per-operator rate limits).

## 2. Failure matrix (backend side — what the operator sees)

| Failure              | Skill router (Agno)                                                 | Assistant plan/compose                                  | Briefing                                | STT (voice)                                   | Classic GUI  |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------- | --------------------------------------------- | ------------ |
| LLM/runtime timeout  | deterministic interpreter after `SKILLS_AGNO_TIMEOUT_MS` (20 s)     | structured answer after `AI_ASSISTANT_TIMEOUT_MS` (8 s) | facts list, `composed:false` after 25 s | 504 «Trascrizione troppo lenta», type instead | unaffected   |
| 429                  | deterministic                                                       | structured                                              | facts only                              | 503/502 message                               | unaffected   |
| 5xx / Agno error     | deterministic                                                       | structured                                              | facts only                              | 502 message                                   | unaffected   |
| malformed output     | deterministic (`malformed`)                                         | structured                                              | facts only                              | treated as provider error                     | unaffected   |
| runtime down         | deterministic (`network_error`)                                     | structured                                              | facts only                              | 503 «non raggiungibile»                       | unaffected   |
| tool/backend failure | workflow `FAILED` with message, no write                            | —                                                       | —                                       | —                                             | normal error |
| realtime disconnect  | n/a (push-to-talk, one utterance per request; no streaming session) |                                                         |                                         | mic returns to idle                           |              |

Writes never depend on the AI answer: every write passes preview → «Conferma» → Tool Layer;
an AI failure before confirmation leaves nothing half-written.

## 3. Evidence

- Backend E2E `AI resilience: Agno ok/500/429/malformed/slow/down` — same skill and status as the
  healthy path, bounded latency (< 5 s with a 1 s budget), zero DB writes, metrics per outcome.
- `AI off: interpreter deterministic + no runtime` — preview + single commit despite 3 concurrent
  confirmations + a retry.
- Recovery drill R3 (real process): runtime `down` and `500` → Assistant 200 `deterministic`,
  classic GUI 200, no write.
- Browser `ai-off-gui-check`: 8 screens, Assistant deterministic, mic disabled with reason.
- Runtime unit: generic 500/502 bodies, constant-time token, correlation (9 tests).

## 4. Retry policy

| Operation                               | Retry                                                                                | Why                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Skill route / plan / compose / briefing | none (fallback instead)                                                              | interactive budget; deterministic path exists                            |
| STT                                     | none automatic; user re-speaks                                                       | paid call; user in the loop                                              |
| Document extraction (import)            | `AI_MAX_RETRIES` (default 2, ≤5 enforced) + 1 JSON repair                            | read-only w.r.t. clinical data; job is idempotent per page key           |
| Runtime job `/retry`                    | explicit only                                                                        |                                                                          |
| Clinical writes (Tool Layer)            | client may resend the SAME confirmation/idempotency key → replay, never a second row | idempotency keys (`lib/idempotency.ts`, voice idempotency, workflow CAS) |
| Non-idempotent sensitive ops            | never blind-retried                                                                  |                                                                          |

No infinite retries anywhere (validation caps `AI_MAX_RETRIES` at 5).

## 5. Timeout budget (critical path: Assistant text turn)

| Hop                           | Budget                                             | Config                                                               |
| ----------------------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| UI fetch                      | browser default; UI shows loading, user can cancel | —                                                                    |
| Backend → runtime skill-route | 20 s                                               | `SKILLS_AGNO_TIMEOUT_MS`                                             |
| Runtime → Azure (agent role)  | 30 s                                               | `AGNOS_LLM_TIMEOUT_MS` (> backend budget ⇒ backend falls back first) |
| Assistant plan/compose        | 8 s                                                | `AI_ASSISTANT_TIMEOUT_MS`                                            |
| Briefing compose              | 25 s                                               | `PROACTIVE_BRIEFING_TIMEOUT_MS`                                      |
| STT                           | 25 s backend / runtime provider timeout            | `voice/stt.ts`                                                       |
| Readiness checks              | 2 s each                                           | `lib/readiness.ts`                                                   |
| Graceful shutdown             | 10 s                                               | `server.ts`                                                          |
| Diary→therapy AI              | 45 s                                               | `therapies/diary-therapy-ai.ts`                                      |
| DB                            | Prisma/pg defaults (no statement timeout)          | residual: consider `statement_timeout`                               |

Observed: healthy skill route p50 ≈ 0.4 s (stub) / 3.7 s (real Azure gpt-6.1-sol, one sample).

## 6. Provider-agnostic resilience (Phase 9 provider abstraction)

- Every adapter maps vendor failures to the 10 normalized codes (`AUTH_ERROR … UNKNOWN`); tested for the
  OpenAI adapter against a stub (429, 401, 500, context length, incomplete, refusal, content filter,
  malformed body, slow→TIMEOUT, real cancellation) and for the test provider (all codes).
- **No hidden retries**: OpenAI adapter `max_retries=0`; Agno-based adapters get `max_retries`/`retries`
  = `AI_PROVIDER_SDK_RETRIES` (default 0). Found by the real-provider benchmark: with SDK retries the
  Azure 429 path took ~60 s while the backend had already fallen back after 8–20 s (wasted cost).
- Found by the same benchmark: Agno returned a swallowed 429 as an ERROR run labelled
  `PROVIDER_ERROR`; it is now classified through the shared classifier → `RATE_LIMIT` (regression test).
- Fallback provider: explicit, availability-class failures only, marked in metadata and metrics.
- **Observed external limit (2026-10-02):** the Azure `gpt-6.1-sol` deployment (germanywestcentral)
  rejected 13/13 command-parser requests at benchmark pace with token-rate 429 and answered planner
  requests in 25–55 s. Reason for moving the primary to OpenAI Direct; with AI degraded the app falls
  back deterministically (no false success, no write).
