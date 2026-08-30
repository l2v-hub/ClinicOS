# Cycle 89 validation report — Atomic legacy intake apply

## Source scope

- Branch: `codex/quality-loop-20260829`
- Entra authentication and deployment remain explicitly paused and unchanged.
- Production authentication was not switched to demo mode.

## Implemented contract

- The legacy apply body accepts only `documentId` and `patientId`, each matching a bounded resource-id contract.
- The target patient is checked with an id-only projection.
- One transaction conditionally changes only an `extracted`, unlinked document to `applied`.
- Replays, competing links, missing resources, and relevant Prisma constraint races return the same generic `409` without relinking a document.
- Existing admin/manager RBAC, `Cache-Control: private, no-store`, deprecation headers, response shape, and route-specific body envelope are preserved.

## Evidence

- Focused legacy-apply tests: 5/5 passed, including competing links and unchanged ineligible records.
- Expanded intake, body-hardening, RBAC, and adjacent clinical-contract regression: 25/25 passed.
- Prettier check: passed.
- ESLint on changed backend files with zero-error gate: passed. The legacy route retains 19 pre-existing regex warnings outside the changed apply block.
- Prisma generation and TypeScript backend build: passed.
- Independent security review: PASS, no P0/P1/P2 in the delta.
- Independent UX/performance review: PASS, no P0/P1 in the delta.

Tests ran only in an isolated process with `AUTH_MODE=demo` and a non-routable dummy `DATABASE_URL`; production configuration and data were not accessed.

## Residual risks and successors

- The concurrency contract is covered by a deterministic fake-client test and a static transaction contract, not by a live PostgreSQL concurrency test. A database-backed race test remains required when an isolated test database is available.
- This deprecated base64 flow remains intentionally limited to admin/manager compatibility use and should be removed after its sunset.
- Entra identity hardening remains on hold by user request.
