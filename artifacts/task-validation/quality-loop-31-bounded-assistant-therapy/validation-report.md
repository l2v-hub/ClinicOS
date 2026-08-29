# Validation report

Status: PASS for the cycle 31 source and local-build gate.

## Implemented evidence

- `findTherapiesDue` performs date, weekday, active-prescription, patient ACL, modern/legacy administration-state, and urgency classification in SQL.
- Exact counts use a window aggregate while only five rows per overdue/due-soon bucket leave PostgreSQL; no Node-side scan is tied to total therapy volume.
- Assistant facility and operator queues use exact counts, bounded samples, and propagate `truncated` when any category is sampled.
- The automatic assistant brief exposes a live partial-results notice with the number shown versus the exact total.
- Agenda administration detail uses exact candidate `VALUES` joins for both relational and legacy records, avoiding cross-product overfetch and false capacity failures.
- Structured schedule quantities are formatted with the canonical fractional-dose helper after the bounded sample returns.

## Verification

- Backend therapy/assistant focused suite: 21/21 PASS.
- Frontend full regression: 213/213 PASS across 39 test files.
- Backend TypeScript/Prisma build: PASS.
- Frontend production build: PASS.
- Changed backend and frontend ESLint: PASS.
- `git diff --check`: PASS.
- Security reviewer: PASS, no P0/P1.
- UX/performance reviewer: PASS, no P0/P1.

## Environment gates and next cycle

- `DATABASE_URL` is unavailable locally and Docker is not installed. The new raw SQL could be type-checked and source-reviewed, but not executed or explained against PostgreSQL in this environment.
- Staging must run representative correctness fixtures and `EXPLAIN (ANALYZE, BUFFERS)` at approximately 100,000 therapies and 1,000,000 administrations before production promotion.
- The next therapy performance item is moving the weekday predicate into the paged agenda source query so sparse intermittent schedules do not produce under-filled pages.
- Production deploy remains blocked until Vercel/Railway project credentials, target Entra configuration, PostgreSQL access, and rollback authority are available.
