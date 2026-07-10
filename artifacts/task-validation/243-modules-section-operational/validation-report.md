# Validation Report — Issue #243 (AC4 remediation)

## Summary

Codex marked #243 QA FAILED: "AC4 is not implemented. The six available modules render as
non-interactive `div` cards; selecting a module cannot open its flow or content." This
remediation makes the step-4 module cards real interactive controls and wires the missing
navigation: selecting a card + creating the patient now lands the operator on that patient's
chart with the module's real tab/content open (AC4), not just a highlighted grid cell.

## Changes

- `frontend/src/components/shared/intake/IntakeWorkspace.tsx`: step-4 `CLINICAL_MODULES` cards
  are now `<button type="button">` with `aria-pressed` selection state, a visible hint when
  selected ("Si aprirà dopo la creazione del paziente"), and a colocated `MODULE_TO_TAB_ID` map.
  `onCreated(patientId, moduleTabId?)` now forwards the selected module's tab id on successful
  creation.
- `frontend/src/App.css`: `.intake-module-card` restyled as a real button (hover/focus-visible/
  disabled/selected states) instead of a static `div`.
- `frontend/src/components/operator/PatientDetail.tsx`: exported `TabId`; added optional
  `initialTab` prop; the tab-reset effect now distinguishes "first mount for this patient"
  (honours `initialTab`) from "patient switched while this component stays mounted" (always
  resets to `riepilogo`), via a ref keyed on `paziente.id`.
- `frontend/src/components/operator/PatientList.tsx`: `onImported` prop broadened to
  `(patientId?, moduleTabId?) => void`; `IntakeWorkspace.onCreated` now forwards both.
- `frontend/src/App.tsx`: `selectPaziente` accepts an optional `moduleTabId`; the `Pazienti`
  page's `onImported` handler refetches the list, finds the just-created patient, validates
  `moduleTabId` against the known Moduli tab ids, and calls `selectPaziente(created, tab)` so
  `PatientDetail` receives `initialTab`.

## Acceptance Criteria → Esito → Evidence

| AC | Esito | Evidence |
|---|---|---|
| AC1 — cards are real interactive buttons (not bare `div`) | IMPLEMENTED — verified by code (button element, `aria-pressed`) + `tsc -b`/`vite build` green | `frontend/src/components/shared/intake/IntakeWorkspace.tsx` (step-4 render block); Playwright assertion authored in `e2e/remediation/issue-243.spec.ts` (`aria-pressed` false→true) |
| AC2 — explicit hint on selection | IMPLEMENTED | same file, `intake-module-braden-hint` testid; asserted in spec |
| AC3 — selection never blocks the wizard | IMPLEMENTED (unchanged #235 gating logic; module selection is a separate, non-blocking state) | code review — `selectedModuleId` has no effect on `acceptanceComplete()` / `handleNext` gating |
| AC4 — real navigation to the module's flow after creation | IMPLEMENTED | `IntakeWorkspace` → `PatientList` → `App.tsx` → `PatientDetail.initialTab` chain (files above); Playwright assertion authored: `aria-selected="true"` on "Scala Braden" tab + `ScalaBradenTab` content visible after Conferma |
| AC5 — module tab reachable after reload (persistence) | IMPLEMENTED (client-side reachability; no server persistence change needed — the module tab is always reachable for any patient via Moduli → Scala Braden, this just proves the fix didn't rely on ephemeral state) | Playwright assertion authored: reload → re-login → re-navigate → same tab/content visible |

## Test Plan Execution

- `cd frontend && npx tsc -b` → **0 errors**.
- `cd frontend && npm run build` (`tsc -b && vite build`) → **exit 0**, `dist/` produced.
- `npx playwright test --config e2e/remediation/pw.config.243.ts --list` → **parses**, lists
  exactly 1 test (`issue-243.spec.ts:36:5`).
- Playwright **execution** (`issue-243.spec.ts`) against the live local stack (frontend + backend
  + Postgres) is **pending** — per the remediation contract, Playwright runs are serialized by
  the controller against the single shared stack (parallel runs corrupt persistence/refresh
  assertions across concurrently-running remediation issues). The spec creates a synthetic
  patient "Moduli243B Test" (left in place — synthetic data acceptable), selects "Scala Braden"
  in step 4, completes the #235 acceptance checklist (`accept-therapy` step 3,
  `accept-demographics` step 6), confirms, asserts the Braden tab/content is live, reloads,
  re-authenticates, and re-asserts reachability — with console-error and HTTP-4xx/5xx assertions
  throughout.
- Trace/video/screenshots/report/test-results will land in this directory
  (`test-results/`, `playwright-report/`, `screenshots/result.png`) once the controller executes
  the spec — the Playwright config (`trace: 'on'`, `video: 'on'`, `screenshot: 'on'`) targets
  this canonical evidence dir directly.

## CI Disposition

No CI runs were triggered by this session (worktree-local commit, not pushed). Per prior
sessions in this repo, the Azure Static Web Apps deploy check is a known repo-wide
infrastructure failure unrelated to any single issue's code — not applicable to this
worktree-only change set.

## Risks / Notes

- This report reflects implementation + static verification (types/build) done directly by
  Claude. The **runtime** Playwright pass/fail must still be produced by executing
  `issue-243.spec.ts` against the shared local stack, per the parallel-evidence-remediation
  contract's "serialize Playwright execution" rule — this session did not start/own that shared
  stack.
- La stringa "CLOSED — VERIFIED" viene apposta da Codex dopo verifica indipendente, come da
  handoff #239 — non usata in questo report.

Final Decision: READY FOR CODEX QA
