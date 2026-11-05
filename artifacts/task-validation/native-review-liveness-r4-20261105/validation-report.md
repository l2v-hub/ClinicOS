# Validation report

Final Decision: IMPLEMENTED NOT VERIFIED

Source commit: b3708634d1a4a3d094daeb1dcc3acd6a40d26565; base d3a876dbc005ea16c2c88cf35e5bb3e7ebb23d47. Ten source/test files including the formerly untracked loader fixture were copied with exact SHA-256 checks. The source commit and this evidence commit are separate.

The integration worktree ran the offline native-guard, cloud-review, capacity, evidence and recovery selection excluding checkpoint-recovery: 231 tests, 227 pass, 4 skipped Linux-only, 0 failed. The author ran the same selection with identical counts. The peer reported 162 tests, 158 pass, 4 skipped. These are fake/offline tests; no live Docker, provider, model, native queue, database or credentials were used. TAP artifacts contain exact unmodified output. Source syntax, formatting and git diff checks passed at author handoff.

The author also ran an overly broad selection including checkpoint-recovery: 243 tests, 224 pass, 15 fail, 4 skip. The 15 failures report that the controller checkpoint requires its registered owned worktree; they are preserved in author-broad-including-checkpoint-failures.tap and are not counted as a passing suite. No bypass was applied. Linux factory/certificate integration remains unverified locally.

The complete fourth advisory raw response and its result are preserved exactly as received/decoded, alongside process and start receipts and the original context-limitation receipt. This was local advisory ordinal 4 of 4; zero remain and no further model call, native review, reset, allowance or approval is claimed. The input lacked workspace.mjs, review-policy.mjs and external-review.mjs, and preparation/runner/preflight were modified after start; therefore the advisory is incomplete and cannot approve this source. The preflight digest printed inside the original limitation receipt differs from the actual present preflight file. The separate receipt manifest records actual file bytes and SHA-256; neither asserts the modified preflight was the one used at start.

Required gates remain current source-bound CI, independent final QA, appropriate native human protected approval and Linux qualification where applicable. Historical run 41937588247 and its exact failure location remain unknown. Candidate deployment, feature parity and release readiness are not established. No deployment or baseline alteration occurred.
