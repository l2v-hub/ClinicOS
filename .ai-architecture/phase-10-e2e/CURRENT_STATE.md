# Phase 10 — Current state (E2E bug hunt, UX repair, fix loop)

- **Status:** CONDITIONALLY READY (see `RELEASE_GATE.md` §9 for owner decisions).
- **Branch:** `feat/phase10-bughunt` (worktree `ClinicOSHouse-worktrees/phase10-bughunt`), on top of
  `feat/phase9-hardening` @ 12da5c98 (PR #398, not merged). Not deployed.
- **Date:** 2026-10-03.

## Numbers

| Metric              | Value                                                      |
| ------------------- | ---------------------------------------------------------- |
| Findings            | 44 (S0 0 · S1 3 · S2 19 · S3 18 · S4 4)                    |
| Fixed               | 38                                                         |
| Open                | 6 (S3 5 · S4 1), none blocking                             |
| Browser checks      | 34/34 (acceptance 27 + intake 7)                           |
| Backend regression  | 1722 tests, 0 new failures, 6 base failures fixed          |
| Frontend tests      | 1034, 0 new failures (9 baseline)                          |
| Independent QA gate | rounds 1–2 FAILED VALIDATION (fixed); round 3 READY FOR QA |

## Where things are

`BUG_CATALOG.json` (all findings) · `UX_FINDINGS.md` · `FUNCTIONAL_BASELINE.md` · `E2E_TEST_MATRIX.json`
· `FIX_LOG.md` · `REGRESSION_REPORT.md` · `MANUAL_ACCEPTANCE_CHECKLIST.md` · `RELEASE_GATE.md`.
Evidence: `artifacts/task-validation/phase-10-e2e-bug-hunt-ux-fix-loop/` (screenshots, traces, results,
logs) and `artifacts/task-validation/phase-10-qa-gate/`.

## How to rerun

```bash
# local synthetic DB only (scripts refuse a non-local DATABASE_URL)
DATABASE_URL=<local> npx tsx scripts/assistant/seed-assistant-demo.mts
DATABASE_URL=<local> npx tsx scripts/e2e/seed-phase10-demo.mts
# backend :3099 AUTH_MODE=demo ROLE_SIMULATOR_ENABLED=true FRONTEND_URL=http://127.0.0.1:5199
# vite :5199 VITE_API_URL=http://127.0.0.1:3099
DATABASE_URL=<local> node scripts/e2e/phase10-acceptance.mjs <out>
DATABASE_URL=<local> node scripts/e2e/phase10-intake-deferred.mjs <out>
```
