# Task Contract

## Impact Classification
High: controller ownership, external review quality gate and GitHub automation activation. No clinical/UI/schema/provider configuration changes. User explicitly requests autonomous GitHub orchestration now; existing root takeover and completed histories remain intact. Codex adaptive implementation plus existing Claude Max independent review is the supported baseline. Optional Claude implementation on the user's PC is a separate execution capability; never silently substitute its read-only reviewer or send Max tokens to Actions.

## Current Behaviour
Main2ee298957c3e1733b01a4b4aca4b48b890032f69. Canonicalb67bb2ca464216f0cd5e81f7a4ab41a8a0dcbb3d preserves all earlier attempts/reviews and root-owned subjects. Five application PRs dualreviewed,23originalissuesopen awaiting real deploy. Three workflow IDs387194409/387194410/387614988 disabled_manually. Issue/comment events and periodic15minute recovery already exist. Actual newofficial-endpoint Railwayidentity checks39854291185/39854740453 both fail unknown before private reads. Do not retry them unchanged. Source analysis finds pipeline ignores operator ownership and external finalQa is channel-specific; verify before fixing.

## Expected Behaviour
Restore safe autonomous new-issue processing and existing SHA-bound Codex/Claude review communication without replaying/mutating operator-owned legacy work. Each approved external report gets fresh independent Codex validation before ready. Existing authorized labels remain codex-run/codex-triage and claude-review-ready/codex-review-ready. True released code and per-issue evidence remain required for closure. Distinguish active workflow/configuration, successful live trigger, actual model execution, actual review and actual deploy; do not claim all because one succeeds.

## Acceptance Criteria
1. Existing independent sync projection can be activated/tested without canonical state, budgets or approval mutation; preserve live own-label states and provenance. Record actual before/after and authentic run attempt1. Do not process model work/deploy through that proof.
2. Before activating controller, explicitly exclude operator-owned subjects from every automatic state/label/model/release transition, while still reserving all their claimed issues and occupied scopes across the relevant collections. Preserve whole historical entity data, counters, reports, claims and holds. No archive/delete/false deployed status merely to clear the queue.
3. Every actual approved externalreview channel requires fresh Codex finalQa bound to live SHA/round/feedback. Preserve correction/review retry history and existing policy/human/native gates. No invented approval.
4. Use meaningful state/scope/negative-provenance regression tests and independent QA on frozen source. Do not rerun clinical E2E unchanged. Publish real source with task/evidence, all actual native checks and genuine Claude review followed by fresh independent final Codex before ordinary protected manual merge.
5. Activation verifies existing OpenAI model metadata without inference/secret exposure first. New automation never invokes Claude API; user Max stays on authenticated existing local worker. GitHub access alone does not give remote PC process control.
6. Actual end-to-end activation requires a safe explicitly marked diagnostic activity using authentic GitHub events, with no clinical data/deploy/false issueclosure. No mere workflow enable/pass can be called full clinical delivery. Real provider/release prerequisites remain visible. Every POST is intent-recorded and observed, never blindly replayed.

## Scope
Source allowlist to be frozen after bounded analysis: agent-team/src/bug-pipeline/pipeline.mjs, external-review.mjs and their focused regression tests; add another path only with recorded scope amendment before edits. Existing synchronization workflow enable/once dispatch and existing regression workflow metadata-probe once dispatch are authorized reversible configuration/read-only-provider actions. No provider mutations, secrets extraction/copy, tests on online DB, clinical code, unrelated refactor, deletion of history, forced Git, protection weakening or native state fabrication.

## Test Plan
Inspect code contract first; unit/integration tests with actual controller/state save boundaries and synthetic injected runners. Negative cases operator-owned legacy subject across all collections, inherited claimed issues/scope collisions, no mutation/no model, automatic unowned subject still progresses, every external report channel, changed SHA/round/fingerprint, findings/QA failure. Independent reviewer selects additional probes; syntax/diff/provenance. Native6checks and actual SHA-bound modelreview remain mandatory for new source publication. Source-byte unchanged existing functional evidence may be inherited explicitly.

## Evidence Plan
Private /tmp/clinicos-autonomy-activation-20261022 with contract, initial identities, durable operation intents, actual workflow inventories/responses/run IDs/attempts/source, source manifests/tests/QA seals and sanitized receipts. Publish only current relevant packet on the eventual source PR, retaining old root history canonical untouched. Each outcome is PASS/FAIL/PENDING with its actual scope; credential rejection unknown remains unknown. Dashboard shows real stages and required remaining personal/provider capability.

## Gate Status
READY FOR IMPLEMENTATION after source reservation; independent sync/metadata read probes authorized now. Source edits and controller/release activation require applicable gates above.
