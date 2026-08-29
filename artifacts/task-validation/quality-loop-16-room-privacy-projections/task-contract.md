# Task Contract

## Task

- Title: Quality loop 16 room privacy projections
- Slug: `quality-loop-16-room-privacy-projections`
- Type: Security/privacy/performance/API read-model hardening
- Date: 2026-08-29

## Baseline

Facility-wide room and bed reads join `patient: true`, exposing complete Patient rows (including
fiscal code, date of birth, contacts and emergency contacts) when the UI needs only patient ID and
name. Occupancy recomputes and returns an unused duplicate room tree, patient room history is loaded
in full during camera synchronization, responses are cacheable, and assignment audit attribution
can be supplied by the client.

## Expected Behaviour

Room occupancy APIs return exact operational projections only, never full Patient rows. The summary
endpoint returns only its six consumed counters. Camera synchronization requests a bounded active
scope. Clinical occupancy responses are non-cacheable and assignment authorship comes exclusively
from the authenticated operator.

## Acceptance Criteria

- AC1: room/bed payloads expose only patient `id`, `firstName` and `lastName`.
- AC2: patient-assignment reads omit notes, audit actor, timestamps and embedded Patient rows.
- AC3: occupancy returns only total rooms/beds, occupied/free/maintenance counts and percentage.
- AC4: room/assignment responses carry `Cache-Control: private, no-store`.
- AC5: active assignments per bed and the patient active-scope query are bounded at eight without
  hiding ordinary overlap data behind `take: 1`.
- AC6: the App camera workflow uses `?scope=active`; unsupported scopes fail before a DB query.
- AC7: `createdById` is ignored as input and derived from `req.operator.id`.
- AC8: focused privacy/RBAC/auth tests, frontend regression, builds, scoped lint, diff check and two
  independent reviews pass.

## Gate Status

PASS FOR BRANCH WITH DB INTEGRATION GATE OPEN — production deploy remains externally gated
