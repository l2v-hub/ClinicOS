# Cycle 72 validation report — project legacy clinical matches for AI searches

## Result

PASS. Structured patient search and correlation no longer fetch or deserialize complete `Cartella.data` blobs to identify one matching legacy allergy or therapy.

## Evidence

- Cycle-specific projection tests: PASS, 3/3.
- Focused gateway compatibility tests: PASS, 25/25.
- Backend production build and Prisma client generation: PASS.
- Cycle-scoped ESLint: PASS, zero errors/warnings.
- `git diff --check`: PASS (line-ending conversion warnings only).
- Independent security review: PASS, no P0/P1.
- Independent UX/performance review: PASS, no P0/P1.

## Contract checks

- Candidate patients are authorized and bounded before their IDs reach the projection helper.
- One shared parametrized query is used per `searchPatients` or `correlate` invocation; there is no per-patient query.
- Array-valued legacy allergies and therapies are expanded defensively with `jsonb_typeof` guards.
- Each lateral projection preserves source-array order and stops at the first match with `LIMIT 1`.
- Allergy and therapy source fields must be non-empty and no longer than the gateway source bound; dates over 64 characters are omitted rather than clipped into a false value.
- Only patient/chart IDs and the matched source fields leave PostgreSQL; chart JSON is never selected.
- SQL normalization preserves the gateway's Italian accent-insensitive, case-insensitive substring behavior.
- Relational therapy remains authoritative when both relational and legacy matches are present.
- Patient result shape, source types and legacy chart record IDs remain unchanged.

## Residual risks

- No configured local PostgreSQL instance was available for a seeded execution of the lateral JSONB query. Existing database-gated gateway integration tests cover legacy/relational results when a database is supplied; local validation used build, static SQL contracts and two independent reviews.
- Accent normalization intentionally covers the gateway's defined Italian/Latin mapping rather than every Unicode diacritic (P2).
- The relational therapy read is still a bulk Prisma query that may return multiple small therapy rows per candidate; the high-cost full-chart overfetch addressed by this cycle is removed.
