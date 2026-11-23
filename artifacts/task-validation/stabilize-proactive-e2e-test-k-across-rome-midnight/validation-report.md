# Task Validation Report

## Task

- Title: Stabilize proactive e2e test K across Rome midnight
- Slug: stabilize-proactive-e2e-test-k-across-rome-midnight
- Commit: see branch `claude/admiring-lamport-69fjbd` (commit that adds this report)
- Date: 2026-11-23

## Implementation Summary

Test K inserted its "new event" reading with the wall-clock `createdAt`, while the vital signal it
re-checks is keyed on the Rome day of `createdAt` (`vitals:${resident}:${day}` in `engine.ts`). Near Rome
midnight the new reading fell into the next day's signal and the acknowledged signal's `rev` stayed the
same (CI run 44415389020).

Fix (test only): the `reading()` helper takes an optional `createdAt`; test K stamps the new reading with
the second encoded in the acknowledged signal's `rev` (`floor(latest occurredAt / 1000)`), which is always
inside that signal's Rome day (Rome offsets are whole hours). `rev` also carries the event count, so one
more event changes it deterministically; the 1100 ms sleep is removed. `engine.ts` unchanged.

## Files Changed

- `backend/src/proactive/__tests__/proactive-e2e.test.ts` (helper `reading()` + test K)
- `artifacts/task-validation/stabilize-proactive-e2e-test-k-across-rome-midnight/**` (contract, report, evidence)

## Acceptance Criteria Result

| AC                                                                                        | Result | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 — K passes with the clock faked just before Rome midnight, where it previously failed |   PASS | OLD code, clock start 22:59:56.9 / 57.3 / 57.7Z (2026-11-18, winter): K fails 3/3 with `Expected "actual" to be strictly unequal to` (`test-results/old-*.spec.log`). NEW code: K passes at 22:59:56.9 / 57.3 / 57.56 / 57.60 / 57.64 / 57.68 / 57.7 / 58.5Z and 10:00Z control (`test-results/new-*`, `straddle-*`); in `straddle-57.56` and `straddle-57.60` J ends before 23:00:00Z and K after it (the CI failure shape). |
| AC2 — K and the whole file pass at the real time                                          |   PASS | `test-results/real-new.log`: 24/24 pass                                                                                                                                                                                                                                                                                                                                                                                       |
| AC3 — no production change                                                                |   PASS | `git diff --stat`: only the test file changed under `backend/`                                                                                                                                                                                                                                                                                                                                                                |
| AC4 — rest of backend tests pass                                                          |   PASS | `npm --prefix backend test` exit 0: 2005 tests, 1999 pass, 0 fail, 6 skipped; isolated global-DB pass 51/51 (`test-results/backend-full.log`)                                                                                                                                                                                                                                                                                 |

## Test Results

| Test             | Result | Evidence                                                              |
| ---------------- | -----: | --------------------------------------------------------------------- |
| Unit             |   PASS | `test-results/backend-full.log`                                       |
| Integration      |   PASS | proactive-e2e real clock + faked pre-midnight clock (`test-results/`) |
| API              |     NA | no API change                                                         |
| Playwright       |     NA | no UI                                                                 |
| Persistence      |     NA | no data model change                                                  |
| Agnos AI         |     NA |                                                                       |
| Voice            |     NA |                                                                       |
| OCR              |     NA |                                                                       |
| Security/privacy |     NA | test-only change                                                      |

Static checks on the test file: `tsc --noEmit` (backend) clean, ESLint clean, Prettier clean.

## Runtime Evidence

Reproduction harness in `logs/`: `fake-clock.mjs` (preload that moves the JS `Date` origin to
`FAKE_START_ISO`, time flows at real speed), `stamp-reporter.mjs` (prints the faked clock at the end of
tests J and K), `run-at.sh` (runs the file with `--experimental-test-isolation=none` so the reporter shares
the faked clock). Local Postgres 16 `clinicos_test`, migrations applied, `NODE_ENV=test AUTH_MODE=demo AI_PROVIDER=mock`.

## Logs

Test-runner output only (synthetic fixtures, no PHI, no secrets).

## Residual Risks

- Under the faked clock, D and E fail at every start time, including 10:00Z. That's an artifact of the
  shim: the watermark comes from the real clock (D: actual `2026-11-23T19:59:53Z`). They pass at the real
  time.
- Sibling day-boundary flakes in the same file, **not fixed here** (out of scope):
  - **U** (line ~819): `denied:<Rome day>` failed once with a pre-midnight start (`new-22-59-56.900.spec.log`).
  - **J** (line ~494): its burst can straddle midnight and split into two signals
    (`new-22-59-57.700.spec.log`).
    Both are the same pattern as K and can be stabilised the same way.

## Final Decision

CLOSED — VERIFIED
