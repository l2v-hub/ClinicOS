# Maintenance #470 — implementation attempt 2

Independent QA rejected attempt 1. Findings are preserved in `independent-qa/findings.json`: QA470-1 (catalog coverage could omit an ImportJob count while retaining the six baseline tables) and QA470-2 (worst-case polling could exceed the workflow timeout and prevent resource cleanup). The contract and frozen implementation plan are unchanged; the durable root ledger records attempt 1 failed and attempt 2 running. This report is implementation validation, not an independent QA verdict.

## QA470-1 correction

The trusted worker captures `catalogTables`, `catalogTableCount` and `catalogSha256` directly from the actual pg_catalog query, before counting tables. The manifest is SHA-256 over JSON.stringify of the unique table names sorted in deterministic ASCII order. The parent requires a valid canonical manifest and exact equality of the catalog table set with the count table set, with no duplicates, omissions or extras. The six baseline tables remain mandatory; classification is checked independently, unknown tables block the empty-data claim, and all patient/mixed counts must be zero.

New tests reproduce removal of a nonempty ImportJob count while preserving the original catalog header and falsely claiming empty: rejected. Tests also cover malformed count/hash, duplicate/noncanonical catalog, extra counts, unknown tables with a fully consistent manifest, misclassification, and recomputed empty status. Real PostgreSQL runtime tests pass actual worker output through the parent parser and then reject an omitted ImportJob count.

The manifest is a consistency check within trusted, reviewed worker output. It is not an independent cryptographic oracle for database truth if an attacker rewrites all fields or replaces the worker. Exact-source review and the target-bound private worker remain necessary.

## QA470-2 correction

A monotonic clock bounds the complete operational phase to eight minutes, including binding verification, service creation, deployment and polling. Each operational API/CLI timeout is capped by the remaining budget; log retrieval is capped at five seconds. Cleanup receives a separate ninety-second budget and targets only the verified newly created service. Its ID/environment are emitted as safe recovery metadata immediately after ownership is verified.

The three preparatory steps of the new demo-only job each have a one-minute timeout. Thus setup <= 3 minutes + operation <= 8 minutes + cleanup <= 90 seconds = 12.5 minutes, leaving 2.5 minutes within the existing fifteen-minute job. Existing maintenance/production jobs are unchanged.

Clock-injected tests exercise repeated slow and failed log retrieval, remaining-time-capped API calls and deployment overrun. They reach the actual deadline and verify that finally deletes the exact owned demo service with an independent cleanup budget. The tests simulate no real network mutations or sleeps.

## Validation

- Unit: 17 PASS, 0 FAIL, 0 SKIP (`attempt-2-unit-results.txt`).
- Real disposable PostgreSQL16: 1 PASS, 0 FAIL, 0 SKIP (`attempt-2-runtime-results.txt`), including actual SQL readiness and READ ONLY rejection SQLSTATE25006. Own container `clinicos-qa-maint470-runtime`, loopback55471, removed in finally; independent QA's stack is not reused.
- Contract validator: PASS. Source syntax and git diff whitespace checks: PASS.
- No commit, push, new-code Actions dispatch, live SQL inventory or deletion was performed.
- Independent QA rerun is pending. Issue #470 remains open; orphan/backup completion is not claimed.
