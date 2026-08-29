# Cycle 20 validation report

## Result

PASS for the locally executable safety envelope.

The lockfile now forces patched `deepmerge-ts@8.0.2` beneath Prisma 7.10.0. The CLI is development/deployment tooling, Railway installs from the lockfile, migrations run in the platform pre-deploy phase, and the runtime start command launches only the compiled server.

## Evidence

- `npm audit`: 0 vulnerabilities.
- `npm audit --omit=dev`: 0 vulnerabilities.
- `npm ls deepmerge-ts`: `8.0.2 overridden` beneath `@prisma/config@7.10.0`.
- `npm ci --dry-run --include=dev --ignore-scripts`: passed.
- Backend-workspace lockfile install dry run: passed.
- Prisma schema validation with a non-routable syntactically valid URL: passed.
- Prisma client generation: passed.
- Prisma migration diff from empty to the repository schema: config and schema loaded successfully.
- Root frontend + backend production build: passed.
- Backend build resolves the installed Prisma binary directly and generates the client exactly once.
- Compiled backend startup and `/health` smoke check on port 4011: passed without invoking the Prisma CLI in the start command.
- Backend focused regression tests: 31/31 passed.
- Frontend full tests: 194/194 passed.
- Independent security and deployment reviews: PASS, no P0/P1 findings.

## Open validation gates

- `prisma migrate deploy` was not run because no target PostgreSQL `DATABASE_URL` is available. It must pass in the Railway pre-deploy container before promotion.
- No Railway or Vercel credential/project binding is available in this environment, so the platform deployment itself remains unverified.

## Residual risks

- `deepmerge-ts@8.0.2` is a transitive major override. Prisma uses its plain `deepmerge` export, and local config/generation/build checks pass, but Map merge semantics changed in version 8; keep the override until Prisma publishes an upstream patched dependency and then remove it.
- Railway pre-deploy needs development dependencies in the built image. The committed build command explicitly includes them; future pruning must preserve a separate migration runner.
- The override is centralized at the workspace root. Supported installs and deployments must continue from the monorepo root and committed lockfile.

## Deployment rationale

Railway documents pre-deploy commands as the phase for database migrations; they run after build, have service environment access, and block deployment on failure. Prisma upstream issue #30052 records the same `deepmerge-ts >=8` remediation and notes that `@prisma/config` uses the plain `deepmerge` export.

## Rollback

Revert the cycle commit to restore the previous dependency graph and Railway lifecycle. No database rollback is required because this cycle does not apply a migration.
