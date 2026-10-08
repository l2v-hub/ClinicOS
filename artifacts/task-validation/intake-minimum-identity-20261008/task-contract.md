# Task Contract

## Task
- Title: intake-minimum-identity-20261008
- Slug: intake-minimum-identity-20261008
- Type: fix
- Date: 2026-10-08

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

Only names required; demographic and empty therapy confirmation block creation.

## Expected Behaviour

Four fields required: name, surname, fiscal code and birth date. Other missing data can be completed later. Prescription safety controls retained. No publish authorization for this new task.

## Acceptance Criteria

- AC1: Four identity fields required with valid fiscal code and non-future date.
- AC2: Optional contacts, sex, birth place, clinical sections and modules do not block; no separate identity or empty-therapy acceptance gate.
- AC3: UI fields, section status and summary coherent; draft reload and confirmation tested with synthetic data.
- AC4: Actual therapy review, invalid supplied values and pending import decisions retain existing gates.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Validator, progress and summary |
| Integration | yes | Existing backend guards compatibility |
| API | no | |
| Playwright | yes | Four required fields and optional sections |
| Persistence after refresh | yes | Synthetic mocked draft API, explicitly disclosed |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | No PHI, secrets, auth or prescription safety weakening |

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

Frontend/UI and privacy impacted. No schema, auth, dependency or deployment changes. Root sole writer; independent QA required. Unit, build, Playwright, reload and security checks required. Mocked API persistence evidence disclosed. Baseline 54d65b24304be50b191ffcec874f2e25a8b43bf8. Preserve dirty primary checkout and all optional data.

## Gate Status

READY FOR IMPLEMENTATION
