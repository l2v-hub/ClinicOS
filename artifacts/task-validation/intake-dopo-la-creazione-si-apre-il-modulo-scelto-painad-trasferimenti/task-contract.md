# Task Contract

## Task

- Title: Intake: dopo la creazione si apre il modulo scelto (PAINAD, Trasferimenti)
- Slug: intake-dopo-la-creazione-si-apre-il-modulo-scelto-painad-trasferimenti
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
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

## Current Behaviour

- Il passaggio 4 (Moduli) del wizard offre tutti i moduli di `CLINICAL_MODULES`: Medicazioni,
  Contenzioni, Trasferimenti posturali, Braden, PAINAD, Tinetti, MNA, GDS-15.
- Alla creazione, App.tsx accetta il modulo scelto solo se è in `MODULE_TAB_IDS`, una lista
  scritta a mano che non contiene `painad` né `postural_transfers`.
- Scegliendo PAINAD o Trasferimenti posturali, la cartella si apre su Anagrafica invece che sul
  modulo scelto: la scelta dell'operatore viene ignorata senza avviso.

## Expected Behaviour

- La lista dei tab di atterraggio deriva dal catalogo dei moduli, così ogni modulo offerto nel
  wizard apre il proprio tab.
- Un modulo aggiunto al catalogo in futuro funziona senza toccare App.tsx.

## Acceptance Criteria

- AC1: la lista dei tab di atterraggio (funzione pura esportata) contiene ogni `tab` di
  `CLINICAL_MODULES` più `nrs` e `dimissione`.
- AC2: App.tsx usa quella lista e non ne mantiene una propria (test di contratto sul sorgente).
- AC3: nel browser, creare un paziente dal wizard scegliendo PAINAD apre la cartella nel modulo
  PAINAD, e scegliendo Trasferimenti posturali nel modulo Trasferimenti.
- AC4: `npm run build` passa; nessun nuovo test fallito rispetto alla baseline di origin/main.

## Test Plan

| Test type                 | Required | Reason                                                          |
| ------------------------- | -------: | --------------------------------------------------------------- |
| Unit                      |      yes | la lista derivata copre tutto il catalogo                       |
| Integration               |       no |                                                                 |
| API                       |       no |                                                                 |
| Playwright                |      yes | wizard vero → conferma → tab aperto (bozza e conferma simulate) |
| Persistence after refresh |       no | solo navigazione                                                |
| Agnos action registry     |       no |                                                                 |
| Voice simulation          |       no |                                                                 |
| OCR/import test           |       no |                                                                 |
| Security/privacy scan     |       no |                                                                 |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results/unit.txt, build.txt, unit-full.txt
- logs/playwright-evidence.txt, screenshots del tab aperto dopo la creazione

## Risks

- **Allowlist più ampia:** ora include tutti i moduli del catalogo. Il rischio è basso, perché
  PatientDetail accetta già ogni `TabId` e li colloca nel gruppo Moduli.

## Gate Status

READY FOR IMPLEMENTATION
