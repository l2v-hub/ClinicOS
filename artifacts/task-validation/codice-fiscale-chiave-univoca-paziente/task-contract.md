# Task Contract

## Task

- Title: Codice fiscale chiave univoca paziente
- Slug: codice-fiscale-chiave-univoca-paziente
- Type: feature
- Date: 2026-07-20
- Issue: #294

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |      yes |
| Database/Persistence |      yes |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |      yes |
| Auth / Permissions   |       no |
| Privacy / Security   |      yes |
| Config / Env         |       no |

Backend/schema changes explicitly requested by the PO (CF as unique patient key).

## Current Behaviour

- `Patient` has no `codiceFiscale` column; CF lives only in the cartella/draft JSON.
- `POST /patients` ignores CF entirely; NewPatientModal collects `codiceFiscale`/`comune` but never sends CF.
- Intake/import confirm (`confirm-service.ts`) deduplicates by name+date-of-birth only; CF is copied into cartella JSON unvalidated.
- No CF validation (structure/checksum) anywhere; no uniqueness guarantee.

## Expected Behaviour

- `Patient.codiceFiscale String? @unique` (nullable for legacy rows; Postgres unique index allows multiple NULLs). Additive migration with prudent backfill from cartella JSON (only well-formed, non-duplicated CFs).
- All three creation paths (POST /patients, intake draft confirm, import confirm) REQUIRE a structurally valid CF (checksum verified, omocodia accepted): 400 if missing/invalid, 409 if already present. CF normalized (trim/uppercase) and persisted on the column (and still in cartella JSON as today).
- NewPatientModal and StepAnagrafica: CF mandatory — typed with live validation, or computed via a "Calcola" button from cognome/nome/sesso/data/comune using `codice-fiscale-js` (PO-approved dependency, frontend only; backend uses its own dependency-free checksum validator).
- Confirm dedup: CF exact match → hard duplicate (not overridable by confirmDuplicate); name+dob fallback keeps current behavior.

## Acceptance Criteria

- AC1: DB column `codiceFiscale` unique on Patient; additive migration + safe backfill.
- AC2: POST /patients rejects missing/invalid CF (400) and duplicate CF (409); valid CF persisted normalized.
- AC3: Intake draft confirm and import confirm enforce the same validation; CF-match duplicate is not forcible.
- AC4: NewPatientModal + StepAnagrafica: live CF validation and working "Calcola" from anagrafica data; submit blocked with invalid CF; 409 surfaced to the operator.
- AC5: CF persists after reload (column returned by GET /patients; PatientDetail shows it).
- AC6: Backend unit tests for validator + route behavior (registered in backend test list); full backend suite green; frontend tsc+build green; Playwright evidence for the UI flows.

## Test Plan

| Test type                 | Required | Reason                                                                                           |
| ------------------------- | -------: | ------------------------------------------------------------------------------------------------ |
| Unit                      |      yes | CF validator (valid/omocodia/bad checksum/format) + confirm dedup logic                          |
| Integration               |       no | covered by route-level unit tests with test DB                                                   |
| API                       |      yes | POST /patients 201/400/409 behavior                                                              |
| Playwright                |      yes | UI create with computed CF, invalid CF blocked, duplicate 409 surfaced, persistence after reload |
| Persistence after refresh |      yes | CF visible after reload                                                                          |
| Agnos action registry     |       no | not touched                                                                                      |
| Voice simulation          |       no | not touched                                                                                      |
| OCR/import test           |      yes | import/draft confirm path validation (unit-level)                                                |
| Security/privacy scan     |      yes | CF is personal data: synthetic fixtures only, no CF in logs                                      |

## Evidence Plan

- validation-report.md with executed commands and outputs
- backend + frontend build/test logs
- Playwright screenshot/trace/report for the UI flows (synthetic CFs only)

## Risks

- Unique constraint vs legacy/seed data → column nullable; backfill only unambiguous CFs.
- Omocodia handling → validator decodes substitution letters before checksum.
- Comune not found in library catalog → compute fails gracefully, operator can still type CF.
- Existing e2e/qa specs that create patients without CF will need updating (they drive the UI which now requires CF).

## Gate Status

READY FOR IMPLEMENTATION
