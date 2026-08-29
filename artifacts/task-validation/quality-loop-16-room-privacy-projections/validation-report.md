# Validation Report

## Outcome

Cycle 16 is PASS for branch publication with the target-database integration gate explicitly open.
Facility-wide room reads no longer serialize complete patient records, occupancy no longer returns
an unused duplicate room tree, active camera synchronization is bounded, and clinical placement
responses cannot be cached. Assignment actor attribution is now server-authoritative.

## Validation evidence

| Gate | Result |
| --- | --- |
| Focused room/privacy/RBAC/auth regression | PASS, 25/25 |
| Frontend regression | PASS, 189/189 |
| Backend build / Prisma generate / TypeScript | PASS |
| Frontend production build | PASS |
| Backend changed-file ESLint and formatting | PASS |
| New frontend regression-guard ESLint | PASS |
| `git diff --check` | PASS; configured LF/CRLF warning only |
| Independent security review | PASS, no P0/P1 |
| Independent UX/performance review | PASS, no P0/P1 |
| Target PostgreSQL response/integration regression | OPEN — target-compatible database unavailable |

The Prisma projections are compile-checked and their exact allowed keys have deterministic tests.
An actual database-backed response snapshot and concurrency suite cannot be certified on this host
without the target PostgreSQL service. No production database was used and no DB integration green
result is claimed.

`App.tsx` compiles, builds and passes the full frontend suite. Direct lint of that entire historical
file still reports eight existing React compiler errors and one dependency warning outside the
changed URL block; the new frontend guard and all changed backend files pass scoped lint.

## Explicit residuals

- Historical `GET /patients/:id/room-assignments` without `scope=active` remains unpaginated for
  compatibility; it requires a cursor contract before a future history UI is introduced.
- Free-text room/bed notes remain visible because the management UI consumes them; policy and input
  guidance must prohibit storing patient PHI in facility notes.
- Concurrent assignments for one patient on different beds and date/body bounds remain cycle 17.
- Production activation still requires real Entra tenant/audience values, user mapping and target
  PostgreSQL validation.
- Production deploy remains gated by Vercel authentication/project binding and real backend config.

## Rollback

Revert the cycle commit. There are no schema, migration or persisted-data changes.
