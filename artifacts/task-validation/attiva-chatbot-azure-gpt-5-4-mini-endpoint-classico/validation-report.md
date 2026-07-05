# Task Validation Report

## Task
- Title: Attiva chatbot Azure gpt-5.4-mini endpoint classico
- Slug: attiva-chatbot-azure-gpt-5-4-mini-endpoint-classico
- Commit: (commit di questo report)
- Date: 2026-07-05

## Implementation Summary

Risolto il 404 Azure impostando sul servizio runtime l'endpoint CLASSICO + api-version + deployment
(Agno `AzureOpenAI` usa il path classico `.../openai/deployments/<dep>/chat/completions?api-version=`).
Var impostate via nuovo workflow `set-runtime-azure.yml` (non-secret) e redeploy runtime.

## Files Changed

- `.github/workflows/set-runtime-azure.yml` (setter var Azure non-secret sul servizio runtime)
- Var Railway (runtime `clinicos-ai-runtime`): `AZURE_OPENAI_ENDPOINT=https://crist-mbqisazh-eastus2.openai.azure.com/`,
  `AZURE_OPENAI_API_VERSION=2024-10-21`, `AZURE_OPENAI_DEPLOYMENT=gpt-5.4-mini`, `AGNOS_LLM_MODEL=gpt-5.4-mini`.

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 — runtime plan/compose non più 500/404 | PASS | log runtime: `POST /v1/assistant/plan 200 OK` e `/compose 200 OK` (prima 500→404) |
| AC2 — chatbot risponde via Azure | PASS (composer) / PARTIAL (planner) | `composed=true`, `answerText` discorsivo da Azure con fonti (latenza ~2.7s); `mode` resta `deterministic` (planner — vedi nota) |
| AC3 — no secret nei log; OCR/extraction Mistral invariati; fallback intatto | PASS | health runtime: ocr/extraction=`mistral` available=true; agent/repair=`azure:gpt-5.4-mini`; nessun secret nei log (solo provider/model) |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | NA | |
| Integration | PASS | flusso backend→runtime→Azure end-to-end; plan+compose 200 |
| API | PASS | `POST /ai/assistant/query` (Folli) → 2 risultati, 2 fonti, answerText Azure |
| Playwright | NA | non eseguito in questa pass |
| Persistence | NA | sola lettura |
| Agnos AI | PASS (F2) | risposta discorsiva Azure con fonti; no-Delete invariato |
| Voice | NA | |
| OCR | PASS (no-regressione) | runtime health ocr=mistral available=true |
| Security/privacy | PASS | log sanitizzati (provider/model), endpoint/version non-secret via workflow, chiave solo su dashboard |

## Runtime Evidence

- Backend `POST /ai/assistant/query` {"question":"quali allergie ha Ugo Folli"}:
  `composed=true`, `answerText="Ugo Folli ha allergia ai crostacei e al paracetamolo. Fonti: recordId ... per «crostacei» ..."`,
  results=2, sources=2 (evidenza: `test-results/chatbot-response-composed.json`).
- Runtime log: `/v1/assistant/plan 200 OK` + `/v1/assistant/compose 200 OK`.
- Runtime health: available=true, ocr/extraction=mistral, agent/repair=azure:gpt-5.4-mini, creds present.

## Logs

Only sanitized logs. Nessun secret stampato (endpoint/version/deployment non-secret; chiave solo su Railway dashboard).

## Residual Risks

**Nota planner (F1) `mode=deterministic`**: per query patient-scoped il planner deterministico è
by-design — il planner LLM non riceve il `currentPatientId` (che il path deterministico risolve via F0
e usa per riempire gli args dei tool), quindi il suo piano non aggiunge valore e il backend usa il
deterministico (garanzia F1≥F0). L'intelligenza Azure è fornita dal **composer (F2)**, verificato attivo.
`mode=llm` è atteso per query dove il planner LLM aggiunge valore (ambigue/cross-patient); non dimostrato
in questa pass. Follow-up separato: valutare l'iniezione di `currentPatientId` nel planner o test con query
cross-patient.

## Final Decision

PARTIAL
