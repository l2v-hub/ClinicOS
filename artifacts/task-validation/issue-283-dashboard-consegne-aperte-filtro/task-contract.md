# Task Contract

## Task
- Title: issue 283 dashboard consegne aperte filtro
- Slug: issue-283-dashboard-consegne-aperte-filtro
- Type: change
- Date: 2026-07-20

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

La card "Consegne aperte" delle dashboard (operatore e admin) navigava alla pagina Consegne generica, senza filtro: l'utente doveva ritrovare a mano la consegna aperta (issue #283).

## Expected Behaviour

La card apre la pagina Consegne già filtrata sulle aperte (chip "Aperte" attivo quando copre il conteggio della card); se la consegna non completata è UNA sola, la sua card viene evidenziata e scrollata al centro (consegna-card--focus). La navigazione generica da sidebar azzera filtro/focus.

## Acceptance Criteria

- AC1: Click sulla card "Consegne aperte" → pagina Consegne con filtro stato coerente (aperte) applicato.
- AC2: Con una sola consegna aperta, la card corrispondente è evidenziata e portata in vista.
- AC3: La voce sidebar Consegne continua ad aprire la vista non filtrata; nessun errore console né 4xx/5xx.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | |
| Integration | no | |
| API | no | |
| Playwright | yes | flusso UI reale |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

## Evidence Plan

- validation-report.md
- screenshot pagina Consegne filtrata con card focus
- Playwright trace + test-results

## Risks

consegneView ha un unico writer (navigate/openConsegneAperte): niente stati orfani.

## Gate Status

READY FOR IMPLEMENTATION
