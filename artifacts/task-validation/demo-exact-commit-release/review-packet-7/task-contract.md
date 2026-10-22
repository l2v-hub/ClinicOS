# Task Contract

## Impact Classification
Bounded safe operational diagnostics only for the demo environment admin bootstrap. No changes to authorization, request order, policy writes, endpoint allowlist, old repository configuration behavior, workflow, clinical or Railway operations.

## Current Behaviour
Actual exact-SHA admin dispatch39644097175 on9bf62a27df909d53b9607d1e766723978d98ada0 failed its configure-repository job119374991187 with only the fixed message Demo environment restriction blocked; no provider details are printed. Context validation passed. Actual subsequent environment read still shows null policy and updated_at2026-08-30, so restriction is not applied; the failed phase/HTTP denial is not observable. Cannot infer token permissions or safely suggest credential edits from this opaque failure. Prior offline QA6 remains PASS and live operation failed/unproven; preserve every attempt/report.

## Expected Behaviour
Emit one finite safe diagnostic identifying the failed operation phase, sanitized HTTP status/code and own read/write-attempt counters, with no provider body, message, token, URL, route, actor or arbitrary values serialized. Preserve existing fixed safe error line if consumers depend on it. This makes the next single controlled invocation diagnostic instead of blind retry. Request behavior remains identical.

## Acceptance Criteria
- Only two scoped source files plus new packet. No request/authorization/policy behavior change, no mutation retries, no inferred404-as-empty or token scope bypass. Legacy configureRepository behavior remains byte-identical.
- Diagnostic phases and codes come from closed local enumerations (context, authorization, repository/environment identity, policy/protection inventory, secret-presence metadata, fixed environment/policy mutation, generic validation/transport). Never print the route/actor/body or error.message. HTTP statuses only a validated numeric classification; counters bounded integers derived from actual own attempts.
- For401/403/404/422/429/5xx/transport/validation failures, actual CLI synthetic regression checks expected safe phase/code/counters and nonreflection of adversarial secrets/errors. In particular prewrite GETpolicy404 and environment403 report zero write attempts. Failure after a mutation reports attempted count and never claims zero mutation or retries.
- Existing targeted80tests and new meaningful diagnostics tests only; no unchanged full1060/local clinical suite repetition. Fresh independent narrow QA before publication. Native six still required on resulting SHA before Claude handoff/merge.
- Author STOP with hashes/inode/proof preservation. Root sole Git/GH/canonical/provider writer. No real credentials, network, Git writes, provider calls, settings application or closure claim.

## Scope
- scripts/quality-gate/configure-bug-repository.mjs
- agent-team/tests/bug-pipeline/repository-settings.test.mjs

## Test Plan
Existing targeted repository-settings suite and actual CLI/fake-fetch phase/status/secret-reflection regressions; preserve exact exit codes. No real network or unrelated clinical tests.

## Evidence Plan
Private /workspace/.clinicos-cloud/demo-exact-author7-20261021, new public artifacts/task-validation/demo-exact-commit-release/codex-followup-5. Preserve actual failed run log/metadata and all six implementation histories unchanged; safe MD/JSON only.

## Gate Status
READY FOR IMPLEMENTATION after authenticated user-session6→7 budget reservation/readback, continuation until resolution already authorized. Actual admin failure remains unresolved, no risk acknowledgement invented.
