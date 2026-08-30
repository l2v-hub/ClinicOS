# Cycle 90 validation report — Operator keyset pages

## Source scope

- Branch: `codex/quality-loop-20260829`
- Entra authentication and deployment remain explicitly paused and unchanged.
- Production authentication was not switched to demo mode.

## Implemented contract

- Admin and operational directory pages default to 50 rows and hard-cap requests at 100 plus one sentinel.
- Stable `(createdAt, id)` keyset cursors are canonical, bounded, and bound to the active search.
- Admin search is server-side across name, department, role, qualification, and email; operational search intentionally excludes email and keeps the minimal projection.
- Exact filtered admin totals are returned only with the first page; append pages preserve that snapshot and count today's appointments only for their own rows.
- The frontend loads 100 rows on demand, merges identities without duplicates, supports explicit load-more, debounces server search, aborts superseded requests, and fences stale session/request responses.
- Failed append retries preserve the current cursor/query. Failed first-page searches keep the prior snapshot with an error but immediately disable its stale load-more cursor.
- Admin dashboard and management KPI totals remain exact while their visible operator lists are progressively loaded.
- The 500-row compatibility endpoints remain available during migration.

## Evidence

- Backend page, compatibility-window, and admin RBAC regression: 13/13 passed.
- Frontend URL/parser/merge/wiring contract tests: 4/4 passed.
- Backend Prettier, zero-error ESLint gate, Prisma generation, and TypeScript build: passed.
- Frontend Prettier, zero-error ESLint gate on the new helper/tests and changed admin components, TypeScript build, and Vite production build: passed.
- Independent security review and final recheck: PASS, no P0/P1/P2 in the delta.
- Independent UX/performance review and two corrective rechecks: PASS, no P0/P1 remaining; the stale-cursor P2 is closed.

Tests ran only in isolated processes with `AUTH_MODE=demo` and a non-routable dummy `DATABASE_URL`; production configuration and data were not accessed.

## Residual risks and successors

- The status chips in operator management still filter the currently loaded/search result pages client-side; a future API status filter should make that dimension independently exhaustive.
- Case-insensitive substring search can scan without dedicated trigram indexes. Query output and browser work are bounded, but a migration-backed index and large-dataset `EXPLAIN ANALYZE` benchmark remain required.
- The main frontend bundle is still about 503 kB minified (about 140 kB gzip), and Vite retains its chunk-size warning; route-level splitting remains a separate performance cycle.
- The full legacy `App.tsx` ESLint run retains six pre-existing React compiler errors outside this delta. Changed helper/tests/admin components pass the zero-error gate, and the TypeScript/Vite build passes.
- No live PostgreSQL load benchmark or interactive browser screenshot test was available in this cycle.
