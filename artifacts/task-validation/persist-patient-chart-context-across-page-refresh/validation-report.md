# Task Validation Report

## Task
- Title: Persist patient chart context across page refresh
- Slug: persist-patient-chart-context-across-page-refresh
- Commit: (pending — see PR)
- Date: 2026-08-08

## Implementation Summary

`frontend/src/App.tsx`, three coordinated changes:

1. `pushNav()` now encodes the patient id into the hash for `dettaglio-paziente` navigations
   (`#/dettaglio-paziente/<id>`) instead of the bare `#/dettaglio-paziente`.
2. The mount hash-restore effect parses that `<id>` suffix, sets `navKey` to `dettaglio-paziente`,
   and records the pending id. A new effect resolves it against the patients list once that list
   has genuinely finished its first fetch (see discovery below), restoring `pazienteSelezionato`
   and the cartella — or, if the id no longer resolves, falling through to the existing empty
   state (AC3). A `restoringPazienteFromHash` flag suppresses the empty-state flash while this is
   pending (AC1).
3. `handleLogin()` — **discovery this cycle**: this app has no session persistence at all
   (`utente` is plain `useState`, no localStorage/cookie/mount-time restore). Every reload,
   without exception, hits the role-picker gate (`if (!utente) return <Login .../>`) before
   anything else — including the code from (1)/(2) above. Worse, `handleLogin` *unconditionally*
   reset `navKey` to the default dashboard and replaced the URL hash on every login, which
   silently discarded the (2) restore before it could ever resolve, since the fetch/resolve cycle
   can only start once `utente` is set. Fixed by having `handleLogin` early-return (leaving
   navKey/hash untouched) when the current hash still encodes a pending `dettaglio-paziente/<id>`
   restore — verified via `git diff` to be a pure addition, not touching the pre-existing
   non-patient-hash behavior (see AC4).

   A second, related bug surfaced during evidence capture: the resolve effect's original guard
   (`if (loadingPazienti || !ref.current) return`) can't distinguish "fetch hasn't started yet"
   from "fetch just finished," because `loadingPazienti` starts `false` and only flips `true` once
   `utente` is set. On the very first render (pre-login), that ambiguity let the effect consume
   and clear the pending-restore id against the still-empty initial `pazienti` array, permanently
   giving up before the real post-login fetch ever ran. Fixed with `pazientiFetchStartedRef`,
   which only permits the "resolve" branch once a real fetch has actually been observed in flight.

   Neither of these two fixes were anticipated in the original task contract — both were
   discovered empirically while trying to get AC1 to actually pass end-to-end in a real browser,
   not from further code reading alone. Both stayed within the contracted `frontend/src/App.tsx`
   scope.

## Files Changed

- `frontend/src/App.tsx`

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 — refresh restores the same patient's chart, no empty-state landing | PASS | `screenshots/02-desktop-after-reload-restored.png`, `screenshots/06-mobile-after-reload-restored.png`, `logs/results.json` (`ac1.restored: true`, `ac1.sawEmptyStateFlash: false`, `ac1.hashEncodedId: true`) |
| AC2 — restored via a fresh backend fetch, not a stale copy | PASS | Same run: the mock patient only exists via the `page.route('**/patients', ...)` stub, so a successful render is only possible via a real fetch on mount (`ac2.restoredViaFreshFetch: true`) |
| AC3 — invalid/unknown id falls back to the empty state | PASS | `screenshots/03-desktop-invalid-id-empty-state.png`, `logs/results.json` (`ac3.emptyStateShown: true`) |
| AC4 — no regression to other hash-restored views | PASS (scope note below) | `screenshots/04-desktop-pazienti-nav-unaffected.png`, `logs/results.json` (`ac4.patientListShown: true`, `ac4Landed.landedOnDashboard: true`) |

