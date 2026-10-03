# Phase 10 — Regression report

All runs on the LOCAL synthetic stack (embedded Postgres 127.0.0.1:54339, fresh UTF8 databases);
never on the production database. Base for comparison: `feat/phase9-hardening` @ 12da5c98.

| Suite                                                                        | Result                                                               | Base                                                           | New failures                     | Evidence                                                                     |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------- |
| Backend full serial (`--test-concurrency=1`, 216 files, fresh DB `p10reg`)   | 1722 tests · 1706 pass · 15 fail                                     | 21 known failures                                              | **0** (6 base failures now pass) | `artifacts/task-validation/phase-10-e2e-bug-hunt-ux-fix-loop/logs/backend-*` |
| Backend touched suites rerun after the last backend edits (fresh DB `p10re`) | 424 · 422 pass · 2 fail                                              | both in the base list (diary spoofed authorship, diary keyset) | 0                                | same                                                                         |
| Proactive E2E incl. AT-08 per-user ack (fresh DB `p10pro`)                   | 23/23                                                                | —                                                              | 0                                | `backend/src/proactive/__tests__/proactive-e2e.test.ts`                      |
| Frontend `npm test`                                                          | 1034 · 1025 pass · 9 fail                                            | same 9 names                                                   | **0**                            | `logs/frontend-*`                                                            |
| Frontend `tsc --noEmit` + `npm run build`                                    | exit 0 / exit 0                                                      | —                                                              | —                                | —                                                                            |
| Backend `tsc --noEmit`                                                       | exit 0                                                               | —                                                              | —                                | —                                                                            |
| Browser acceptance `phase10-acceptance.mjs` (fresh DB per run)               | 27/27 (incl. cold first-tap AT-01 ×2, no 403/5xx, no console errors) | —                                                              | —                                | `test-results/acceptance-results.json`, `screenshots/`, `trace/`             |
| Browser intake `phase10-intake-deferred.mjs`                                 | 7/7                                                                  | —                                                              | —                                | `test-results/results-intake.json`                                           |

Base failures fixed by this phase: `createTherapyInTx: rejects when farmacoNome is missing` (operator
message) and five `confirm-therapy-validation` tests (stale stubs updated).

Classic GUI: every journey above runs through the classic screens with the deterministic Skills
interpreter and the AI runtime OFF — the GUI works without AI.

## Cluster retests (Prompt 10 §21)

After each cluster: targeted unit/API suite → acceptance run on a fresh DB → second role.
Intake (nurse + doctor), therapy (nurse administers, doctor prescribes), diary (nurse; edit path by
QA), navigation (nurse, doctor, OSS, supervisor, admin), import (API, valid + invalid).

## Independent QA gate

First pass: FAILED VALIDATION (F1 Consegne part not scrolled into view, F2 background reads denied
to OSS/Admin, F3 weak assertions, F4 conditional AT-08 assert, F5 hygiene). All five addressed; round 3
verdict READY FOR QA, recorded in `artifacts/task-validation/phase-10-qa-gate/validation-report.md`.
