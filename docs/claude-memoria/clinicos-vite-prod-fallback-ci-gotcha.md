---
name: clinicos-vite-prod-fallback-ci-gotcha
description: Production Vite builds without VITE_API_URL silently target the real Railway backend — any CI/e2e that builds the frontend MUST set VITE_API_URL
metadata:
  node_type: memory
  type: project
  originSessionId: 116f22cb-c8e8-4704-b539-3909603c301f
---

`frontend/src/config.ts` (commit `6e6ccca`, 2026-06-13) makes any production Vite build fall
back to `https://clinicos-backend-production-df88.up.railway.app` when `VITE_API_URL` is
unset/blank. Prod backend CORS allows `localhost:5173`, so a locally-previewed prod bundle
works against production **silently**.

**Why:** this made the CI `browser-e2e` job (AI Import E2E Gate) upload synthetic documents to
production for weeks; it looked green while prod extraction worked, then failed
deterministically (issue #267) when prod started returning `retryable_error`. Diagnostic
signature: UI shows job progress/errors but local `importJob` table is empty and the local
mock runtime log has only health checks.

**How to apply:** any workflow/test that builds the frontend for a local/e2e run must export
`VITE_API_URL=http://localhost:3001` at build time (fixed in `.github/workflows/ai-import-e2e.yml`;
guarded by `scripts/ci/ai-import-e2e-config.test.mjs`, enforced in the `gate` job). Related:
[[clinicos-branch-topology]], [[clinicos-evidence-workflow]].

**#267 residual cause (fixed commit `83f6afd`, run 29505031086 green):** after the VITE_API_URL +
Playwright fixes, `browser-e2e` still failed with `created=false` because `e2e/import-happy-path.mjs`
was stale vs the F5 #124 flow. The import Revisione's "Crea paziente" (`ImportSectionsReview`) no
longer creates directly — `DischargeImportModal.handleProceedToWorkspace` hands off to the 6-step
`IntakeWorkspace` (opens at step 3 Clinica); the patient is created only at step 6 Verifica, after the
`#235` acceptance gates (`accept-therapy` in Clinica, `accept-demographics` in Verifica). Any e2e that
imports-to-create must drive the full wizard. The "Stato allergie non documentato" message is advisory
(`StepVerifica.canCreate` does NOT require an allergy state) — not a creation gate.
