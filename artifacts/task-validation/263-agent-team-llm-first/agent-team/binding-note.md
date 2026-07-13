# Evidence binding note — issue #263, attempt 3

Same non-circular architecture as attempt 2 (`agent-team/src/core/binding.mjs`, schema
`agent-team/protocol/schemas/evidence-binding.schema.json`).

Chain:

1. Evidence commit `ab09899decb39d62c9343348c2bc1efedfbd8b58` commits all attempt-3 evidence (fresh TAP runs,
   doctor smoke, build, reproducible diff-check, real-timestamp command log, TDD RED/GREEN for
   QA-263-010 and QA-263-011, attempt-3 validation report and remediation map, and the preserved
   Codex attempt-2 QA artifacts attributed to `codex-qa`).
2. The committed `artifact-manifest.json` / `development-handoff.json` in this directory use
   that commit as `subject_sha`; every artifact entry carries SHA-256 and git blob SHA
   (72 artifacts).
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
publication) is recorded in the attempt-3 handoff comment.
