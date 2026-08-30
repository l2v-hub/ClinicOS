# Cycle 67 task contract — room assignment overlap in SQL

## Objective

Prevent large assignment histories from being materialized and filtered in Node when checking bed availability or assignment conflicts.

## Acceptance criteria

- The shared database predicate exactly implements overlap for finite and open-ended ISO-date intervals.
- Available-bed reads use a relation `none` predicate and do not select assignment rows.
- POST bed conflicts use an existence query after the established advisory locks.
- POST patient conflicts load only exact overlaps and preserve automatic closure of an earlier open stay.
- PUT loads only exact patient/bed overlaps while excluding its current assignment.
- No overlap query applies a row limit before the complete overlap predicate.
- Auth, RBAC, patient scope, no-store, lock order and 404/409 semantics remain unchanged.
- Exhaustive predicate tests, focused/full backend tests, build/lint and independent security/performance reviews pass.

## Safety envelope

- No schema migration, endpoint or response contract change.
- ISO date storage and existing advisory-lock protocol remain unchanged.
- Do not stage unrelated local changes.
