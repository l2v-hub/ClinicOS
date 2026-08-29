# Validation Report

## Outcome

Cycle 17 is PASS for branch publication. Facility inputs are bounded, patient and bed interval
integrity is enforced for POST and PUT under deterministic transaction locks, occupied state is
derived, and failed facility reads are visible and recoverable. No P0/P1 remains in the independent
security or UX/performance reviews.

## Validation evidence

| Gate | Result |
| --- | --- |
| Focused room/input/RBAC/auth regression | PASS, 30/30 |
| Frontend regression | PASS, 191/191 |
| Backend build / Prisma generate / TypeScript | PASS |
| Frontend production build | PASS |
| Backend changed-file ESLint | PASS |
| Frontend changed-file ESLint | PASS |
| `git diff --check` | PASS; configured LF/CRLF warning only |
| Independent security review | PASS, no P0/P1 after PUT remediation |
| Independent UX/performance review | PASS, no P0/P1 |
| Target PostgreSQL assignment concurrency suite | OPEN — `DATABASE_URL` and a local PostgreSQL runtime are unavailable |

The database-gated suite now covers same-bed POST races, same-patient POST races, finite interval
races, a sequential overlapping PUT and a concurrent POST+PUT invariant. Those tests compile, but
they were not executed against a fake or incompatible database and no database-integration green
result is claimed.

The Ruflo coordination CLI was also attempted as required by repository policy, but local npm
resolution failed with `Invalid Version`. This did not replace implementation or validation; the
isolated Codex writer and existing read-only review agents continued the cycle.

## Explicit residuals

- DELETE does not acquire assignment locks; a delete race can surface a 500 instead of a stable
  404, although it cannot create an overlap invariant violation.
- `previousIsoDate` assumes clean validated data; a legacy stay before `0001-01-01` would require a
  data-remediation policy.
- The concurrent POST+PUT regression accepts either a serialized 200 or 409 PUT and asserts the
  invariant. A future product contract may choose one deterministic user-facing outcome.
- Existing legacy room/bed values longer than the new bounds may need normalization when edited.
- Production activation still requires real Entra tenant/audience values, operator mapping and a
  target PostgreSQL validation run.
- Production deploy remains gated by Vercel authentication/project binding and real backend
  configuration.

## Rollback

Revert the cycle commit. There are no schema migrations or deliberate persisted-data rewrites.
