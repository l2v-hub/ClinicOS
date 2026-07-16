# Task Contract — Issue #265: stato allergie non persistito nel wizard intake + copertura E2E incompleta

- Issue: https://github.com/l2v-hub/ClinicOS/issues/265
- Branch: `codex/issue-265-bug-stato-allergie-non-persistito-nel-wizard-int`
- Base: `origin/main` (0953223)
- Slug: `265-intake-allergy-e2e`

## Impact Classification

- Type: bugfix (frontend wiring) + E2E/CI hardening
- Surfaces: `frontend/src/components/shared/intake/StepClinica.tsx`,
  `frontend/src/components/shared/intake/IntakeWorkspace.tsx`,
  new pure helper `frontend/src/components/shared/intake/confirmCartella.ts`,
  `e2e/import-happy-path.mjs`, `.github/workflows/ai-import-e2e.yml`.
- Backend/Prisma: NO changes (confirmDraft already persists `payload.cartella` verbatim in `Cartella.data`).
- Risk: clinical-data ambiguity (missing vs verified-absent allergies) — high user impact, low code-blast radius.

## Current Behaviour

- `StepClinica` renders `AllergiesEditor` through the generic section registry without `status`/`onStatusChange` props → clicking Presenti/Assenti/Paziente nega in the intake wizard does not update `allergieStatus` in the draft.
- `IntakeWorkspace.handleConfirm` never copies `data.allergieStatus` into the confirmed `cartella` payload → status is lost even if it were in the draft.
- `e2e/import-happy-path.mjs` (REQ-020) stops at the review pane ("Crea paziente" now hands off to the IntakeWorkspace wizard) — it never completes the therapy/demographics acceptance gates, never creates the patient through the real path, never checks `/patients` nor UI-after-reload.
- CI `browser-e2e` job builds the frontend without `VITE_API_URL` → production build falls back to the external Railway backend instead of the local mock backend, and the whole job runs under `continue-on-error: true`.

## Expected Behaviour

- In the intake wizard, selecting `presenti` / `assenti` / `paziente_nega` updates the draft (`allergieStatus`), is autosaved, enters the confirmed cartella, persists after creation and reload, and stays coherent with the allergy list (`presenti` keeps the list; `assenti`/`paziente_nega` blocked while list non-empty per #244 model).
- REQ-020 browser E2E completes the real journey on desktop and tablet: review → wizard step 3 (select allergy status + accept therapy) → steps 4/5 → step 6 (accept demographics) → create → explicit duplicate handling → assert `/patients` API, cartella `allergieStatus`, UI after reload; exits non-zero if persistence is missing.
- CI browser job binds the frontend build to `VITE_API_URL=http://localhost:3001` and is no longer `continue-on-error`; the mock runtime document-job assertion stays authoritative.

## Acceptance Criteria

1. AC1 — Wizard: the three allergy states are selectable in step Clinica and update the draft.
2. AC2 — Chosen status enters the confirmed cartella and is unchanged after creation and reload.
3. AC3 — `presenti` does not lose the allergy list; no ambiguous clinical states are created.
4. AC4 — REQ-020 journey completes therapy/demographics gates, creates the patient, handles duplicate explicitly.
5. AC5 — Desktop and tablet verify `/patients` and reloaded UI and exit non-zero if persistence is missing.
6. AC6 — CI builds the frontend against the local mock backend; runtime mock receives a document-job call; no test counted as valid if skipped/failed under continue-on-error.
7. AC7 — Build + typecheck pass; relevant unit tests pass.
8. AC8 — No real clinical data or secrets in logs/trace/screenshots/artifacts (synthetic fixtures only).
9. AC9 — All evidence declares and matches the exact SHA of the controlled PR.

## Test Plan

- Unit (TDD, node:test via tsx): new `frontend/src/components/shared/intake/__tests__/confirmCartella.test.ts`
  — RED first against extracted `buildConfirmCartella(data)`: carries `allergieStatus`; keeps list with `presenti`;
  omits key when undefined; preserves existing keys (ingresso, allergie, diagnosi, anamnesi, parametri, dolore, terapiaImportText).
- Existing unit: `frontend/src/lib/__tests__/allergyStatusModel.test.ts` still green.
- Backend unit suite: `npm --prefix backend test` (no backend change — regression guard).
- Typecheck/build: `npm run build` (frontend `tsc -b && vite build`, backend tsc).
- Browser E2E: `node e2e/import-happy-path.mjs <outDir>` against local stack (backend :3001 mock provider + runtime mock + frontend :5173), desktop 1366×768 and tablet 1024×768, with Playwright tracing on; asserts API persistence (`/patients`, `/patients/:id/cartella` → `allergieStatus`), UI after reload, zero console errors, explicit duplicate branch, non-zero exit on failure.

## Evidence Plan

Bundle under `artifacts/task-validation/265-intake-allergy-e2e/`:

- `task-contract.md` (this file)
- `validation-report.md` (final decision + real paths)
- `screenshots/` — key steps + final desktop/tablet
- `trace/` — Playwright trace.zip for the full journey
- `test-results/` — machine-readable unit + E2E results
- `logs/` — sanitized backend/runtime logs
- `manifest.md` — SHA binding (evidence ↔ commit)

## Gate Status

- Status: IN PROGRESS — IMPLEMENTED — NOT VERIFIED until validation-report.md records executed tests.
- Final Decision: (pending)
