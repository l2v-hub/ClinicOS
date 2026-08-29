# Cycle 18 validation report

## Result

PASS for the locally executable safety envelope.

Room, bed, and assignment mutations now share the deterministic advisory-lock order `room -> bed -> patient`. Destructive paths re-read active assignments after locking, assignment paths re-read bed availability after locking, and manual bed creation enforces the eight-bed limit while holding the room lock.

## Evidence

- Backend focused tests: 30/30 passed.
- Frontend tests: 191/191 passed.
- Backend production build: passed.
- Frontend production build: passed.
- ESLint on changed backend files: passed.
- `git diff --check`: passed (repository line-ending warnings only).
- Independent security review: PASS, no P0/P1 findings.
- Independent performance/deadlock review: PASS, no P0/P1 findings.
- Added database-gated races for assignment versus bed deletion, room deletion, and room shrink.
- Added authorization checks proving ordinary operators cannot mutate room/bed configuration.

## Open validation gate

The database-backed concurrency tests were not executed because this environment does not expose a target PostgreSQL `DATABASE_URL`. They remain gated and must run against the deployment-equivalent database before promotion.

## Residual risks

- Concurrent double deletion of one assignment can still surface as a server error rather than an idempotent outcome (P2).
- Patient deletion, available only when `ALLOW_PATIENT_DELETE=true`, does not yet participate in the patient advisory lock and could race with assignment creation (P2).
- Room-level serialization is intentionally conservative; benchmark contention against the target database and expected workload.
- Production deployment, Entra authentication, and database configuration remain external gates.

## Rollback

Revert the cycle commit. No database rollback or data migration is required.
