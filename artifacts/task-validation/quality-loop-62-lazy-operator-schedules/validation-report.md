# Cycle 62 validation report — lazy operator schedules

## Outcome

PASS. Login no longer downloads the all-operator schedule dataset. An authenticated admin loads it only while `orari-operatori` is active, with request cancellation, session/sequence guards, explicit loading/error/valid-empty states and retry.

## Implementation evidence

- Removed both schedule endpoints from the session bootstrap; ordinary operators no longer request this dataset.
- Added a navigation-scoped `/operators/schedules` read for the admin schedule page.
- Navigation, login and logout invalidate and abort obsolete requests; results from a prior request/session cannot update current state.
- Returning to the page revalidates the retained snapshot. Fresh entry clears stale feedback, while duplicate same-route navigation preserves the actionable retry state.
- The page selects the first active operator when the directory arrives after mount and never presents a failed read as a valid empty schedule.

## Verification

- Focused lazy-schedule tests: PASS, 2/2 on the final diff.
- Full frontend suite: PASS, 244/244.
- OperatorSchedule and cycle-test ESLint: PASS.
- Frontend TypeScript + Vite production build: PASS.
- `git diff --check`: PASS.
- Bundle evidence: `OperatorSchedule` remains a separate lazy chunk (6.54 kB raw, 2.58 kB gzip); the initial request now omits the schedule API call.

## Existing lint baseline

`App.tsx` still has six React compiler lint errors and one exhaustive-deps warning at untouched lines. Running ESLint against the pre-cycle `HEAD:frontend/src/App.tsx` reproduces the same findings, so Cycle 62 introduces no new App lint debt. These findings should be handled in a dedicated refactor rather than suppressed.

## Independent review

- Security: PASS. Admin-only navigation gates the read; abort, sequence and session guards prevent cross-session stale data; login/logout clear the snapshot.
- UX/performance: PASS. The login request is removed, page states are truthful and retryable, and operator selection works even when directory data arrives after mount.

## Residual risk

- The endpoint still returns the complete schedule collection when the admin explicitly opens the page. This is bounded by facility staffing in practice, but server pagination/virtualization remains a future scale improvement for very large multi-facility deployments.
