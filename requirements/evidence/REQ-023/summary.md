# REQ-023 (#22) + REQ-024 (#23) — ClinicOS AI Runtime

Nuovo servizio `clinicos-ai-runtime/` (Python + FastAPI + Agno), provider/model agnostic.

## Costruito + verificato (19 test stdlib PASS)
- **ModelRegistry** (REQ-024): `provider:model_id`, 4 ruoli (ocr/extraction/agent/repair), fallback, no model id hardcoded, selezione solo via registry.
- **ModelFactory** (REQ-023 §5): dispatch provider, capability gate prima di costruire/chiamare.
- **Capability contract** (§6) + minimi per ruolo.
- **Provider adapters** (§5): google/openai/anthropic/azure/openai-like + mock — **SDK isolato solo in models/providers/*** (guard CI).
- **API neutrale** (§3): `/v1/document-jobs*`, `/v1/runtime/health|capabilities` — nessun provider nei path, auth service-token.
- **Workflow** estrazione + repair, normalizzazione errori, no accesso DB clinico.
- Deploy artifacts: requirements.txt, Dockerfile, railway.json, .env.example, README, CI (`ai-runtime-tests.yml`).

## Test
- `python -m unittest`: **19/19 PASS** (spec/config/registry/factory/capabilities).
- py_compile tutti i moduli OK. Guard isolamento SDK OK.

## BLOCCO (status-blocked) — provisioning utente
Non chiudibile: il deploy richiede azioni fuori dal sandbox (Railway API TLS-bloccata, creazione servizio = azione account):
1. creare servizio Railway `clinicos-ai-runtime` (build Dockerfile, root della cartella);
2. impostare variabili per ruolo + `AI_RUNTIME_SERVICE_TOKEN` + secret provider;
3. ricablare il backend Node a chiamare il runtime (client HTTP neutro) — descritto nel README.
Verifica estrazione reale soggetta a quota provider.
