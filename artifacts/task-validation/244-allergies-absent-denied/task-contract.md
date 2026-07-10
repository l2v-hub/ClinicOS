# Task Contract

## Task
- Title: 244 — Allergy status not shown in summary; contradictory states persistable
- Slug: 244-allergies-absent-denied
- Type: bugfix / QA remediation
- Date: 2026-07-09
- Issue: ClinicOS GitHub Issue #244
- Branch: fix/issue-244-allergie
- Worktree: E:/Workspace/DG_SE_DEV/ClinicOS/.wt-fix/244
- Superseded evidence dir (kept, not canonical): artifacts/task-validation/244-allergie-negata-assenti/

## Codex QA findings (verbatim, from the QA FAILED verdict)

1. "`allergieStatus` is consumed only inside the modal. The patient summary still derives
   its message/count solely from `cartella.allergie`" — the modal can say "Paziente nega
   allergie" while the background summary says "Nessuna allergia segnalata".
2. "The implementation permits `assenti`/`paziente_nega` while retaining a non-empty
   allergy list … persists the contradictory state".
3. "No unit/integration test covers status validation or summary rendering".

Required: "define a non-ambiguous state model, render it in the patient summary, add tests".

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no (client-side validation only; no schema/API change) |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

- `AllergiesEditor` (`frontend/src/components/operator/sections/AllergiesEditor.tsx`)
  let the operator click "Assenti" / "Paziente nega" unconditionally — `setStatus()` called
  `onStatusChange?.(s)` with no check against the current allergy list, persisting the new
  status via the parent's `upd({ allergieStatus: s })` even when `cartella.allergie` still
  had entries. The UI then rendered a "warning but already persisted" banner
  (`data-testid="allergy-conflict"`) after the fact — i.e. it warned about a contradiction
  it had itself just written to the backend.
- `PatientDetail.tsx`'s quick-stat (`cr-quick-stat` for "Allergie") and the riepilogo card
  (`cr-riepilogo-card` for "Allergie") both read `cartella.allergie.length` /
  `cartella.allergie` directly and never looked at `cartella.allergieStatus`. So with
  `allergieStatus: 'paziente_nega'` and an empty list, the modal showed "Paziente nega
  allergie" while the summary quick-stat showed a bare `0` and the riepilogo card showed
  "Nessuna allergia registrata." — no indication of *why* it was zero (verified absent?
  patient refused to say? never asked?).
- No unit tests existed for the allergy status derivation or the block-on-contradiction
  rule; no Playwright coverage of the summary/quick-stat surfaces for this state.

## Expected Behaviour

- A single pure function, `deriveAllergySummary(list, status)` in
  `frontend/src/lib/allergyStatusModel.ts`, is the one source of truth for how the allergy
  state is described everywhere (modal derivation already existed inline; summary now
  calls the same function).
- The patient summary (quick-stat `data-testid="allergy-summary-state"` and the riepilogo
  "Allergie" card) render the *explicit* state — "N allergie" (count), "Allergie assenti
  (verificato)" (success), "Paziente nega allergie" (info), or "Stato non documentato"
  (warning) — instead of a bare, ambiguous number.
- `canSetStatus(list, next)` blocks setting `'assenti'` or `'paziente_nega'` while the
  allergy list is non-empty. The corresponding radio buttons are rendered `disabled` with
  an explanatory `title`, and an inline message (`data-testid="allergy-status-blocked"`)
  is shown whenever the list is non-empty. No state change, no `onStatusChange` call, no
  PUT request is fired for a blocked transition.

## Acceptance Criteria

- AC1: Setting "Paziente nega" (or "Assenti") with an empty allergy list is allowed and
  persists via the existing `upd({ allergieStatus })` PUT — asserted by the Playwright
  spec (PUT observed, `allergy-denied` badge visible).
