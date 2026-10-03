# Phase 9 — Observability

Audit ≠ observability. `AiAuditEvent` (append-only, DB triggers) stays the durable business /
security record. Phase 9 adds technical telemetry that carries **no clinical content**.

## 1. Correlation

```
Browser / caller ── X-Request-Id (optional, ^[A-Za-z0-9._-]{8,64}$, else minted UUID) ──▶ backend
backend: AsyncLocalStorage (lib/observability.ts#requestObservability) → response header X-Request-Id
  ├─ access log            {"evt":"http","req":<id>,"route":"/patients/:id","status","ms","code","src"}
  ├─ AI call               {"evt":"ai_call","req":<id>,"kind":"skill_route|assistant_plan|assistant_compose|briefing|stt","outcome","ms","chars"}
  ├─ runtime request       header X-Request-Id → runtime contextvar (clinicos_ai/correlation.py)
  │                        → provider log `correlationId=<id>` (assistant.py), STT log `correlationId=<id>`
  ├─ Skill → Tool (in-process, same async context)
  └─ audit link            {"evt":"audit","req":<id>,"auditRequestId":"skill-<workflowId>","action","kind","channel","outcome"}
                           ↔ AiAuditEvent.requestId = "skill-<workflowId>" (durable row)
```

Observed on the real-Agno run (`test-results/correlation-chain.txt`):
`ai_call skill_route ok 3764 ms 2657 chars` → `audit skill:vitals.record:request` → `http POST
/skills/converse 200 3810 ms`, all with request id `c472ae4a-…`. Load run: 1 825 / 1 825 runtime
calls carried the id. Runtime side: unit-tested (`test_phase9_hardening.CorrelationTests`); active in
production once the runtime is redeployed.

## 2. Logs

| Class       | Where                                                                          | Content                                                                              | Production                                             |
| ----------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| operational | stdout JSON (`evt:http`)                                                       | method, route shape (ids → `:id`, no query), status, ms, error code, identity source | on (`ACCESS_LOG`, default on with NODE_ENV=production) |
| AI          | stdout JSON (`evt:ai_call`), runtime `agnos provider call …`                   | kind, outcome, latency, request size; provider, deployment, correlationId            | on                                                     |
| audit link  | stdout JSON (`evt:audit`)                                                      | ids + action + outcome                                                               | on                                                     |
| security    | config validation `[config]`, CORS blocked origin, 401/403 codes in access log | names / codes                                                                        | on                                                     |
| debug       | none added                                                                     | —                                                                                    | —                                                      |

Never logged: bodies, query strings, prompts, transcripts, audio, tokens, patient names. Enforced
structurally (`logEvent` drops keys matching token/secret/password/authorization/api key/cookie/
prompt/transcript/text/body/name/note and caps strings at 120 chars; `routeShape` collapses ids).
Runtime: plan/compose errors log the exception TYPE only; 5xx bodies are generic.

## 3. Metrics (`GET /metrics`, Prometheus text, `Authorization: Bearer $METRICS_TOKEN`; 404 if unset)

| Metric                                                    | Labels                                                                     | Meaning                                                                                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `clinicos_http_requests_total`                            | method, area, status class                                                 | traffic / errors                                                                                                                        |
| `clinicos_http_request_duration_ms` (histogram)           | area                                                                       | latency p50/p95/p99                                                                                                                     |
| `clinicos_http_denied_total`                              | area, status 401/403                                                       | auth/authorization denials                                                                                                              |
| `clinicos_http_error_codes_total`                         | area, code                                                                 | taxonomy: `capability_denied`, `capability_unmapped`, `resident_out_of_scope`, `authz_unavailable`, `auth_disabled`, `token_invalid`, … |
| `clinicos_http_unavailable_total`                         | area                                                                       | fail-closed 503                                                                                                                         |
| `clinicos_ai_calls_total`                                 | kind, outcome (ok/timeout/rate_limited/http_error/malformed/network_error) | AI calls / failures                                                                                                                     |
| `clinicos_ai_call_duration_ms` (histogram)                | kind                                                                       | AI vs app latency                                                                                                                       |
| `clinicos_ai_request_chars_total`                         | kind                                                                       | context size (token proxy); STT = audio bytes                                                                                           |
| `clinicos_ai_fallback_total`                              | component, reason                                                          | fallback usage (deterministic interpreter, …)                                                                                           |
| `process_uptime_seconds`, `process_resident_memory_bytes` | —                                                                          | saturation                                                                                                                              |

No resident or operator id appears in any label (tested). `area` is restricted to the routers
mounted in `app.ts` (anything else → `other`), so random paths from scanners cannot grow the
registry (independent review finding M2, tested).

## 4. Alerting (recommended rules — needs an external scraper; Railway has none built in)

| Alert                                             | Rule                                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Backend down                                      | `/health` ≠ 200 for 2 min (Railway healthcheck already restarts)                            |
| Not ready                                         | `/ready` 503 for 2 min (DB / policy)                                                        |
| Fail-closed spike                                 | `rate(clinicos_http_unavailable_total[5m]) > 0.1/s`                                         |
| `authz_unavailable` / `scope_unavailable`         | any in 5 min                                                                                |
| AI degraded                                       | `ok / total` of `clinicos_ai_calls_total{kind="skill_route"}` < 0.8 over 15 min             |
| Content filter / composed:false (Phase 7 finding) | runtime log `content_filter`/`OUTPUT_INCOMPLETE` count > 0; briefing `composed:false` ratio |
| 5xx                                               | `rate(clinicos_http_requests_total{status="5xx"}[5m]) > 0`                                  |

External: choose the scraper (Grafana Cloud / Better Stack / Azure Monitor) — not provisioned.

## 5. Provider/model metadata (Phase 9 provider abstraction)

- Runtime: one sanitized line per provider call from the gateway —
  `ai call role=<logical role> purpose=<skill_route|plan|compose|extraction|repair|ocr> provider=<name>
model=<id> latencyMs=<n> status=<ok|normalized code> fallback=<bool> correlationId=<X-Request-Id>`;
  `ai-role` / `ai-config` lines at startup; `GET /v1/runtime/ai-health` (no provider call): roles,
  credentials presence, STT, budget, validation errors/warnings.
- Runtime responses carry `ai: {provider, model, role, latencyMs, fallbackUsed, finishReason, usage}`;
  errors carry the normalized `code`.
- Backend metrics: `clinicos_ai_calls_total{kind,outcome,provider,role}`,
  `clinicos_ai_tokens_total{kind,provider,direction=input|output|cached_input|reasoning}`,
  `clinicos_ai_audio_seconds_total{provider}`, `clinicos_ai_provider_fallback_total{kind,provider}`;
  `evt:ai_call` log adds provider, model, role, normalized `code`, token counts. Labels are sanitized
  (`^[a-z0-9_.:-]{1,48}$`), never content.

## 6. Cost telemetry (Phase 9B)

Runtime per-call line: `ai call role=… provider=openai model=gpt-5.6-luna latencyMs=… status=… retries=0
inTok=… outTok=… estUsd=… correlationId=…`; STT line: `stt provider=openai model=gpt-transcribe bytes=…
durationMs=… outcome=…` (+ `audioSeconds` in usage). `estimatedUsd` comes only from `AI_PRICING_JSON`
(never invented); soft budgets alert via one warning per period and `/v1/runtime/ai-health.cost`.
Backend: `clinicos_ai_estimated_usd_total{kind,provider}` in addition to tokens/audio seconds.
