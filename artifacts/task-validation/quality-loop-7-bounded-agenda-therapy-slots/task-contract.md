# Task Contract

## Task

- Title: Quality loop 7 bounded agenda and therapy slots
- Slug: quality-loop-7-bounded-agenda-therapy-slots
- Type: performance/privacy/security refactor
- Date: 2026-08-29

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes |
| Database/Persistence | query shape only |
| Agnos AI / Chatbot | shared appointment service only |
| Voice | shared appointment service only |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

App login calls `GET /appointments` without a date, retaining up to 1000 appointments across the
entire database. Agenda views filter that facility-wide array in the browser even though they show
only one day, week or 42-day month matrix. The route has no `no-store` header and silently truncates
at 1000. Therapy slots are date-scoped but accept malformed dates and transfer the full legacy
cartella JSON for every therapy only to read room and bed.

## Expected Behaviour

Appointment reads require an explicit validated day/range of at most 42 days, use the existing
scheduledAt indexes, return only that visible range and fail visibly rather than silently truncate.
Agenda navigation requests its current range; operator agenda also scopes by operator ID. Therapy
slots validate one date, are no-store and read only room/bed fallbacks instead of full cartelle.
Both flows remain authenticated, race-safe across session changes and compatible with UI/Agnos
writes.

## Acceptance Criteria

- AC1: `GET /appointments` requires either `date` or `from`+`to`; dates are real ISO calendar
  dates, range is inclusive and at most 42 days, operator ID and limit are bounded/validated.
- AC2: appointment list query applies date/operator predicates before ordering/limit, selects only
  DTO fields, fetches at most limit+1 and returns a visible capacity error rather than truncation.
- AC3: App login fetches only today's appointments; day/week/month agenda navigation fetches only
  the visible 1/7/42-day range, and operator agenda supplies its operator ID.
- AC4: stale appointment range responses cannot overwrite a newer range/session; loading and
  failure states are visible with retry and never present an old range as the current one; an
  Agnos write refreshes the current visible range instead of resetting the agenda to today.
- AC5: appointment and therapy read responses are `private, no-store` and remain behind
  `requireOperator`; missing/malformed/repeated input is rejected before the database.
- AC6: therapy slots require one valid ISO date and no longer select full `Cartella.data` per
  therapy; any legacy room/bed fallback is a bounded, projected batch query. Stale therapy
  responses are rejected and API/capacity failures show retryable errors, never mock clinical data.
- AC7: therapy-slot source rows have an explicit capacity bound and an over-capacity response;
  medication administrations remain one batched query with indexed date/patient predicates.
- AC8: focused unit/API/PostgreSQL tests, frontend regression, builds, scoped lint, secret scan and
  independent performance/security reviews pass.
- AC9: appointment create/update/delete authorization is derived from the authenticated actor;
  operators can manage only their own assignments, while admin/manager can manage facility-wide.
  The same ownership rule applies to reads, and client-supplied filters, actor names and IDs never
  grant authority.
- AC10: appointment and therapy mutation bodies, identifiers, dates, times, enums and text lengths
  are bounded; therapy administration requires a real due `therapyId` and persists the
  authoritative prescription fields instead of client-provided drug data.
- AC11: medication administration is keyed to the exact therapy/date/fascia, so two prescriptions
  with the same patient and drug display name cannot overwrite or visually complete each other;
  legacy rows remain readable as a fallback during migration.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Date/range/limit parsing and URL contract |
| Integration | yes | Auth, no-store, bounds and capacity errors |
| API | yes | Appointment visible range and therapy date contract |
| PostgreSQL | yes | Query projection/range and room fallback |
| Frontend regression | yes | Agenda views and appointment actions |
| Security/privacy scan | yes | Facility-wide PHI removal |

## Evidence Plan

- `validation-report.md`
- static audit proving no date-less appointment read
- focused backend/frontend and PostgreSQL tests
- build, scoped lint, secret scan and diff integrity
- independent lightweight security and performance reviews

## Risks

- A facility can legitimately exceed the per-view capacity. The endpoint must fail visibly and ask
  for a narrower operator/date view; silent omission is clinically unsafe.
- Therapy rounds still need every due administration for the selected date. This cycle caps memory
  and removes full JSON transfer; true patient/slot pagination needs a later UX contract.
- Patient/operator tenant ABAC still requires a dedicated schema and policy cycle.

## Gate Status

READY FOR IMPLEMENTATION
