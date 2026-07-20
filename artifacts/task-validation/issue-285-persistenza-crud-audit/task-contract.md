# Task Contract

## Task
- Title: issue 285 persistenza crud audit
- Slug: issue-285-persistenza-crud-audit
- Type: change
- Date: 2026-07-20

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes |
| Database/Persistence | yes |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

Audit CRUD (issue #285): gli orari operatori dell'admin erano SOLO client-side (MOCK_SCHEDULES) e l'agenda della dashboard operatore mostrava MOCK_AGENDA: dati persi a fine sessione.

## Expected Behaviour

Nuovo modello OperatorSchedule (JSON blob {turni,note}, unique per operatore, migrazione 20260720100000): GET /operators/schedules + PUT /operators/:id/schedule (upsert); il frontend carica gli orari dal DB e salva saveSchedule via API con toast esito. Il widget agenda dashboard deriva dagli appuntamenti reali di oggi (niente più mock).

## Acceptance Criteria

- AC1: Salvataggio orari operatore dall'admin → PUT 200 e dato in DB (riletto da GET /operators/schedules).
- AC2: Gli orari salvati persistono dopo reload completo della pagina.
- AC3: Il widget agenda della dashboard mostra gli appuntamenti reali di oggi (non MOCK_AGENDA); nessun errore console né 4xx/5xx.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | |
| Integration | no | |
| API | yes | |
| Playwright | yes | flusso UI reale |
| Persistence after refresh | yes | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

## Evidence Plan

- validation-report.md
- screenshot orari salvati dopo reload
- Playwright trace + test-results
- API proof (GET dopo PUT)

## Risks

Blob JSON owned dal frontend (stesso pattern cartella); onDelete Cascade evita orfani.

## Gate Status

READY FOR IMPLEMENTATION
