# Tasks: Fase LLM di Agnos — letture NL con risposta discorsiva

**Input**: Design documents from `/specs/016-agnos-llm-reads/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/assistant-llm-api.md

**Tests**: richiesti esplicitamente dalla spec (golden set planner, anti-invenzione, suite adversarial no-delete — SC-001/SC-004/SC-007).

**Organization**: per user story. Mappa incrementi plan.md: US1=F0 (deterministico), US2=F1 (planner LLM), US3=F2 (composer), US4=F3 (correlazione+hardening).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [ ] T001 Verificare baseline: stack SPEC-015 avviabile (backend :3001, frontend :5173, Postgres), `cd backend && npm test` verde, `cd frontend && npm run build` verde; registrare la baseline delle domande fallite oggi (repro «mostra le allergie di <nome>» → unknown) in `requirements/evidence/SPEC-016/baseline.md`
- [ ] T002 [P] Creare il golden set iniziale domanda→piano atteso in `backend/src/ai/__tests__/fixtures/assistant-golden.json` (allergie/terapie/parametri/appuntamenti/documenti, con e senza paziente in contesto, plurali/sinonimi, nome nel testo)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: strutture condivise a tutte le fasi. NON introduce ancora l'LLM.

- [ ] T003 Definire l'allowlist esplicita dei 13 tool di sola lettura del gateway in `backend/src/ai/assistant/read-tools.ts` (nomi + schema args), riusata da validazione piano (F1) e da schema esposto all'LLM; nessun tool di scrittura presente
- [ ] T004 Estendere il tipo `AssistantAnswer` in `backend/src/ai/assistant/service.ts` con i campi opzionali `answerText?`, `mode`, `composed` (retrocompatibili); `dispatch()`/executor INVARIATI
- [ ] T005 Introdurre i flag/config in `backend/src/ai/assistant/config.ts` (`AI_ASSISTANT_LLM_ENABLED`, `AI_ASSISTANT_PLAN_ENABLED`, `AI_ASSISTANT_COMPOSE_ENABLED`, `AI_ASSISTANT_PLAN_MODEL`, `AI_ASSISTANT_COMPOSE_MODEL`, `AI_ASSISTANT_TIMEOUT_MS`), default = motore deterministico

**Checkpoint**: build/test verdi; nessun cambiamento di comportamento (flag off).

---

## Phase 3: User Story 1 — Chatbot risponde alle domande comuni, subito (Priority: P1) 🎯 MVP

**Goal**: potenziamento deterministico — risoluzione paziente per nome + pattern plurali/sinonimi.

**Independent Test**: senza paziente aperto «mostra le allergie di Elena Moretti» → risposta con fonti; con paziente aperto «quali terapie assume» → terapie; paziente inesistente → «non identificato».

- [ ] T006 [US1] Estendere `backend/src/ai/assistant/plan.ts`: se la domanda nomina un paziente («di/per/del paziente <Nome [Cognome]>») e manca `currentPatientId`, pianificare `search_patients` e usarne l'id univoco come scope; ambiguo/assente → intent `unknown` con motivo «paziente non identificato» (nessuna invenzione)
- [ ] T007 [US1] Estendere i pattern in `backend/src/ai/assistant/plan.ts` a plurali/sinonimi (`terapi\w*|farmac\w*`, `allerg\w*`, `parametr\w*|pressione|saturazione|temperatura|frequenza`, `appuntament\w*|agenda`, `document\w*`), rimuovendo i singolare-only
- [ ] T008 [US1] Gestire in `backend/src/ai/assistant/service.ts` la risoluzione a due passi (search_patients → tool sul patientId risolto) mantenendo SOURCE_ONLY e i cap esistenti
- [ ] T009 [P] [US1] Unit test in `backend/src/ai/__tests__/assistant-plan.test.ts`: risoluzione paziente per nome (univoco/ambiguo/assente), plurali/sinonimi, rifiuto clinico invariato; golden set (T002) verde
- [ ] T010 [US1] Rendere `answerText` nel pannello `frontend/src/components/shared/AgnosPanel.tsx` quando presente, altrimenti la vista strutturata attuale (in F0 resta strutturata); nessuna regressione UI
- [ ] T011 [US1] E2E `e2e/agnos-llm-reads.mjs` sezione F0: domande con/senza paziente, nome nel testo, plurali → risposta con fonti; screenshot in `requirements/evidence/SPEC-016/`

**Checkpoint**: il chatbot risponde alle domande comuni SENZA LLM (MVP + fallback per le fasi seguenti).

---

## Phase 4: User Story 2 — Planner LLM (Priority: P2)

**Goal**: l'LLM produce il piano di lettura (solo la domanda all'LLM); validazione + fallback.

**Independent Test**: 20 formulazioni libere → tool corretti; runtime spento/piano invalido → fallback deterministico senza errori.

- [ ] T012 [US2] Runtime: endpoint `POST /v1/assistant/plan` in `clinicos-ai-runtime/clinicos_ai/api/app.py` con structured output vincolato allo schema tool read (contracts/assistant-llm-api.md), temperatura 0, modello `AI_ASSISTANT_PLAN_MODEL`
- [ ] T013 [P] [US2] Runtime test `clinicos-ai-runtime/tests/test_assistant_plan.py`: output conforme allo schema, nessun tool fuori lista, timeout gestito
- [ ] T014 [US2] Backend `backend/src/ai/assistant/llm-planner.ts`: `planQueryLLM()` chiama il runtime, **valida** il piano contro l'allowlist read (T003), **ricalcola** `requiresCrossPatientAccess` server-side; piano invalido/timeout → fallback a `planQuery`
- [ ] T015 [US2] Integrare la scelta del mode in `backend/src/ai/actions/orchestrate.ts` (letture): usa `planQueryLLM` se flag on + runtime disponibile, altrimenti deterministico; scritture invariate
- [ ] T016 [P] [US2] Unit test `backend/src/ai/__tests__/llm-planner.test.ts`: piano con tool fuori allowlist → scartato+fallback; JSON malformato → fallback; nessun tool di scrittura accettato; audit `mode` corretto
- [ ] T017 [US2] Estendere audit (`backend/src/ai/audit-store.ts`) con `mode`/`model` — via log runtime se la migrazione additiva su `AiAuditEvent` non è approvata (D6); nessun valore clinico loggato
- [ ] T018 [US2] E2E `e2e/agnos-llm-reads.mjs` sezione F1: formulazioni libere → piano corretto; runtime spento → fallback; tentativo delete via LLM → nessuno strumento disponibile

**Checkpoint**: interpretazione libera con planner LLM; PHI minimo (solo domanda); fallback garantito.

---

## Phase 5: User Story 3 — Composer LLM: risposta discorsiva (Priority: P2)

**Goal**: comporre la prosa dai risultati (dati clinici → LLM EU) con post-check anti-invenzione.

**Independent Test**: risposta discorsiva con fonti; prosa con entità non presenti → scartata; modello non approvato → composer off.

- [ ] T019 [US3] **DECISIONE COMMITTENTE (bloccante F2)**: registrare in `research.md` il modello/host EU/self-hosted approvato per `compose` (FR-011) e configurarlo in `AI_ASSISTANT_COMPOSE_MODEL`
- [ ] T020 [US3] Runtime: endpoint `POST /v1/assistant/compose` in `clinicos-ai-runtime/clinicos_ai/api/app.py` (SOURCE_ONLY, italiano, cita fonti, rifiuto giudizio clinico), temperatura 0; `GET /v1/runtime/capabilities` espone `assistant_compose` + host
- [ ] T021 [US3] Backend `backend/src/ai/assistant/composer.ts`: `composeAnswer(results, sources)`; **post-check** che scarta la prosa se cita entità/valori non presenti nei results (FR-006) o se `citedSources` ⊄ sources
- [ ] T022 [US3] Gating in `backend/src/ai/assistant/service.ts`: chiamare il composer solo se `AI_ASSISTANT_COMPOSE_ENABLED` e host approvato (capabilities); altrimenti risposta strutturata; mai loggare contenuti clinici
- [ ] T023 [P] [US3] Test: unit post-check anti-invenzione (`backend/src/ai/__tests__/composer.test.ts`) + runtime `test_assistant_compose.py` (rifiuto clinico, citazioni)
- [ ] T024 [US3] E2E `e2e/agnos-llm-reads.mjs` sezione F2: risposta discorsiva con fonti; iniezione di entità non presenti → scarto; modello non approvato → strutturato; misura SC-002 (<5s) e SC-004 (0 invenzioni)

**Checkpoint**: risposta discorsiva fondata sulle fonti, GDPR-conforme, dietro flag.

---

## Phase 6: User Story 4 — Correlazione cross-patient + hardening (Priority: P3)

**Goal**: correlazioni tra pazienti role-gated + suite adversarial completa.

**Independent Test**: ruolo autorizzato → correlazione con fonti; ruolo non autorizzato → rifiuto; adversarial → 0 cancellazioni/invenzioni/accessi.

- [ ] T025 [US4] Piani multi-tool cross-patient guidati da LLM in `backend/src/ai/assistant/llm-planner.ts` + composizione sintetica; `requiresCrossPatientAccess` ricalcolato e `canCrossPatientSearch` applicato dal gateway (invariato)
- [ ] T026 [US4] Suite adversarial in `e2e/agnos-llm-reads.mjs` + `backend/src/ai/__tests__/adversarial.test.ts`: prompt injection nel testo E nei documenti importati, jailbreak «cancella», accesso cross-patient non autorizzato → 0 delete/invenzioni/accessi (SC-007)
- [ ] T027 [US4] Golden set esteso + misura SC-001 (≥90% domande comuni corrette con fonti) documentata in `requirements/evidence/SPEC-016/`

**Checkpoint**: correlazione governata; sicurezza dimostrata su tutta la superficie.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T028 [P] Documentare in `specs/016-agnos-llm-reads/quickstart.md` gli esiti reali delle misure SC-001..SC-007 (prima/dopo)
- [ ] T029 Gate finali per ogni incremento consegnato: `cd backend && npm test`, runtime `pytest`, `cd frontend && npm run build` verdi; zero lint
- [ ] T030 Commit per incremento + push + manifest deployment in `requirements/deployments/` (feature 016, flag stato); deploy verificato Vercel+Railway prima di chiudere ciascun incremento

---

## Dependencies & Execution Order

- **Setup (P1)** → **Foundational (P2)** BLOCCA tutte le story.
- **US1/F0 (P3)**: dopo Foundational — MVP, nessun LLM. È il **fallback** di tutte le fasi LLM.
- **US2/F1 (P4)**: dopo US1 (fallback pronto) — planner LLM.
- **US3/F2 (P5)**: dopo US2 + **T019 (decisione modello EU)** — composer. Bloccata finché il modello non è approvato.
- **US4/F3 (P6)**: dopo US2/US3 — correlazione + hardening.
- **Polish (P7)**: dopo gli incrementi consegnati.

### Parallel Opportunities
- T002 ∥ T001; T009/T013/T016/T023 ∥ (test in file diversi); runtime e backend di una stessa fase in parallelo dove i file sono disgiunti.

---

## Implementation Strategy

MVP = Setup + Foundational + **US1/F0**: il chatbot funziona subito senza LLM (risolve il difetto attuale) ed è il fallback. Poi incrementi indipendenti dietro flag: US2/F1 (planner, PHI minimo) → **[decisione modello EU]** → US3/F2 (composer) → US4/F3 (correlazione+hardening). Ogni incremento: flag off di default, gate build/test, evidenze Playwright, deploy verificato.
