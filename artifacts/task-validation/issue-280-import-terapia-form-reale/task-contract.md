# Task Contract

## Task

- Title: issue 280 import terapia form reale
- Slug: issue-280-import-terapia-form-reale
- Type: bugfix
- Date: 2026-07-20
- GitHub Issue: #280

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |      yes |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

## Current Behaviour

La revisione delle terapie rilevate dall'import (`DischargeTherapyReview`) è una tabella di input
raw (testo libero per dosaggio/via/orari) diversa dal form usato per creare una terapia da zero:
l'operatore non può confrontare i dati importati con l'originale né modificarli con lo stesso
editor strutturato (orari con quantità/frazioni, via da select, giorni settimana).

## Expected Behaviour

Ogni terapia rilevata è rivista nello STESSO form della creazione manuale (`TherapyFormFields`),
precompilato dai dati parsati (bridge `dischargeRowToTherapyForm` / `therapyFormToDischargeRow`),
con accanto il testo originale estratto dal documento per confronto. Le modifiche fatte nel form
si riflettono nel draft e alla conferma vengono salvate come nella creazione manuale.

## Acceptance Criteria

- AC1: Nello step Clinica dell'import, ogni terapia rilevata mostra il form reale (stessi campi
  della creazione manuale: prodotto, forma, dosaggio commerciale, via, orari con quantità,
  giorni settimana) precompilato con i dati parsati.
- AC2: Il testo originale estratto dal documento è visibile accanto al form per confronto.
- AC3: Una modifica nel form (es. cambio orario/dosaggio) aggiorna il draft e sopravvive alla
  conferma (la terapia creata riflette la modifica).
- AC4: Le righe "da verificare" restano segnalate e non vengono perse.

## Test Plan

| Test type                 | Required | Reason                                       |
| ------------------------- | -------: | -------------------------------------------- |
| Unit                      |       no | bridge coperto indirettamente dal flusso e2e |
| Integration               |       no |                                              |
| API                       |       no |                                              |
| Playwright                |      yes | flusso import → revisione form → conferma    |
| Persistence after refresh |      yes | AC3: terapia creata visibile dopo reload     |
| Agnos action registry     |       no |                                              |
| Voice simulation          |       no |                                              |
| OCR/import test           |      yes | draft d'import seedato con terapiaImport     |
| Security/privacy scan     |       no |                                              |

## Evidence Plan

- validation-report.md
- screenshot del form precompilato con blocco "dati originali"
- Playwright trace + test-results + video (flusso critico import)
- assert: no console errors, no 4xx/5xx

## Risks

Round-trip form ⇄ riga raw lossy per campi senza casa strutturata: mitigato tenendo stato form
locale a piena fedeltà e ripiegando in `note` ciò che non è mappabile.

## Gate Status

READY FOR IMPLEMENTATION
