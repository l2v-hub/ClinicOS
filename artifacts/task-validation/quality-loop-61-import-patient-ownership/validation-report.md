# Cycle 61 validation report — imported patient ownership

## Outcome

PASS within the available local environment. Reviewed intake/import confirmation now writes a valid `Patient.registeredById` atomically, falls back safely when legacy ownership is null or stale, and conditionally repairs ownerless patients during idempotent replay.

## Implementation evidence

- `resolveRegisteredById` checks the authenticated actor against `Operator` and preserves the original draft/job creator only when that operator still exists.
- Draft and direct job creation resolve ownership inside the same transaction as `Patient.create`.
- The job confirm route passes its server-authenticated operator to the confirmation service.
- Replay repair uses `updateMany` with `registeredById: null`, so an existing valid owner cannot be overwritten.
- The database-backed test fixtures now create relational `User`/`Operator` rows and cover replay repair, a stale draft owner and an ownerless job.

## Verification

- Prettier: PASS on all cycle files.
- Ownership contract test: PASS, 1/1.
- Focused backend ESLint: PASS.
- Backend Prisma generation + TypeScript build: PASS.
- `git diff --check`: PASS.
- Database-backed ownership tests: NOT RUN locally because `DATABASE_URL` is absent. They remain executable in the database-enabled integration environment.

## Independent review

- Security: PASS. Actor and candidate ownership are validated; stale/null owners fall back without FK failure; replay cannot steal an existing owner.
- UX/performance: PASS. Ownership lookup is bounded to at most two IDs; no N+1 or unbounded payload was introduced; intended operator visibility is restored.

## Residual risk

- An old ownerless job remains inaccessible to an ordinary operator through the owner-scoped route and requires manager/admin break-glass for replay/backfill. This is fail-closed behavior.
- The concurrent in-transaction idempotency branch does not run legacy backfill, but every patient created by the current flow receives ownership in its initial transaction.
