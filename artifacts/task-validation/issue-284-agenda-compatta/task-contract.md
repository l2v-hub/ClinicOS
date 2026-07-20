# Task Contract

## Task
- Title: issue 284 agenda compatta
- Slug: issue-284-agenda-compatta
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

L'agenda (operatore e admin) usava slot molto alti (52-64px per slot, celle admin 44-56px): poche righe visibili, troppo spazio sprecato, leggibilità ridotta (issue #284).

## Expected Behaviour

Densità ridotta via CSS token (slot 40/48/32px, celle admin 34/42px, free-slot 22/26px, padding ridotti): più fasce orarie visibili a parità di viewport, senza perdita di leggibilità né modifiche funzionali.

## Acceptance Criteria

- AC1: Gli slot agenda hanno le nuove altezze compatte (verifica computed style min-height ≤ 48px slot ora).
- AC2: A viewport 1280x800 l'agenda mostra più fasce orarie di prima (nessuna riga tagliata/overlap).
- AC3: Interazioni agenda invariate (click slot, creazione appuntamento); nessun errore console.

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
- screenshot agenda compatta (operatore e admin)
- Playwright trace + test-results

## Risks

Solo CSS: rischio regressione visiva mitigato da screenshot before/after.

## Gate Status

READY FOR IMPLEMENTATION
