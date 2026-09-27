# Task Contract

## Task

- Title: Import documenti: a fine import si apre il paziente creato
- Slug: import-documenti-a-fine-import-si-apre-il-paziente-creato
- Type: bugfix
- Date: 2026-09-27

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

- Nell'import da lettera di dimissione, il wizard di intake chiama `onCreated(patientId,
moduleTabId)`.
- La catena scarta i parametri a ogni passaggio:
  - `DischargeImportModal.completed()` non li riceve;
  - `AIImportStatus` e `PatientList` richiamano `onImported()` senza argomenti.
- Anche nella modalità "paziente esistente" (`ImportReviewWorkspace`) l'id è noto ma non viene
  passato.
- Risultato: a fine import la finestra si chiude e resta la lista. L'operatore deve cercare il
  paziente appena creato, e il modulo scelto al passaggio 4 viene ignorato.

## Expected Behaviour

- A fine import si apre la cartella del paziente creato (o aggiornato), sul modulo scelto se c'è,
  esattamente come nel flusso "Nuovo paziente".

## Acceptance Criteria

- AC1: `DischargeImportModal`, `AIImportStatus`, `ImportReviewWorkspace` e `PatientList`
  inoltrano `(patientId, moduleTabId)` fino a `onImported` di App. Coperto da un test di contratto
  sul sorgente, che verifica anche che l'import non chiami più `onImported()` a vuoto.
- AC2: nel browser, un import che arriva al wizard e crea il paziente apre la sua cartella, sul
  modulo scelto (import e bozza simulati con page.route).
- AC3: `npm run build` passa; nessun nuovo test fallito rispetto alla baseline.

## Test Plan

| Test type                 | Required | Reason                                                 |
| ------------------------- | -------: | ------------------------------------------------------ |
| Unit                      |      yes | contratto sul sorgente della catena dei callback       |
| Integration               |       no |                                                        |
| API                       |       no |                                                        |
| Playwright                |      yes | import simulato → wizard → creazione → cartella aperta |
| Persistence after refresh |       no | solo navigazione                                       |
| Agnos action registry     |       no |                                                        |
| Voice simulation          |       no |                                                        |
| OCR/import test           |      yes | il flusso di import stesso (con risposte simulate)     |
| Security/privacy scan     |       no |                                                        |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results/unit.txt, build.txt, unit-full.txt
- logs/playwright-evidence.txt e screenshot della cartella aperta a fine import

## Risks

- **Import simulato:** i passi di caricamento e revisione dipendono da molte API. Se non sono
  simulabili nel browser, AC2 verrà provato entrando dal wizard aperto dalla modale di import
  (`step === 'workspace'`), dichiarandolo nel report.

## Gate Status

READY FOR IMPLEMENTATION
