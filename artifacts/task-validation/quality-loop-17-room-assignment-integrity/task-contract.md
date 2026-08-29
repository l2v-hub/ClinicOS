# Task Contract

## Task

- Title: Quality loop 17 room assignment integrity
- Slug: `quality-loop-17-room-assignment-integrity`
- Type: Security/data-integrity/performance/usability hardening
- Date: 2026-08-29

## Baseline

Room, bed and assignment writes accepted malformed or unbounded values. Concurrent assignment
requests could double-book a bed or place one patient in overlapping stays, and an assignment PUT
could reintroduce overlap after a safe POST. The room editor also persisted a derived `occupato`
state and silently rendered failed facility reads as zero occupancy.

## Expected Behaviour

Facility writes validate strict bounded contracts before Prisma access. POST and interval-changing
PUT operations serialize on deterministic patient and bed advisory locks, re-read committed state
inside the transaction and reject patient or bed overlaps with 409. Occupancy remains derived from
assignments. Facility loading is abortable and a failed read exposes an explicit retry rather than
presenting false zero KPIs.

## Acceptance Criteria

- AC1: room/bed fields, enums, note lengths, bed count and ISO dates are strictly validated.
- AC2: an empty date and year `0000` are rejected; end dates cannot precede start dates.
- AC3: POST assignment locks both patient and bed in deterministic order and rejects finite/open
  overlaps for either resource.
- AC4: PUT assignment uses the same locks, re-reads after lock acquisition and rejects a candidate
  interval that overlaps another stay for the patient or bed.
- AC5: assignment conflicts return 409 and invalid input returns 400 before unrelated DB work.
- AC6: the frontend mirrors server bounds and never persists derived occupied state.
- AC7: initial facility reads are abortable; failed reads show a retry and do not display false zero
  occupancy statistics.
- AC8: focused security/RBAC/input tests, full frontend tests, both builds, scoped lint, diff check
  and independent security plus UX/performance reviews pass.
- AC9: target-PostgreSQL sequential and concurrent regressions exist; execution remains an explicit
  external gate when no compatible database is configured.

## Gate Status

PASS FOR BRANCH WITH TARGET POSTGRESQL INTEGRATION GATE OPEN — production deploy remains externally
gated.
