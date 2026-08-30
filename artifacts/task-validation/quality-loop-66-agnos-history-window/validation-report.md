# Cycle 66 validation report — bounded Agnos history rendering

## Source scope

- Branch: `codex/quality-loop-20260829`
- Parent commit: `bf2bda0a`
- Scope: Agnos conversation rendering and speech-output selection only.
- No assistant API, backend, action catalog or confirmation-state change.

## Implemented controls

- Long conversations initially render the latest 80 turns; older turns are explicitly disclosed and revealed in blocks of 80.
- Every visible item retains its absolute conversation index, preserving `pending.turnIndex` bindings.
- New sends, confirmations and cancellations return the rendered window to the latest 80 turns.
- TTS inspects only the newest turn instead of scanning all history and marks resolved responses even while speech is disabled, preventing later PHI replay.

## Evidence

| Gate | Result |
|---|---|
| Focused Agnos history/TTS/header/feedback tests | PASS — 8/8 |
| Full frontend suite | PASS — 254/254 |
| Frontend production build (`tsc -b` + Vite) | PASS |
| Cycle-scoped frontend ESLint | PASS |
| `git diff --check` | PASS |
| Independent security/privacy review | PASS — no introduced P0/P1/P2 |
| Independent UX/performance review | PASS — no introduced P0/P1 |

## Residual limitations

- The conversation remains in component memory while the app session is active; this cycle bounds initial DOM and TTS work but intentionally does not truncate state.
- Repeated explicit “Mostra i precedenti” actions can render more than 80 turns; every new consequential interaction collapses back to the latest window.
- Coordinated production deployment remains gated on access to the Railway project that owns the backend release set.
