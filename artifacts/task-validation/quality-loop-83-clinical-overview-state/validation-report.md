# Cycle 83 validation report — Clinical overview failure state

## Source state

- Branch: `codex/quality-loop-20260829`
- Parent commit: `f127f248`
- Scope: distinguish unavailable clinical overview data from verified zero values on the operator dashboard

## Implemented contract

- The overview loader owns explicit `loading`, `ready`, and `error` states.
- Every request has an abort controller, request sequence, and session-epoch fence.
- Login, logout, effect cleanup, and retry invalidate superseded responses.
- Retry calls only the overview loader; appointments, handovers, and notes are not reloaded.
- The clinical KPI grid remains mounted during loading/error and displays `—` for unavailable values.
- “Nessuna criticità” is shown only after a ready overview with a verified zero.
- The patient total also displays `—` until the overview is ready.
- Failure is exposed through a generic accessible alert and an explicit retry action.

## Automated evidence

- Focused dashboard/read-model tests: **10/10 PASS**.
- Production frontend build (`tsc -b && vite build`): **PASS**.
- Initial JavaScript: **500.31 kB raw / 139.54 kB gzip**.
- Initial CSS: **234.25 kB raw / 39.44 kB gzip**.
- ESLint for `OperatorDashboard` and the new contract test: **PASS**.
- Full-file ESLint for `App.tsx` still reports six errors and one warning on pre-existing unchanged lines (`loadCartella` declaration order, hash restore effect, appointment/therapy effect calls, and render-time navigation ref). The Cycle 83 effect-specific warning was removed; both independent reviewers confirmed the delta adds no lint regression.
- Prettier and `git diff --check`: **PASS**.

## Independent review

- Security reviewer: **PASS**, no P0/P1. Confirmed abort/request/session fencing, isolated retry, unchanged auth/cache/routing behavior, and no new PHI disclosure.
- UX/performance reviewer: **PASS**, no P0/P1. Confirmed stable KPI geometry, verified-value semantics, accessible recovery, and unchanged success navigation.

## Result

**PASS** for commit and push. Railway access is now available for the authenticated account; coordinated backend/frontend deployment follows from the committed source state.
