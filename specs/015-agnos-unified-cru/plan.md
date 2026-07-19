# Implementation Plan: Agnos AI unificato (CRU, no Delete) + UX/Performance

**Branch**: `015-agnos-unified-cru` | **Date**: 2026-07-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-agnos-unified-cru/spec.md`

## Summary

Unificare i due assistenti esistenti (pannello testuale read-only REQ-040 + assistente vocale write REQ-041) in un unico orchestratore Agnos AI channel-agnostic che esegue azioni Create/Read/Update tramite un catalogo allowlist deny-by-default, con divieto strutturale di Delete, conferma esplicita, audit persistente su Postgres e riuso dei service applicativi della UI. Il canale voce entra nello stesso pannello con trascrizione modificabile e risposta TTS (speechSynthesis it-IT). Estensione CRU: appuntamenti agenda — che richiede prima la sostituzione dei MOCK_APPUNTAMENTI con API REST reali (sana anche una violazione della Constitution III). Pacchetto UX/performance mirato con misure prima/dopo. Validazione Playwright end-to-end con evidenze.

## Technical Context

**Language/Version**: TypeScript 5.x — React 18 + Vite (frontend), Node 20 + Express 4 (backend)

**Primary Dependencies**: Prisma 7, Playwright (già installato no-save a livello repo), Web Speech API browser (SpeechRecognition + speechSynthesis, it-IT). Nessuna nuova dipendenza npm.

**Storage**: PostgreSQL (Podman locale / Railway prod). Nuovo modello additivo `AiAuditEvent` (migrazione additiva, nessuna modifica a modelli esistenti). Modello `Appointment` GIÀ esistente in schema.prisma:172 — inutilizzato dal frontend (mock).

**Testing**: Vitest/Jest backend (`backend/src/ai/__tests__/`), tsc -b + vite build gate, Playwright E2E via harness `e2e/*.mjs` + `.claude/skills/run-clinicos/driver.mjs`.

**Target Platform**: Web — Chrome/Edge desktop + tablet 1024px. Voce degrada a solo testo dove Web Speech assente.

**Project Type**: Web application (frontend/ + backend/ monorepo).

**Performance Goals**: -30% richieste rete su apertura agenda; 0 fetch duplicati stessi parametri stesso flusso; lista pazienti senza re-render completi su filtro (memo).

**Constraints**: planner deterministico (nessun dato clinico verso LLM esterni); audio mai fuori dal browser; UI italiana; nessun framework UI; delete AI vietato a 3 livelli (planner, executor, catalogo).

**Scale/Scope**: ~20 pazienti/clinica oggi; catalogo azioni AI v2 = 12 read + 6 write (4 esistenti + 2 appuntamenti); 5 incrementi.

## Constitution Check

_GATE: verificato contro Constitution v1.1.0 — PASS con giustificazioni._

| Principio                   | Esito                        | Note                                                                                                                                                                                                   |
| --------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. Simplicity First         | PASS                         | Riuso planner/executor/preview esistenti; nessuna nuova dipendenza; catalogo = modulo TS semplice.                                                                                                     |
| II. Healthcare UX           | PASS                         | Pannello unico Agnos in italiano, tablet-first; nessun tooltip-only; nessuna nuova tabella fuori ClinicalTable.                                                                                        |
| III. Backend Data Authority | PASS (migliora)              | Elimina MOCK_APPUNTAMENTI: appuntamenti persistiti via API. Audit su Postgres.                                                                                                                         |
| IV. Schema & API Stability  | PASS con richiesta esplicita | L'utente ha esplicitamente richiesto backend/schema per: orchestratore, audit persistente, allowlist, appuntamenti. Migrazione ADDITIVA (`AiAuditEvent`); nessun `migrate reset`. `/patients` intatto. |
| V. Role-Aware Development   | PASS                         | Azioni AI validate server-side su ruolo operatore; route pubbliche continuano a fare clamp del ruolo.                                                                                                  |
| VI. Integration Integrity   | PASS                         | Endpoint `/ai/voice/*` e `/ai/assistant/query` restano funzionanti (delega al nuovo orchestratore); tsc/build gate ad ogni incremento.                                                                 |
| VII. Environment Safety     | PASS                         | Nessun cambio a env/deploy config; audit usa la stessa DATABASE_URL.                                                                                                                                   |

## Project Structure

### Documentation (this feature)

```text
specs/015-agnos-unified-cru/
├── plan.md              # questo file
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   └── agnos-api.md     # contratto endpoint orchestratore
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── prisma → ../prisma/schema.prisma      # + model AiAuditEvent (additivo)
└── src/
    ├── ai/
    │   ├── actions/                      # NUOVO: orchestratore unificato
    │   │   ├── catalog.ts                # allowlist deny-by-default {name, kind: read|create|update}
    │   │   ├── orchestrate.ts            # planCommand()/executeCommand() channel-agnostic
    │   │   └── appointments.ts           # planner+writer appuntamenti (riusa appointment-service)
    │   ├── voice/                        # ESISTENTE: plan/preview/execute/idempotency riusati
    │   │   └── audit.ts                  # esteso: scrive anche su AiAuditEvent
    │   ├── gateway/audit.ts              # esteso: scrive anche su AiAuditEvent
    │   └── audit-store.ts                # NUOVO: persistenza audit (Prisma)
    ├── services/
    │   └── appointment-service.ts        # NUOVO: CRU appuntamenti condiviso UI+AI (delete solo route UI)
    └── routes/
        ├── ai-actions.ts                 # NUOVO: POST /ai/actions/plan|execute {text, channel}
        ├── ai-voice.ts                   # ESISTENTE: delega a actions/orchestrate
        ├── appointments.ts               # NUOVO: REST GET/POST/PATCH/DELETE /appointments (UI)
        └── ai-audit.ts                   # NUOVO: GET /ai/audit (consultazione, ruolo admin/manager)

frontend/
└── src/components/shared/
    ├── AgnosPanel.tsx                    # NUOVO: pannello unico chat+voce (sostituisce AIAssistantButton + VoiceAssistant)
    ├── agnos/
    │   ├── useAgnosChat.ts               # stato conversazione, plan/execute
    │   ├── useVoiceInput.ts              # SpeechRecognition it-IT (estratto da VoiceAssistant)
    │   └── useSpeechOutput.ts            # NUOVO: speechSynthesis it-IT, toggle + stop
    └── AppointmentForm.tsx               # ESISTENTE: onSave → API reale invece di stato mock

e2e/
└── agnos-cru.mjs                         # NUOVO: suite Playwright validazione obbligatoria
```

**Structure Decision**: monorepo web esistente; l'orchestratore nasce in `backend/src/ai/actions/` GENERALIZZANDO i moduli `ai/voice/*` (plan.ts, preview.ts, execute.ts, idempotency.ts) invece di duplicarli — le route voce esistenti delegano al nuovo modulo per retrocompatibilità.

## Incrementi (ordine di consegna)

- **A — Pilota chatbot CRU** (US1): route `/ai/actions/*` + catalogo allowlist + `AgnosPanel` con write via testo (parametri vitali + diario prima, poi anagrafica/narrative). Delete già rifiutato dal planner riusato.
- **B — Audit persistente + prova no-Delete** (US2): modello `AiAuditEvent` + audit-store + estensione refusal patterns (tutte le varianti lessicali) + endpoint consultazione.
- **C — Voce nel pannello + TTS** (US3): useVoiceInput/useSpeechOutput dentro AgnosPanel; VoiceAssistant FAB rimosso; stesso percorso plan/execute.
- **D — Appuntamenti reali + via Agnos** (US4): appointment-service + REST + App.tsx staccato dai mock + azioni AI create/update_appointment con conflitto slot in preview.
- **E — UX/Performance quick-wins** (US5): dedup fetch /therapy-slots e /therapies, memo PatientList, saving-state NewPatientModal, catch silenziosi eliminati nei flussi toccati, misure rete prima/dopo.
- **F — Validazione Playwright completa** + evidenze (screenshot, trace, report) + manifest deployment.

Ogni incremento: team agenti (UIUX review → implementazione → QA build/test) + commit dedicato.

## Complexity Tracking

| Violation                                              | Why Needed                                                                                  | Simpler Alternative Rejected Because                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Modifica backend + migrazione Prisma (Constitution IV) | Richiesta esplicita utente: orchestratore, audit persistente, allowlist, appuntamenti reali | Audit su file JSONL: non consultabile via API, non sopravvive ai redeploy Railway (filesystem effimero) |
| Nuovo endpoint pubblico `/ai/actions/*`                | Canale testo deve eseguire write con stesso contratto del canale voce                       | Estendere `/ai/voice/*` col canale nel nome: fuorviante e rompe la semantica delle route esistenti      |
