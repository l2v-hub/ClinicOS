# Cycle 88 task contract — Bounded operator directory

## Problem

Both operator roster endpoints return every operator and execute a separate `groupBy` across all appointments scheduled today. Roster payload, browser state, DOM work, and aggregate cost therefore grow without an endpoint contract.

## Acceptance criteria

- Fetch one stable 501-row sentinel window ordered by `(createdAt, id)` for both roster endpoints.
- Return no more than 500 operators; above that threshold return explicit `409` with no partial roster.
- Eliminate the facility-wide appointment `groupBy` from roster reads.
- Count today's appointments through the bounded operator relation count in the same Prisma query.
- Preserve minimal directory/admin projections, exact counts, response shapes, RBAC, no-store, and lazy loading for rosters within the compatibility limit.
- Add no schema migration, Entra dependency, or deployment change.
- Record keyset pagination and server-side search as the required successor before supporting rosters above 500.
- Focused tests, TypeScript build, lint, and independent reviews pass.
