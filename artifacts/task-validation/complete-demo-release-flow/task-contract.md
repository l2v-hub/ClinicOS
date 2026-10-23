# Task Contract

## Impact Classification
Workflow and release guard integration, isolated follow-up based on already independently verified PR498 source. No clinical application change. Provider credentials and actual protected-main deployment are not available to author/QA. Root alone publishes, configures and operates remote jobs after review.

## Current Behaviour
Exact demo helper/workflow exist, but release CLI installs default main-trigger-v1 callbacks and release workflow waits legacy deploy-backend.yml. Thus the exact reviewed-deployment route is not usable by the issue closure flow. Independent #453 end-to-end sanitized Playwright ZIP is 27,606,230 bytes (all 767 resources referenced); current collector, remote Git blob reader and release validator reject above 25MiB. Lossless deflate preserves all payloads but remains too large.

## Expected Behaviour
The protected-main release explicitly selects native-exact-commit-v1, obtains successful read-only preflight on current main before clinical merge, dispatches fixed exact demo workflow on the exact current merged-main SHA after merge, awaits authenticated matching successful run and records its immutable exact receipt/live identity through existing verifier. Legacy default policy remains available to existing callers. Authentic large traces are accepted under a strictly bounded 32MiB binary ceiling in collector/reader/release with bounded transport accommodating base64 JSON.

## Acceptance Criteria
- Existing default main-trigger-v1 unchanged unless strict explicit enum selects exact; reject unknown policy before any mutation. Pass selected policy through preflight, recording and completion/live revalidation. Fixed ClinicOS repo/demo target/main workflow only; no arbitrary dispatch URL, branch, SHA, target or credential fallback.
- Exact preflight dispatch and successful receipt precede merge, on freshly checked current main. Exact deploy follows only successful protected merge, on exact merged main, with immutable run proof (repo/path/event/headSHA/run attempt/success) and existing provider/live receipt validation. If main moves or proof absent/mismatched, fail closed, preserve progress, do not duplicate dispatch/mutation automatically. Do not claim a POST204 proves job success; bounded discovery distinguish prior runs, ambiguity, retry/timeout and terminal failure.
- No demo-secret read in release/PR runtime or relay. Dedicated protected main-only demo environment remains in exact workflow. No weakening native six gates, actual Claude+Codex approval, releaseHold, histories, issue closure/deploy proof or human-required approvals. Do not use --admin or force merge.
- Avoid deadlocks: orchestration workflow's concurrency group remains distinct from railway-demo queue it waits for. Actions dispatch capability explicitly bounded to this main workflow; no broad action scheduling from issue strings. Keep pinned actions, no untrusted PR execution with credentials, and dedicated demo token. Existing separate runtime deployment scope remains intact.
- Evidence 32MiB ceiling applies consistently collector/reader/release; preserve regular-file containment, media/ZIP validity, exact declared bytes/hash and remote blob size verification. Bounded base64 JSON output enough for32MiB; no unlimited buffer or raw trace credential publication. Tests at limit, over limit and mismatched size/hash meaningful.
- Isolated worktree only, scoped files below; no editing current PR498/483/497 source, old proofs, Git/index/refs, canonical state, GitHub, provider, database/services or local auth files. All code/tests run with trusted credential-stripped verification runner. No installs or executable downloads. Preserve failed attempts and honest independent QA status.

## Scope
- agent-team/src/bug-pipeline/release.mjs
- agent-team/src/bug-pipeline/github.mjs
- agent-team/src/bug-pipeline/workspace.mjs
- agent-team/src/bug-pipeline/evidence-limits.mjs
- agent-team/src/bug-pipeline/exact-demo-dispatch.mjs
- agent-team/tests/bug-pipeline/release.test.mjs
- agent-team/tests/bug-pipeline/github.test.mjs
- agent-team/tests/bug-pipeline/workspace.test.mjs
- agent-team/tests/bug-pipeline/exact-demo-dispatch.test.mjs
- .github/workflows/codex-bug-release.yml

## Test Plan
Meaningful existing release, github, workspace tests plus new fixed dispatch tests with injected fake transport/clock only, no live provider/actions/credentials. Cases: explicit exact vs default/invalid policy, correct run receipt and fresh exact SHA, wrong repo/path/event/SHA/attempt, missing/old/ambiguous/failed run, changed main before dispatch, preflight/deploy distinction, timeout with no repeated mutation, completion recheck. Verify workflow is main-only with pinned trusted code and distinct queues; retain old regression cases and no weakening. Full bug-pipeline test suite once focused passes; independent separate QA required.

## Evidence Plan
Private /workspace/.clinicos-cloud/complete-release-flow-20261021/author, source/index/old proof freeze before/after, complete per-command private receipts, diff/source manifest/contract hash, report/summary/STOP/seal. No provider or deploy proof claimed. Root review publication only after author STOP and separate independent QA.

## Gate Status
READY FOR IMPLEMENTATION after canonical nonce remote readback. Plan executes in isolated branch codex/complete-demo-release-flow on b07317f4d7eee2bd873ff465d0df317459fcde28; current actual model reviews are preserved unchanged.

## Authorized Scope Amendment — immutable dispatch correlation
Root approved before editing .github/workflows/deploy-demo-exact-commit.yml: existing Actions run metadata does not expose dispatch inputs, and deploy runs also emit a preflight receipt, so SHA/path/event plus prior run IDs cannot alone establish operation. Add a bounded unique dispatch_id input and fixed run-name containing operation, exact reviewed SHA and dispatch_id; validate dispatch_id before credentials. New orchestration persists its immutable dispatch intent before one POST and requires exact display_title correlation, no automatic duplicate dispatch. Preserve protected-main/SHA/workflow_ref guards, pinned actions, environment and target. This extra workflow path is authorized within the same isolated follow-up; prior contract bytes are retained separately.
