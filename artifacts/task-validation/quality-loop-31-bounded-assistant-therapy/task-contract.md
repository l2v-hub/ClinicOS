# Quality loop 31 — bounded assistant therapy signals

## Objective

Remove the assistant's 5,000-therapy availability ceiling and eliminate legacy administration overfetch while preserving exact counts, patient scope, clinical dose/date semantics, and explicit disclosure of sampled results.

## Acceptance criteria

- Assistant facility and operator queues do not call the legacy complete agenda reader.
- PostgreSQL computes exact overdue/due-soon counts under the caller's patient ACL and returns at most five urgency-ordered samples per bucket.
- Modern administration detail matches exact `(therapyId, fascia, date)` candidates.
- Legacy detail matches exact `(patientId, drug, fascia, date)` candidates and selects one deterministic latest row.
- Sampled assistant results propagate `truncated` and sample counts and are disclosed in the automatic brief.
- Structured fractional dose labels remain intact in assistant samples.
- Source tests, lint, builds, and independent P0/P1 reviews pass.

## Safety envelope

- Keep the original worktree and unrelated files untouched.
- One writer only; reviewers are read-only.
- Do not deploy without target credentials, target-like PostgreSQL query validation, migration verification, and rollback evidence.
- Do not claim SQL execution-plan performance without a reachable representative database.
