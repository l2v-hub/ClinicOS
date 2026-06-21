# BUG-050 — Acceptance matrix

Issue: #72 — *Revisione import: la UI usa ancora il renderer legacy a tabelle*
Goal: ensure the discharge import reviews as narrative blocks (`NarrativeClinicalSection` via `ImportSectionsReview`), never the legacy structured table (`ImportReviewFull`), with a runtime contract assertion that also runs in the real deployment.

| # | Acceptance criterion | Verification method | Where | Initial | Final | Evidence |
|---|----------------------|---------------------|-------|---------|-------|----------|
| 1 | Il renderer effettivamente montato è quello narrativo | Source guard test: modal renders `ImportSectionsReview`, not `<ImportReviewFull>` | `DischargeImportModal.tsx:374` | already true | **PASS** | `import-contract.test.ts` "GUARD: never renders ImportReviewFull" |
| 2 | Non compaiono tabelle `Diagnosi (N)` per l'import documentale | Narrative renderer derives text blocks from `_narrative`/`_sections`; no structured table | `ImportSectionsReview`, `deriveSections.ts` | already true | **PASS (no regression)** | `import-contract.test.ts` mapping tests |
| 3 | Non vengono generati `diagnoses[]`/`medications[]` nel nuovo flusso | Backend produces `_narrative` only; frontend asserts no legacy arrays | `narrative.ts`, `deriveSections.assertNoLegacyImportArrays` | partially (assertion not wired) | **PASS** | new load-time assertion + tests |
| 4 | **Assertion runtime** se il draft contiene array legacy inattesi | Shared `assertNoLegacyImportArrays` invoked at result-load; fatal in DEV, **logged in prod** (runs in the real deployment) | `DischargeImportModal.tsx tick()` | **DEV-only, duplicated, wrong target** | **PASS (implemented)** | `import-contract.test.ts` "BUG-050: assertion wired into result-load path (runs in prod)" |
| 5 | Test E2E sul deployment preview/production | Playwright against deployed preview/prod | — | — | **BLOCKED** (deploy) | see Notes |

## What changed
- `DischargeImportModal.tsx`:
  - Replaced the render-time, **DEV-only**, inlined legacy-array check (which targeted `_narrative` — by construction always array-free, so a no-op) with a single load-time call to the shared, tested `assertNoLegacyImportArrays`, applied to `_narrative` **and** `_sections`.
  - The assertion now **runs in production** (logs `[ClinicOS] import contract violation` via `console.error`) and throws only in DEV — so a real-deployment regression is observable, addressing the issue's "verificare il deployment reale, non soltanto localhost".
  - Removed duplicated inline contract logic; single source of truth in `deriveSections.ts`.
- `import-contract.test.ts`: +2 tests (null/undefined no-op safety; assertion wired into the result-load path and not DEV-gated). Suite 6/6 pass.

## Build & tests
- frontend `import-contract.test.ts`: **6/6 pass** (`tsx --test`).
- frontend `npm run build` (tsc -b + vite): **PASS**.

## Notes / blocked items
- **Browser E2E + deploy verification BLOCKED**: GitHub Actions billing-blocked (Azure SWA frontend deploy + AI Import E2E gate fail at job-start). Cannot run the production E2E or close the issue until billing is fixed.
- The issue's production evidence (legacy tables in the deployed app) is consistent with **prod running a stale frontend build**: the current code already mounts the narrative renderer and never renders `ImportReviewFull`. A successful redeploy is expected to resolve the visible symptom; this change adds the runtime guard that makes any future regression observable in prod.
- "Il popup deve essere ampio e leggibile": modal layout unchanged (no regression); to be visually re-verified on the redeployed preview alongside the E2E.
