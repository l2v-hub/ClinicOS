# Validation Report — Attivazione chatbot Agnos su Azure (F1/F2)

**Task**: riattivare i flag F1/F2 del backend e validare il chatbot LLM su Azure.
**Data**: 2026-07-05
**Metodo**: docs/validation-method.md — root cause tracing con diagnostici read-only su Railway.

## Catena diagnosticata (root cause tracing)

| Livello | Stato | Evidenza |
|---|---|---|
| Flag backend F1/F2 impostati (`AI_ASSISTANT_LLM_ENABLED/PLAN_ENABLED/COMPOSE_ENABLED=true`, `*_MODEL=azure:gpt-5.4-mini`, `AI_RUNTIME_URL`) | ✅ VERIFICATO | diag `railway variables` sul service `clinicos-backend` |
| Gate backend attivo → chiama il runtime | ✅ VERIFICATO | log runtime: `POST /v1/assistant/plan` + `/compose` in arrivo |
| Runtime `/v1/assistant/plan|compose` → 500 | ✅ FIXATO | causa: `ImportError: openai not installed` (pacchetto commentato in requirements.txt) |
| Dopo fix openai → Azure raggiunto | ✅ | latenza 0.4s→1.0s |
| **Azure risponde 404 "Resource not found"** | ❌ BLOCCATO | log runtime: `API status error from OpenAI API: Error code: 404 - {'error':{'code':'404','message':'Resource not found'}}` |

## Fix applicati (codice, deployati su main)

1. `clinicos-ai-runtime/requirements.txt`: attivato `openai>=1.30` (richiesto da Agno `AzureOpenAI`; OCR/extraction Mistral non lo usano → prima non era installato).
2. `clinicos-ai-runtime/clinicos_ai/api/app.py`: logging sanitizzato (tipo+messaggio, no PHI/prompt) sulle eccezioni di `assistant plan|compose`; il tipo eccezione ora è incluso nel corpo dell'errore 500. I 500 opachi impedivano la diagnosi.

## Blocco residuo — richiede config Azure dell'utente

Azure OpenAI ritorna **404 Resource not found**: la deployment `gpt-5.4-mini` (o endpoint/api-version)
non risolve a una risorsa reale. `AzureOpenAI(id=spec.model_id)` costruisce
`{AZURE_OPENAI_ENDPOINT}/openai/deployments/{deployment}/chat/completions?api-version=...`.
Serve dall'utente (dal portale Azure):
- nome ESATTO della deployment (impostato in `AGNOS_LLM_MODEL` / `AZURE_OPENAI_DEPLOYMENT`);
- `AZURE_OPENAI_ENDPOINT` esatto (`https://<resource>.openai.azure.com`);
- se necessario, `AZURE_OPENAI_API_VERSION` supportata dalla risorsa.

`credentials_present=true` conferma solo che chiave+endpoint sono impostati, non che la deployment esista.

## Final Decision

**BLOCKED** — codice pronto (flag attivi, openai installato, errori diagnosticabili); il chatbot LLM
resta **IMPLEMENTED — NOT VERIFIED** finché la deployment Azure non è corretta. Fallback deterministico
attivo e funzionante nel frattempo (nessuna regressione: 2 allergie reali con fonti).
