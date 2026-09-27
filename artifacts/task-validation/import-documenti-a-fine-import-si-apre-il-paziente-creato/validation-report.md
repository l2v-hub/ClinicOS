# Task Validation Report

## Task

- Title: Import documenti: a fine import si apre il paziente creato
- Slug: import-documenti-a-fine-import-si-apre-il-paziente-creato
- Commit: (vedi PR)
- Date: 2026-09-27

## Implementation Summary

La catena dei callback di fine import inoltra ora `(patientId, moduleTabId)` fino ad App, che già
apre la cartella sul modulo scelto:

- `DischargeImportModal`: `onImported?(patientId?, moduleTabId?)`; `completed(patientId,
moduleTabId)` riceve gli argomenti di `IntakeWorkspace.onCreated` e li inoltra.
- `ImportReviewWorkspace`: nella modalità "paziente esistente" inoltra `result._target.patientId`.
- `AIImportStatus`: tipo del callback esteso.
- `PatientList`: passa gli id ad App invece di chiamare `onImported()` a vuoto.

## Files Changed

- frontend/src/components/shared/DischargeImportModal.tsx
- frontend/src/components/shared/import/ImportReviewWorkspace.tsx
- frontend/src/components/shared/AIImportStatus.tsx
- frontend/src/components/operator/PatientList.tsx
- frontend/src/lib/**tests**/importLandsOnPatient.test.ts (nuovo)

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                                                       |
| --- | -----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | test-results/unit.txt 3/3: contratto sul sorgente di modale, revisione, AIImportStatus e PatientList, compresa l'assenza di `onImported()` a vuoto                                                                                                                                             |
| AC2 |   PASS | logs/playwright-fix.txt 3/3: dalla modale di import si arriva al wizard (bozza dell'import), si crea il paziente, si apre la sua cartella sul modulo scelto (Braden). logs/playwright-baseline.txt, stesso script su origin/main: conferma inviata ma la cartella NON si apre (bug riprodotto) |
| AC3 |   PASS | test-results/build.txt exit 0 (build frontend); unit-full.txt 804/813, stessi 9 fallimenti della baseline                                                                                                                                                                                      |

## Test Results

| Test             |          Result | Evidence                                                                                                                                                                            |
| ---------------- | --------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit             |            PASS | unit.txt 3/3; unit-full.txt 804/813 (9 preesistenti identici alla baseline)                                                                                                         |
| Integration      |              NA |                                                                                                                                                                                     |
| API              |              NA |                                                                                                                                                                                     |
| Playwright       |            PASS | evidence.mjs: fix 3/3; baseline 1 PASS + 2 FAIL (bug riprodotto)                                                                                                                    |
| Persistence      |              NA | solo navigazione                                                                                                                                                                    |
| Agnos AI         |              NA |                                                                                                                                                                                     |
| Voice            |              NA |                                                                                                                                                                                     |
| OCR              | PASS (simulato) | flusso di import vero nella UI, con servizio di estrazione e bozze simulati da page.route. Si entra dal job ripreso con bozza corrente, come quando l'operatore riapre una sessione |
| Security/privacy |              NA |                                                                                                                                                                                     |

## Runtime Evidence

- screenshots/fix-wizard-da-import.png, fix-dopo-import.png
- screenshots/baseline-wizard-da-import.png, baseline-dopo-import.png

## Logs

Only sanitized logs are allowed. Solo esiti.

## Residual Risks

- **Moduli verificati:** la prova usa Braden perché questo branch parte da main prima del ciclo 3.
  PAINAD e Trasferimenti funzioneranno anche dall'import una volta mergiato il ciclo 3 (PR #343),
  che deriva la lista dal catalogo.
- **Passi non esercitati nel browser:** caricamento pagine, OCR e revisione dei conflitti. Il bug
  riguarda solo la chiusura del flusso.

- **Modalità "paziente esistente":** coperta solo dal test di contratto sul sorgente
  (`ImportReviewWorkspace` inoltra `result._target.patientId`), non da una prova nel browser.

## QA

QA indipendente: READY FOR QA. Ha rieseguito le prove su entrambe le build con esiti identici e
verificato tutti i punti in cui la catena dei callback è montata.

## Final Decision

CLOSED — VERIFIED
