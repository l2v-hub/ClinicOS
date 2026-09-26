# Task Validation Report

## Task

- Title: Intake: dopo la creazione si apre il modulo scelto (PAINAD, Trasferimenti)
- Slug: intake-dopo-la-creazione-si-apre-il-modulo-scelto-painad-trasferimenti
- Commit: (vedi PR)
- Date: 2026-09-27

## Implementation Summary

- Nuovo modulo `frontend/src/lib/intakeLandingTabs.ts`: `INTAKE_LANDING_TABS` deriva dal
  catalogo `CLINICAL_MODULES`, più `nrs` e `dimissione`. `intakeLandingTab()` restituisce il tab
  solo se ammesso.
- `App.tsx`: rimossa la lista scritta a mano `MODULE_TAB_IDS`, che non conteneva `painad` né
  `postural_transfers`. L'atterraggio dopo la creazione usa `intakeLandingTab`.

## Files Changed

- frontend/src/lib/intakeLandingTabs.ts (nuovo)
- frontend/src/lib/**tests**/intakeLandingTabs.test.ts (nuovo)
- frontend/src/App.tsx

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                                                       |
| --- | -----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | test-results/unit.txt — "every module offered by the wizard is a landing tab", "landing tabs live in the Moduli or Dimissione groups", "unknown or missing tabs are not accepted"                                                                                                              |
| AC2 |   PASS | unit.txt — "App.tsx uses the derived list instead of its own (source contract)". Prima della correzione il test falliva (TDD)                                                                                                                                                                  |
| AC3 |   PASS | logs/playwright-fix.txt 3/3: PAINAD, Trasferimenti posturali e Braden aprono il proprio modulo. logs/playwright-baseline.txt, stesso script su origin/main senza correzione: PAINAD e Trasferimenti aprono "Anagrafica" (FAIL, il bug riprodotto), Braden passa. Screenshot fix-* e baseline-* |
| AC4 |   PASS | test-results/build.txt exit 0; unit-full.txt 805/814, stessi 9 fallimenti della baseline di origin/main                                                                                                                                                                                        |

## Test Results

| Test             | Result | Evidence                                                                    |
| ---------------- | -----: | --------------------------------------------------------------------------- |
| Unit             |   PASS | unit.txt 4/4; unit-full.txt 805/814 (9 preesistenti identici alla baseline) |
| Integration      |     NA |                                                                             |
| API              |     NA |                                                                             |
| Playwright       |   PASS | evidence.mjs: fix 3/3 PASS; baseline 2 FAIL + 1 PASS (bug riprodotto)       |
| Persistence      |     NA | solo navigazione                                                            |
| Agnos AI         |     NA |                                                                             |
| Voice            |     NA |                                                                             |
| OCR              |     NA |                                                                             |
| Security/privacy |     NA |                                                                             |

## Runtime Evidence

- screenshots/fix-painad.png, fix-postural_transfers.png, fix-braden.png
- screenshots/baseline-painad.png, baseline-postural_transfers.png, baseline-braden.png

## Logs

Only sanitized logs are allowed. Solo esiti e nomi dei tab.

## Residual Risks

- **Lista di atterraggio più ampia:** ora contiene tutti i moduli del catalogo. PatientDetail
  accetta già ogni `TabId` e li colloca nel gruppo Moduli (verificato dal test sui gruppi).
- **Import da documenti:** anche lì, alla fine, non si apre il paziente creato. È un bug separato
  (ciclo successivo).

## QA

QA indipendente: READY FOR QA. Ha rieseguito le prove su entrambe le build con esiti identici. Unico
rilievo, un commento orfano in App.tsx: rimosso.

## Final Decision

CLOSED — VERIFIED
