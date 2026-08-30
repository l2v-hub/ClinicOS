# Cycle 56 validation report — consistent bed editing dialog

## Result

PASS. Bed editing now uses the shared accessible dialog behavior and permits only one in-flight update.

## Evidence

- `npm --workspace frontend test`: 238 passed, 0 failed.
- `npm --workspace frontend run build`: TypeScript and Vite production build passed; 295 modules transformed.
- Focused ESLint on the changed source and test: passed.
- `git diff --check`: passed (line-ending warnings only on existing Windows working-copy policy).
- UX/performance independent review: PASS, no P0/P1/P2.
- Security independent review: PASS, no P0/P1/P2.

## Behavior verified

- The shared surface supplies dialog naming, initial focus, focus trap, Escape ownership and trigger restoration.
- Overlay, Escape, close and cancel are disabled while the PUT is pending.
- Status, notes and save controls are disabled while pending and expose `Salvataggio…`.
- A synchronous ref guard rejects duplicate saves before React can re-render.
- HTTP and network failures keep the dialog open; `finally` always releases the guard.
- Existing endpoint, payload, error messages and reload flow are unchanged.

## Test iteration note

The first run exposed an incorrect new-test expectation (four disabled controls); inspection confirmed the implementation correctly disables five. The assertion was corrected and the definitive full run passed.

## Remaining scope

The shared `ConfirmDialog` still has a separate cross-application focus-containment debt and is the recommended next cycle.
