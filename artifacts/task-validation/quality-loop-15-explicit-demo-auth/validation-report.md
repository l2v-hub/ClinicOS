# Validation Report

## Outcome

Cycle 15 is PASS for branch publication with the database-integration gate explicitly open.
Synthetic operator headers no longer activate through an implicit non-production fallback: demo
authentication now requires an explicit local/test decision. CI and supported setup documentation
carry that decision visibly, while production remains Entra-only and fail-closed.

## Validation evidence

| Gate | Result |
| --- | --- |
| Focused auth/RBAC/CORS/body hardening | PASS, 32/32 |
| CI configuration guard | PASS, 5/5 |
| Frontend regression | PASS, 188/188 |
| Backend build / Prisma generate / TypeScript | PASS |
| Frontend production build | PASS |
| Scoped ESLint and script formatting | PASS |
| `git diff --check` | PASS; configured LF/CRLF warning only |
| Independent security review | PASS, no P0/P1 |
| Independent operational/regression review | PASS after backend-port documentation remediation |
| Full DB-dependent backend regression | OPEN — 368/402 pass; 34 files require target PostgreSQL |

The full backend runner was started with `AUTH_MODE`, `NODE_ENV` and `DATABASE_URL` absent. This
confirmed that the runner's synthetic auth opt-in works, while 34 database-importing files aborted
because `backend/src/lib/prisma.ts` correctly requires `DATABASE_URL`. No production database was
used and no database-dependent green result is claimed.

The repository-wide backend lint remains open because two pre-existing irregular-whitespace errors
exist in `backend/src/services/farmaci/import.ts`, plus 26 unrelated warnings. The two changed
TypeScript auth files pass scoped ESLint with zero findings.

## Explicit residuals

- Production activation still requires real Entra tenant/audience values, user mapping and target
  PostgreSQL validation.
- Operator-readable room endpoints still require a privacy/projection decision because their
  current payload includes patient data.
- `npm audit --omit=dev` retains the documented Prisma CLI/deepmerge findings; an incompatible
  Prisma 6 downgrade was not applied.
- Multer 1.x migration, persistent distributed idempotency/audit and base64 document removal remain
  separate security/scalability projects.
- Production deploy remains gated by Vercel authentication/project binding and real Entra/target
  PostgreSQL configuration.

## Rollback

Revert the cycle commit. There are no schema, migration or persisted-data changes.
