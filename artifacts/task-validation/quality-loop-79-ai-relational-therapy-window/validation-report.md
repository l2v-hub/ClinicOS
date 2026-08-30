# Quality loop 79 — validation report

## Result

PASS for the source-bound change. Production deployment remains gated on coordinated backend
access.

## Evidence

- Focused gateway/projection tests: **28/28 passed**.
- Backend TypeScript/Prisma build: **passed**.
- ESLint on implementation and new test: **passed**, zero warnings/errors.
- Prettier and `git diff --check`: **passed** (line-ending conversion warnings only).
- Independent security review: **PASS**, no P0/P1.
- Independent UX/performance review: **PASS**, no P0/P1.

## Verified properties

- Candidate patient IDs are produced by the existing ACL-scoped searches.
- The query uses parameterised patient IDs and an escaped LIKE pattern.
- Name matching remains case-, accent- and substring-insensitive.
- `DISTINCT ON (patientId)` plus deterministic ordering returns at most one relational match per
  candidate patient.
- Only bounded name, dose and start-date source fields leave PostgreSQL.
- Search and correlation share the helper and run no per-patient query.
- The selected relational record ID remains the source reference; legacy therapy fallback is
  unchanged.

## Integration limitation

The existing PostgreSQL gateway suite already checks accented relational therapy matching and will
exercise the new helper in CI. This isolated worktree has no `DATABASE_URL`, so that database-backed
suite cannot execute locally; deterministic contract tests, build and lint passed.

## Residual risk

- `DISTINCT ON` can still sort a large number of matching rows inside PostgreSQL. The database has a
  trigram index on therapy name and a patient/created-at index; query-plan benchmarking remains a
  release-environment task.
