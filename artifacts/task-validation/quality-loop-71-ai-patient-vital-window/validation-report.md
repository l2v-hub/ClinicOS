# Cycle 71 validation report — bound per-patient AI vital reads

## Result

PASS. Per-patient vital reads used by the assistant no longer load the full chart JSON into Node or create unbounded data/source arrays. Filtering, projection and look-ahead now occur in PostgreSQL, and partial results are disclosed through the full assistant path.

## Evidence

- Cycle-specific tests: PASS, 4/4.
- Focused gateway compatibility tests: PASS, 26/26.
- Backend production build and Prisma client generation: PASS.
- Cycle-scoped ESLint: PASS, zero errors/warnings.
- `git diff --check`: PASS (line-ending conversion warnings only).
- Independent security review and timestamp re-review: PASS, no P0/P1.
- Independent UX/performance review initially found two P1 semantic mismatches; both were fixed and the final re-review is PASS.

## Contract checks

- Tenant and patient ACL assertions execute before the PostgreSQL query.
- PostgreSQL safely expands only an array-valued `parametriVitali` member and ignores malformed chart JSON.
- Label, pressure, numeric and temporal predicates execute before `LIMIT 101`.
- Numeric parsing trims whitespace and retains pressure/plain-number behavior, including numeric prefixes.
- Date-only and canonical ISO timestamps with offsets are calendar-validated and compared as instants.
- Only six bounded vital fields leave PostgreSQL; clipping and row overflow set `truncated: true`.
- Service data and source references are index-aligned and capped at 100.
- Query-plan `step.limit` applies a second bound and contributes to `truncated`.
- Query engine and assistant dispatch preserve the truncation signal; the internal gateway continues returning the complete sourced-result object.

## Residual risks

- No configured local PostgreSQL instance was available to execute the generated JSONB SQL against seeded rows. TypeScript build, pure boundary tests, source-contract assertions and two independent SQL reviews were used instead.
- Non-canonical legacy timestamps (for example more than six fractional-second digits or non-ISO separators) are excluded when a date filter is active. This is a P2 compatibility residual and avoids unsafe casts.
- PostgreSQL still inspects the patient's JSON vital array to apply filters; this cycle bounds application transfer, heap, prompt and source-reference cost but does not normalize legacy vitals into a relational table.
