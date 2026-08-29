# Validation report

Status: PASS for the cycle 29 source and local-build gate.

## Implemented evidence

- REST agenda reads constrain ordinary operators by `Patient.registeredById` before loading clinical relations; manager/admin roles use the existing global-scope policy.
- Confirm and not-administered writes resolve the prescription and ownership server-side inside the transaction; cross-owner requests return `404`.
- Assistant therapy queries push `permittedPatientIds` into the same database read model.
- Per-therapy schedules are bounded to 32 plus one look-ahead row.
- Administration lookup is candidate-scoped, ordered, and bounded to 25,000 plus one look-ahead row; legacy tuples receive a second exact in-memory guard.
- Migration `20260830002500_therapy_slot_scope` adds the composite legacy lookup index.
- The potentially large therapy feed is no longer fetched at login and is loaded only for an active agenda route.

## Verification

- New backend scope/bounds source tests and therapy predicate tests: 4/4 PASS.
- New frontend navigation guard: 1/1 PASS.
- Frontend full regression: 205/205 PASS across 37 test files.
- Backend TypeScript/Prisma build: PASS.
- Frontend production build: PASS.
- Changed backend ESLint: PASS.
- Prisma schema validation: PASS.
- `git diff --check`: PASS.
- Security reviewer: PASS, no P0/P1.
- UX/performance reviewer: PASS for cycle 29, no P0/P1.

## Environment gates and next cycle

- `DATABASE_URL` is unavailable locally. Database-backed integration tests, migration deploy, and representative query plans were therefore not executed; attempts against the documented dummy URL fail only because no PostgreSQL server is listening.
- Staging must run `prisma migrate deploy` and `EXPLAIN ANALYZE` for both modern `therapyId` and legacy tuple branches.
- The remaining 5,000-therapy hard capacity response is explicitly assigned to cycle 30; it needs a cursor-paged agenda contract rather than a larger cap.
- Production deploy remains blocked until Vercel/Railway project credentials, target Entra configuration, PostgreSQL access, and rollback authority are available.
