# Independent QA — preliminary candidate 1

**Verdict: FAILED VALIDATION**

This is a preliminary source gate requested by root before the implementation author freezes the complete candidate. No application build, full test suite, database integration or Playwright session was executed by this QA. Historical author results are not certified by this report.

Baseline: `a516d42e31f6674c39c1d130c9706cd80a7ab4c6`. Issues: #432, #441, #442, #460, #463, #464, #467.

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS — seven issue bodies and all comments read directly; frozen criteria match | `task-contract.md` |
| 1 Diff review | FAIL — finding QA432-1 below; all 37 planned source files inspected, 35 changed, no outside source paths | `preliminary-source-observation.json`, `frozen-packet-check.json` |
| 2 Build and tests | NOT EXECUTED — root stopped before spending full validation on the known defect | No application test results claimed |
| 3 Playwright | NOT EXECUTED — stable candidate was not authorized | No browser evidence claimed |
| 4 Security | Static inspection complete without an additional certain finding; runtime validation NOT EXECUTED | Notes below |

## QA432-1 — barrier entry can bypass cleanup

Location: `backend/src/skills/__tests__/skills-e2e.test.ts:579` (entry wait); cleanup begins at 581 and 602.

The test awaits `reachedInterpreter` before entering the `try/finally`. If correction completes without reaching the injected interpreter, or fails before that point, the barrier Promise remains pending and the cleanup `release(); await correction` is never reached. The outer `node:test` timeout reports a cancelled test but does not unwind that asynchronous function. This fails AC442.2 and the issue's explicit requirement to clean up the barrier even when the test fails.

The separate new browser harness already uses a bounded entry race inside its protected block; the full-suite regression needs the same guarantee. Correction must not continue as an unhandled rejected Promise while waiting for entry. Preserve all existing completion, late-correction, replay and single-write assertions.

A minimal independent reproduction uses synthetic dependencies only, verifies the inspected source's exact control-flow pattern, and makes the correction return before the interpreter. Command:

`node --test artifacts/task-validation/bug-batch-432/independent-qa/barrier-cleanup-reproducer.mjs`

Actual exit: **1**; tests **1**, pass **0**, fail **0**, cancelled **1**, skipped **0**. The test timed out after 20 ms, and the measured `cleanupCalled` remained `false` after 50 ms. This proves the control-flow defect; it is not the application suite or a clinical/DB reproduction. See `barrier-cleanup-reproducer.txt`. An initial QA helper relative-path typo is preserved separately in `barrier-cleanup-reproducer-path-error.txt`; it was corrected before the diagnostic run.

## Remaining review observations

- Complete source audit includes atomic serializable receipts and first-result replay, current patient access on replay, bounded request parsing and schedule selection, one-off read/write/summary/assistant identity, Europe/Rome clock, client session race handling and hashed retry storage, strict catalog-empty detection, clinical pagination fail-closed behavior, receipt schema/migration, and all E2E harness changes.
- No second certain correctness finding was established during static review. This does not certify runtime behavior.
- No dependency or lockfile change, public AIFA capacity change, production target/configuration weakening, authentication bypass, direct clinical inference, real patient fixture or embedded external credential was found in the reviewed diff. SQL additions use Prisma parameterization; migration DDL is explicitly required by #460.
- Test targets are restricted to owned synthetic loopback infrastructure; existing dev PostgreSQL was not touched. Global browser/Docker lock was not acquired because no stack was started.
- All four original frozen packet hashes matched at this observation. The author was still preparing evidence code; the source hashes are observations, explicitly not final immutable-candidate certification.
- Root must preserve this failed candidate 1 record and reserve the next implementation/validation attempt before source correction. A new dedicated independent QA must review the corrected stable candidate and run all remaining mandatory phases, including both full suites, builds/types, the canonical full-stack command, seven issue-specific result screenshots, traces/videos, privacy checks and exact before/after source hashes.

No GitHub mutation, commit, push, issue closure, model call, Claude invocation or live database operation was performed by this QA.
