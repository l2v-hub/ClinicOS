# Cycle 87 validation report — Bounded operator schedules

## Outcome

PASS. Operator schedules now have a canonical seven-day write contract, bounded notes and list reads, safe handling of malformed legacy rows, and an explicit list-overflow response. The admin editor exposes the same note limit with an accessible character count.

## Evidence

- Backend schedule and RBAC tests: **12/12 PASS**.
  - Valid schedules are ordered canonically and notes are trimmed.
  - Malformed IDs/bodies, unknown fields, non-string notes, notes over 2,000 characters, incomplete/duplicate/invalid days, invalid times, and non-boolean availability fail before Prisma.
  - Overnight healthcare shifts are explicitly supported.
  - Read queries select only `id`, `operatorId`, and `data`, order stably, and fetch a 501st sentinel row.
  - Responses are capped at 500 schedules, malformed legacy rows are omitted, and directory notes remain redacted.
  - Ordinary operators remain forbidden and manager-invalid input returns `400` before a database call.
- Frontend schedule contract: **1/1 PASS**.
  - The editor enforces `maxLength=2000` and associates a polite live character count with the note field.
- Backend TypeScript/Prisma production build: **PASS**.
- Frontend production build: **PASS**.
  - Initial JS: 500.42 kB raw / 139.54 kB gzip.
  - Initial CSS: 234.25 kB raw / 39.44 kB gzip.
  - Lazy operator-schedule chunk: 6.82 kB raw / 2.66 kB gzip.
- ESLint on changed backend and frontend component/test files: **PASS**.
- Prettier and `git diff --check`: **PASS** apart from existing checkout EOL warnings.

## Independent read-only reviews

- Security review: **PASS**, no P0/P1. Validation precedes Prisma, stored data is canonical, RBAC/no-store ordering is preserved, list reads are bounded, and directory notes are private.
- UX/performance review: **PASS**, no P0/P1. The 501-row sentinel, explicit `409`, note limit, live count, and existing retry state are compatible with the current lazy-loading flow.

## Declared residuals

- Prisma must still transfer each selected legacy JSON blob into Node before invalid/oversized historical data can be omitted. New writes are structurally bounded; fully eliminating this legacy cost requires a database cleanup or a PostgreSQL-specific projection/migration.
- The frontend currently presents the existing generic schedule load/retry message for a `409`; a dedicated overflow explanation should accompany future schedule pagination.
- End times earlier than start times are accepted intentionally to represent overnight clinical shifts.

## Test environment

The HTTP RBAC suite uses `NODE_ENV=test` and `AUTH_MODE=demo` only inside the test process, with an unreachable dummy database URL. No production authentication setting was changed and no test path connected to a database.

## Release scope

- No schema migration.
- No Entra configuration.
- No production deployment.
