# Validation report

Status: PASS for the cycle 32 source and local-build gate.

## Implemented evidence

- `therapyWhereForDueDate` composes the existing active/date predicate with an ISO weekday predicate before access scope and keyset cursor constraints.
- Canonical weekday values match exact token positions using equality, prefix, suffix, or middle-token boundaries; malformed multi-digit values do not match.
- Migration `20260830010000_normalize_therapy_weekdays` removes legacy whitespace and maps an empty result to `NULL` without changing weekday tokens.
- `therapy-slots` no longer selects or filters `giorniSettimana` after slicing a page.
- The administration write resolver remains on the independent date predicate plus `isDueOnWeekday`, preserving server-authoritative write validation.

## Verification

- Focused therapy scope/query tests: 9/9 PASS.
- Backend TypeScript/Prisma build: PASS.
- Changed backend ESLint: PASS.
- Prisma schema validation: PASS.
- `git diff --check`: PASS.
- Security reviewer: PASS, no P0/P1.
- UX/performance reviewer: PASS, no P0/P1; its malformed-token P2 was remediated and regression-tested.

## Environment gates and next cycle

- `DATABASE_URL` is unavailable locally; target-like query execution and plans remain staging gates.
- Production deploy remains blocked until Vercel/Railway project credentials, target Entra configuration, PostgreSQL access, and rollback authority are available.
