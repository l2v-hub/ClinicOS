# Implementation and validation plan

1. Preserve the existing draft PR and unrelated manual patient-cleanup SQL. Create and validate the expanded task contract before code/config changes.
2. Delegate bounded GitHub adapter/workflow and model-session modules to Luna, with explicit interfaces and test ownership. Keep Codex responsible for orchestration, evidence boundaries and integration.
3. Implement authenticated issue-command/label intake, complete structured grouping, isolated worktrees and frozen per-issue plans. Reserve attempts using a durable GitHub Contents API compare-and-swap ledger before model calls.
4. Start separate planner/executor/simplifier CLI sessions, enforce four initial implementation attempts, run real sandboxed verification commands, regenerate synthetic PNG/Playwright evidence and publish immutable source-issue links.
5. Create draft PRs before read-only Claude review. Persist exact-SHA structured review evidence and a four-review budget across later comments, corrections and restarts. Fail closed on malformed state, interrupted calls, stale heads and unknown required checks.
6. Configure opt-in/explicit production release: revalidate remote evidence and review digests, PR identity and required checks, merge only the approved head, deploy the exact merged revision from a separate checkout, monitor each affected Railway workflow and post confirmed deployment links without closing issues.
7. Add secret-free CI regression tests and perform independent QA, meaningful temporary-Git/subprocess tests, browser assertions, frontend build, workflow semantic and security checks. Fix reported defects before the final source manifest.
8. Update PR #471 with final scope, validation and operational prerequisites. Save reproducible pinned CLI setup and secure Claude credential requirements in the cloud draft. Do not merge, process live unselected bugs or deploy during setup.

All real paid model invocations, actual label-to-Action execution and production deployment remain unverified until the documented credentials, sandbox, default-branch workflows and activation settings are available.
