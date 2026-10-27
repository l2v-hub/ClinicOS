# Task Contract

## Task
- Title: Known terminal output retention
- Slug: known-terminal-output-retention
- Type: bugfix
- Date: 2026-10-27

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | yes |

## Current Behaviour

The accepted controller retains failed source only for verify-before/verify-after failures. A genuine terminal blocked result from executor, simplifier or independent QA leaves output and its report on an ephemeral runner without eligibility for retention. The failed attempt remains genuine and spent; retention must not replay it or normalize its verdict.

## Expected Behaviour

Export exact permitted source and bounded safe blocked-model evidence for all native known terminal correction failures and strictly equivalent initial definite failures. Preserve original status/history/limits. Physical checkpoint, source/base/plan/feedback identity, registered ownership, file scope, secret filters and byte limits remain mandatory. Unknown, running, publishing, unsettled and unsafe scope/evidence states are refused.

## Acceptance Criteria

- AC1: The CLI and exporter share native known-failure eligibility covering execute/simplify/qa/verification/revision, preserve strict initial verification support, and never infer safety merely from blocked phase.
- AC2: Native workspace records the actual blocked status with bounded safe summary for executor/simplifier/QA before terminal checkpoint capture. Reports bind to the captured physical file hash; missing or unsafe text has explicit finite availability and never becomes approval.
- AC3: Export remains partial allowed-source/diagnostic retention, with exact live physical checkpoint and original source/plan/feedback guards, unchanged source/media/path/secret/size protections, and no overwrite of earlier attempts.
- AC4: Controller retry, budget, authorization, inference, release and workflow policy remain unchanged; original implementation/review history is not reset or rewritten.
- AC5: Genuine native RED/GREEN fixtures reproduce the QA-blocked omission, cover the other terminal stages and initial flow, and reject unknown/running/publish/scope unsafe/changed checkpoint/unsafe report. Existing focused tests and required full bug-pipeline suite pass.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Native eligibility, report binding and negative cases |
| Integration | yes | Owned temporary Git/worktree fixtures with actual checkpoint/export boundaries |
| API | no | No external API or workflow invocation in author role |
| Playwright | no | No application UI; real browser issue fixes remain separate |
| Persistence after refresh | yes | Read retained immutable files/manifests and exact hashes |
| Agnos action registry | no | Unchanged |
| Voice simulation | no | Unchanged |
| OCR/import test | no | Clinical import source unchanged |
| Security/privacy scan | yes | No unsafe summary/source, traversal, credential or unauthorized report copies |

## Evidence Plan

Preserve baseline manifests, RED/GREEN native fixture logs, complete domain test log, exact source projection and partial validation report. All test resources are synthetic, owned and cleaned in finally. All private output goes under this task directory; no provider, external network, shared Git/API/canonical/DB/dependency writes.

## Risks

This source change cannot recover already lost output. Native classified failure plus physical checkpoint is required; artifacts do not reconstruct a checkpoint or authorize another model call. Standalone review/checks/fresh Codex QA and normal protected merge remain pending. The large workspace.test.mjs remains byte-identical; new tests are a separate small fixture file. Only the five reserved paths may change.

## Gate Status

READY FOR IMPLEMENTATION
