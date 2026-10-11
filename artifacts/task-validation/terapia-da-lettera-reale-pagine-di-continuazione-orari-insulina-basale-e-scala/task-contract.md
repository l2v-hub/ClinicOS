# Task Contract

## Task

- Title: Terapia da lettera reale: pagine di continuazione, orari, insulina basale e scala
- Slug: terapia-da-lettera-reale-pagine-di-continuazione-orari-insulina-basale-e-scala
- Type: bugfix
- Date: 2026-10-11

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |       no |
| Backend/API          |      yes |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |      yes |
| Auth / Permissions   |       no |
| Privacy / Security   |      yes |
| Config / Env         |       no |

## Current Behaviour

The user provided a real 4-page scanned discharge letter (Lungodegenza, "Terapia Domiciliare" with 5
drugs at the bottom of page 1 and 15 more at the top of page 2, without a heading, after the
repeated patient header; insulin LANTUS basal and HUMALOG glucose scale). Reproduced on main
489d1551 with an anonymised Mistral-style transcription:

- a page whose drug list comes before any heading (page imported as its own letter) loses ALL of
  it: lines before the first heading are dropped by `parseMarkdownSections` (0 rows);
- administration times are lost whenever an unplaced token precedes "ore" (N/ORD, RM, 10/10,
  5000U/0,2 ML, 67G/100ML, "100 UI /ML 10 Ui") → ROSUMIBE, MIRAPEXIN, CALCIPARINA, LATTULAC,
  DIAMICRON, LANTUS without times; "ORE 8-15-20" not read;
- LANTUS "100 UI /ML 10 Ui ore 08:00" → dosaggio 100 UI, no dose 10 UI, no time;
- "0,2 ML" read as quantity "2 ML"; "875 + 125 MG" read as 125 MG; package sizes ("FL 20ML",
  "10 ML 100 UI/ML") taken as strength;
- "DIETA PER DIABETICI ..." and "Controlli periodici ..." become drug rows.

## Expected Behaviour

Every prescription line of the letter becomes a row with its own name, strength, quantity and
times as written; the insulin basal gets dose 10 units at 08:00; the HUMALOG scale keeps exactly
the document's bands (overlapping 250 boundary left for the operator, row da_verificare); diet and
lab-control lines are not drugs; a drug list that opens a page without a heading is still therapy.
Values are never invented or normalised to a different number.

## Acceptance Criteria

- AC1: the anonymised transcription of the real letter (pages 1-2, one letter) yields exactly the
  20 drugs, no DIETA/CONTROLLI rows.
- AC2: times are extracted for every line that has them (incl. "ORE 8-15-20" → 08:00,15:00,20:00,
  N/ORD, RM, 10/10 MG, 5000U/0,2 ML, 67G/100ML, LANTUS); lines with unplaced numbers stay
  da_verificare.
- AC3: LANTUS → dosaggio "100 UI /ML", quantita "10 UI", orari 08:00; CALCIPARINA → dosaggio
  "5000U/0,2 ML", quantita "1 F"; AUGMENTIN → dosaggio "875 + 125 MG"; HUMALOG → dosaggio
  "100 UI/ML", scale [200-250:4, 250-300:6, 350-450:8] as written, da_verificare.
- AC4: page 2 imported as its own letter (drug list before any heading) still yields its 15 drugs.
- AC5: no regression: full backend parser/intake/import/sections suites green.

## Test Plan

| Test type                 | Required | Reason                                                               |
| ------------------------- | -------: | -------------------------------------------------------------------- |
| Unit                      |      yes | parser + section split fixtures from the real letter (anonymised)    |
| Integration               |      yes | intake + import pages suites on local Postgres                       |
| API                       |       no | no route change                                                      |
| Playwright                |       no | no UI change; rows rendered by the unchanged review component        |
| Persistence after refresh |       no | no persistence change                                                |
| Agnos action registry     |       no |                                                                      |
| Voice simulation          |       no |                                                                      |
| OCR/import test           |      yes | real pipeline (header filter → sections → rows) on the transcription |
| Security/privacy scan     |      yes | fixture must not contain the real patient's identifiers              |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- sanitized logs if backend/AI

## Risks

- The exact OCR text of production is unknown (prod DB not accessible by rule): fixtures model
  Mistral markdown and plain-text shapes of the same letter.
- Relaxing the "everything before ore must be placed" rule could read prose times as a schedule:
  only uppercase abbreviations / numeric tokens are tolerated; lowercase prose still blocks.

## Gate Status

READY FOR IMPLEMENTATION
