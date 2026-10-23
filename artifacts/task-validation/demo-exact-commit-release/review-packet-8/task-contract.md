# Task Contract

## Impact Classification
Bounded existing demo-environment administrator bootstrap, fixed target only. No workflow, credentials, authorization, branch/review checks, Railway deployment, clinical or database changes.

## Current Behaviour
Actual diagnostic run39649785587/job119394782991 on 5940f563f48f9a1eae44d6e2dc2cfa989144a3ee reports policy_inventory/http_denied404 after4reads and0writes. Actual environment read remains id20880188544/name glistening-friendship / demo, deployment_branch_policy null and updated30August. Existing helper lists deployment-branch-policies before enabling custom policies, so it cannot bootstrap this real null-policy environment. No cause is attributed to token scope/expiration; no new credentials requested.

## Expected Behaviour
An explicitly authorized fixed-target bootstrap can restrict the known null-policy environment by enabling custom branch policy with all unrelated protections preserved, verify that exact state, and then inventory actual policies before creating main if absent. Never infer404 means empty, never retry mutations, never delete or broaden conflicts.

## Acceptance Criteria
- Preserve exact dispatch reviewedSHA/workflow/repository/admin/triggeringactor guards and fixed existing envID/name, no create-environment fallback. Legacy configureRepository export byte-identical. Only two scoped files plus new safe packet.
- When before.deployment_branch_policy is exactly null, validate readable protection/custom-rule/secret-presence metadata and complete environment update body BEFORE writes; do not call disabled policy inventory and do not swallow404. PUT only fixed custompolicy enablement with preserved reviewers/timers/self-review/adminbypass, then immediate GET identity/policy/unrelated-protection readback. Only after that successful readback perform complete bounded actual policy inventory and validate main-only. If unknown/conflicting/malformed/nonmain/tag/wildcard policy appears, refuse with no deletion and no further write; report actual1writeattempt, notzero. Prior null policy allowed every branch; enabling custom policies is restrictive, never a credential/protection bypass.
- Existing readable enabled/protected policy modes keep prewrite complete policy inspection/conflict guards. Preserve diagnostics finite closed fields and actual counters, no arbitrary provider body/error/string/URL/token output. Policy404 after enabling or for preexisting modes still fails; no404-as-empty. No mutation retries or rollback/delete of unreviewed patterns.
- Create exactly main branch policy only when complete inventory is empty; preserve existing exact main without duplication. Final environment, exact singlemain/no tags, customprotections and unrelated settings readbacks all required before verified status. Repeated successful invocation idempotent zero writes. Partial failure afterPUT orPOST reports actualattempts and never success. Repo-level secrets remain explicitly not confined by environment restriction; no migration/rotation/secretread.
- Update meaningful existing fake-request/actualCLI regressions for genuine API contract: null-policy inventory inaccessible beforePUT; queryorder/readback guards; null with afterenable404, conflict, duplicate, wildcard/tag/malformed inventory; preserved human/timer/custom protections, idempotence and PUT/POST failure counters. Do not delete old negative scenarios merely to pass; distinguish initialcustommode prewritezeroWrites and explicitnullbootstrap after1write. Existing old CLI policy404 scenario uses protectedmode and retains safe4reads0writes; newnull cases must be explicit.
- Author targeted existing settings tests and syntax only, trusted credential-stripped runner; no full1060 pipeline/local clinical rerun. Independent dedicated narrow QA next. Root will publish exactsource, verify5relevantnative checks and perform at mostone controlled real bootstrap; all6currentnative plus actualClaude/finalCodex beforemerge. No live REST or provider action from author/QA.
- Freeze source/proofs hashes/bytes/inodes first; privatize scoped hardlinks if needed. All prior8? attempts specifically implementations1..7, actualfailed39644097175 and39649785587, QA7 initial and durablefailedharnesses preserved. No old proof/contract/report rewrite. Root soleGit/index/ref/GH/state/providerwriter. Raw private durable actualoutputs, safe publicMD/JSON only. No closure/merge/deploy claims.

## Scope
- scripts/quality-gate/configure-bug-repository.mjs
- agent-team/tests/bug-pipeline/repository-settings.test.mjs

## Test Plan
Existing repository-settings targeted suite, actualCLI fakefetch tests and independently authored API-order/readback/conflict probes; no real network/deps/provider. Preserve failures in newattemptdirs and save harness before execution. Verify configureRepository function originalbytes, all old proof preservation and no settings actually applied.

## Evidence Plan
Private /workspace/.clinicos-cloud/498-null-policy-author8-20261021; new artifacts/task-validation/demo-exact-commit-release/codex-followup-6 contract/analysis/authorreport/hashes and actualsafe diagnostic summary. QA7 durable evidence and packet7 remain immutable. Operational permission remains unknown until future actual safe invocation; no token conclusion from404.

## Gate Status
READY FOR IMPLEMENTATION after authenticated7→8 budget reservation/readback. User authorizes configuration and continuation until resolution with history. Actualpolicybootstrapunresolved; no newClaude readiness from this contract alone.
