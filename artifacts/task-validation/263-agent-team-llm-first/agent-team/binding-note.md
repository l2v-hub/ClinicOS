# Evidence binding note — issue #263, attempt 9

Same non-circular architecture as attempts 2–6 (`agent-team/src/core/binding.mjs`, schema
`agent-team/protocol/schemas/evidence-binding.schema.json`).

Chain:

1. Evidence commit `652210dd99c0d666624e11f0e8103ddaa7042488` commits all attempt-9 evidence (fresh TAP runs 106/106,
   doctor smoke 21/21, full build, diff-check, real-timestamp command log, preserved attempt-8
   TDD RED/GREEN for QA-263-014, attempt-9 TDD RED/GREEN for QA-263-015, static
   secret/prohibited-action scan, attempt-9 validation report and remediation map, and the
   preserved Codex attempt-8 QA artifact attributed to `codex-qa`).
2. The committed `artifact-manifest.json` / `development-handoff.json` in this directory use
   that commit as `subject_sha`; every artifact entry carries SHA-256 and git blob SHA
   (88 artifacts).
3. The final PR head (the commit adding these two JSON files and this note) is bound by the
   **evidence_binding envelope**, generated after the final commit and published only as a
   protocol comment on issue #263 and PR #264 — never committed, so no circular SHA dependency
   exists.
4. Self-reference rule: the manifest never enumerates the files rewritten by the binding commit
   itself (`artifact-manifest.json`, `development-handoff.json`, `binding-note.md`) — enforced
   by `verifyEvidenceBinding` and its integration tests.
5. `verifyEvidenceBinding` proves, reading exclusively committed state at the PR head: envelope
   subject equals the PR head; the manifest blob and SHA-256 at the head equal the envelope's
   declared values; the committed manifest's own subject equals the envelope's
   `manifest_subject_sha`; and every artifact's git blob ID and committed content digest match
   the manifest.

The dogfood verification of this very PR (envelope built and verified at the final head before
publication) is recorded in the attempt-9 handoff comment.