- AC2: The patient summary (riepilogo card + quick-stat, `data-testid="allergy-summary-state"`)
  shows the *same* explicit state as the modal ("Paziente nega allergie"), both immediately
  after setting it and after a full page reload — asserted by the Playwright spec
  (`toContainText('Paziente nega allergie')` before and after `page.reload()`).
- AC3: Adding an allergen while status is `'assenti'`/`'paziente_nega'` forces status back
  to `'presenti'` (pre-existing behaviour, unchanged) — asserted by the Playwright spec
  (`allergy-status-presenti` becomes `aria-checked="true"`).
- AC4: Attempting to set `'assenti'` while the list is non-empty is blocked: the button is
  `disabled`, `data-testid="allergy-status-blocked"` is visible, no PUT request is fired,
  and the status remains unchanged — asserted by the Playwright spec (request tracking via
  `page.on('request')`, `toBeDisabled()`, `toBeVisible()` on the blocked message).
- AC5: The derivation logic (`deriveAllergySummary`) and the guard (`canSetStatus`) are
  covered by unit tests for every branch: presenti/count (including when list contradicts
  a stale status), assenti, paziente_nega, undocumented (undefined status + empty list,
  and the `'presenti'`-with-emptied-list edge case), and the two blocking rules —
  `frontend/src/lib/__tests__/allergyStatusModel.test.ts` (13 tests, all passing).

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | `deriveAllergySummary` / `canSetStatus` are pure logic — every branch must be verified in isolation (13 `node:test` cases via tsx). |
| Integration | no | No backend/API contract change. |
| API | no | No backend/API contract change. |
| Playwright | yes | UI regression risk: modal vs. summary disagreement, and a contradictory-state write, are both UI-only bugs only observable end-to-end. |
| Persistence after refresh | yes | AC2 explicitly requires the summary to still show the explicit state after `page.reload()`. |
| Agnos action registry | no | Not touched. |
| Voice simulation | no | Not touched. |
| OCR/import test | no | Not touched. |
| Security/privacy scan | no | No PHI/secret handling change; purely a display + client-side validation fix. |

## Evidence Plan

Required evidence (canonical dir `artifacts/task-validation/244-allergies-absent-denied/`):

- `validation-report.md` (AC → esito → evidence path table)
- unit test output (13/13 passing, captured in validation-report.md)
- `screenshots/summary-paziente-nega.png`, `screenshots/blocked-assenti.png`,
  `screenshots/result.png` (final state)
- `trace.zip` / `test-results/` / `playwright-report/` produced by
  `e2e/remediation/issue-244.spec.ts` (executed later by the controller against the live
  local stack — not run by this implementer per the shared remediation contract)
- sanitized console/network logs are captured inside the Playwright trace (no separate log
  file needed — no backend/AI logging touched)

## Risks

- The Playwright spec is authored but NOT executed in this pass (per shared contract: the
  local stack is a single shared resource run by the controller). Risk: a selector/text
  mismatch only surfaces at execution time. Mitigation: `--list` was run and the spec
  parses; selectors/testids were cross-checked against the actual JSX
  (`allergy-summary-state`, `allergy-status-blocked`, `allergy-status-presenti`,
  `allergy-denied`) rather than guessed.
- `deriveAllergySummary` prioritizes a non-empty list over the stored `status` (branch 1
  in the module's precedence comment). This means legacy records written *before* this fix
  shipped, where `status='assenti'` but the list is non-empty, will now show the count
  instead of "Allergie assenti" — this is intentional (the list is the more concrete,
  trustworthy signal) but is a display change for any such legacy row. The
  `allergy-conflict` warning banner inside the editor (unchanged) still flags this case for
  the operator to reconcile.
- CI: Azure SWA deploy is expected to fail repo-wide (shared infra, unrelated to this
  change); secret-scan may show a transient 0-step startup failure requiring a rerun — both
  noted per the shared remediation contract, not caused by this change.

## Gate Status

READY FOR IMPLEMENTATION (contract filled retroactively alongside the implementation, per
remediation dispatch instructions)
