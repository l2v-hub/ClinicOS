# Cycle 65 task contract — assignment deletion concurrency

## Objective

Prevent concurrent assignment and parent room/bed deletion from surfacing an internal error or producing an ambiguous administrative outcome.

## Acceptance criteria

- Assignment DELETE acquires the established deterministic `room → bed → patient` advisory locks.
- The assignment is re-read by both `assignmentId` and `patientId` inside the transaction after locking.
- Two concurrent deletes return exactly one 204 and one 404, never 500.
- Concurrent assignment/bed deletion returns only expected 204/404/409 outcomes, never 500.
- A mismatched patient remains a 404 and cannot delete another patient's assignment.
- Existing authentication, admin RBAC and `private, no-store` policy remain unchanged.
- Static focused tests, backend build/lint and independent security review pass; the database-gated concurrency suite is recorded for an environment with `DATABASE_URL`.

## Safety envelope

- No schema migration, response payload change or new endpoint.
- No changes outside the assignment DELETE route and its focused tests/receipts.
- Do not stage unrelated local changes.
