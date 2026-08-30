# Cycle 65 validation report — assignment deletion concurrency

## Source scope

- Branch: `codex/quality-loop-20260829`
- Parent commit: `adaaea74`
- Scope: `DELETE /patients/:patientId/room-assignments/:assignmentId` and concurrency regression coverage.
- No schema, payload or endpoint change.

## Implemented controls

- The assignment is first located by both `assignmentId` and `patientId` using only `bedId` and `roomId`.
- Deletion runs in a transaction and acquires the existing deterministic `room → bed → patient` advisory locks.
- The assignment is re-read with the same patient scope after the locks are held.
- A concurrent deletion or parent cascade returns 404 instead of surfacing Prisma's missing-record error as HTTP 500.
- Authentication, admin/manager RBAC and `private, no-store` middleware are unchanged.

## Evidence

| Gate | Result |
|---|---|
| Focused static route + input/lock tests | PASS — 6/6 |
| Backend production build (`prisma generate` + TypeScript) | PASS |
| Cycle-scoped backend ESLint | PASS |
| `git diff --check` | PASS |
| Independent security review | PASS — no residual P0/P1/P2 in Cycle 65 |
| Independent concurrency/performance review | PASS — no residual P0/P1 in Cycle 65 |

The database integration suite now mounts both routers and covers duplicate DELETE, DELETE versus historical-assignment bed cascade and mismatched-patient isolation. It could not be executed locally because `DATABASE_URL` is unset; it remains an explicit deployment/CI gate.

## Residual limitations

- PostgreSQL advisory locks are required, matching the existing create/update/room/bed concurrency design.
- Existing overlap queries still filter part of their interval in Node; pushing the complete overlap predicate into PostgreSQL is a separate performance candidate.
- Coordinated production deployment remains gated on access to the Railway project that owns the backend.
