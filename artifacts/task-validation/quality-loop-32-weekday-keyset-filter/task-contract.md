# Quality loop 32 — weekday-aware keyset pages

## Objective

Apply intermittent therapy weekday eligibility before keyset pagination so each agenda page, cursor, and `hasMore` value describes therapies actually due on the requested date.

## Acceptance criteria

- Date-range, weekday, patient ACL, and cursor predicates execute in the database before `take: limit + 1`.
- No post-page weekday filter can produce sparse or falsely empty pages.
- Weekday matching uses canonical comma-token boundaries and does not treat malformed `10` as day `1`.
- Existing whitespace-bearing weekday lists are canonicalized by an idempotent data migration.
- The write path keeps its independent authoritative weekday guard.
- Focused tests, lint, build, schema validation, and independent P0/P1 reviews pass.

## Safety envelope

- Keep the original worktree and unrelated files untouched.
- One writer only; reviewers are read-only.
- Do not deploy without target credentials, representative PostgreSQL validation, and rollback evidence.
