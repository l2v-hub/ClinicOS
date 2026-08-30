# Cycle 85 validation report — Atomic appointment authorization

## Outcome

PASS. Appointment updates and UI-only deletes now repeat the actor ownership policy in the database mutation predicate. A concurrent reassignment can no longer turn a previously authorized ordinary-operator request into an ID-only write.

## Evidence

- Focused policy and source-contract tests: **4/4 PASS**
  - `appointment-atomic-auth.test.ts`: ordinary owner predicate, admin/manager facility-wide predicate, no ID-only update/delete fallback.
  - `list-query.test.ts`: adjacent appointment-list query contract.
- Appointment write-boundary validation: **7/7 PASS** using a syntactically valid, unreachable dummy URL; the tests do not connect to a database.
- Assistant action regression suite: **49/49 PASS**.
  - Appointment create/update behavior remains available.
  - Delete variants remain denied.
  - No module under `src/ai` imports `uiOnlyDeleteAppointment`.
- TypeScript/Prisma production build: **PASS** (`npm run build`).
- ESLint on changed backend files: **PASS**.
- Prettier check on changed backend files: **PASS**.
- `git diff --check`: **PASS** (only the repository's existing LF-to-CRLF checkout warnings were emitted).

## Independent read-only reviews

- Security review: **PASS**, no P0/P1. Atomic owner predicates, RBAC behavior, slot locks, 403/404 semantics, and the AI delete boundary are preserved.
- UX/performance review: **PASS**, no P0/P1. DTO/API shape is unchanged and all added reads are bounded primary-key lookups.

## Environment limitation

The PostgreSQL-backed appointment integration and concurrency suites were not run because this isolated worktree has no reachable local `DATABASE_URL` and Docker is unavailable. Consequently, the exact reassignment-vs-update/delete race has not been exercised against a live PostgreSQL instance in this cycle. The database mutation predicate is covered directly and by a source regression contract; the existing advisory-lock integration tests remain unchanged.

## Release scope

- No schema migration.
- No Entra configuration.
- No production deployment.
- No new assistant delete capability.
