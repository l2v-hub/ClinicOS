# Cycle 23 validation report

## Result

PASS for the locally executable safety envelope.

Therapies, medication administrations, narrative sections, and assistant text/voice operations now enforce the same fail-closed patient ownership rule as the diary. Clinical authorship controlled by these routes is server-derived, and voice narrative attribution uses the stable verified operator id. The first independent security review found an AI direct-writer bypass; it was remediated before promotion by deriving a bounded database allowlist and asserting scope before preview, replay, and dispatch. A follow-up review found that demo manager/admin headers could still create a global AI context; global scope is now limited to Entra mode and idempotent appointment/consegna replay is re-grounded before returning stored results.

## Evidence

- Combined assistant scope, authorization, replay-revocation, and source-contract tests: 70/70 passed with an unreachable placeholder database URL; all assertions were pure/injected and no clinical database operation was required.
- Focused voice planning/execution and actor tests executable without PostgreSQL: 21/21 passed.
- Prisma client generation and backend TypeScript build: passed.
- ESLint on every changed backend TypeScript file: passed.
- Prettier and `git diff --check` on changed files: passed.
- A database-backed HTTP test was added for the full REST method matrix plus text/voice foreign-patient preview and execution denial, own/global access, uniform 404, no-store, and spoof-resistant attribution.
- Independent final security review after both remediations: PASS, no P0/P1 residual in scope.
- Independent final UX/performance review after both remediations: PASS, no P0/P1 introduced or residual in scope.

## Open validation gates

- The database-backed HTTP test cannot run locally because `DATABASE_URL` is absent. It must pass against the target PostgreSQL schema before promotion.
- Two existing database-dependent focused test modules also fail at import for the same missing environment variable; this is an environment gate, not an assertion failure.
- Full-package backend lint currently reports two pre-existing irregular-whitespace findings in `backend/src/services/farmaci/import.ts`, which is outside this cycle and unchanged from the cycle baseline.

## Residual risks

- `registeredById` is still a conservative proxy for patient assignment rather than an explicit care-team/ward authorization model.
- Legacy patients without `registeredById` remain inaccessible to ordinary operators by design.
- Therapy reads and schedule input still need explicit high-volume bounds; this is a P2 performance follow-up.
- Operators assigned more than 100 patients receive a fail-closed assistant error until the care-team scope model supports server-side cursor search without serializing a large allowlist.

## Rollback

Revert the cycle commit. No database rollback is necessary.
