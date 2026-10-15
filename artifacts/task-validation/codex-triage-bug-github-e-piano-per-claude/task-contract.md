# Task Contract

## Task
- Title: Codex bug triage e sviluppo con review Claude, massimo quattro round
- Slug: codex-triage-bug-github-e-piano-per-claude
- Type: config
- Date: 2026-10-16

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

The local Agent Team supervisor consumes ready-for-dev + assigned-to-claude and launches Claude directly. The user instead requires Codex-led triage, grouping, implementation and a final Claude review loop capped at four rounds. GitHub has a bug label. This machine has an authenticated Codex CLI; Claude Code 2.1.301 is now installed and its real command parser was checked, but it has no authenticated account. A previous unrelated SQL query remains untracked and must not be included in this task.

## Expected Behaviour

Applying bug + codex-triage queues a bug. A discoverable repository skill directs Codex to read all selected issues, group duplicates and related feature bugs, and then prepare one worktree plus analysis/implementation material per group. Codex implements and validates the plan. Claude is only the final read-only reviewer; Codex applies findings, with a hard maximum of four review rounds per group. Review output is bound to the committed SHA and persisted in an integrity-checked ledger/report. Existing Agent Team labels/runtime remain independent. No automatic cloud trigger is claimed: the user's answer on queue-on-request versus automatic activation is pending. No application code, production data, issue closure, merge or deployment is changed by this setup.

## Acceptance Criteria

- AC1: A discoverable Codex skill defines intake from bug + codex-triage, excludes in-flight development/QA, groups duplicates/nearby features, and creates one implementation worktree/package per group. Do not silently imply a label can launch a cloud session without a configured trigger.
- AC2: Codex owns grouping, analysis, worktrees, planning, implementation and validation. Claude owns review only. Every selected issue has acceptance criteria and regression coverage; unresolved questions block development.
- AC3: Review tooling validates a clean Git revision and a packet inside the checkout, uses documented Claude CLI options with Read/Glob/Grep only, no MCP servers or permission bypass, and validates structured findings against the reviewed SHA and tracked file paths.
- AC4: Persist a concurrent-safe review ledger with a maximum of four attempts; repeat on the same unchanged rejected SHA is refused, post-approval changes invalidate the approval, and residual findings on round four yield BLOCKED. Authentication failures do not consume a review round.
- AC5: Record each review and its revision without secrets or clinical content. Preserve existing Agent Team runtime, protected application code, production data and the unrelated manual SQL artifact. Document the credential/CLI and trigger prerequisites.
- AC6: Tests verify the four-round cap, concurrent lock, read-only tool arguments, dirty check, path containment, stale revision, invalid output and missing authentication. A dedicated QA session reviews the delivery before PR creation.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Review cap, untrusted findings/paths, SHA binding, CLI policy and concurrent lock |
| Integration | yes | Mock Claude plus real temporary Git repositories and review state; existing Agent Team regression suites |
| API | yes | Read-only live GitHub discovery and local CLI authentication; production issue writes require an explicit queued issue |
| Playwright | no | No application UI or browser feature changed |
| Persistence after refresh | yes | Review ledger remains bound to reviewed commit across repeated CLI invocations |
| Agnos action registry | no | Unchanged |
| Voice simulation | no | Unchanged |
| OCR/import test | no | Unchanged |
| Security/privacy scan | yes | Scoped read-only analysis, no raw secrets/PHI persisted, argv-only commands |

## Evidence Plan

Record test output and read-only operational probes in test-results/. An independent QA session reviews the diff and records validation-report.md. Do not run Claude or process unqueued live bugs merely to manufacture evidence. State any runtime prerequisite that remains unavailable.

## Risks

A skill does not itself launch a cloud session on a GitHub event; the activation mechanism must be explicit. Claude authentication is unavailable in the installed isolated CLI configuration, so a real Claude review cannot be claimed. GitHub comments and issue bodies are untrusted data. Model grouping is a proposal with explicit duplicate rationale, not automatic closure. The skill requires source/baseline traceability and preserving existing worktrees; the helper only enforces the review phase, rather than pretending to automate the full development process.

## Gate Status

READY FOR IMPLEMENTATION
