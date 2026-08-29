# Task Contract

## Task

- Title: Quality loop 9 bounded handover feed and exact summaries
- Slug: `quality-loop-9-bounded-handover-feed`
- Type: security/performance/data-authority/frontend orchestration
- Date: 2026-08-29

## Current Behaviour

`GET /consegne` returns every handover in the facility at login. Dashboard KPIs, urgent alerts,
patient-list badges, patient detail and the handover page all derive from this same unbounded
array. Applying a naive page would make each of those views incomplete. Creation trusts patient,
creator and assignee names from the browser; any authenticated operator can edit or delete any
record; strings and dates are weakly validated. The assistant reads at most 500 rows and then
filters in memory, so both security scope and counts can be wrong at scale.

## Expected Behaviour

The handover domain exposes separate bounded read models: a keyset feed for the full page, exact
constant-size dashboard summaries with small previews, and patient-scoped results/aggregates.
No consumer derives a facility KPI from one page. Patient, creator and assignee identity are
resolved server-side. Mutations apply explicit role/ownership rules and non-enumerating errors.
The assistant uses the same scoped database predicates and exact counts rather than a truncated
facility array.

For a normal operator, the authorization predicate is `created-by actor OR assigned-to actor` and
is applied in SQL before search, count or limit. Admin/manager roles have facility scope. Legacy
rows without verified creator/assignee IDs are facility-visible and admin-managed only; display
names are never authorization keys.

## Acceptance Criteria

- AC1: `GET /consegne` requires auth, is `private, no-store`, validates strict filters/search,
  defaults to at most 20 rows and returns stable keyset `items/pageInfo/summary`. Twenty is the
  enforced worst-case page budget for notes of up to 4 kB while keeping the response below 100 kB.
- AC2: `GET /consegne/overview` returns exact facility and actor-assigned counts plus bounded
  urgent/assigned previews; no dashboard KPI is computed from the feed page.
- AC3: patient list obtains exact open-handover counts only for visible patient IDs; patient
  detail uses a patient-scoped bounded query, never the facility feed.
- AC4: frontend feed supports server filters/search, load-more dedup, visible loading/error/retry
  and session/request/mutation race guards.
- AC5: schema stores `creatoDaId` and `operatoreAssegnatoId`; POST derives creator from verified
  actor and resolves patient/assignee names from database records. Legacy names are never used as
  authorization keys.
- AC6: IDs, query, note/type/date/time/enums and JSON body are bounded; unknown fields fail 400.
- AC7: author/assignee may perform permitted workflow transitions; content/delete require
  author or admin/manager; foreign records fail closed without enumeration.
- AC8: Agnos create uses the shared authoritative service with actor metadata; facility/queue
  reads apply patient scope in SQL before bounds and preserve exact counts with bounded samples.
- AC9: indexes cover feed cursor, state/priority, patient and assignee read models; a repeatable
  PostgreSQL benchmark gates first page, deep cursor, filtered feed, overview and patient summary.
- AC10: focused HTTP/PostgreSQL tests, AI tests, frontend regression, builds, scoped lint, secret
  scan and two independent reviews pass before publish.
- AC11: login never downloads a handover roster; a 100k/1m-row test proves summary correctness,
  constant query count, payload below 100 KB and p95 below the documented gate on PostgreSQL.

## Gate Status

PASS FOR BRANCH — production deploy remains gated by target PostgreSQL/Entra/Vercel configuration.
