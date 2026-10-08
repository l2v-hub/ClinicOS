# Task Contract

## Task
- Title: Insulin online integration 20261008
- Slug: insulin-online-integration-20261008
- Type: feature
- Date: 2026-10-08

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes |
| Database/Persistence | yes |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | yes |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | yes |

## Current Behaviour

Commit 44bc99c5 implements variable insulin dosing on an older branch; current production main 13f0aacd includes newer intake, therapy and UX changes. Direct deployment would regress them.

## Expected Behaviour

Integrate the requested variable-dose and discharge comparison functionality onto current main, preserve existing clinical validation, verify safety and publish only the validated immutable release. User explicitly authorized integration, conflict resolution, tests and online deployment.

## Acceptance Criteria

- AC1: Scheduled glucose-scale therapy does not require a fabricated fixed quantity; administration requires a numeric measured glucose and resolves the dose on the server from a validated saved protocol. Missing/out-of-band readings block administration.
- AC2: The intake form and summary support a glucose scale and show discharge-source text beside editable therapies; incomplete extraction remains visible and must be reviewed.
- AC3: Existing current-main functionality and authorization safeguards remain intact; build, focused tests and independent QA pass before release.
- AC4: Backend deployment applies the additive database migration successfully; frontend production alias serves the validated release and backend health responds.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Dose protocol, import mapping and validation regression tests |
| Integration | yes | Server-authoritative therapy writes and migration checks where local DB is available |
| API | yes | Backend deployed health and deployment identity, no patient writes in production smoke |
| Playwright | yes | Synthetic UI rendering and form behavior, no real PHI fixtures |
| Persistence after refresh | yes | Local synthetic therapy tests; production smoke is read-only |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | yes | Preserve current parser behavior while adding glucose scale |
| Security/privacy scan | yes | Check secrets, authorization, dose validation, sanitized logs |

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

19 conflicting files require semantic integration. Never substitute old files wholesale. Use isolated worktrees for independent scopes; parent integrates only reviewed commits. Never expose tokens, log clinical data, run seeds/reset against production, weaken authentication or invent prescription bands. Backend migration is additive; deploy backend before frontend. All claims bind to exact release commit.

## Gate Status

READY FOR IMPLEMENTATION
