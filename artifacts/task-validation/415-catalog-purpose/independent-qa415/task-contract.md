# Independent QA #415

Frozen application: 0d7adc361b92c8466655d9ed830d2b87bbd0f419. Baseline: 288dac948c8a46e26e1bef87d6266b2497727566. Read original GitHub issue and all comments (none) independently. No publication authority.

## Impact Classification
Frontend catalog/navigation yes; backend/API/Prisma/clinical model/scoring/storage changes no. QA-only artifact writes exclusively in this subtree; root sole application writer.

## Current Behaviour
Audit reported acronym-only catalog and ambiguous adjacent chevron/+ actions.

## Expected Behaviour
Source-backed brief purposes and unchanged official names; visible distinct text actions; truthful empty/draft/final/loading/error metadata; keyboard/mobile access; explicit history never automatically resumes, reads current/full assessment or creates/updates records.

## Acceptance Criteria
1. Every scale has brief purpose without changing official name.
2. New compilation and history have distinct visible actions.
3. Nessuna compilazione, Bozza, Ultima completa are coherent and sourced only from available metadata; no invented results.
4. Catalog keyboard navigable and understandable without tooltip.
Extended safety regression: all seven modern new/history routes; legacy kept-alive and restored editId preserve answers on history/resume; read-only role; #413 focus; loading/retry and local-delete confirmation.

## Test Plan
Full diff review; independent frontend/backend type checks/build; focused unit and SSR with explicit Node Vite-only stub; normal full suite versus pinned baseline failures; synthetic guarded actual-SPA Playwright desktop/mobile; changed-source security checklist.

## Evidence Plan
Own screenshots, videos, traces, raw outcomes/request counts, command logs, source receipt and immutable evidence SHA256 manifest. Shared synthetic QA414 actor/patient fixtures reused transparently; no real patient/API/DB writes. Metadata mocks establish UI behavior only, not server persistence. Clinical sign-off/hardware/deploy excluded.

## Gate Status
READY FOR IMPLEMENTATION
