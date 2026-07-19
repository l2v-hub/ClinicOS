# Quickstart — 016 Fase LLM di Agnos (letture NL)

## Prerequisiti

- Stack SPEC-015 in esecuzione (backend :3001, frontend :5173, Postgres). Runtime `clinicos-ai-runtime` :8000 per F1/F2.
- Flag di default: `AI_ASSISTANT_LLM_ENABLED=false` (parte in modalità deterministica potenziata).

## F0 — Potenziamento deterministico (subito, senza LLM)

1. Avvia lo stack; il pannello Agnos risponde già alle domande comuni.
2. Verifica: senza paziente aperto, «mostra le allergie di Elena Moretti» → risposta con fonti; «quali terapie assume Rossi» → terapie. Formulazioni plurali/sinonimi riconosciute.
3. Test: `cd backend && npm test` (golden set planner + risoluzione paziente per nome); `e2e/agnos-llm-reads.mjs` sezione F0.

## F1 — Planner LLM (all'LLM va solo la domanda)

1. `AI_ASSISTANT_LLM_ENABLED=true`, `AI_ASSISTANT_PLAN_ENABLED=true`, `AI_ASSISTANT_PLAN_MODEL=provider:model`.
2. Runtime up con `/v1/assistant/plan`. Verifica: formulazioni libere → piano corretto; spegni il runtime → fallback deterministico senza errori; piano con tool fuori allowlist → scartato + audit.

## F2 — Composer LLM (dati clinici → LLM EU)

1. `AI_ASSISTANT_COMPOSE_ENABLED=true`, `AI_ASSISTANT_COMPOSE_MODEL=<host EU/self-hosted approvato>`.
2. Verifica: risposta discorsiva con fonti; prosa con entità non presenti → scartata (vista strutturata); modello non approvato → composer disattivato.

## F3 — Correlazione + adversarial

1. Ruolo autorizzato: domanda di correlazione cross-patient → risultati con fonti; ruolo non autorizzato → rifiuto.
2. Suite adversarial: injection nel testo e nei documenti importati, jailbreak «cancella», accesso non autorizzato → 0 cancellazioni/invenzioni/accessi.

## Gate per ogni incremento

- `cd backend && npm test` verde; runtime `pytest` verde (F1/F2); `cd frontend && npm run build` verde.
- Evidenze Playwright in `requirements/evidence/SPEC-016/`; misure SC-001..SC-007.
- Flag off di default; deploy verificato (Vercel+Railway) prima di considerare l'incremento chiuso.

## Prova rapida "no-Delete" (invariata)

`POST /ai/actions/plan {"text":"cancella la nota"}` → `refuse_forbidden`/`refusalKind:delete`; `GET /ai/actions/catalog` → 0 azioni delete; nessuno strumento di scrittura nello schema esposto all'LLM.
