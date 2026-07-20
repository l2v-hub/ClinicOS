# Task Contract

## Task
- Title: issue 282 creazione paziente ultimo step
- Slug: issue-282-creazione-paziente-ultimo-step
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

Nell'ultimo step della creazione paziente il bottone "Crea paziente" può risultare premuto ma inerte: il gate di accettazione terapia (checkbox dello step Clinica) lo disabilita, ma nello step finale non esiste alcun controllo per sbloccarlo → bottone che "non funziona" (issue #282).

## Expected Behaviour

La checkbox di conferma terapia è disponibile ANCHE nello step di riepilogo (data-testid accept-therapy-verifica): l'operatore può completare l'accettazione lì e il bottone crea il paziente.

## Acceptance Criteria

- AC1: Nello step finale è presente la checkbox di conferma revisione terapia (o "nessuna terapia da inserire").
- AC2: Spuntate le conferme, il bottone "Crea paziente" è abilitato e al click crea il paziente (visibile in lista dopo il flusso).
- AC3: Il paziente creato persiste dopo reload; nessun errore console né 4xx/5xx.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | |
| Integration | no | |
| API | no | |
| Playwright | yes | flusso UI reale |
| Persistence after refresh | yes | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

## Evidence Plan

- validation-report.md
- screenshot step finale con checkbox + bottone abilitato
- Playwright trace + test-results + video (flusso critico)

## Risks

Il gate _accepted resta l'unico writer; la checkbox duplicata scrive lo stesso campo del draft (nessuna divergenza).

## Gate Status

READY FOR IMPLEMENTATION
