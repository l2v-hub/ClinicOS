# Task Validation Report

## Task
- Title: #389 Pazienti presenti non consultabili dai profili autorizzati
- Slug: 389-facility-resident-scope
- Commit: branch fix/389-facility-resident-scope (7acb9e5d)
- Date: 2026-10-03

## Implementation Summary

Resident Access Scope default `facility` for every clinical identity (reads and writes); admin/manager
keep `all`. Patient-reach call sites use `hasFacilityPatientScope`; management privileges
(`hasGlobalPatientScope`: roster default, handover author/assignee visibility, AI global context) unchanged.
AI assistant context (Agnos, /ai/actions, Tool Layer assistant.query) uses the same rule for the clamped
non-privileged role, explicit id list (cap 2000). `registered_by_me` selectable via `RESIDENT_SCOPE_CONFIG`
(rollback); scope-enforcement suites pin it.

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 same residents for Supervisor/Doctor/Nurse/OSS (list/search/detail) | PASS | facility-scope-389.test.ts; QA browser 11/11 |
| AC2 writes follow role; RBAC unchanged; missing → 404 | PASS | facility-scope-389.test.ts; QA API probes |
| AC3 enforcement plumbing still tested; 0 new regression failures | PASS | full serial 1729 tests, 0 new (1 timing flake re-run 3/3) |
| AC4 management privileges not widened; AI channel same rule | PASS | QA round 2 code review + AI probes |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | PASS | resident-access-scope.test.ts |
| Integration | PASS | facility-scope-389.test.ts (5), full regression |
| API | PASS | qa/ai-probe-r2.json, ai-oss-probe-r2.json |
| Playwright | PASS | qa/results.json 11/11, screens/ |
| Agnos AI | PASS | qa/agnos-ui-r2.json |
| Security/privacy | PASS | QA gate (header role clamp, RBAC, 404) |

## Residual Risks

Handover visibility stays author/assignee-only for clinical profiles (unchanged rule). With
`AUTHZ_ENFORCEMENT=off` no resident filter applies (rollback = RESIDENT_SCOPE_CONFIG). Follow-up: unpinned
profile × registrant matrix test over pagination/overview/slots.

## Final Decision

IMPLEMENTED — NOT VERIFIED
