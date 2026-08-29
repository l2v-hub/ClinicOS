# Cycle 44 task contract — operator cache privacy

## Objective

Prevent browser and intermediary caches from retaining operator PII or operational schedules across authenticated sessions.

## Acceptance criteria

- Every `/operators` response carries `Cache-Control: private, no-store`.
- The policy is applied before authentication and RBAC so it also covers 401, 403 and error responses.
- Existing operator/admin authorization behavior is unchanged.
- A focused route test verifies unauthenticated directory and forbidden administration responses.
- Focused tests, targeted lint, backend build and independent security/UX review pass without P0/P1.

## Safety envelope

- No API payload, database query, schema, identity or role behavior changes.
- No production deployment without the matching backend release.
- Do not stage unrelated local changes.
