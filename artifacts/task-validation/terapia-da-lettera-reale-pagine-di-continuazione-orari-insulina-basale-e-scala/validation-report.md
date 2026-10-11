# Task Validation Report

## Task

- Title: Terapia da lettera reale: pagine di continuazione, orari, insulina basale e scala
- Slug: terapia-da-lettera-reale-pagine-di-continuazione-orari-insulina-basale-e-scala
- Branch: fix/therapy-real-letter (base origin/main 489d15510)
- Date: 2026-10-11

## Implementation Summary

- Parser (`parse-discharge-therapy.ts`):
  - compound strengths stay whole (10/10 MG, 875 + 125 MG, 5000U/0,2 ML, 100 UI /ML, 1.200.000 UI);
  - a package volume before the real strength is skipped (row da_verificare);
  - "0,2 ML" is no longer the quantity "2 ML"; "1 F" = fiala;
  - insulin units after a concentration become the quantity, never from ranges, sums, alternatives
    or maxima;
  - times are read after uppercase abbreviations (N/ORD, RM) and from "ORE 8-15-20" (row
    da_verificare);
  - suspension, negation or condition anywhere in the line → never 'ok';
  - dotted thousands → da_verificare;
  - DIETA and laboratory "Controlli/Esami" lines are not drugs.
- Sections (`markdown-parse.ts`): a drug list before the first heading (continuation page imported
  on its own) becomes therapy, from the first complete prescription to the last line with a
  prescription signal, plus short uppercase drug lines in the same paragraph.
- Frontend (`dischargeTherapy.ts`):
  - "f" = fiala;
  - ambiguous dotted numbers ("1.000") never pre-fill a value; they stay in the note.

## Files Changed

- backend/src/intake/parse-discharge-therapy.ts
- backend/src/ai/sections/markdown-parse.ts
- backend/src/intake/**tests**/parse-discharge-therapy.test.ts (67G/100ML case: now the dosaggio)
- backend/src/intake/**tests**/therapy-real-letter.test.ts (new)
- frontend/src/components/shared/intake/dischargeTherapy.ts
- frontend/src/components/shared/intake/**tests**/realLetterRows.test.ts (new)

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                            |
| --- | -----: | ------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | therapy-real-letter.test.ts AC1 (markdown + plain text): exactly 20 drugs, no DIETA/CONTROLLI                       |
| AC2 |   PASS | AC2 tests: times for TACHIPIRINA, ROSUMIBE, MIRAPEXIN, CALCIPARINA, LATTULAC, DIAMICRON, LANTUS, AUGMENTIN, MOVICOL |
| AC3 |   PASS | AC3 tests: LANTUS 100 UI /ML · 10 UI · 08:00; CALCIPARINA; AUGMENTIN; HUMALOG scale as written, da_verificare       |
| AC4 |   PASS | AC4 test + QA r2/r3 variants: page 2 alone → 15 drugs                                                               |
| AC5 |   PASS | see Test Results                                                                                                    |

## Test Results

| Test             | Result | Evidence                                                                                                                   |
| ---------------- | -----: | -------------------------------------------------------------------------------------------------------------------------- |
| Unit             |   PASS | backend parser/sections/header suites 166/166; frontend intake + cartella 259/259 (incl. realLetterRows)                   |
| Integration      |   PASS | intake + ai + import pages + therapies on fresh Postgres: 1099/1100, 0 fail (test-results/backend-intake-ai-therapies.txt) |
| API              |     NA | no route change                                                                                                            |
| Playwright       |     NA | no UI component change; review component unchanged                                                                         |
| Persistence      |     NA | no persistence change                                                                                                      |
| Agnos AI         |     NA |                                                                                                                            |
| Voice            |     NA |                                                                                                                            |
| OCR              |   PASS | anonymised transcription of the real letter through header filter → sections → rows                                        |
| Security/privacy |   PASS | fixtures contain no real patient, clinician or facility identifiers; the real PDF was not committed                        |

Full backend runner (`run-node-tests.mjs`, fresh DB, test-results/backend-full-r3.txt): 1824 pass in
the concurrent pass. The 13 failures, re-run serially, give 59/60. The only failure left,
"therapy reads and writes apply patient scope before loading clinical data", fails identically on
origin/main (pre-existing, unrelated). Backend `tsc --noEmit` and frontend `npm run build` pass.

## Runtime Evidence

Independent QA session, 4 rounds: FAILED VALIDATION ×3, all findings fixed with regression tests, round 4
READY FOR QA. Detail and accepted residual risks: qa-report.md.

## Logs

Only test output, synthetic/anonymised data (test-results/).

## Residual Risks

- The production OCR text of the user's letter is not available (prod DB off limits): the fixture
  models the Mistral markdown and plain-text shapes of the same letter.
- LOW residual cases listed in qa-report.md (all either da_verificare or a narrow trailing-line loss
  outside the therapy section).

## Final Decision

IMPLEMENTED — NOT VERIFIED

(READY FOR QA from the independent session; to be closed after the user re-imports the real letter
in production.)
