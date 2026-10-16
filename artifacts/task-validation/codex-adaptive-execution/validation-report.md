# Task Validation Report

## Scope

Adaptive execution routing in PR #471, baseline `7c6a482a`, 2026-10-16. No application, database or production changes. The unrelated patient-cleanup SQL is preserved and excluded.

## Implementation

`CODEX_EXECUTOR_MODEL=auto` is the new default. Codex assesses each group's difficulty, direct/delegate mode and rationale. Complex/direct work and escalated attempts use the analyst (default `gpt-6.1-sol`). Bounded work may use the optional delegate (`CODEX_SMALL_EXECUTOR_MODEL`, currently Luna). Actual in-flight sessions and explicit provider capacity/rate-limit responses affect routing. No global provider-load estimate or hidden retry is introduced. Simplification retains the selected executor; decisions enter the packet and durable batch execution history.

A fixed `CODEX_EXECUTOR_MODEL=gpt-6.1-sol` runs all implementation and simplification with 6.1-Sol. Independent QA remains a separate fresh read-only session even when using the same model. Claude review and four-attempt budgets retain their original roles and limits. Existing frozen plans lacking an execution assessment remain byte-for-byte unchanged and choose the senior; explicitly malformed assessments fail validation.

## Acceptance Criteria

| AC | Result | Evidence |
| --- | --- | --- |
| AC1 | PASS | New structured assessment; strict malformed-value tests; legacy state validation does not rewrite plans |
| AC2 | PASS | Real CLI-argument tests, deferred overlapping sessions, explicit capacity cooldown and incidental-line-number negative regression; no hidden retries |
| AC3 | PASS | Senior-only override, same-model simplification and independent recorder probe of packet/durable history |
| AC4 | PASS | Skill/guide/CLI/workflow updated; cloud startup draft and `auto` suggestion saved; independent QA and source hashes |

## Validation

- Scoped Node suite: **75/75 PASS** in `test-results/tests.txt`, independently repeated in the QA evidence.
- Independent QA: six probes, separate frontend TypeScript/build, workflow semantic checks and a Playwright report surface with actual saved results. See `qa-gate.md` for exact commands, outcomes and artifacts.
- One independent suite run overlapped the frontend build and hit the existing process-fixture startup deadline. Its failing log is preserved; the independent full suite passed after the build. No assertion was disabled and the process runner/test timing was not modified.
- Routing tests exercise deterministic fake CLI providers and temporary files, including real overlapping calls. No paid provider request or live issue processing was performed.

## Configuration and Limits

The cloud draft retains existing installation/network/authentication requirements and changes the executor suggestion to `auto`, with optional `CLINICOS_SMALL_EXECUTOR_MODEL=gpt-6-luna`. It requires settings review/save/publication. Provider entitlement, Claude authentication, the local sandbox and default-branch activation remain live prerequisites documented in the workflow guide. Saved defaults do not replace an explicit fixed executor chosen by the operator.

## Final Decision

PARTIAL

Adaptive routing implementation is prepared for draft PR review with independent evidence. Live model selection is not certified until the existing authentication/sandbox/activation prerequisites are usable.
