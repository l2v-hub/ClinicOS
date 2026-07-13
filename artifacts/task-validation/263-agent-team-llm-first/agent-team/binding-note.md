# Evidence binding note — issue #263, attempt 2

QA-263-005 remediation replaces the attempt-1 binding scheme with the non-circular authoritative
envelope implemented in `agent-team/src/core/binding.mjs` (schema:
`agent-team/protocol/schemas/evidence-binding.schema.json`).

Chain:

1. Evidence commit `7c4fb0b69a27f61e707e09ebb9e9cbdb1018fa59` commits all attempt-2 evidence.
2. The committed `artifact-manifest.json` / `development-handoff.json` in this directory use that
   commit as `subject_sha`; every artifact entry carries SHA-256 and git blob SHA (70 artifacts,
   including the preserved Codex QA artifacts attributed to `codex-qa`).
3. The final PR head (the commit adding these two JSON files) is bound by the **evidence_binding
   envelope**, generated after the final commit and published only as a protocol comment on issue
   #263 and PR #264 — never committed, so no circular SHA dependency exists.
4. `verifyEvidenceBinding` proves, reading exclusively committed state at the PR head: envelope
   subject equals the PR head; the manifest blob and SHA-256 at the head equal the envelope's
   declared values; the committed manifest's own subject equals the envelope's
   `manifest_subject_sha`; and every artifact's git blob ID and committed content digest match the
   manifest. Any disagreement (including tampering after manifest generation) is rejected — proven
   by `agent-team/tests/integration/evidence-binding.test.mjs` against a real git repository.

The dogfood verification of this very PR (envelope built and verified at the final head before
publication) is recorded in the handoff comment and the attempt-2 validation report.
