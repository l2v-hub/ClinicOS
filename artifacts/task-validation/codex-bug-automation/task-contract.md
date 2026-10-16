# Task Contract

## Task

- Title: GitHub command to Codex planning, small-model implementation and bounded Claude PR review
- Type: config / automation
- Date: 2026-10-16
- Baseline: fe40c01d, draft PR #471

## Impact Classification

| Area | Impacted |
| --- | --- |
| Application frontend/backend/database | no |
| Agent orchestration / GitHub Actions | yes |
| Credentials / permissions / privacy | yes |
| Evidence and release gating | yes |

## Current Behaviour

The existing skill prepares Codex-led bug work but no GitHub event starts it. The read-only Claude review helper has a four-attempt local ledger. There is no small-model executor, complete validation/evidence pipeline or PR-review-comment reconciliation. The local Codex CLI is authenticated; Claude is installed but unauthenticated. GitHub Actions secret metadata is denied to the available integration (403), which does not establish that repository secrets are absent. The unrelated untracked patient-cleanup SQL must be preserved and excluded.

## Expected Behaviour

A maintainer's `/codex fix` issue comment or explicit `codex-run` label requests automatic processing. GitHub Actions runs a serialized controller from trusted repository code. Codex triages authorized issues, groups related feature bugs with rationale and complete issue coverage, creates one worktree per group and a detailed implementation/evidence plan. A configurable smaller Codex model implements that plan in fresh bounded CLI sessions; Luna is used for scoped implementation during this setup where supported by the agent host, never silently assumed to be a public API model ID.

Implementation/validation has at most four attempts, including failed model calls; accepted changes are simplified, revalidated and documented in the source issues with immutable screenshot links and trace/video links. The controller publishes a draft branch/PR for Claude to review; this is a necessary prerequisite for PR review and is distinct from merging/deploying. Claude reviews only and Codex-owned smaller-model sessions apply corrections, with at most four final review attempts including later PR comments. Every approval is tied to the actual head revision and available evidence. Missing auth, evidence, invalid plans, residual findings, interrupted attempts and failed required checks block progression without resetting budgets.

No production merge/deploy is performed while installing this setup. The optional production release workflow can merge and deploy future batches only after evidence, simplification, current-head Claude approval, required GitHub checks and deployment bindings. Automatic release is opt-in; explicit dispatch is also available. The frontend gets an explicit Vercel deploy of the exact merged commit; existing Railway backend/runtime workflows are monitored. The workflow never treats 'no findings' as a promise of perfect code.

## Acceptance Criteria

- AC1: Exact GitHub command/label intake authenticates actor permissions; untrusted issue/PR content is never evaluated as shell or workflow expressions. Code and credentials are not loaded from fork PR heads.
- AC2: Structured Codex plans account for every selected issue exactly once, explain grouping and include source-specific acceptance criteria, file scope, implementation tasks, verification and screenshot/video/trace requirements; duplicate/in-flight batches are not silently restarted.
- AC3: One isolated worktree per group; clean/registered identity checks and durable, serialized state prevent accidental reuse, competing writers or budget resets. Interrupted model attempts count and block unsafe recovery.
- AC4: Configurable small-model executor uses new CLI sessions and normal sandboxing, no permission bypass. At most four implementation attempts; separate simplification is followed by required verification and cannot erase scope/evidence.
- AC5: Real command exits, missing/stale output, symlink/path traversal and absent evidence fail closed. Evidence is synthetic, committed, digest-bound and posted as immutable Markdown screenshots/links to every source issue.
- AC6: A draft PR is created before final Claude review. Claude remains read-only; at most four total final reviews, including comment-triggered revisions. New comments invalidate prior readiness; unresolved/changes-requested reviews, changed heads and failing/pending required checks block release readiness.
- AC7: Persist/recover state across Action invocations, bind state to batch/PR/head, and publish failures instead of reporting success. No direct main push, force push, merge, deploy, issue closure or patient-data change.
- AC8: Meaningful integration tests exercise successful flow, four-attempt failures, permission denial, grouped issue coverage, interrupted recovery, evidence validation, post-review comments and revision invalidation. Independent QA reviews the final diff and evidence before PR update.
- AC9: The optional release gate rechecks durable review/evidence digests, exact PR head and required checks before matching-head merge; deployment uses that merge commit and monitors each affected service. Trusted controller and deployment checkouts remain separate; no-ready events are no-ops. Deployment links are posted only after successful deployment, without closing source issues or claiming functional production verification.

## Test Plan

Node tests with real temporary Git repositories and deterministic fake model/GitHub adapters; malicious inputs, stale/different heads, missing evidence, restart and concurrency tests. Exercise the actual CLI parser and read-only credential probes. Independent frontend build and relevant existing regressions. QA-only browser surface with assertions, screenshot and trace required by the repository QA skill. No live paid model execution or processing of unrelated issues merely to generate evidence.

## Evidence Plan

Sanitized logs, test results, workflow/runner security review and browser evidence under this packet. Record real CLI version/authentication status and GitHub API limitations separately from simulated model tests. Update PR #471 with the actual final scope and operational prerequisites.

## Gate Status

READY FOR IMPLEMENTATION
