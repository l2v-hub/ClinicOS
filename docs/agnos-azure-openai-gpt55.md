# Agnos su Azure OpenAI (gpt-5.5) — configurazione runtime (#236)

Agnos legge provider, endpoint, deployment/model e API key **solo da environment variables**
(runtime/backend). Nessun valore è hardcoded nel codice e **nessuna chiave è esposta al frontend**.

## Variabili Railway (impostate manualmente dal Product Owner)

| Variabile                 | Valore                                                 | Note                                        |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------- |
| `AZURE_OPENAI_ENDPOINT`   | `https://dpsaifoundry.services.ai.azure.com/openai/v1` | endpoint Azure OpenAI                       |
| `AZURE_OPENAI_DEPLOYMENT` | `gpt-5.5`                                              | deployment/model (diventa `spec.model_id`)  |
| `AZURE_OPENAI_API_KEY`    | _(segreto, solo su Railway)_                           | mai committata, mai in log, mai al frontend |
| `OPENAI_API_VERSION`      | _(secondo l'API surface Azure)_                        | usata dall'SDK Azure/Agno                   |

Il codice provider: `clinicos-ai-runtime/clinicos_ai/models/providers/azure.py`
(`AzureOpenAI(id=spec.model_id, …)`) legge endpoint/key dall'ambiente; il deployment arriva da
`AZURE_OPENAI_DEPLOYMENT` via `models/env_config.py` → `models/configuration.py`.

## Degradazione sicura

In assenza di configurazione valida (endpoint/deployment/key mancanti), il runtime **degrada in modo
comprensibile e sicuro**: `GET /v1/runtime/health` riporta `available:false` con `errors[...]`, senza
crash e senza esporre segreti (vedi `models/env_config.py`).

## Privacy / sicurezza

- API key letta solo da backend/runtime; **mai** nel bundle frontend (verificato da
  `scripts/security/scan-frontend-secrets.mjs` + gate CI `frontend-secret-scan`).
- Nessun hardcoding di provider/endpoint/deployment/key nel codice.
- Nessun prompt completo / output LLM completo / chiave nei log.
