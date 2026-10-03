# Task Contract

## Task

- Title: #389 Pazienti presenti non consultabili dai profili autorizzati
- Slug: 389-facility-resident-scope
- Type: change
- Date: 2026-10-03

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |       no |
| Backend/API          |      yes |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |      yes |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |      yes |
| Privacy / Security   |      yes |
| Config / Env         |      yes |

## Current Behaviour

Resident Access Scope default = `registered_by_me` for every non-manager identity: a nurse sees only
residents she registered (1 of 25 in the demo), across list, detail, overview, tools and AI.

## Expected Behaviour

Owner decision 2026-10-03: every clinical identity reaches every resident of the (single) facility,
for reads AND writes; WHAT it may do stays decided by the capability policy. Registrant kept for audit.
Management privileges (roster default, handover author/assignee visibility, AI global context) are
NOT widened. `registered_by_me` stays selectable via `RESIDENT_SCOPE_CONFIG`.

## Acceptance Criteria

- AC1: Supervisor, Doctor, Nurse, OSS see the same residents created by different operators (list/search/detail).
- AC2: writes follow the role (nurse records vitals on a doctor-registered resident); RBAC unchanged (nurse cannot prescribe, OSS cannot read therapy); missing resident 404.
- AC3: scope-enforcement plumbing still tested in restricted mode; 0 new regression failures.
- AC4: management privileges not widened.

## Test Plan

| Test type                 | Required | Reason                           |
| ------------------------- | -------: | -------------------------------- |
| Unit                      |      yes | scope rule                       |
| Integration               |      yes | HTTP + DB cross-profile          |
| API                       |      yes | list/search/detail/write/RBAC    |
| Playwright                |      yes | profile switch roster in browser |
| Persistence after refresh |       no | read rule                        |
| Agnos action registry     |      yes | tool layer shares the predicate  |
| Voice simulation          |       no |                                  |
| OCR/import test           |       no |                                  |
| Security/privacy scan     |      yes | authorization change             |

## Evidence Plan

- validation-report.md, test output, Playwright screenshot of the nurse roster

## Risks

Authorization widening by design (owner decision); mitigated by keeping capability gates and the
management marker unchanged and by a restricted-mode config switch for rollback.

## Gate Status

READY FOR IMPLEMENTATION
