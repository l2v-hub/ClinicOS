# Task Validation Report

## Task

- Title: Estrazione terapia da documenti: tutti i farmaci, schemi insulina a scale glicemiche, data inizio default al giorno di import
- Slug: estrazione-terapia-da-documenti-tutti-i-farmaci-schemi-insulina-a-scale-glicemic
- Branch: feat/therapy-extraction-scan (base origin/main 30f0b14d6)
- Date: 2026-10-11

## Implementation Summary

- `parseDischargeTherapy`: a prose paragraph after drugs is skipped, no longer the end of the
  therapy (#296 rule superseded by the 2026-10-11 requirement); OCR/pipeline page markers
  (`---`, `--- Pagina N/Tot ---`, `[Lettera 2]`, `Pagina 2 di 3`) are not rows.
- Glucose scales: `findGlucoseRules` reads range→units and units→range forms (`150-200: 2 UI`,
  `> 250: 6 UI`, `< 150: 0 UI`, `da 120 a 160: 2 unità`, `oltre 160`, `4 U se glicemia 200-250`),
  one line at a time, glycemia values ≥ 40, other labs (aPTT, INR, K…) excluded. Scale-only lines
  merge into the preceding row only if it announces a scale (schema/glicemia/stick/…); a merged row
  is always `da_verificare`. Values always come from the document. Persistence reuses the existing
  `PatientTherapy.doseMode/doseProtocol` (main 54d65b243): no schema change.
- Prescriptions outside the therapy section (decorso, consigli, anamnesi, unmapped): sentence with
  drug + dose + periodicity → `da_verificare` row with `outsideTherapySection: true` and UI alert;
  suspended/forbidden/past drugs, allergies and lab values excluded; drugs already in the section
  are not repeated.
- Dates: rows without `dal dd/mm/yyyy` get `dataInizio` = clinic day (Europe/Rome) at processing;
  frontend fallback to local day; `todayStr()` now local (was UTC); intake "Data presa in carico" and
  "Ora" prefilled once on open.

## Files Changed

- backend/src/intake/parse-discharge-therapy.ts
- backend/src/intake/draft-service.ts
- backend/src/ai/upload/pages/draft-source.ts
- backend/src/intake/**tests**/parse-discharge-therapy.test.ts (#296 AC2 test updated to new rule)
- backend/src/intake/**tests**/therapy-extraction-scan.test.ts (new)
- frontend/src/components/shared/intake/dischargeTherapy.ts
- frontend/src/components/shared/intake/DischargeTherapyReview.tsx
- frontend/src/components/shared/intake/StepIngresso.tsx
- frontend/src/components/operator/cartella/shared.tsx
- frontend/src/components/shared/intake/**tests**/therapyConfirmation.test.ts (date default updated)

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                           |
| --- | -----: | ------------------------------------------------------------------------------------------------------------------ |
| AC1 |   PASS | unit tests AC1; screenshots/r2/03, 04-*; logs/r2-ui-therapy-rows.json                                              |
| AC2 |   PASS | unit tests AC2/F2/R1; screenshots/r2/05, 05b-outside-section-alert.png; logs/r2-legacy-from-import-summary.txt     |
| AC3 |   PASS | unit tests AC3/F1/F5/R2; screenshots/r2/06-insulin-humalog-glucose-scale.png; logs/r2-ui-insulin-scale-inputs.json |
| AC4 |   PASS | logs/r2-db-patient-therapies.json (doseMode=glucose_scale, rules = document); screenshots/r2/12, 13 after reload   |
| AC5 |   PASS | unit tests AC5 (Europe/Rome); screenshots/r2/07, 08                                                                |
| AC6 |   PASS | see Test Results                                                                                                   |

## Test Results

| Test             | Result | Evidence                                                                                                                              |
| ---------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------- |
| Unit             |   PASS | backend parser suites incl. new therapy-extraction-scan; frontend intake+cartella 254/254                                             |
| Integration      |   PASS | backend intake + import pages + intake-* + therapies + sections: 649/649 on fresh Postgres `txfinal` (test-results/final-backend.txt) |
| API              |   PASS | real POST /intake/drafts/from-import 201 (page-session and legacy jobs), confirm → PatientTherapy                                     |
| Playwright       |   PASS | independent QA r2: 34/35 + 4/4 reload (the 1 miss checked the calendar view, which does not show scales by design); trace/r2-*.zip    |
| Persistence      |   PASS | DB query + full reload, Piano terapeutico shows the 4 bands                                                                           |
| Agnos AI         |     NA |                                                                                                                                       |
| Voice            |     NA |                                                                                                                                       |
| OCR              |   PASS | synthetic 2-page OCR text through the real page-session pipeline (only /ai/extraction/status stubbed)                                 |
| Security/privacy |   PASS | synthetic data only, local DBs, no secrets in logs                                                                                    |

Frontend full suite: 1281/1299, the 18 failures identical by name to origin/main baseline.
`npm run build` (frontend) and backend `tsc --noEmit` pass.

## Runtime Evidence

Independent QA session (did not write the code): round 1 FAILED VALIDATION (F1 scale merged into
metformin as `ok`, F2 wrong names, F3–F5), all fixed; round 2 READY FOR QA. R1 (form word as name)
and R2 (`glicemia` connector) fixed afterwards with unit tests (backend 649/649 rerun).
Full detail: qa-report.md.

## Logs

Only sanitized logs, synthetic data (logs/).

## Residual Risks

- Not yet run on the user's real discharge letter / real OCR output: the synthetic fixtures model
  the reported failure (drugs after a page break or outside the section), but the actual document
  was not available in this session.
- Outside-section rows can still be noisy (infusions, contrast prose): always `da_verificare`,
  never prescribed without the operator.
- Compound drug names outside the section are truncated to the first token (ACIDO, INSULINA): the
  full sentence stays visible as "Dal documento".

## Final Decision

IMPLEMENTED — NOT VERIFIED

(READY FOR QA from the independent session; to be closed after a check on a real discharge letter
in a deployed environment.)
