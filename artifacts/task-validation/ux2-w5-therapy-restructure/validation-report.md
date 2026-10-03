# Task Validation Report

## Task

- Title: ux2 w5 therapy restructure
- Slug: ux2-w5-therapy-restructure
- Commit: 1bb38aca (branch ux2/w5-therapy, local)
- Date: 2026-10-03

## Implementation Summary

The patient Terapia section went from six sub-tabs (Farmaci attivi, Programmazione, Calendario,
Somministrazioni giornaliere, Storico, Sospese/concluse) to three views:

- **Calendario** (default): a compact list of the active drugs, one line each (drug, strength,
  schedule, route, prescriber, «Al bisogno» chip, «non in anagrafica» chip). Tapping a line opens
  the prescription detail with Modifica / Sospendi / Elimina / Riattiva, gated by capability. Below
  it is the day/week calendar. Today, the hour of the first due dose opens by itself with its
  actions. A today dose marked «non somministrata» gets «Somministra ora» in that hour (this was
  F7 in the Storico before).
- **Storico**: administrations grouped by day (given / not given + reason / al bisogno). Filters:
  status (Tutte, Somministrate, Non somministrate, Al bisogno, Prescrizioni sospese/concluse),
  period (Oggi, 7, 30 giorni, Tutto) and drug.
- **Nuova terapia**: the existing TherapyFormFields form with field-level validation, shown only
  with therapy.create. Editing an existing prescription opens the same form in place.

Old deep-link values still work: attivi / programmazione → Calendario with the drug open;
giornaliere / calendario → Calendario on that date and time with the dose highlighted;
storico / sospese → Storico. The resolver now emits `calendario`. The chosen view is saved in the
hash and history.state (`rememberTherapyView`), so reload and Back keep it (F2). The duplicate
in-tab AIFA anomaly banner was removed: the state now shows on the drug line.

## Files Changed

- frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx (rewritten)
- frontend/src/components/operator/cartella/TherapyDrugList.tsx (new)
- frontend/src/components/operator/cartella/TherapyHistoryView.tsx (new)
- frontend/src/components/operator/cartella/TherapyViews.css (new)
- frontend/src/components/operator/cartella/PatientTherapyCalendar.tsx / .css
- frontend/src/components/operator/cartella/PatientTherapySlotDetail.tsx
- frontend/src/lib/therapyView.ts (new), patientTarget.ts, patientTargetHash.ts, patientTargetResolver.ts
- tests: lib/**tests**/therapyView.test.ts (new); updated therapyW2InPlace, therapyPages,
  patientTargetResolver, turnoPatients, patientDetailWorkspace, table-filters-contract
- E2E: scripts/e2e/ux-w5-therapy.mjs (new); ux-w2-therapy.mjs trimmed to the cases that still
  exist; ux-w1-navigation.mjs uses the new view labels

## Acceptance Criteria Result

| AC  | Result | Evidence                                              |
| --- | -----: | ----------------------------------------------------- |
| AC1 |   PASS | W5-01, W5-01b, W5-18 (doctor sees Nuova terapia)      |
| AC2 |   PASS | W5-02, W5-06, W5-18, W5-19, W5-20                     |
| AC3 |   PASS | W5-03, W5-04 (2 taps, was 3), W5-05/05b, W5-07, W5-14 |
| AC4 |   PASS | W5-08, W5-09, W5-10                                   |
| AC5 |   PASS | W5-15, W5-16, W5-17; W1 T2/A1/N1/L1/B1/S1/O1          |
| AC6 |   PASS | W5-11 (reload), W5-12 (Back)                          |
| AC7 |   PASS | W5-13a, W5-22, W5-23, W5-24                           |

## Test Results

| Test                                 |  Result | Evidence                                                                                                                                                                   |
| ------------------------------------ | ------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                                 |    PASS | 1078 tests, 1069 pass, 9 fail: the same 9 names as the baseline (artifacts/task-validation/ux2-cycle/w5/frontend-tests.txt)                                                |
| Typecheck + build                    |    PASS | `tsc --noEmit -p tsconfig.app.json`, `npm run build`                                                                                                                       |
| Playwright W5                        |    PASS | 28/28 (artifacts/task-validation/ux2-cycle/w5/results.json, screens/)                                                                                                      |
| Playwright W2 (regression)           |    PASS | 9/9 (w2-regression/results.json)                                                                                                                                           |
| Playwright W1 (regression)           | PARTIAL | 40/42. Every therapy landing passes. A2 / A2.info fail: no «farmaci da verificare» row in the Adesso queue on this DB. Not touched by W5; not compared with a baseline run |
| Persistence                          |    PASS | DB rows checked in W5-04/05/05b/07/14/19/20                                                                                                                                |
| Integration / API / AI / Voice / OCR |      NA | frontend only, no backend change                                                                                                                                           |

## Runtime Evidence

Local synthetic stack: vite preview :5221 + backend :3121 (AUTH_MODE=demo) on DB ux2w5 (embedded
Postgres). Screenshots are in artifacts/task-validation/ux2-cycle/w5/screens. Playwright traces
are saved locally and not committed.

## Residual Risks

- On the tablet landing, the chart header and banners (PatientDetail, not in W5 scope) leave about
  470 px for content. The due hour is scrolled into view, so the drug list and the view chips sit
  above the fold.
- Suspending a drug now takes 4 taps (Terapia → drug → Sospendi → confirm) instead of 3. This
  follows the owner's «tap a drug → detail with doctor actions» decision.
- Removed: the server-side therapy search filters (Cerca farmaco / Tipo / Data inizio) on the old
  tables. Storico has its own client-side filters instead.

## Final Decision

READY FOR QA. The implementation was validated by its author. An independent QA gate is still
required before closure.
