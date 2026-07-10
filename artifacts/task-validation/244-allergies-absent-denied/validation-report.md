# Validation Report — Issue #244

## Summary

Codex QA FAILED this issue for two concrete defects plus missing tests:
1. the patient summary (riepilogo card + quick-stat) ignored `cartella.allergieStatus` and
   derived its message/count solely from `cartella.allergie`, so it could contradict the
   AllergiesEditor modal;
2. the UI allowed setting `assenti`/`paziente_nega` while the allergy list was still
   non-empty, persisting a contradictory state (warn-after-persist, not block-before-persist);
3. no unit/integration test covered status validation or summary rendering.

This pass adds a single non-ambiguous state-derivation module, wires the summary to it,
blocks the contradictory transition at the source (disabled controls, no persisted write),
and adds unit + Playwright coverage.

## Changes

- **New** `frontend/src/lib/allergyStatusModel.ts` — pure module:
  - `deriveAllergySummary(list, status)` → `{ label, badge, count }`. Precedence: a
    non-empty list always wins (count), else `assenti` → success, `paziente_nega` → info,
    else → warning "Stato non documentato".
  - `canSetStatus(list, next)` → blocks `assenti`/`paziente_nega` when the list is
    non-empty, with a user-facing `reason`.
- **New** `frontend/src/lib/__tests__/allergyStatusModel.test.ts` — 13 `node:test` cases,
  all passing (see `unit-tests/allergyStatusModel.tap.txt`).
- `frontend/src/components/operator/sections/AllergiesEditor.tsx`:
  - `setStatus()` now calls `canSetStatus` and returns early (no `onStatusChange`, no
    state/UI change) when blocked — the previous "persist regardless, then show a warning"
    path is gone.
  - Each status radio button computes its own `canSetStatus` result; `assenti` /
    `paziente_nega` are rendered `disabled` (with an explanatory `title`) whenever the list
    is non-empty.
  - New inline message `data-testid="allergy-status-blocked"` is rendered whenever the
    block condition holds (derived from the list, not from a click attempt — so it's
    visible even though a disabled button cannot fire `onClick`).
  - The pre-existing `allergy-conflict` banner (for any *already persisted* contradictory
    legacy data) is left in place as a read-only safety net; it can no longer be reached
    through normal interaction going forward.
- `frontend/src/components/operator/PatientDetail.tsx`:
  - `allergySummary = deriveAllergySummary(cartella.allergie, cartella.allergieStatus)`
    computed once, alongside the existing `allergieGravi`/`hasAllergie`.
  - Quick-stat button (`data-testid="allergy-summary-state"`) shows the numeric count when
    `badge === 'count'`, otherwise `"0 — <label>"` (e.g. `"0 — Paziente nega allergie"`).
  - Riepilogo "Allergie" card shows the explicit `status-badge--<badge>` label instead of
    "Nessuna allergia registrata." whenever `badge !== 'count'`.

## Acceptance Criteria → Evidence

| AC | Description | Result | Evidence |
|---|---|---|---|
| AC1 | Setting "Paziente nega"/"Assenti" with empty list is allowed and persists | Implemented + asserted in Playwright spec (PUT observed via `page.on('request')`, `allergy-denied` badge visible) | `e2e/remediation/issue-244.spec.ts` lines ~78-86 |
| AC2 | Summary shows the same explicit state as the modal, before and after reload | Implemented + asserted | `e2e/remediation/issue-244.spec.ts` — `allergy-summary-state` assertions before/after `page.reload()`; `screenshots/summary-paziente-nega.png` (produced when the controller executes the spec) |
| AC3 | Adding an allergen forces status to "presenti" (unchanged pre-existing behaviour) | Verified unchanged, re-asserted | `e2e/remediation/issue-244.spec.ts` — `allergy-status-presenti` `aria-checked="true"` check |
| AC4 | Setting "Assenti" while list is non-empty is BLOCKED: disabled control, inline message, no PUT, no state change | Implemented + asserted | `frontend/src/components/operator/sections/AllergiesEditor.tsx` (`canSetStatus` guard); `e2e/remediation/issue-244.spec.ts` — `toBeDisabled()`, `allergy-status-blocked` visible, `cartellaPutRequests.length === 0` after forced click |
| AC5 | Unit tests cover every derivation/guard branch | Done | `frontend/src/lib/__tests__/allergyStatusModel.test.ts` — 13/13 passing, `unit-tests/allergyStatusModel.tap.txt` |

## Test Execution

### Unit tests (executed now)

```
node_modules/.bin/tsx --test frontend/src/lib/__tests__/allergyStatusModel.test.ts
```
Result: **13/13 pass, 0 fail** — full TAP output at
`artifacts/task-validation/244-allergies-absent-denied/unit-tests/allergyStatusModel.tap.txt`.

Not registered in `backend/package.json`'s hardcoded test list (that list is
backend-only/`backend/src/**`); this is a frontend-only pure-logic test with no frontend
test-runner script in this repo, so the direct `tsx --test` invocation above is the
documented way to run it, per the shared remediation contract.

### Type check / build (executed now)

```
cd frontend && NODE_OPTIONS=--max-old-space-size=4096 npx tsc -b   → "TypeScript: No errors found"
cd frontend && NODE_OPTIONS=--max-old-space-size=4096 npm run build → build succeeded (tsc -b && vite build)
```

### Playwright (authored, NOT executed by this implementer)

Per the shared remediation contract, the local stack (frontend :5173 + backend :3001 +
Postgres) is a single shared resource run serially by the controller — this implementer
does not start it or execute the spec. Parse-only gate was run and passed:

```
node_modules/.bin/playwright test --config e2e/remediation/pw.config.244.ts --list
→ Listing tests:
    issue-244.spec.ts:30:5 › issue #244 — allergy status is unambiguous in the summary and cannot be set to a contradictory state
  Total: 1 test in 1 file
```
Exit code: 0.

(Note: the global `npx` in this environment is rewritten by an `rtk` shell hook that fails
to parse the Playwright CLI output — `node_modules/.bin/playwright` was called directly to
bypass that, as it is the same binary `npx playwright` would resolve to.)

When the controller executes the spec against the live stack, expected outputs are:
`trace.zip`, `playwright-report/`, `test-results/` under this evidence directory (per
`pw.config.244.ts`), plus `screenshots/summary-paziente-nega.png`,
`screenshots/blocked-assenti.png`, and the final `screenshots/result.png` written by the
spec itself.

## CI Disposition

Not applicable to this pass — no CI run has been triggered yet (implementer stage only, no
push). Per the shared remediation contract: if Azure SWA deploy fails repo-wide (shared
infra) or secret-scan shows a transient 0-step startup failure on the eventual push, a
rerun should be requested; neither is caused by this change (frontend-only, no
config/env/secret touched).

## Files Changed

- `frontend/src/lib/allergyStatusModel.ts` (new)
- `frontend/src/lib/__tests__/allergyStatusModel.test.ts` (new)
- `frontend/src/components/operator/sections/AllergiesEditor.tsx`
- `frontend/src/components/operator/PatientDetail.tsx`
- `e2e/remediation/issue-244.spec.ts` (new)
- `e2e/remediation/pw.config.244.ts` (new)
- `artifacts/task-validation/244-allergies-absent-denied/*` (this report + contract + unit
  test output; canonical evidence dir per remediation dispatch)

## Note on Final Decision Wording

The string `CLOSED — VERIFIED` is apposed by Codex after independent verification, as per
the handoff protocol established in issue #239. This report does not claim that status.

Final Decision: READY FOR CODEX QA
