# Luna state transport documentation update

Status: `implemented-awaiting-parent-integration`.

Changed exactly two documentation paths: `docs/codex-bug-workflow.md` and `.claude/skills/clinicos/references/bug-delivery.md`. Added exact-serialized-byte transport selection (Contents through 1 MiB; Git Data above), retained 8 MiB raw-state plus pending-result cap, immutable candidate bytes/expected file SHA, exact parent/base tree and preservation of unrelated valid root entries, fresh ownership/guard/ref checks, non-forced update, proven-conflict-only opt-in bounded rebase, and fatal handling/readback for rejected or uncertain writes. Clarified that the threshold is transport policy rather than a proven HTTP 400 cause, and that the no-op endpoint probe does not prove source QA, peer review, deployment, or complete autonomy. Existing label, review, budget, Max local handoff, final Codex, and release proof policy remains intact.

Baseline source7 bytes and hashes matched the pre-invocation receipt. Exact delta: `two-file.diff`; before/after read receipts: `read-receipts.json`. No secrets, canonical state, raw tokens, or clinical data were included.

Tests run: 0 (documentation-only task). Manual verification: inspected exact diff; it adds one paragraph in each assigned file.
