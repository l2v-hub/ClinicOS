# Validation Report

## Outcome

Cycle 14 is PASS for branch publication with the database-integration gate explicitly open. The
generic pre-auth JSON envelope is reduced twenty-fold, while the deprecated compatibility upload
keeps its required capacity behind authentication and RBAC. Independent security and
regression/performance reviews are PASS with no P0/P1 introduced by the diff.

## Validation evidence

| Gate | Result |
| --- | --- |
| Focused body/header hardening | PASS, 5/5 |
| Security/CORS/RBAC/patient-route regression | PASS, 33/33 |
| Backend build / Prisma generate / TypeScript | PASS |
| Scoped ESLint | PASS, 0 errors; 19 pre-existing regex warnings in legacy intake |
| `git diff --check` | PASS; configured LF/CRLF warning only |
| Independent security review | PASS, no P0/P1 |
| Independent regression/performance review | PASS, no P0/P1 |
| Full DB-dependent backend regression | OPEN — target-compatible PostgreSQL unavailable |

The first full-suite attempt passed 367 of 401 tests; 34 test files terminated at module load because
the runner inherited no `DATABASE_URL`. A second attempt confirmed the non-DB security/RBAC slice.
The bundled PGlite socket server started, but Prisma 7 schema push/migrate returned a schema-engine
error, so it cannot be represented as a target-compatible database gate. No production database was
used for testing.

## Explicit residuals

- Implicit non-production demo auth remains a P1 follow-up: demo mode must become explicit in the
  next security cycle.
- Operator-readable room endpoints still require a privacy/projection decision because their
  current payload includes patient data.
- `npm audit --omit=dev` reports three high findings in Prisma CLI's `deepmerge-ts`; the registry
  offers only an incompatible Prisma 6.12 downgrade, so no unsafe dependency change is claimed.
- Multer 1.x migration and removal of base64 database documents remain separate projects.
- Production deploy remains gated by Vercel authentication/project binding and real Entra/target
  PostgreSQL configuration.

## Rollback

Revert the cycle commit. There are no schema, migration or persisted-data changes.
