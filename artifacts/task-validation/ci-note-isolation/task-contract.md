# Task Contract

## Task
- Title: ci-note-isolation
- Slug: ci-note-isolation
- Type: change
- Date: 2026-10-17

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | yes |

## Current Behaviour

Actual required native CI39028043893 at unchanged operational head87dfe795 failed notes-privacy exact unread count:58 actual vs57 expected. The suite runs concurrently with other global broadcast writers, although its assertions require the whole visible mailbox. Other fixtures have unique operator IDs but broadcasts are intentionally shared. This is test isolation, not a reason to weaken privacy or the count.

## Expected Behaviour

Run the existing notes-privacy suite in the existing serial global-database phase after all concurrent writers complete. Retain its complete assertions and all existing suites, test discovery, exit status and parallelism elsewhere.

## Acceptance Criteria

- AC1: Exactly one source path scripts/run-node-tests.mjs changes, adding only src/routes/__tests__/notes-privacy.test.ts to the existing DATABASE_ISOLATED list with a factual comment. All nine existing isolated entries and the test bodies/count57 remain identical.
- AC2: An actual production-runner child-process fixture reproduces the old concurrent shared-state failure and proves the corrected runner executes the same global-reader fixture after its writer completes; all fixture files are synthetic/private and tests execute, not source-string matching.
- AC3: Fresh independent five-phase QA with safe actual browser screenshot/trace/video validates orchestration, failure propagation, frontend discovery unaffected, nonbackend isolation unaffected and no zero-test false-success. No actual DB/development/remote patient access is needed for this scheduling proof.
- AC4: Root publishes a separate small operational PR, required native full backend and browser checks must pass unchanged, then reruns the same blocked configuration candidate after the main isolation fix. No waived checks, repeated blind CI retries or scope/budget reset. Guard19, clinical and maintenance budgets remain unchanged.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Existing runner behavior and discovery exercised by real child tests |
| Integration | yes | Old RED/new GREEN real process scheduling and exit status |
| API | no | |
| Playwright | yes | Safe internal actual-runner surface, no product route |
| Persistence after refresh | yes | Real results retained across UI reload |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | Source/evidence synthetic and credential-free |

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

One global-count suite moves into the existing serial phase; no tests are skipped or assertions widened. Use sparse fresh isolated worktree to preserve disk. No application, API, database, schema, workflow, release guard or paid model change. Existing config candidate source3 stays frozen; its failed CI receipt is retained.

## Gate Status

READY FOR IMPLEMENTATION
