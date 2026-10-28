# Results and evidence boundaries

## UI source and independent review

The prepared source is `4c85fdf5a97eea10c8efcc6d105cd32de054e030`. Its four changed files are the two allergy/contrast UI fixes from UI15 and UI16. UI15's independent contrast failure remains preserved: the prior severe pairing measured 3.955:1 and the regular pairing 3.147:1, both below the 4.5:1 small-text threshold. UI16 uses the existing `--text` foreground. Independent source analysis measured 14.380:1 on the severe background and 14.916:1 on the regular background. The actual browser run on final source measured 12 desktop/mobile, normal/severe, hover/focus/normal groups; the minimum was 14.380:1.

The UI author reports 1,550 frontend tests and a successful frontend typecheck. Independent UI16 review reports 33 focused tests, successful typecheck, and passing negative controls. The independent reviewer did not rerun the entire frontend suite.

## Fresh browser runtime5

The app scenario used the production frontend with the exact backend app, normal simulator authentication, real HTTP, and owned PostgreSQL. A supervisor confirmation returned HTTP 200 and produced exactly one owned SQL administration row. `confirmedAt` was persisted, and reload showed the durable result. The scoped 503 scenario showed no actions and no writes. This is a load-failure check; it is not proof of a PS-unknown retained-modal state.

The component scenario rerendered the actual production React component with synthetic props and a callback recorder. It recorded one allowed callback, zero blocked callbacks, and zero non-asset HTTP requests. It verifies dialog behavior, not clinical HTTP/PG end-to-end behavior.

Only the finalized sanitized traces and finalized videos, screenshots, `results.json`, `trace-privacy.json`, and `ffprobe.json` are included. Their hashes match the runtime5 output manifest. The raw-private trace archives and process/environment data remain excluded. Runtime5 media verification passed CRC and residual signed-token scans. The separate runtime attempts 1 through 4 remain intact with their respective failed or partial states.

## Real PostgreSQL concurrency proof

Concurrency runtime2 used base source `f26625a12bba1052da5b9af88bad88c1bf12420c`; prepared source integration verifies backend byte-equivalence with `4c85fdf5a97eea10c8efcc6d105cd32de054e030`. The real Assistant Tool request was observed waiting on the control transaction's patient-row lock. PostgreSQL logged SQLSTATE 40001 for the waiter, and the authenticated endpoint returned HTTP 409 with a conflict response. The clinical snapshot was unchanged on failure. The unlocked positive control returned HTTP 200 and durably recorded one dose. Two forged import confirmation forms returned HTTP 409 with no clinical snapshot mutation. Deadlock count remained zero.

This verifies the real Assistant Tool boundary and correlated PostgreSQL serialization error. It does not claim that a natural-language or `executeSkill` flow surfaces the conflict; the skill path may retry and succeed after one 40001.

## Historical and pending gates

The original eight `bb12` proof aliases remain unchanged. This new browser runtime is scoped to the current UI source and does not claim the eight historical clinical journeys were rerun on `4c85`. Publication-head native checks, a new Claude review, final Codex review, deployment, and closure remain pending. No state in this candidate advances those gates.
