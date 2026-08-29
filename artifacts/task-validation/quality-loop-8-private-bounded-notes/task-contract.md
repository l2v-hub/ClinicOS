# Task Contract

## Task

- Title: Quality loop 8 private bounded notes mailbox
- Slug: `quality-loop-8-private-bounded-notes`
- Type: privacy/security/performance refactor
- Date: 2026-08-29

## Current Behaviour

`GET /notes` returns the complete facility message history. Recipient/sender filters run only in
the browser, so every authenticated operator can inspect private messages for colleagues in the
Network response. Author ID/name are client-controlled and any operator can update or delete any
note. Reads are cacheable and mutation strings are not bounded.

## Expected Behaviour

The server exposes only the authenticated actor's mailbox: sent messages plus messages addressed
to that operator or everyone; `admin` messages are visible only to admin/manager. Reads are
keyset-paged at at most 50 rows with server-side box/search filters, exact unread summary and
`private, no-store`. Actor and referenced display names are authoritative. Authors/admins manage
content; recipients may only change read/resolved status. Foreign records fail closed.

## Acceptance Criteria

- AC1: GET requires auth, is `private, no-store`, validates single `box`, `q`, `limit`, `cursor`
  values and never returns more than 50 records.
- AC2: visibility predicates are applied in the database before ordering/take; an operator never
  receives a private note sent between other operators.
- AC3: response is `{items,pageInfo,summary}` with stable `(createdAt,id)` keyset pagination and an
  exact unread count independent of the current page.
- AC4: POST derives author ID/name from `req.operator`; client actor fields do not affect stored
  identity. Recipient and optional patient display names are resolved server-side.
- AC5: body, IDs, query, message and text fields are bounded; enums and unknown fields fail 400.
- AC6: author or admin/manager may edit content/delete; a visible recipient may update only
  `stato`; foreign access returns a non-enumerating 404.
- AC7: frontend login keeps one bounded mailbox page; filters/search query the server; load-more
  deduplicates; request/session guards prevent stale overwrite.
- AC8: loading/error/retry are visible and never appear as an empty mailbox; unread UI uses the
  server summary, not a partial page.
- AC9: focused unit/API/PostgreSQL tests, frontend regression, builds, scoped lint, secret scan and
  independent privacy/performance reviews pass.

## Test Plan

- parser/cursor unit tests;
- HTTP/PostgreSQL tests with two operators for cross-recipient privacy and author spoofing;
- mutation authorization tests for author, recipient and outsider;
- frontend paging/filter/stale/error contract tests;
- build, lint, secret scan and independent review.

## Gate Status

CLOSED — VERIFIED
