# Task Contract

## Impact Classification
Fixed-target demo backend deployment on the exact reviewed current-main commit. Operational/source-attestation and credential-output boundaries, no production deployment or clinical/schema change.

## Current Behaviour
Previous PR498 Claude review requested queue isolation, strict default release preflight, resume/deadline behavior, zero-trigger exact policy, and honest migration metadata. Followup3/4 failed independent security probes; followup5 fixes raw/effective HTTP credential output guarding. All five implementation attempts, failed QA and actual Claude report remain preserved.

## Expected Behaviour
Manual dedicated demo workflow performs bounded fixed-target native exact-SHA deployment, reuses unique same-SHA active success without mutation, verifies identity/source/readiness, and emits safe recoverable progress. Legacy/default release policy stays strict and unchanged. Permanent exact postmerge automation remains separate and unimplemented here.

## Acceptance Criteria
- Exact/configure share railway-demo concurrency; legacy workflow remains actual-main byte-identical with railway-backend. Complete pending inventory checked before mutation, no automatic mutation retry.
- Fixed demo UUIDs/domain/current main reviewed commit verified before native serviceInstanceDeployV2(commitSha), after polling and readiness. Exact policy zero triggers; legacy policy still one configured trigger. Bounded aggregate deadline, safe progress/reuse and finite diagnostics.
- Both credential bindings snapshot raw/effective HTTP aliases once, guard every artifact/stdout/fallback and context. Invalid controls fail before requests, reflected initial identifiers zero calls, reflected mutation identifier one call and no retry/poll. No real token/provider used in tests.
- Preserve main492 contract/budget protection changes and exact-only default preflight regression in merged release.test. Imported source and all previous proof/history immutable. Existing forward-only db:migrate and unknown migration delta/previous active metadata disclosed; no rollback or human protection invented.
- Fresh independent QA5 on exact source, actual Claude2, fresh final Codex and six required native checks before ordinary protected merge. Actual provider authorization/deploy remains later and unproven by offline tests. No clinical closure or live-ready claim.

## Scope
- .github/workflows/configure-demo-source.yml
- .github/workflows/deploy-demo-exact-commit.yml
- agent-team/src/bug-pipeline/demo-deployment.mjs
- agent-team/tests/bug-pipeline/demo-deployment.test.mjs
- agent-team/tests/bug-pipeline/release.test.mjs
- scripts/automation/configure-demo-source.test.mjs

## Test Plan
QA5 executed329focused and1124full registrations:1121PASS,0FAIL,3nativeWindowsSkip;105actual CLI security+24direct,49functional/proof and60official offline schema checks PASS. Five obsolete vulnerable-behavior probes retained as expected assertion failures, not product passes. No repeated unchanged suite after evidence-only publication.

## Evidence Plan
Curated safe MD/JSON in this packet and previous followup packets. Raw logs/traces/private seal manifest remain private. Source manifest binds reviewed diff to mainfbaa78d8c7eacf8402db0c8fa2be276ae579a27c; original source tested17d3f5a7bef0565db1992221a41b9f924037195c; publication adds evidence only.

## Gate Status
READY FOR IMPLEMENTATION — the scoped contract remains satisfied; implementation and independent QA have passed. Actual Claude2, final Codex, native checks and live provider operations PENDING. Existing authorized continuation past four authenticated; no history reset or fake claim. No application deploy/issue closure yet.
