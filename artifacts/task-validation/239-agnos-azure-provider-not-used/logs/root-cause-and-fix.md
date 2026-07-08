# #239 — Root cause & fix (riprodotto con credenziali reali Railway)

## Sintesi
Agnos **usa già Azure** in produzione: il config-loader `AGNOS_LLM_*`→Azure, il gating backend
(`AI_ASSISTANT_LLM_ENABLED/PLAN_ENABLED=true`, `AI_RUNTIME_URL`) e le credenziali sono tutti
deployati e corretti. Il runtime risolve `agent → azure:gpt-5.5` (creds present, `available:true`).

Il problema NON è "Azure non usato": è che **la richiesta ad Azure fallisce e l'errore viene
silenziosamente ingoiato**, degradando ogni piano a `intent=unknown` → il backend ricade sul
planner deterministico → l'utente vede "Comando non riconosciuto" e conclude "non usa Azure".

## Prova che Azure È chiamato in produzione
`POST https://clinicos-ai-runtime-production.up.railway.app/v1/assistant/plan` (Bearer service token):
```
HTTP 200  durationMs≈1200-2350  model=azure:gpt-5.5   plan={intent:unknown, tools:[]}
```
Latenza ~1-2s = vera inferenza di rete (mock=istantaneo). `GET /v1/runtime/health` →
`agent model=azure:gpt-5.5 creds=True`.

## Root cause: 3 misconfig Azure impilate, TUTTE ingoiate
Riprodotte in locale con le env reali (agno 2.5.14 / openai 2.29):

1. **Endpoint con `/openai/v1` di troppo** — `AZURE_OPENAI_ENDPOINT=https://dpsaifoundry.services.ai.azure.com/openai/v1`.
   L'adapter Agno `AzureOpenAI` accoda `/openai/deployments/<dep>/chat/completions` → path doppio →
   **404 Resource not found**.
2. **api-version invalida** — `AZURE_OPENAI_API_VERSION=2026-04-24` → **404** anche con endpoint corretto.
3. **temperature non supportata** — `AGNOS_LLM_TEMPERATURE=0.2`; gpt-5.5 (reasoning) accetta solo il
   default `1` → **400 unsupported_value**.

Ognuno di questi errori viene restituito da Agno come *testo della risposta* (es. `"Resource not found"`),
quindi `parse_plan_json` fallisce → piano vuoto → il runtime risponde **200** con `intent=unknown`.
Nessun 4xx/5xx visibile all'esterno: l'errore Azure è nascosto.

### Matrice di prova (deployment gpt-5.5)
| endpoint | api-version | temperature | esito |
|---|---|---|---|
| …/openai/v1 (attuale) | 2026-04-24 (attuale) | 0.2 (attuale) | **404** |
| root (senza /openai/v1) | 2026-04-24 | 1 | **404** |
| root | 2024-10-21 | 0.2 | **400** (temperature) |
| root | 2024-10-21 | 1 | **200 OK** |

## Fix (config Railway, nessun hardcoding di endpoint/modello nel codice)
Sul servizio **clinicos-ai-runtime**:
```
AZURE_OPENAI_ENDPOINT   = https://dpsaifoundry.services.ai.azure.com   # rimuovere /openai/v1
AZURE_OPENAI_API_VERSION = 2024-10-21                                  # GA valida (2026-04-24 → 404)
AGNOS_LLM_TEMPERATURE   = 1                                            # gpt-5.5 reasoning: solo default 1
```
(`AGNOS_LLM_MODEL` / `AZURE_OPENAI_DEPLOYMENT=gpt-5.5` sono corretti — gpt-5.5 è un deployment valido.)

## Verifica end-to-end del fix (runtime completo, env corrette)
```
Q="cerca il paziente Rossi"          → model=azure:gpt-5.5  plan: intent=patient_search, tools=[search_patients(query=Rossi)]
Q="quante camere sono occupate oggi" → model=azure:gpt-5.5  plan: intent=data_query, tools=[query_data(steps=…endDate isNull…)]
Q="Rispondi solo con OK-AZURE"       → model=azure:gpt-5.5  plan: intent=unknown (corretto: non è una query dati)
```
Agnos produce piani reali e validi via Azure gpt-5.5.

## Fix di codice consigliato (in scope: "errori Azure non nascosti")
Il runtime NON deve ingoiare gli errori provider: un 4xx/5xx Azure deve emergere come
`RuntimeError_(PROVIDER_ERROR)` → HTTP 502 + log sanitizzato `status=failure`, invece di degradare a
piano vuoto. Così una futura misconfig Azure è immediatamente visibile via health/log/HTTP.

_Nessun secret in questo file: chiavi ed endpoint-host completi non sono riportati._
