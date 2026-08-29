# Cycle 20 — Prisma supply-chain and deployment lifecycle

## Baseline risk

Both the complete and production npm audits reported three high-severity findings through `prisma -> @prisma/config -> deepmerge-ts@7.1.5` (GHSA-ggr8-5vv4-36mx). The Prisma CLI was classified as a runtime dependency, Railway used a non-lockfile install, and database migration ran inside every application start/restart.

## Acceptance criteria

- Resolve the reviewed `deepmerge-ts` stack-exhaustion advisory without downgrading Prisma.
- Produce zero high/critical findings in complete and production npm audits.
- Keep Prisma client, PostgreSQL adapter, and driver as runtime dependencies; classify the Prisma CLI as development/deployment tooling.
- Preserve Prisma config/schema loading, client generation, TypeScript builds, and server startup.
- Use a reproducible Railway install from the committed lockfile.
- Resolve the Prisma binary from installed dependencies and never allow an implicit `npx` download.
- Run migrations in Railway pre-deploy and start the application process without invoking the CLI.
- Keep migration failure fail-closed before promotion.

## Safety envelope

- No database migration or production deployment is executed locally.
- No package downgrade and no release-candidate Prisma upgrade.
- No application behavior or schema change.
- Rollback is the single cycle commit.
