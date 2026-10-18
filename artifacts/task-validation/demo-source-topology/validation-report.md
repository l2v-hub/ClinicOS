# Task Validation Report

## Task
- Title: demo-source-topology
- Slug: demo-source-topology
- Commit:
- Date: 2026-10-17

## Implementation Summary

Candidate 3/4 adds an inspect-only topology helper and a separate trusted-main workflow. Existing project token and all old source/release guards are preserved. No serviceConnect/create/trigger update/deploy operation is exposed. Project-wide visibility remains explicitly unproven; no singleton result can authorize a service-wide operation.

## Files Changed

Three new source files: `scripts/automation/inspect-demo-source-topology.mjs`, its `.test.mjs`, and `.github/workflows/inspect-demo-source-topology.yml`. Four pre-implementation contract/analysis/plan/reference documents and source/legacy manifests accompany them. Source manifest binds exact candidate bytes; legacy preservation receipt verifies 22 old operator/release guard sources against baseline299ba8ff8d048631cdb969f26656d02de981da83.

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 | PASS (author) | Exact-main context and workflow credential/concurrency checks; old fixed-target validator unchanged |
| AC2 | PASS (author) | Paginated ownership, duplicate/cursor/page limits, drift and real HTTP fixture tests |
| AC3 | PASS (author) | Singleton/additional/fork/inaccessible fixtures all disallow connect, immutable branded receipt |
| AC4 | PASS (author) | No mutation implemented, 22 legacy sources byte-identical to baseline |
| AC5 | PASS (independent) | Fresh QA report b373389571e8908bbe115a36c5702403a9a5a52c9b14b6a5b177552a8f8df7ce: 127 regressions, two typechecks, production build, nine actual browser/local HTTP scenarios, media/privacy verification |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | PASS (author) | 20 new tests plus 107 inherited operator tests executed, zero skips/failures |
| Integration | PASS (author) | Actual two-snapshot synthetic clients and stale context/inventory failures |
| API | PASS (author synthetic HTTP) | Real local HTTP fixtures through production createClient; no live provider |
| Playwright | PASS (independent) | Nine scenarios, 53 actual loopback HTTP requests, zero unexpected console/page/HTTP errors; exact metadata and safe rejections asserted |
| Persistence | NA | |
| Agnos AI | NA | |
| Voice | NA | |
| OCR | NA | |
| Security/privacy | PASS (author and independent) | Forbidden token echo, forged receipt, arbitrary provider fields/errors, no-write/workflow scope, actual media decode and trace-member scans |

## Runtime Evidence

`logs/author-operational-tests.txt` records the actual combined127PASS run. `logs/legacy-tests.txt` records an earlier107PASS legacy-only run. Syntax check and contract validation passed. No real Railway/GitHub request, credential-bearing process, hosted schema validation, source configuration, clinical test, native CI or deployment occurred in the author session. The subsequent independent QA executed its own127-test run, production build/typechecks and actual browser/local HTTP scenarios; its original report,34 evidence files and immutable seal remain in `independent-qa/`.

## Logs

Only sanitized logs are allowed.

## Residual Risks

Hosted schema availability is not yet known. A project token may not authorize project topology metadata; a fixed phase-specific error will identify the failed read without reflecting provider messages or inferring its cause. Completed pagination does not prove absence of authorization-filtered resources. Repeated reads are non-atomic. This change cannot fix or claim to fix the missing main trigger by itself.

Implementation source and contract bytes are frozen in `source-manifest.json`; the author stopped before fresh QA, which completed without source changes. No commit/push/merge/state write was performed by either author or QA. Existing implementation/review budgets are not reset.

## Final Decision

CLOSED — VERIFIED

This decision covers only the local inspect-only implementation, independently reviewed and verified without source changes after its freeze. The independent report and final seal are retained under `independent-qa/`; root verified their hashes and the seven frozen source/contract entries before publication. Native GitHub checks, the hosted Railway schema and actual metadata inspection remain separate subsequent checks. No source repair, service connection, clinical feature release, Claude Max review or issue resolution is claimed by this local decision.
