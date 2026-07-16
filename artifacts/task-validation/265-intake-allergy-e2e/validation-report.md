# Validation Report — Issue #265: stato allergie non persistito nel wizard intake + copertura E2E

- Issue: https://github.com/l2v-hub/ClinicOS/issues/265
- Branch: `codex/issue-265-bug-stato-allergie-non-persistito-nel-wizard-int`
- Base: `origin/main` @ 0953223
- Commit (evidence-bound SHA): `05f1fa2`
- Slug: `265-intake-allergy-e2e`
- Status: **READY FOR CODEX QA**

## What changed (scoped to #265)

- `frontend/src/components/shared/intake/StepClinica.tsx` — wires `status`/`onStatusChange`
  into the `AllergiesEditor` when the intake section is `allergie`, so selecting
  Presenti/Assenti/Paziente-nega updates the draft (`allergieStatus`). Anamnesi still gets the
  read-only `allergie` prop as before.
- `frontend/src/components/shared/intake/confirmCartella.ts` (new) — pure, unit-tested mapper
  `buildConfirmCartella(data)` extracted from `IntakeWorkspace.handleConfirm`; it carries
  `data.allergieStatus` into the confirmed cartella (previously dropped) while preserving every
  pre-existing key (ingresso, allergie, diagnosi, anamnesi, parametri, dolore, terapiaImportText)
  and omitting `allergieStatus` when never selected (undocumented ≠ invented default).
- `frontend/src/components/shared/intake/IntakeWorkspace.tsx` — `handleConfirm` now delegates the
  draft→cartella mapping to `buildConfirmCartella` (behaviour-preserving + the status fix).
- `frontend/src/components/shared/intake/__tests__/confirmCartella.test.ts` (new) — TDD unit
  contract (6 tests) for the mapper.
- `e2e/import-happy-path.mjs` — completes the real REQ-020 journey: review → wizard step 3
  (select allergy status + accept therapy) → steps 4/5 → step 6 (accept demographics) → create →
  explicit duplicate branch → API persistence + reload assertions, desktop & tablet, tracing on.
- `.github/workflows/ai-import-e2e.yml` — uploads the per-viewport Playwright traces
  (`req020-*-trace.zip`) alongside the screenshots. **Only** this artifact change is #265's; see
  the #268 dependency note below.

Backend / Prisma: **no changes**. `confirmDraft` already persists `payload.cartella` verbatim in
`Cartella.data`, so carrying `allergieStatus` in the cartella is sufficient for persistence.

## Tests executed

| Test | Command | Result |
|---|---|---|
| Unit (mapper, TDD) | `node node_modules/tsx/dist/cli.mjs --test .../confirmCartella.test.ts` | **6/6 pass** — `test-results/confirmCartella-GREEN.txt` |
| Typecheck | `cd frontend && npx tsc --noEmit` | **No errors** |
| Build | `cd frontend && npm run build` (`tsc -b && vite build`) | **built OK** — `test-results/build.txt` |
| Browser E2E (desktop+tablet) | `node e2e/import-happy-path.mjs <out>` (local mock stack) | **exit 0, both viewports green** — `test-results/e2e-result.txt` |

## Acceptance criteria

| AC | Verdict | Evidence |
|---|---|---|
| AC1 — three allergy states selectable in step Clinica and update the draft | **PASS** | `screenshots/req020-desktop-4-step3-clinica.png` (Paziente nega selected, badge shown, "Salvato"); e2e `aria-checked==true` + `allergy-undocumented` hidden assertions |
| AC2 — chosen status enters the confirmed cartella; unchanged after creation and reload | **PASS** | e2e API check `cartella.data.allergieStatus`; `screenshots/req020-desktop-8-reload-detail.png` ("Paziente nega allergie"), tablet reload ("Allergie assenti (verificato)") |
| AC3 — `presenti` keeps the list; no ambiguous states | **PASS** | unit test "presenti keeps BOTH status and list"; e2e asserts absent-status viewports keep `allergie[]` empty |
| AC4 — REQ-020 completes therapy/demographics gates, creates patient, handles duplicate | **PASS** | e2e checks accept-therapy + accept-demographics, then create; both viewports hit the explicit 409 duplicate branch and confirm via "Crea comunque" (`screenshots/req020-*-6-duplicate.png`) |
| AC5 — desktop+tablet verify `/patients` + reloaded UI; non-zero exit if persistence missing | **PASS** | two viewports (1366×768, 1024×768); `process.exit(failures?1:0)`; `test-results/e2e-result.txt` |
| AC6 — CI builds the frontend against the local mock backend; browser job blocking | **DEPENDS ON #268** | see note — delivered by PR #268 (issue #267). #265 alone keeps only the trace-artifact change. |
| AC7 — build + typecheck + unit green | **PASS** | table above |
| AC8 — no real clinical data or secrets | **PASS** | synthetic fixtures only (`e2e/fixtures.mjs`, "E2E Sintetico_*"); logs sanitized; no PHI/secrets in screenshots/traces |
| AC9 — evidence declares and matches the exact pushed SHA | **PASS** | this file, commit `05f1fa2` |

## Dependency on #268 (issue #267) — AC6

AC6 (the CI frontend build bound to the local mock backend + the browser-e2e job promoted to
blocking) is **exactly** issue #267's deliverable — the "Vite prod-fallback" gotcha: a production
Vite build without `VITE_API_URL` silently targets the real Railway backend, so the browser test
drives production instead of the CI mock stack. That fix lives in **PR #268**
(`fix/issue-267-ci-browser-e2e`), which changes the same workflow hunks (`VITE_API_URL`,
removing `continue-on-error`, a lockfile-installed Playwright) plus `package.json`.

To keep #265 minimal and conflict-light, this PR includes **only** the #265-specific workflow
change (uploading `req020-*-trace.zip`) and **reverts** the `VITE_API_URL` / `continue-on-error` /
Playwright-install / `package.json` changes back to `main` — those belong to #268. Consequently the
CI **browser-e2e** meaningful green for #265 lands once #268 merges; until then the objective
evidence for #265 is the **local** hermetic run above. `e2e/import-happy-path.mjs` is also touched
by #268 (a smaller subset) — #265's completed journey supersedes it; whichever PR merges second
must rebase this file.

## Final Decision

**READY FOR CODEX QA** — implementation verified locally (unit + typecheck + build + serialized
Playwright E2E green on desktop and tablet, persistence confirmed after creation and reload).
Claude does not close, merge, or deploy. Codex remains the sole QA gatekeeper.
