# Task Contract

## Task
- Title: Attiva chatbot Azure gpt-5.4-mini endpoint classico
- Slug: attiva-chatbot-azure-gpt-5-4-mini-endpoint-classico
- Type: config
- Date: 2026-07-05

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | yes |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | yes |

## Current Behaviour

Chatbot resta `mode=deterministic`. Runtime `/v1/assistant/plan|compose` → Azure 404 "Resource not found":
endpoint/api-version non corrispondono. Agno `AzureOpenAI` usa il path classico
`.../openai/deployments/gpt-5.4-mini/chat/completions?api-version=...`.

## Expected Behaviour

Con endpoint classico `https://crist-mbqisazh-eastus2.openai.azure.com/` + `AZURE_OPENAI_API_VERSION`
recente + deployment `gpt-5.4-mini`, il runtime completa il planner/composer e il chatbot risponde
`mode=llm` con `answerText` fondato sulle fonti (post-check anti-invenzione attivo).

## Acceptance Criteria

- AC1: runtime `/v1/assistant/plan` non ritorna più 500/404 (log runtime senza errori Azure).
- AC2: `POST /ai/assistant/query` (paziente reale) ritorna `mode=llm`.
- AC3: nessun secret nei log; OCR/extraction Mistral invariati; fallback deterministico intatto se Azure timeout.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | |
| Integration | no | |
| API | no | |
| Playwright | no | |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

<!-- Rischi noti e mitigazioni. -->

## Gate Status

READY FOR IMPLEMENTATION
