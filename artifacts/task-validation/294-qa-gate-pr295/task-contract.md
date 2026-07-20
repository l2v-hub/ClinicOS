# Task Contract — QA Gate PR #295 (issue #294)

## Task

- Title: QA Gate — codice fiscale chiave univoca paziente (PR #295, head 56435f9)
- Slug: 294-qa-gate-pr295
- Type: independent QA gate (no production code changes)
- Date: 2026-07-20
- Issue: #294 · PR: #295 (`feat/cf-chiave-univoca-paziente`)

## Acceptance criteria under audit (from issue #294)

- AC1: `Patient.codiceFiscale` column, UNIQUE at DB level, nullable for legacy patients.
- AC2: All creation paths (POST /patients, intake draft confirm, import confirm) reject missing/invalid CF with 400 (structure + control char, omocodia accepted) and duplicate CF with 409.
- AC3: New-patient form and intake StepAnagrafica: CF mandatory — typed with live validation OR computed via button from anagrafica data (`codice-fiscale-js`, PO-approved).
- AC4: Confirm dedup uses CF as primary comparison key (CF match = non-forcible duplicate), fallback name+date-of-birth.
- AC5: CF persisted on the Patient column (in addition to cartella JSON) and survives reload.
- AC6: Additive migration with prudent backfill from existing cartella data (only well-formed, non-duplicated CFs).

## QA phases

| Phase | Content |
| ----- | ------- |
| 0 | Contract extraction (this file) |
| 1 | Deep diff review (CF algorithm, routes, confirm-service, frontend, migration, e2e specs) |
| 2 | Independent build + tests (backend suite, new unit file, frontend tsc+build) |
| 3 | Playwright evidence (issue-294 spec + issue-282 regression, serialized, single worker) |
| 4 | Security checklist (synthetic CFs only, no CF in logs, no typosquat dep, bounded input) |
| 5 | Verdict: QA PASSED / BLOCKED / FAILED VALIDATION |

## Constraints

- QA session is independent: reviews, builds, tests — never modifies production code.
- Evidence path: `artifacts/task-validation/294-qa-gate-pr295/` (main repo).
- No merge, no close, no GitHub comments, no deploy.