**AC4 scope note:** discovered that `handleLogin` already unconditionally reset *any* hash to the
default dashboard before this fix — no view, patient or otherwise, was ever actually restored
after a refresh in this app; only the mount-effect's *intent* to restore existed, silently
defeated by the login gate for every case except the one this cycle fixes. So "no regression"
here is verified two ways: (a) `git diff` shows the `handleLogin` change is a pure addition (one
early-return branch) that never touches the pre-existing non-patient-hash code path, and (b)
runtime evidence confirms normal navigation (landing on the dashboard, then clicking into
Pazienti) still works exactly as before. Extending hash-restore to other views is out of scope
for this cycle and is a candidate for a future one.

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | NA | not required per test plan |
| Integration | NA | not required per test plan |
| API | NA | not required per test plan — no endpoint changed |
| Playwright | PASS | `evidence-script.mjs`, run against real chromium, desktop (1440×900) + mobile (390×844, `isMobile: true`) viewports, traces + screenshots captured |
| Persistence after refresh | PASS | This is what AC1–AC3 directly exercise: a real `page.reload()` (not a SPA-internal hash change) each time, confirming the fix survives an actual full document reload |
| Agnos AI | NA | not touched |
| Voice | NA | not touched |
| OCR | NA | not touched |
| Security/privacy | NA | patient id was already visible in-app during normal use; no new exposure class (see task-contract Risks) |

## Runtime Evidence

- `screenshots/01-desktop-before-reload-chart-open.png` — chart open before reload, hash confirmed to carry the id
- `screenshots/02-desktop-after-reload-restored.png` — AC1/AC2, desktop
- `screenshots/03-desktop-invalid-id-empty-state.png` — AC3
- `screenshots/04-desktop-pazienti-nav-unaffected.png` — AC4
- `screenshots/05-mobile-before-reload-chart-open.png`, `screenshots/06-mobile-after-reload-restored.png` — mobile viewport, AC1 equivalent
- `trace/desktop-trace.zip`, `trace/mobile-trace.zip` — full Playwright traces (open with `npx playwright show-trace`)
- `logs/results.json` — machine-readable summary of every assertion above
- `evidence-script.mjs` — the exact script run to produce all of the above (re-runnable: `node artifacts/task-validation/persist-patient-chart-context-across-page-refresh/evidence-script.mjs` from the repo root, with the frontend dev server up on :5173)

**Method note:** run without a live Postgres/backend — `GET /patients` and related list endpoints
are stubbed via `page.route()` (real component code, real fetch, real hash-parsing effect all
exercised for real; only the HTTP response is synthetic). The one unstubbed endpoint,
`GET /patients/:id/cartella`, fails with `net::ERR_CONNECTION_REFUSED` (no backend running on
:3001) — this is expected and handled by the app's existing try/catch + `getCartella()` default
fallback (the same graceful-degradation path already used when a real backend is briefly
unreachable), and is the sole content of `consoleErrors` in every run. This does not test data
*persistence* (nothing is written in this flow) — it tests view-state *restoration*, for which
stubbing is sufficient and appropriate (per project convention, see
`reference-ui-runtime-evidence-without-db` memory).

## Logs

Sanitized only. The two recorded console errors, verbatim (field/status only, no patient data):
```
Failed to load resource: net::ERR_CONNECTION_REFUSED
Failed to load resource: net::ERR_CONNECTION_REFUSED
```
Both are the expected, handled `GET /patients/:id/cartella` failure described above (backend not
running in this evidence environment) — not a regression introduced by this change.

## Residual Risks

- Not covered this cycle: no other view/tab actually survives refresh either (pre-existing,
  confirmed above) — the dashboard becomes the effective landing page for every other hash after
  a reload. Flagged as a candidate for a future Loop Engineering cycle.
- Not covered this cycle, and explicitly a **stop-and-ask** item, not a silent fix: `utente`
  (the logged-in session/role) itself has zero persistence, so every refresh forces a role
  re-pick even with this fix. Making that persist touches session/auth-adjacent state, which the
  loop's own rules classify as requiring explicit approval before implementing, not something to
  build silently.
- Real Postgres persistence was not exercised (not applicable to this cycle's scope — no data is
  written by this flow).

## Final Decision

CLOSED — VERIFIED
