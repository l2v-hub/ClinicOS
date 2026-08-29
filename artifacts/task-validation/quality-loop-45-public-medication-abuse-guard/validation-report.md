# Cycle 45 validation report

## Result

Implementation validation passed. Public medication lookup now rejects oversized work, limits each client, caps aggregate process work, and cannot grow its identity map without bound.

## Automated evidence

- AI/security suite: **17/17 passed**, including per-IP throttle, LRU eviction, expiry and global rotating-IP budget.
- Focused medication HTTP tests: **2/2 passed**, covering oversized input and the shared `429`/`Retry-After` policy for search and dosage routes.
- CORS/security suite: **6/6 passed**, including the one-hop production proxy policy.
- Backend Prisma generation and TypeScript production build: **passed**.
- Targeted ESLint for all six changed TypeScript files: **passed**.
- `git diff --check`: **passed** (line-ending warnings only).

## Independent review

- The first UX/performance review found that `/dosaggi` was outside the initial limiter; it was moved under the shared lookup budget.
- The first security review found unbounded rate-limit bucket cardinality; expiry and a hard cardinality bound were added.
- The second security review found that rejecting all new identities at capacity enabled bucket reservation; it was replaced with LRU eviction and a separate aggregate process budget.
- Final security review: **PASS**, no P0/P1 in the single-instance scope.
- Final UX/performance review: **PASS**, no P0/P1 or API regression found.

## Residual deployment note

- The process limiter is safe for the current single-instance deployment target. A shared edge/Redis limiter remains required before scaling to multiple backend replicas.
- Production deployment remains coordinated with Railway; the authenticated CLI account still exposes no backend project.
