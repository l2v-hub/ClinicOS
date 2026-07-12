# Task Validation Report — #239 Agnos AI non usa endpoint Azure LLM

## Task
- Title: Bug #239 — Agnos AI non usa endpoint Azure LLM nonostante variabili backend configurate
- Slug: 239-agnos-azure-provider-not-used
- Branch: fix/239-agnos-azure-provider (base: origin/main)
- Date: 2026-07-08

## Executive summary

La premessa dell'issue ("Agnos non usa Azure") è risultata **falsa dopo indagine oggettiva**: Agnos
**usava già Azure** (runtime `agent → azure:gpt-5.5`, `available:true`). Il difetto reale erano **3
misconfigurazioni Azure impilate**, tutte **silenziosamente ingoiate**, che facevano fallire ogni
chiamata (404/404/400) → il piano degradava a `unknown` → il backend ricadeva sul planner
deterministico → l'utente vedeva "Comando non riconosciuto".

**Fix applicato in produzione (config Railway, nessun hardcoding) e VERIFICATO end-to-end.**

## Flusso reale (mappato)
```
Frontend AIAssistantButton → POST /ai/assistant/query (backend)
 → assistantQuery(): se AI_ASSISTANT_LLM_ENABLED/PLAN_ENABLED → callPlanRuntime
 → POST {AI_RUNTIME_URL}/v1/assistant/plan (Bearer AI_RUNTIME_SERVICE_TOKEN)
 → runtime run_assistant_plan → registry.build('agent')
 → configuration.py _ROLE_RESOLVERS['agent'] = resolve_agnos_llm(env)  ← legge AGNOS_LLM_PROVIDER
 → azure:gpt-5.5 → providers/azure.py → Agno AzureOpenAI → HTTPS Azure Foundry
```
Servizio che istanzia il provider LLM: **clinicos-ai-runtime** (Railway). Le variabili Azure erano
sul servizio CORRETTO.

## Root cause (riprodotto con credenziali reali Railway — vedi logs/root-cause-and-fix.md)
| Variabile | Valore errato | Errore Azure | Fix |
|---|---|---|---|
| `AZURE_OPENAI_ENDPOINT` | `…/openai/v1` (path doppio) | 404 Resource not found | `https://dpsaifoundry.services.ai.azure.com` |
| `AZURE_OPENAI_API_VERSION` | `2026-04-24` | 404 | `2024-10-21` |
| `AGNOS_LLM_TEMPERATURE` | `0.2` | 400 unsupported (gpt-5.5 reasoning) | `1` |

Errore ingoiato: Agno restituisce il testo d'errore come "risposta" → `parse_plan_json` fallisce →
piano vuoto → runtime 200. Nessun 4xx/5xx visibile all'esterno.

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 Provider Azure selezionato da env | PASS | `logs/provider-selection-proof.txt`; prod health `agent=azure:gpt-5.5` |
| AC2 Endpoint Azure realmente chiamato | PASS | `logs/production-after-fix.txt`: HTTP 200 `model=azure:gpt-5.5`, piani reali (patient_search/data_query), 4–7s |
| AC3 Health check LLM (secret-free) | PASS | nuovo `GET /v1/assistant/llm-health`; `logs/health-endpoint-proof.txt` (shape esatto + caso error) |
| AC4 Errore chiaro se env mancante | PASS | health `status:error` + errori che nominano la variabile; test `test_health_missing_azure_env_is_error_no_secret` |
| AC5 Nessun secret frontend | PASS | test `test_11_no_secret_key_in_frontend` |
| AC6 OCR separato (Mistral) | PASS | health `ocrProvider:mistral`; `provider-selection-proof.txt` |
| AC7 Evidence runtime | PASS | Playwright vs produzione: `screenshots/final-agnos-azure-provider.png`, `test-results/.../trace.zip`, `test-results/.../video.webm`, `playwright-report/index.html`, spec `tests/239.spec.ts` |

