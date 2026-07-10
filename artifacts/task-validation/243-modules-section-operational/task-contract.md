# Task Contract

## Task
- Title: 243 — Modules section operational (AC4 remediation)
- Slug: 243-modules-section-operational
- Type: bugfix / remediation
- Date: 2026-07-09
- Issue: #243
- Supersedes/complements: `artifacts/task-validation/243-moduli-section-operative/` (previous
  evidence — covered only AC1–AC3, stopped before creating a patient; canonical dir is this one).

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no (no schema/API change; only client-side navigation state) |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

Codex QA (verbatim): "AC4 is not implemented. The six available modules render as
non-interactive `div` cards; selecting a module cannot open its flow or content."

Confirmed in code before this fix: `IntakeWorkspace.tsx` step 4 rendered
`CLINICAL_MODULES` as plain `<div className="intake-module-card" role="listitem">` elements
with no `onClick`, no focus state, no selection state — clicking a card did nothing. The
prior evidence run (`243-moduli-section-operative`) only verified the grid was *visible*
(AC1–AC3) and explicitly clicked "Annulla" to close the wizard without creating a patient —
it never exercised any interaction or the post-creation navigation Codex asked for.

## Expected Behaviour

1. Each available module card in intake step 4 is a real, keyboard-focusable
   `<button type="button">` with `aria-pressed` reflecting selection state.
2. Clicking an available card selects it (visual highlight + a hint: "Si aprirà dopo la
   creazione del paziente"). Selection is optional — it does not block advancing/confirming.
3. On successful patient creation (`Conferma`), if a module was selected, the app navigates to
   the newly created patient's chart with the "Moduli" tab group active and the selected
   module's tab (e.g. "Scala Braden") active and rendering its real content — not just the
   step-4 grid.
4. The selected module's tab remains reachable for that patient after a full reload (this app
   keeps no session in browser storage, so "reload" re-authenticates and re-navigates via the
   patient list — the assertion is that the module tab + its content are still there, i.e. the
   fix didn't rely on ephemeral in-memory state that a real user's flow doesn't have anyway).

## Acceptance Criteria

- AC1: Module cards are interactive (`<button>`, `role` semantics via native button, no bare
  non-interactive `div`). Asserted: Playwright locates `[data-testid="intake-module-braden"]`
  as a `<button>`, checks `aria-pressed` toggles `false → true` on click.
- AC2: Selecting a card shows an explicit hint that it will open post-creation. Asserted:
  `[data-testid="intake-module-braden-hint"]` visible with the exact hint text after click.
- AC3: Selection does not block the wizard — Avanti/Conferma remain gated only by the existing
  #235 acceptance flags (unchanged), not by module selection. Asserted: the spec advances
  through steps 5–6 and confirms successfully with a module selected.
- AC4 (the one Codex flagged): selecting a module and completing patient creation navigates to
  the created patient's chart with that module's real flow open (tab active + its content
  rendered), not merely a step-4 grid highlight. Asserted: after `Conferma`, Playwright checks
  the "Scala Braden" L3 tab has `aria-selected="true"` and the `ScalaBradenTab` content
  ("Scala di Braden" section title) is visible.
- AC5: The module tab remains reachable for the same patient after a full app reload
  (persistence, not a session-restore illusion). Asserted: spec reloads, re-logs in, re-selects
  the patient by name, re-opens Moduli → Scala Braden, and re-asserts the same content.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Pure UI interaction/navigation change; no isolable pure function beyond a trivial identity map |
| Integration | no | No API contract change |
| API | no | Backend untouched |
| Playwright | yes | Only way to prove a *real* click → real navigation → real module content, per Codex's explicit ask |
| Persistence after refresh | yes | AC5 — module tab reachable for the created patient after reload |
| Agnos action registry | no | Not touched |
| Voice simulation | no | Not touched |
| OCR/import test | no | Not touched |
| Security/privacy scan | no | No new data surface; patient created is synthetic ("Moduli243B Test") |

Spec: `e2e/remediation/issue-243.spec.ts` + `e2e/remediation/pw.config.243.ts` (authored now,
executed by the controller against the single shared local stack per remediation contract).

## Evidence Plan

Required evidence (canonical dir `artifacts/task-validation/243-modules-section-operational/`):

- validation-report.md
- Playwright test output / `playwright-report/`
- `test-results/`
- final screenshot: `screenshots/result.png` (+ intermediate step screenshots)
- trace (`trace.zip`, via `trace: 'on'` in the Playwright config)
- video (via `video: 'on'`)
- sanitized logs: n/a (no backend/AI change)
- persistence proof: post-reload re-navigation to the same module tab (AC5)

## Risks

- The intake wizard's PatientDetail-tab wiring reuses `paziente.id` to distinguish "first
  mount for this patient" (honour `initialTab`) from "patient switched while already mounted"
  (reset to default tab). Mitigated by keeping `PatientDetail` fully unmounted whenever the
  operator leaves `dettaglio-paziente` (already true before this change — the block is
  conditionally rendered in `App.tsx`), so every intake-driven navigation is a fresh mount.
- `onImported` callback signature was broadened from `() => void` to
  `(patientId?: string, moduleTabId?: string) => void`; verified type-compatible with the other
  three call sites of `IntakeWorkspace.onCreated` (AdminAgenda, OperatorAgenda,
  DischargeImportModal) which still declare narrower callback signatures — TypeScript accepts
  this (functions with fewer, or fewer-required, params are assignable both ways here) and
  `tsc -b` confirms zero errors.
- This is a bugfix on top of an already-diverged local branch (`ai/codex-project-stabilization`
  vs. `main`, per prior session memory) — kept strictly to the 5 files needed for AC4, no
  unrelated refactor.

## Gate Status

READY FOR IMPLEMENTATION
