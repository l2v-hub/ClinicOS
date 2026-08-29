# Quality loop 29 — therapy scope and bounded agenda reads

## Objective

Prevent cross-owner therapy disclosure or mutation and bound the agenda read path before patient, schedule, room, or administration data is loaded.

## Acceptance criteria

- Ordinary operators can read and mutate only therapies belonging to patients registered to them.
- Manager/admin roles retain the explicitly global patient scope.
- Out-of-scope therapy mutations return a non-enumerating `404` and create no administration.
- The assistant applies its permitted-patient set in the database predicate, not after PHI is loaded.
- Therapy schedules and candidate medication-administration rows have explicit look-ahead caps.
- Legacy administrations are accepted only for an exact candidate tuple and have a matching database index.
- Therapy slots are not loaded during login; agenda navigation, deep links, and browser history trigger the read.
- Source tests, lint, builds, Prisma validation, and independent P0/P1 reviews pass.

## Safety envelope

- Keep the original worktree and unrelated files untouched.
- One writer only; reviewers are read-only.
- Do not deploy without target credentials, Entra configuration, PostgreSQL access, migration verification, and rollback evidence.
- Do not claim integration or query-plan validation without a reachable target-like database.
