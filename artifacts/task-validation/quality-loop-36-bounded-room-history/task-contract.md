# Cycle 36 task contract — bounded room-assignment history

## Objective

Remove the last unbounded patient room-assignment query while preserving the legacy array response, active-room consumer behavior, patient ownership controls, and administrator/manager access.

## Acceptance criteria

- `scope=active` returns at most eight operational assignments.
- An omitted scope retains the legacy history meaning but queries at most 101 rows and returns at most 100.
- A truncated legacy history response exposes `X-Result-Truncated: true` rather than silently implying completeness.
- Ordering is deterministic by `startDate DESC, id DESC`.
- Unsupported scope values fail before Prisma.
- Patient ownership and non-enumerating 404 behavior remain unchanged.
- No `take: undefined` or other unbounded fallback remains in the route.
- Focused unit/source-contract tests, authorization tests, lint, and backend build pass.

## Safety envelope

- No database migration.
- No expansion of roles or patient scope.
- Preserve the current frontend `scope=active` contract.
- Do not stage unrelated user or local coordination files.
