# Task Contract

## Task

- Title: ux2 w5 therapy restructure
- Slug: ux2-w5-therapy-restructure
- Type: change
- Date: 2026-10-03

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

The patient Terapia section has six sub-tabs (Farmaci attivi, Programmazione, Calendario,
Somministrazioni giornaliere, Storico, Sospese/concluse) that repeat the same drugs and the same
administration actions in several places. The chosen sub-view is not kept in the URL (QA F2) and
some action buttons are cut off at 1180 / 820 (QA F8).

## Expected Behaviour

Three views: Calendario (default; compact active-drug list + day/week calendar with administration
actions in place; tap a drug → prescription detail with capability-gated doctor actions), Storico
(administrations over time with period / drug / status filters; suspended/concluded prescriptions
as a filter), Nuova terapia (registration form, therapy.create only). Old deep-link values keep
working; the view is persisted in the hash.

## Acceptance Criteria

- AC1: Terapia shows exactly the views Calendario / Storico / (Nuova terapia for therapy.create); Calendario is the default.
- AC2: Calendario shows a compact active-drug list (one line per drug, PRN marked); tapping a drug opens its prescription detail with Modifica/Sospendi/Elimina/Riattiva only for roles with the capability.
- AC3: Nurse administers today's due dose from the Calendario with fewer taps than before (actions visible on landing); persisted in DB.
- AC4: Storico lists administrations (given / not given + reason / PRN) with period, drug and status filters; «Sospese/concluse» is a filter.
- AC5: Legacy therapyTarget values (attivi, programmazione, giornaliere, calendario, storico, sospese) land on the new views; resolver emits the new values.
- AC6: Chosen view survives reload and Back (hash + history.state).
- AC7: No horizontal scroll / no cut-off action button at 1180x820 and 820x1180; no console errors, no 403/5xx.

## Test Plan

| Test type                 | Required | Reason                                                 |
| ------------------------- | -------: | ------------------------------------------------------ |
| Unit                      |      yes | view mapping, history filters, hash codec, resolver    |
| Integration               |       no | frontend only                                          |
| API                       |       no | no backend change                                      |
| Playwright                |      yes | journeys, tap counts, persistence, widths              |
| Persistence after refresh |      yes | view kept after reload/Back; administrations persisted |
| Agnos action registry     |       no |                                                        |
| Voice simulation          |       no |                                                        |
| OCR/import test           |       no |                                                        |
| Security/privacy scan     |       no | no new data flows                                      |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots (artifacts/task-validation/ux2-cycle/w5/)
- Playwright trace

## Risks

Large rewrite of TerapiaFarmacologicaTab: mitigated by reusing existing components/endpoints and
by E2E on a local synthetic stack.

## Gate Status

READY FOR IMPLEMENTATION