## Files Changed (osservabilità — additivi, non cambiano il fix di config)
- `clinicos-ai-runtime/clinicos_ai/models/env_config.py` — `llm_health_summary()` secret-free (AC3/AC4).
- `clinicos-ai-runtime/clinicos_ai/api/app.py` — endpoint `GET /v1/assistant/llm-health`.
- `clinicos-ai-runtime/clinicos_ai/agents/assistant.py` — log sanitizzato per-invocazione
  `provider/deployment/correlationId/durationMs/status` (#7).
- `clinicos-ai-runtime/tests/test_env_config.py`, `test_assistant_plan.py` — 5 nuovi test.

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit/Integration runtime | PASS 49/49 | `logs/runtime-tests.txt` |
| Provider selection (AC1) | PASS | `logs/provider-selection-proof.txt` |
| Health shape/secret-free (AC3/AC5) | PASS | `logs/health-endpoint-proof.txt` |
| Sanitized log (#7) | PASS | test `ProviderInvocationLogTests` |
| Production E2E post-fix (AC2) | PASS | `logs/production-after-fix.txt` |
| Provider error surfacing (#7/obs) | PASS | `logs/error-surfacing-proof.txt`; `tests/test_runner.py` |
| Playwright vs produzione (AC7) | PASS | screenshot + trace.zip + video.webm + playwright-report/ |

## Runtime Evidence (produzione, dopo fix)
```
Q="cerca il paziente Rossi"          HTTP 200  azure:gpt-5.5  intent=patient_search tools=[search_patients]
Q="quante camere sono occupate oggi" HTTP 200  azure:gpt-5.5  intent=data_query    tools=[query_data]
Q="Rispondi solo con OK-AZURE"       HTTP 200  azure:gpt-5.5  intent=unknown (corretto)
```

## Logs
Solo log sanitizzati. Nessuna chiave/endpoint-host completo/PHI in questo bundle.

## Residual Risks / Recommendations
- **Osservabilità (in scope) — IMPLEMENTATO**: il runner condiviso (`providers/_common.py`) ora rileva
  `RunOutput.status == ERROR` (Agno cattura gli errori provider in una risposta invece di sollevarli)
  ed emerge un `RuntimeError_(PROVIDER_ERROR)` → HTTP 502 + log `status=failure`. Una futura misconfig
  Azure NON degrada più silenziosamente a piano vuoto. Verificato con 404 Azure reale
  (`logs/error-surfacing-proof.txt`) + 3 test (`tests/test_runner.py`). Nessuna regressione sul path
  felice (status != ERROR → comportamento invariato; il mock/risposte senza `status` restano invariati).
- `AI_AGENT_MODEL=gpt-5.4-mini` (bare) resta sul servizio come legacy: ignorato quando
  `AGNOS_LLM_PROVIDER` è impostato; consigliabile rimuoverlo per chiarezza.

## Final Decision

Final Decision: CLOSED — VERIFIED

- Fix di produzione (config Railway) **APPLICATO e VERIFICATO live**.
- Aggiunte di osservabilità (health + log + test) implementate, 49/49 test verdi, in PR verso main.
- Claude non chiude l'issue: Codex resta l'unico QA Gatekeeper.

## Codex final gate — 2026-07-12

| Check | Result | Evidence |
|---|---:|---|
| Acceptance criteria | PASS | Azure provider live evidence plus `/ai/actions/plan` remediation |
| Code review | PASS | Scoped PR #258 reviewed and merged as `57e90ef` |
| Tests | PASS | 68/68 targeted routing/safety tests; backend/frontend builds PASS |
| Playwright | PASS | Real Agnos UI, request routing, occupancy and therapies evidence |
| Runtime validation | PASS | Live Azure evidence and DB-backed integrated UI evidence |
| Persistence | NA | Read-only aggregate capability |
| Privacy/security | PASS | Aggregate counts only; no patient identifiers or secrets |
| Evidence complete | PASS | Screenshot, trace, video, report and test-results committed |
| Final decision | CLOSED — VERIFIED | No blocking product finding remains |
