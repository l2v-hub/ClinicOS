# Task Contract

## Task
- Title: Quality Gate infrastructure
- Slug: quality-gate-infrastructure
- Type: infra
- Date: 2026-07-05

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

Nessun gate di processo: i task potevano partire senza contract e dirsi "done" senza report.

## Expected Behaviour

Task Contract obbligatorio prima di modificare codice; Validation Report + Final Decision
(`CLOSED — VERIFIED`) obbligatori prima di dichiarare completato. Enforcement via hook + script.

## Acceptance Criteria

- AC1: create-task-contract genera contract + sottocartelle + scheletro report; no overwrite senza --force.
- AC2: validate-task-contract fallisce se manca una sezione obbligatoria.
- AC3: check-closure consente "done" solo con `CLOSED — VERIFIED`; preflight blocca codice app senza contract; closure blocca parole di completamento senza report verificato.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | script CLI provati per esecuzione diretta |
| Integration | yes | flusso create→validate→check-closure + 2 hook |
| API | no | infra locale |
| Playwright | no | nessuna UI |
| Persistence after refresh | no | nessun dato applicativo |
| Agnos action registry | no | non toccato |
| Voice simulation | no | non toccato |
| OCR/import test | no | non toccato |
| Security/privacy scan | yes | hook fail-open, nessun secret |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

<!-- Rischi noti e mitigazioni. -->

## Gate Status

READY FOR IMPLEMENTATION
