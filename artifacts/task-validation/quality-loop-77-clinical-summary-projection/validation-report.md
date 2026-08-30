# Quality loop 77 — validation report

## Result

PASS for the source-bound change. Production deployment remains gated on coordinated backend
access.

## Evidence

- Focused summary/parser tests: **6/6 passed**.
- Backend TypeScript/Prisma build: **passed**.
- ESLint on implementation, route and affected tests: **passed**, zero warnings/errors.
- Prettier and `git diff --check`: **passed** (line-ending conversion warnings only).
- Independent security review: **PASS**, no P0/P1.
- Independent UX/performance review: **PASS**, no P0/P1.

## Verified properties

- Authentication and ownership filtering precede the clinical projection.
- The parser and query both cap a request at 100 patient IDs.
- SQL is parameterised and returns only the eight scalar fields needed by the roster.
- The full `Cartella.data` JSONB value is never selected into Node.
- Non-array/malformed clinical collections become safe empty arrays inside PostgreSQL.
- Missing charts retain null/false/zero defaults.
- Requested order and open-consegna counts remain stable.
- Endpoint URL and frontend response shape are unchanged.

## Integration coverage and limitation

The existing patient-scope integration test now includes a large unused narrative, a malformed risk
collection and known clinical arrays. It verifies exact summary values and that an ordinary operator
cannot receive another operator's patient. This isolated worktree has no `DATABASE_URL`, so the
database-backed suite cannot execute locally; build, lint and deterministic query/assembly tests
passed.

## Expected impact

For each roster page, PostgreSQL now transfers one compact scalar row per chart instead of up to 100
complete clinical JSON blobs. The exact reduction depends on chart size; the upper transfer cost is
now proportional to the fixed response contract rather than narrative and historical chart volume.
