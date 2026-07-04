# Validation Report — Config modelli AI environment-driven (Agnos / OCR / Extraction)

**Task**: rendere la configurazione dei modelli AI completamente environment-driven, con
tre ambiti separati (Agnos LLM · OCR · Extraction), fallback legacy, errori chiari senza
secret, logging sanitizzato. Obiettivo: cambiare modello/provider/endpoint da Railway
**senza toccare il codice**.
**Data**: 2026-07-05
**Ambiente**: runtime Python `clinicos-ai-runtime` (unit + validazione config; nessuna
chiamata a provider reali — verifica di risoluzione config e sanitizzazione).
**Metodo**: `docs/validation-method.md`.

## Cosa è stato implementato

- `clinicos_ai/models/env_config.py` — tre resolver separati, mai incrociati:
  - `resolve_agnos_llm(env)` → `AGNOS_LLM_PROVIDER/MODEL/TEMPERATURE/MAX_TOKENS/TIMEOUT_MS/STREAMING_ENABLED`;
    se `azure-openai` legge anche `AZURE_OPENAI_ENDPOINT/DEPLOYMENT/API_KEY`. Fallback **solo** `AI_AGENT_MODEL`.
  - `resolve_ocr(env)` → `AI_OCR_PROVIDER` (default `mistral`) + `AI_OCR_MODEL` (+ `MISTRAL_API_KEY/OCR_URL`). Mai `AGNOS_LLM_*`.
  - `resolve_extraction(env)` → `AI_EXTRACTION_PROVIDER` (default `mistral`) + `AI_EXTRACTION_MODEL`. Mai Agnos/OCR.
  - `normalize_provider()` mappa `azure-openai → azure` (case-insensitive).
  - `safe_config_summary(env)` → righe log-safe: solo `provider/model/source`, **mai** chiavi/endpoint.
- `clinicos_ai/models/configuration.py` — `load_runtime_config` ora usa i resolver per
  `agent/ocr/extraction`; `repair` resta sul percorso legacy. La temperatura di Agnos viene dal suo ambito.
- `clinicos_ai/api/app.py` — log di avvio sanitizzato via `safe_config_summary` (mai secret).
- `.env.example` — documentate le tre sezioni separate + runtime settings.
- Priorità garantita: (1) nuove var specifiche → (2) legacy come solo fallback → (3) errore chiaro con il nome della var mancante.

## Evidenze (path)

```
artifacts/validation/agnos-016-env-config/
├── run-validation.py   # script rieseguibile (nessun secret reale, marker finti)
├── checks.json         # esito PASS/FAIL per criterio (overall_pass=true)
└── validation-report.md
```
Test unit: `clinicos-ai-runtime/tests/test_env_config.py` (16 test) + suite completa **55/55 OK**.

## Esiti oggettivi (da checks.json — overall_pass = true)

| Criterio | Esito | Evidenza |
|---|---|---|
| Agnos legge `AGNOS_LLM_*` (azure-openai→azure, deployment=model, temp/max_tokens/streaming) | ✅ PASS | `agnos_reads_agnos_llm_vars` |
| OCR usa `AI_OCR_MODEL` (mistral), **non** il modello Agnos | ✅ PASS | `ocr_separate_from_agnos` |
| Extraction usa `AI_EXTRACTION_MODEL`, separato | ✅ PASS | `extraction_separate` |
| Cambio modello **solo da env** (Agnos + OCR) senza toccare il codice | ✅ PASS | `change_model_from_env_only` |
| Legacy `AI_AGENT_MODEL` **solo** come fallback; nuove var hanno priorità | ✅ PASS | `legacy_fallback_only` |
| Errore chiaro con nome var mancante, senza mostrare secret | ✅ PASS | `clear_error_missing_var` |
| Log di avvio sanitizzato: nessun secret, ma provider+model presenti | ✅ PASS | `boot_log_sanitized` |
| `load_runtime_config` integra i 3 resolver end-to-end | ✅ PASS | `runtime_config_integration` |
| Nessun secret di provider referenziato nel frontend | ✅ PASS | test `test_11_no_secret_key_in_frontend` |

## Tabella finale (metodo di validazione)

| Area | Test eseguito | Esito | Evidenza |
|---|---|---|---|
| Backend/Config | 16 unit env_config + 55/55 suite + script risoluzione config | ✅ PASS | `tests/test_env_config.py`, `checks.json` |
| Agnos AI | Agnos legge il proprio ambito (`AGNOS_LLM_*`), azure-openai→azure/deployment, temp/streaming | ✅ PASS | `agnos_reads_agnos_llm_vars`, `runtime_config_integration` |
| Sicurezza | no-secret nei log (provider/model soltanto), no-secret nel frontend, errori senza secret | ✅ PASS | `boot_log_sanitized`, `clear_error_missing_var`, `test_11` |
| Retrocompat. | OCR/Extraction Mistral invariati; legacy AI_AGENT_MODEL/formato `provider:model` come fallback | ✅ PASS | `legacy_fallback_only`, `ocr_legacy_provider_colon_model`, suite 55/55 |

## Limiti residui (onesto)
1. **Non testato contro provider reali**: la validazione prova la *risoluzione* della config e
   la sanitizzazione dei log, non una chiamata live ad Azure/Mistral. La chiamata reale ad Azure
   (`gpt-5.4-mini`) è rinviata all'attivazione (endpoint+deployment+chiave impostati su Railway).
   → Attivazione Azure: **IMPLEMENTED — NOT VERIFIED end-to-end** finché le `AGNOS_LLM_*` non
   sono impostate in prod e il chatbot risponde via Azure.
2. La logica **OCR Mistral non è modificata**: il resolver OCR legge lo stesso `AI_OCR_MODEL`
   già in uso (incluso il formato legacy `mistral:...`), quindi l'OCR odierno resta invariato.
