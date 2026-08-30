# Cycle 62 task contract — lazy operator schedules

## Objective

Remove the unneeded all-operator schedule request from every login and load this growing admin dataset only while the schedule page is active.

## Acceptance criteria

- Login bootstrap never requests `/operators/schedules` or the operator directory schedule feed.
- Only an authenticated admin visiting `orari-operatori` starts the schedule request.
- Navigation and session changes abort obsolete reads; stale responses cannot update the next session.
- The page distinguishes loading, failure and a valid empty schedule and exposes retry.
- Returning to the page revalidates its retained snapshot.
- Focused and full frontend tests, production build, cycle-scoped lint and independent reviews pass without new P0/P1 findings or new lint debt.

## Safety envelope

- No endpoint, payload, persistence, RBAC or schedule-editing behavior changes.
- Do not stage unrelated local changes.
