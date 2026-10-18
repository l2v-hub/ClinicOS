# Task Contract

## Task
Recover the immutable actual Railway topology metadata receipt from successful original GitHub run39150528800 using a credential-minimal reviewed GitHub runner and API-readable comment channel.

## Impact Classification
Infrastructure evidence transport only. New bounded task, distinct from already merged491, no clinical implementation or inherited approval.

## Current Behaviour
Original run and artifact succeeded but this cloud cannot fetch the signed Azure artifact/log redirect (403). Actual receipt contents are unknown. Main729e6144b9d5a924874843ba264819d4bd1a6dca. No provider preflight may be bypassed.

## Expected Behaviour
Trusted main-only workflow recovers fixed existing artifact12145555014 from fixed run39150528800, validates exact run/head/repository/workflow/attempt/artifact name and archive digest, strict bounded schema/fixed demo target/inventory digest, then projects only a small allowlisted public metadata receipt to fixed PR481. No Railway token, provider call, secret extraction or source mutation.

## Acceptance Criteria
AC1 reject stale/wrong/mismatched run, artifact, SHA, scope, digest, archive members, oversized/decompression/CRC failures and unsafe metadata; no comment on invalid input. AC2 unknown fields never propagate; private credentials cannot enter output. AC3 comment contains complete validated receipt provenance and inventory, <=60KiB; idempotent unique marker avoids duplicate identical report. AC4 main-reviewed dispatch guard; pinned actions; contents:read/actions:read/issues:write only; no PR source execution or provider credentials; no production deployment lock. AC5 meaningful offline tests, independent reviewer and exact current-head native CI and actual Claude/Codex reviews before ordinary protected merge. AC6 prior artifacts unchanged; all fresh public files<=25MiB and decoded/scanned if any media.

## Scope
Only scripts/automation/recover-demo-topology-receipt.py, scripts/automation/recover-demo-topology-receipt.test.py and .github/workflows/recover-demo-topology-receipt.yml may change as source. Fresh owned packet artifacts/task-validation/receipt-recovery only. Do not amend existing inspector/configurator, application, model/workflow policies or existing proof bytes. Root owns remote state, GitHub, publication, dispatch and any merge. Author no authenticated writes or provider calls.

## Implementation Plan
Root reserves attempt durably before source edits. Python standard library only, bounded explicit error handling and no raw remote error/URL printing. Verify API metadata before downloading, archive digest before extraction, ZIP path/member/size/CRC before JSON validation; public output strict allowlist. Fixed existing IDs and target481. Use existing inspector/configurator schemas as source-of-truth, no invented visibility. Stop after tests/freeze for fresh independent QA. No logs of signedURLs/token or raw remote response errors. Documentation states receipt is metadata, not deploy confirmation.

## Test Plan
Offline unittest with injected HTTP/GitHub client, meaningful positive and all AC1negative boundaries, archive digest+CRC+expansion/path checks, byte-bounded allowlisted output, no-secret-in-output and idempotent marker. Independent review reruns source tests and tests new adversarial cases; app builds/clinical browser inapplicable to receipt-only transport. Any optional safe local visualization must use synthetic fixtures and no tokens. NativeCI and actual original artifact workflow execute only after protected review.

## Evidence Plan
Fresh analysis, plan, exact source freeze, offline reports and independent QA under owned packet/external QA roots. Preserve original run39150528800 receipt bytes/digest when recovered; publish only validated bounded metadata through fixed GitHubcomment; no fake deploy or issue closure. Root independently verifies all seals and published blobs. New task has no prior attempts; default4; any authorized continuation preserves history.

## Gate Status
READY FOR IMPLEMENTATION
