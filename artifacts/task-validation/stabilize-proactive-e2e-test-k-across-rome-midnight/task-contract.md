# Task Contract

## Task
- Title: Stabilize proactive e2e test K across Rome midnight
- Slug: stabilize-proactive-e2e-test-k-across-rome-midnight
- Type: bugfix
- Date: 2026-11-23

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | yes (test file only: `backend/src/proactive/__tests__/proactive-e2e.test.ts`; no production code) |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

Test K (`proactive-e2e.test.ts`) inserts a second vital reading ~1100 ms after the first and expects the
SAME signal (`vitals:${resident}:${RomeDay(createdAt)}`) to get a new `rev`. The reading's `createdAt` is the
wall clock, so when the first reading lands at 23:59:58–59 Europe/Rome the new reading falls into the next
day's signal and `notStrictEqual(reopened.rev, vit.rev)` fails (CI run 44415389020, 2026-11-18 22:59:58Z).

## Expected Behaviour

Test K is independent of the wall clock: the new reading is stamped with an explicit `createdAt` inside the
acknowledged signal's Rome day (the second encoded in `vit.rev`), so it always joins the same signal and
bumps its revision through the event count. `engine.ts` / production behaviour unchanged.

## Acceptance Criteria

- AC1: Test K passes with the process clock faked to just before Rome midnight (22:59:58.5Z, winter), where it previously failed.
- AC2: Test K and the whole `proactive-e2e.test.ts` file pass at the real current time.
- AC3: No production file changes (`git diff --stat` touches only the test file + artifacts).
- AC4: The rest of the backend test suite still passes (`npm test` in `backend`), apart from failures proven pre-existing/unrelated.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | backend node:test suite (`npm test`) |
| Integration | yes | proactive-e2e (real Express app + Postgres), with and without a faked pre-midnight clock |
| API | no | |
| Playwright | no | |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

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

- Backdating the new reading by <1 s could look like an "old" event: mitigated because rev includes the event count, so a new event always changes rev; documented in a test comment.
- Faking the clock for the whole process could break other tests in the file (JWT/session expiry, windows): the reproduction run reports test K's result specifically.

## Gate Status

READY FOR IMPLEMENTATION
