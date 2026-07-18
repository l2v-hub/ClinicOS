# Task Contract

## Task
- Title: Scheda paziente banda allergie rischi altezza
- Slug: scheda-paziente-banda-allergie-rischi-altezza
- Type: refactor
- Date: 2026-07-18

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

Nella scheda paziente le card della banda sicurezza (`.cr-alert-strip` ALLERGIE GRAVI / Rischi attivi) hanno
altezza sproporzionata (troppo alta). Causa: `.cr-alert-band` usa `align-items:stretch` (default flex) → le due
strip si allungano all'altezza della più alta (quando una ha testo lungo che va a capo); inoltre il padding
14px è generoso.

## Expected Behaviour

Solo CSS. Le strip hanno altezza proporzionata al contenuto: `.cr-alert-band { align-items: flex-start }`
(niente stretch → ogni strip prende la propria altezza), padding ridotto a ~10px 16px, contenuto allineato
in alto quando va a capo. Nessuna regressione; nessun cambio a logica/dati/API.

## Acceptance Criteria

- AC1: `.cr-alert-band` non forza le strip alla stessa altezza (`align-items:flex-start`); ogni strip è alta quanto il suo contenuto.
- AC2: padding strip ridotto/proporzionato; nessuna altezza eccessiva con testo corto.
- AC3: banda ancora leggibile su desktop e phone; nessun cambio logica/dati/API.
- AC4: `cd frontend && npm run build` verde; screenshot scheda paziente di conferma.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Solo CSS |
| Integration | no | |
| API | no | Backend non toccato |
| Playwright | yes | Screenshot banda sicurezza scheda paziente (altezza proporzionata) |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

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
