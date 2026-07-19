# Implementation Plan: Fase LLM di Agnos — letture NL con risposta discorsiva

**Branch**: `016-agnos-llm-reads` | **Date**: 2026-07-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/016-agnos-llm-reads/spec.md`

## Summary

Introdurre un **agente LLM con tool-calling** davanti al Data Gateway esistente (REQ-039) per le sole **letture**: l'LLM interpreta la domanda in linguaggio naturale, produce un piano di chiamate agli strumenti di lettura, il backend lo valida ed esegue sul gateway (confine fidato, authz lato server, SOURCE_ONLY), e — quando abilitato — un secondo passaggio LLM compone la risposta discorsiva citando le fonti. Le scritture e il divieto Delete restano invariati da SPEC-015. Consegna incrementale F0→F3, con **fallback deterministico** senza regressioni e postura GDPR (dati clinici all'LLM solo con modello EU/self-hosted sotto DPA). L'F0 potenzia il planner deterministico (risoluzione paziente per nome + pattern plurali/sinonimi), risolvendo subito il difetto per cui «ogni domanda sembra non funzionare» e fornendo il fallback di qualità.

## Technical Context

**Language/Version**: TypeScript 5.x — Node 20 + Express 4 (backend), React 18 + Vite (frontend). Runtime AI: Python 3.11 (`clinicos-ai-runtime`, FastAPI).

**Primary Dependencies**: Prisma 7, Data Gateway REQ-039 (`backend/src/ai/gateway/*`), planner/executor REQ-040 (`backend/src/ai/assistant/*`), orchestratore SPEC-015 (`backend/src/ai/actions/*`), `clinicos-ai-runtime` (registry modelli per-ruolo `provider:model_id` via env). Nessuna nuova dipendenza npm nel backend/frontend; l'integrazione runtime usa HTTP service-to-token già esistente. Structured output del modello per il planner (JSON schema dei tool).

**Storage**: PostgreSQL. Riuso di `AiAuditEvent` (SPEC-015) esteso in modo additivo con `mode` (llm|deterministic) e `model` — campi aggiunti **solo se** il committente approva la migrazione additiva; altrimenti la modalità è registrata nel log runtime senza schema change (vedi research D6). Nessuna modifica ad altri modelli.

**Testing**: Vitest/node --test backend (`backend/src/ai/__tests__/`), pytest runtime (`clinicos-ai-runtime/tests/`), tsc -b + vite build gate, Playwright E2E (`e2e/*.mjs`), golden set domande→piano.

**Target Platform**: Web (Chrome/Edge desktop + tablet 1024px). Runtime su Railway (EU).

**Performance Goals**: risposta lettura tipica < 5s (SC-002); timeout LLM ≤ ~8s con fallback deterministico entro la soglia.

**Constraints**: dati clinici verso LLM SOLO con modello EU/self-hosted sotto DPA (FR-011); nessun contenuto clinico nei log di prompt (FR-012); Delete strutturalmente irraggiungibile all'AI (FR-008); authz cross-patient ricalcolata server-side (FR-009); UI/risposte in italiano.

**Scale/Scope**: ~20 pazienti/clinica; 13 tool di lettura del gateway già esistenti; 2 nuovi endpoint runtime; 4 incrementi (F0–F3).

## Constitution Check

_GATE: verificato contro Constitution v1.1.0 — PASS con giustificazioni._

| Principio                   | Esito                        | Note                                                                                                                                                                                                                                                                                                          |
| --------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Simplicity First         | PASS                         | Riuso di gateway/executor/planner esistenti; l'LLM si innesta in 2 punti (planner, composer) dietro l'executor fidato; nessun refactoring dell'accesso dati.                                                                                                                                                  |
| II. Healthcare UX           | PASS                         | Nessuna nuova tabella; risposta nel pannello Agnos esistente (italiano, tablet-first); compatibile con TTS.                                                                                                                                                                                                   |
| III. Backend Data Authority | PASS                         | I dati escono solo dal gateway (backend); nessun mock; l'LLM non è fonte dati.                                                                                                                                                                                                                                |
| IV. Schema & API Stability  | PASS con richiesta esplicita | L'unico eventuale schema change è ADDITIVO su `AiAuditEvent` (`mode`,`model`) e va richiesto esplicitamente; senza approvazione la modalità resta a log runtime. Nessun `migrate reset`. `/patients` intatto. Nuovi endpoint runtime (`/v1/assistant/*`) sono additivi, non modificano le route Express dati. |
| V. Role-Aware Development   | PASS                         | Autorizzazione per ruolo/perimetro applicata dal gateway; cross-patient role-gated e ricalcolato server-side.                                                                                                                                                                                                 |
| VI. Integration Integrity   | PASS                         | `/ai/actions/*`, `/ai/voice/*`, `/ai/assistant/query` restano funzionanti; l'LLM è dietro feature flag con fallback deterministico; build/test gate per incremento.                                                                                                                                           |
| VII. Environment Safety     | PASS                         | Config via env Railway (modello per-ruolo, flag, timeout); nessun cambio a deploy/DATABASE_URL. Dati clinici solo verso runtime EU approvato.                                                                                                                                                                 |

## Incrementi (ordine di consegna)

- **F0 — Potenziamento deterministico (US1, senza LLM)**: risoluzione paziente per nome nel testo (riuso `search_patients`) + pattern plurali/sinonimi in `plan.ts`; le intent current-patient diventano applicabili anche con paziente risolto dal testo. Sblocca l'uso immediato ed è il fallback.
- **F1 — Planner LLM (US2)**: endpoint runtime `POST /v1/assistant/plan` + `llm-planner.ts` (validazione del piano contro allowlist read, fallback deterministico). All'LLM va solo la domanda (PHI minimo). Risposta ancora strutturata.
- **F2 — Composer LLM (US3)**: endpoint runtime `POST /v1/assistant/compose` + `composer.ts` (SOURCE_ONLY, post-check anti-invenzione). Dati clinici → LLM EU. Dietro flag, prima solo current-patient.
- **F3 — Correlazione cross-patient + hardening (US4)**: piani multi-tool cross-patient role-gated; suite adversarial completa (prompt injection, jailbreak, accessi); golden set.

Ogni incremento: flag off di default, gate build/test, evidenze Playwright, deploy verificato.

## Project Structure

### Documentation (this feature)

```text
specs/016-agnos-llm-reads/
├── plan.md              # questo file
├── design.md            # design tecnico (già presente)
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   └── assistant-llm-api.md   # contratto endpoint runtime /v1/assistant/*
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
backend/
└── src/ai/
    ├── assistant/
    │   ├── plan.ts             # ESTESO F0: risoluzione paziente per nome + pattern plurali/sinonimi
    │   ├── service.ts          # ESTESO: mode 'deterministic'|'llm'; executor/dispatch INVARIATI
    │   ├── llm-planner.ts      # NUOVO F1: planQueryLLM() → chiama runtime, valida piano, fallback
    │   └── composer.ts         # NUOVO F2: composeAnswer(results, sources) → answerText SOURCE_ONLY
    ├── actions/orchestrate.ts  # ESTESO: sceglie mode via flag + disponibilità runtime (letture)
    ├── gateway/                # INVARIATO: confine fidato, 13 tool read, authz, SOURCE_ONLY
    └── audit-store.ts          # ESTESO (additivo, opzionale): mode/model nell'evento

clinicos-ai-runtime/
└── clinicos_ai/api/app.py      # NUOVI endpoint: POST /v1/assistant/plan, /v1/assistant/compose

frontend/
└── src/components/shared/AgnosPanel.tsx  # ESTESO: rende answerText discorsivo (oltre a risultati/fonti)

e2e/
└── agnos-llm-reads.mjs         # NUOVO: NL reads, fallback, no-delete, anti-invenzione, adversarial
```

**Structure Decision**: monorepo web esistente. L'LLM si innesta in `backend/src/ai/assistant/` (planner/composer) e in `clinicos-ai-runtime` (endpoint modello), lasciando il Data Gateway e l'executor `dispatch()` come confine fidato invariato. Il pannello Agnos (SPEC-015) rende il testo discorsivo aggiuntivo.

## Complexity Tracking

| Violation                                               | Why Needed                                                                                                                   | Simpler Alternative Rejected Because                                                                                                            |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Nuovi endpoint su clinicos-ai-runtime                   | L'interpretazione NL libera e la composizione richiedono un modello; il runtime EU è l'unico host approvato per dati clinici | Chiamare un LLM esterno dal backend: viola FR-011 (PHI verso host non approvato) e Constitution VII                                             |
| Eventuale campo additivo `mode`/`model` su AiAuditEvent | Tracciabilità della modalità (LLM vs deterministica) per audit/forense                                                       | Solo log runtime: non consultabile via API, non sopravvive ai redeploy — mitigato lasciandolo opzionale e subordinato ad approvazione esplicita |
