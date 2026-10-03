# Task Contract

## Task

- Title: Phase 10 E2E bug hunt UX fix loop
- Slug: phase-10-e2e-bug-hunt-ux-fix-loop
- Type: change
- Date: 2026-10-02

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |      yes |
| Database/Persistence |      yes |
| Agnos AI / Chatbot   |      yes |
| Voice                |       no |
| OCR / Import         |      yes |
| Auth / Permissions   |      yes |
| Privacy / Security   |      yes |
| Config / Env         |       no |

## Current Behaviour

Owner-reported (prod, Nuovo ingresso, synthetic patient GENNAI STEFANIA):

- "Bozza non salvata: errore di salvataggio, riprova" during intake;
- "La terapia rinviata non può essere prescritta" blocks "Crea paziente";
- Allergie section says "Gestisci dal tab Diagnosi" (navigation inconsistency);
- intake therapy check without the intake photo to compare;
- intake prescriber must be typed (owner wants one-click "Dimissione ospedaliera");
- intake "Parametri iniziali" still has IPM / IP pomeriggio signature fields, lacks DTX 20.
  Prompt 10 known bugs: therapy calendar slots not clickable, administration not obvious, red generic
  therapy form errors, diary states beyond NORMAL/URGENT, manual dates, patient import generic error.

## Expected Behaviour

Per Prompt 10 §2–§14 (deep navigation keeps patient + section, slots interactive, administration
reachable, field-level validation, NORMAL/URGENT, per-user acknowledgement, automatic timestamps,
import errors name field/row) and the owner's intake requests above.

## Acceptance Criteria

- AC1: AT-01..AT-15 of Prompt 10 PASS or documented as real blocker.
- AC2: owner-reported intake bugs reproduced, root-caused, fixed with regression tests.
- AC3: no new S0/S1/S2 after the last discovery pass; authorization/scope/audit/safety unchanged.
- AC4: backend/frontend/runtime regression shows 0 new failures vs base; frontend build passes.

## Test Plan

| Test type                 | Required | Reason                                 |
| ------------------------- | -------: | -------------------------------------- |
| Unit                      |      yes | domain/validation fixes                |
| Integration               |      yes | intake/therapy/diary services          |
| API                       |      yes | backend validation & error propagation |
| Playwright                |      yes | UI journeys per role                   |
| Persistence after refresh |      yes | intake draft, diary ack                |
| Agnos action registry     |      yes | AI deep links                          |
| Voice simulation          |       no | not touched                            |
| OCR/import test           |      yes | patient import errors                  |
| Security/privacy scan     |      yes | role isolation                         |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

Clinical semantics (therapy deferral, prescriber default, intake vitals fields) — only change what the
owner stated; ask for genuinely new features (tablet signature). Validation runs on the local
disposable Postgres only, never on the production DB.

## Gate Status

READY FOR IMPLEMENTATION
