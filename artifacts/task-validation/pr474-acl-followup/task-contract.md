# Task Contract — PR474 ACL follow-up, no deployment

## Impact Classification

Test-only ACL assertion plus branch-specific Vercel deployment veto and synthetic QA evidence. No clinical frontend behavior, backend, database, API, dependencies, credentials, installed scheduler or provider changes. Root sole source writer in the dedicated pr474-followup worktree; preserve primary and installed review-checkout files.

## Current Behaviour

PR474 was externally squash-merged. Claude Max round3 approved local093b8aed, whose ACL test checks the exact privacy rejection reason. It is not integrated. Main62a52a94 has the old weaker assertion. Vercel live project clinicos__ uses frontend root and automatic Git previews are enabled; creating a PR without a branch-specific veto would deploy against the user's explicit instruction.

## Expected Behaviour

Publish only the approved test correction and the minimal branch-specific no-deploy guard, based on current main to avoid reintroducing PR474's squash history. Run local/independent QA and GitHub CI. Preserve cumulative Claude budget: failed1, changes-requested2, approved3; at most final4 on the new committed source, no reset/API fallback. Leave the follow-up open, no auto-merge or deployment.

## Acceptance Criteria

1. ACL test captures publicResult, retains ok===false and matches stderr Non-private scheduler state. Its bytes equal the already approved093 test. Native Windows10/10 and independent negative control remain valid with assertions intact.
2. frontend/vercel.json differs only by git.deploymentEnabled mapping codex/pr474-acl-rejection-followup to false. No wildcard/global/main/foreign branch policy changes. All previous config values byte-semantically unchanged. Live GitHub/Vercel show no deployment for the published follow-up SHA.
3. Diff based on latest main contains only this test, deployment veto and task evidence. Primary HEAD/branch/full status digest and dirty-file hashes unchanged; installed093 checkout/files/task not changed. Sanitized synthetic fixtures only, no secrets/PHI/dependency lock changes.
4. Independent QA covers diff/security, native suite, guard tests and fresh QA-only browser metadata with concrete values, clean telemetry, reload, screenshot/trace/report/video. The metadata surface is not a deployed app or proof of external CI.
5. PR open for final human verification, auto-merge null. Required Windows/Linux CI green, other CI accurately reported; source/merge-ref/tree identities explicit. New actual restricted Claude Max review bound to final SHA, only remaining cumulative cycle4, persisted before inference with CAS. If findings remain, report BLOCKED, never reset counters.

## Test Plan

Native Windows10; branch guard/config equivalence unit tests; independent native/negative control; existing bug-pipeline Linux+Windows and frontend/backend/browser GitHub CI; fresh synthetic metadata Playwright; explicit secrets/privacy scan; final preservation/deployment/PR state reads. Frontend build/test delegated to independent GitHub runners when no source/dependency change; no local production services needed.

## Evidence Plan

Native output/source manifests and guard test logs, independent QA report, QA screenshot/trace/video/report/test-results, immutable commit-pinned PR links, exact-source CI run links, no-deploy and preserved-source receipts. Actual Claude report/ledger stored durably in setupReview474 continuation and published as SHA-bound COMMENT review. Existing original failed reports stay historical.

## Gate Status

READY FOR IMPLEMENTATION
