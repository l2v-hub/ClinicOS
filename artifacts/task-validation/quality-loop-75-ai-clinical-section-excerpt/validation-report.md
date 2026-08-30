# Cycle 75 validation report — bound clinical-section search excerpts

## Result

PASS. Direct and cross-patient clinical-section searches now reuse the centered PostgreSQL excerpt projection, so complete narrative text is no longer transferred to Node for assistant search results.

## Evidence

- Cycle 73/75 excerpt tests: PASS, 7/7.
- Focused gateway compatibility tests: PASS, 29/29.
- Backend production build and Prisma client generation: PASS.
- Cycle-scoped ESLint: PASS, zero errors/warnings.
- `git diff --check`: PASS (line-ending conversion warnings only).
- Independent security and UX/performance reviews: PASS, no P0/P1.

## Contract checks

- One shared SQL primitive owns match position, clamped window boundaries, ellipses and truncation.
- Full text remains available to the PostgreSQL predicate, preserving matches anywhere in a narrative.
- Search ACL, patient/section filters, ordering, validated limit and source record IDs are unchanged.
- Node receives only excerpt, truncation boolean and existing metadata.
- Result excerpt and source exact text are identical.
- `contentTruncated` is optional for compatibility and assistant dispatch aggregates it for direct and cross-patient tools.
- Existing correlation uses the same primitive and retains the Cycle73 start-boundary correction.

## Residual risks

- No local PostgreSQL instance was configured for seeded execution; validation used build, source-contract tests and independent SQL reviews.
- SQL normalization uses the gateway's defined Italian/Latin translation mapping; broader Unicode position equivalence remains P2.
- Narrative text remains stored as large relational text fields; this cycle removes application transfer, not database text-search cost. A dedicated full-text index is a future scaling step.
