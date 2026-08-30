# Cycle 69 task contract — protect the operator schedule directory

## Objective

Close the RBAC exception that lets an ordinary operator retrieve the facility-wide schedule directory while preserving the minimal operational operator directory.

## Acceptance criteria

- `GET /operators/directory/schedules` requires the existing admin-or-manager role gate.
- An authenticated ordinary operator receives `403` before any Prisma query.
- Denied responses retain `Cache-Control: private, no-store`.
- `GET /operators/directory` remains available to authenticated ordinary operators.
- Existing admin schedule endpoints and response shapes remain unchanged.
- Focused tests, backend build/lint, diff checks and independent security review pass.

## Safety envelope

- No schema, response-shape or frontend change.
- No authentication-mode or role-definition change.
- Do not stage unrelated local changes.
