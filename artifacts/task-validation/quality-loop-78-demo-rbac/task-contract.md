# Quality loop 78 — demo/seed RBAC

## Objective

Prevent ordinary operators from creating seed patients or overwriting the complete demo chart in
preview, staging and other non-production environments.

## Acceptance criteria

1. `POST /patients/seed` requires an authenticated admin or manager.
2. `POST /patients/demo-setup` requires an authenticated admin or manager.
3. An ordinary operator receives 403 before either handler reaches Prisma.
4. Admin/manager requests retain the existing non-production handler behavior.
5. Production remains fail-closed under the existing authentication and environment gates.
6. Focused tests, backend build, lint and independent security/performance reviews pass.

## Safety envelope

- Authorization-only change; no schema or response-shape change.
- Existing production block remains intact.
- No seed or demo mutation is executed during validation without a configured test database.
- No deployment until coordinated backend access is available.
