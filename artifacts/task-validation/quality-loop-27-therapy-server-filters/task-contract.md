# Cycle 27 — therapy server filters

## Baseline risk

The bounded therapy feed prevented unbounded reads, but name, type, and start-date filters were local-only. Operators had to load every page before filtering, and a partial page could not safely support a full-chart search.

## Acceptance criteria

- Add strict server filters for medication name, therapy type, and exact start date.
- Normalize name search, require 2–80 characters, and reject SQL wildcard characters.
- Bind every active filter to the opaque keyset cursor; changing any filter invalidates it.
- Apply filters before `take: limit + 1` and compute exact summary counts from the same patient-scoped predicate.
- Carry identical filters on first-page and load-more requests.
- Replace duplicated local therapy filters with one accessible server-filter toolbar.
- Disable local sorting while the server feed is partial.
- Reject stale responses and never present previous-query rows as current after a failed first page.
- Preserve valid loaded rows after a load-more failure.

## Safety envelope

- Patient scope and private/no-store caching remain authoritative.
- Query bounds remain 1–100 rows plus one look-ahead.
- Search never includes notes or prescriber free text.
- No schema migration is added without target query-plan evidence.
