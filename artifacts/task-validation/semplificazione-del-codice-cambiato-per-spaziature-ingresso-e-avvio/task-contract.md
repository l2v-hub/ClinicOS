# Task Contract

## Task

- Title: Semplificazione del codice cambiato per spaziature, ingresso e avvio
- Slug: semplificazione-del-codice-cambiato-per-spaziature-ingresso-e-avvio
- Type: refactor
- Date: 2026-11-19

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

Note: richiesta originale dell'utente (2026-11-18): «semplificando la verbosità del codice con le
skill di /simplify». Riguarda solo il codice frontend cambiato dalla #533
(`3360d52d..97e36fda`, `frontend/src`). Comportamento invariato.

## Current Behaviour

Il codice cambiato dalla #533 non è ancora passato dalla revisione `simplify` (riuso, semplicità,
efficienza): la passata era rimasta indietro per il limite d'uso dell'account.

## Expected Behaviour

Il codice cambiato è più semplice o uguale, senza duplicazioni evitabili, con comportamento e
aspetto invariati.

## Acceptance Criteria

- AC1: la skill `simplify` è eseguita sul diff `3360d52d..97e36fda -- frontend/src`; ogni
  correzione applicata è elencata nel rapporto, ogni proposta scartata ha il motivo.
- AC2: `cd frontend && npm run build` passa; la suite frontend passa con lo stesso numero di test o
  più; il lint non aggiunge errori nei file toccati.
- AC3: nessuna modifica fuori da `frontend/src` (più evidenze e documentazione).
- AC4: nessuna modifica di comportamento clinico (letture, salvataggi, validazioni, permessi).

## Test Plan

| Test type                 | Required | Reason                                        |
| ------------------------- | -------: | --------------------------------------------- |
| Unit                      |      yes | suite frontend esistente                      |
| Integration               |       no |                                               |
| API                       |       no | backend non toccato                           |
| Playwright                |       no | solo se una correzione tocca il markup/CSS    |
| Persistence after refresh |       no |                                               |
| Agnos action registry     |       no |                                               |
| Voice simulation          |       no |                                               |
| OCR/import test           |       no |                                               |
| Security/privacy scan     |       no |                                               |

## Evidence Plan

Required evidence:

- validation-report.md
- test output (build, suite, lint dei file toccati)

## Risks

- Molti test leggono il testo dei sorgenti CSS/TSX: ogni correzione va verificata con la suite.
- Una semplificazione può cambiare il comportamento in modo sottile: si applicano solo correzioni
  a comportamento identico, dimostrabile dal codice.

## Gate Status

READY FOR IMPLEMENTATION
