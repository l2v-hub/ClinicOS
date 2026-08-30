# Cycle 67 validation report — room assignment overlap in SQL

## Source scope

- Branch: `codex/quality-loop-20260829`
- Parent commit: `7056f662`
- Scope: available-bed and assignment POST/PUT overlap queries.
- No schema, endpoint, response, RBAC or advisory-lock change.

## Implemented controls

- A shared Prisma predicate expresses inclusive overlap for finite intervals and treats `endDate = null` as infinity.
- Available beds use `assignments.none` and no longer select every candidate assignment for Node filtering.
- POST checks bed conflict with an exact existence query and loads only exact patient overlaps with the fields required for safe automatic closure.
- PUT applies `(patientId OR bedId) AND exact overlap`, excludes the current assignment and selects only the two scope identifiers.
- Existing transaction boundaries, deterministic `room → bed → patient` locks and post-lock re-reads are unchanged.

## Evidence

| Gate | Result |
|---|---|
| Focused overlap/lock/delete contract tests | PASS — 9/9 |
| Exhaustive finite/open interval equivalence matrix | PASS |
| Backend production build (`prisma generate` + TypeScript) | PASS |
| Cycle-scoped backend ESLint | PASS |
| `git diff --check` | PASS |
| Independent security/correctness review | PASS — no residual P0/P1 |
| Independent UX/performance review | PASS — no residual P0/P1 |

## Residual limitations

- `DATABASE_URL` is unset, so the existing PostgreSQL concurrency suite and `EXPLAIN (ANALYZE, BUFFERS)` could not be executed locally. No runtime latency or index-use claim is made.
- The schema has `[patientId, startDate, endDate]` and `[bedId]`, but not `[bedId, startDate, endDate]`. A compound bed interval index requires a separately reviewed migration and production-sized query-plan evidence.
- The available-bed endpoint remains a facility-wide bed result; this cycle removes assignment-history amplification but does not paginate the bed list.
- Coordinated production deployment remains gated on access to the Railway project that owns the backend.
