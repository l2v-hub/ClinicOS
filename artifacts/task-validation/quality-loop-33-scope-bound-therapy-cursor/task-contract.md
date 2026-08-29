# Quality loop 33 — scope-bound therapy cursor

## Objective

Bind therapy agenda cursors to both the requested date and the verified patient-access scope so a cursor cannot be reused after an operator or scope change.

## Acceptance criteria

- Cursor payload version 2 contains date, scope fingerprint, and validated keyset ID.
- Scope fingerprints are deterministic, order-independent for patient allow-lists, and distinct for owner/global access.
- The route derives access once and reuses it for cursor parsing, database query, and continuation encoding.
- A cursor from another operator, scope, date, or version is rejected with a bounded input error.
- ACL remains enforced independently by the database predicate.
- Focused tests, lint, build, and independent P0/P1 reviews pass.

## Safety envelope

- Keep the original worktree and unrelated files untouched.
- One writer only; reviewers are read-only.
- Treat the cursor as pagination state, never as authorization; database ACL remains authoritative.
- Do not deploy without target credentials and rollback evidence.
