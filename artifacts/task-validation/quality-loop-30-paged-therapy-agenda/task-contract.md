# Quality loop 30 — paged therapy agenda

## Objective

Replace the 5,000-therapy agenda ceiling with a bounded keyset feed while preserving exact clinical totals, patient access scope, and date integrity across agenda navigation and medication actions.

## Acceptance criteria

- The interactive agenda loads at most 250 therapies per request and follows an opaque, date-bound cursor.
- The first page returns exact per-slot totals from an ACL-scoped aggregate; continuation pages do not repeat that aggregate.
- Modern and legacy medication administrations are matched only to bounded, in-scope therapy candidates.
- Partial detail is explicit and recoverable in the UI without presenting a false empty or complete state.
- Weekly and monthly views never repeat one day's therapy data across other calendar dates.
- Opening, navigating, or changing view preserves one authoritative date and closes any stale therapy modal before an action.
- Source tests, lint, builds, Prisma validation, and independent P0/P1 reviews pass.

## Safety envelope

- Keep the original worktree and unrelated files untouched.
- One writer only; reviewers are read-only.
- Do not deploy without target credentials, Entra configuration, PostgreSQL access, migration verification, and rollback evidence.
- Do not claim database execution plans without a reachable target-like PostgreSQL database.
