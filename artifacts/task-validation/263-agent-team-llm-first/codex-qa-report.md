# Codex Independent QA Report — Issue #263 / PR #264

Reviewed PR head: `69564a85dd9f9dbd0852dad37275722329fc91bd`

## Fresh verification

- `node --test agent-team/tests/unit agent-team/tests/integration`: PASS, 24/24.
- `npm run agent-team:doctor`: exit 0, but incomplete against AC2; see QA-263-004.
- `npm run build`: PASS for frontend and backend.
- `git diff --check origin/main...HEAD`: FAIL due trailing whitespace in committed evidence.
- GitHub Actions `secret-scan`: FAIL before job start.
- GitHub Actions `Build and Deploy Job`: FAIL before job start.
- Both GitHub failures have the same annotation: the jobs were not started because account payments failed or the Actions spending limit must be increased.

Passing existing tests does not establish acceptance because the integration suite does not exercise the real Claude remediation, lease refresh, restart recovery, exact-SHA evidence binding, or supervisor status/stop contract.

## Findings

### QA-263-001 — CRITICAL — Codex findings never reach Claude remediation

`agent-team/src/runtime.mjs:39` always calls the Claude worker with `priorQaResult: null`. The next attempt therefore loses the QA findings and saved coordinates, and `prepareIssueWorktree` tries to create a new branch/worktree instead of reusing the same branch, worktree, and PR. The attempt calculation also reads `issue.comments` from an issue-list payload that does not contain comments.

Required remediation: parse and validate the latest development handoff and QA result from GitHub, increment the attempt, pass unresolved findings plus stable coordinates to Claude, and add an integration test covering `qa-failed → same branch/worktree/PR → ready-for-qa`.

### QA-263-002 — CRITICAL — Generated Claude worker is not operable headlessly

The actual bootstrap worker initially failed closed because the project has no Bash allow rules. `agent-team/src/workers/claude-development-worker.mjs:9` still invokes Claude only with `--print --output-format json --permission-mode acceptEdits`; it provides neither a scoped `--allowedTools` policy nor structured `--json-schema` enforcement. `agent-team/config/default.json:15` also limits the complete Claude development run to 120 seconds, while the observed implementation needed substantially longer.

Required remediation: make the scoped allowed-tool policy and separate development/QA timeouts explicit configuration, verify them in `doctor`, pass supported Claude CLI options, validate real structured output, and test that an unactionable permission policy prevents launch with a specific diagnostic.

### QA-263-003 — HIGH — GitHub lease lifecycle is incomplete and claims are not schema validated

`leaseRefreshMs` is only loaded and compared. No heartbeat edits the claim, no release message is published, and no restart path recovers an expired lease. `acquireGitHubClaim` creates an ad-hoc object that does not contain the required common protocol fields and parses competing comments without schema validation.

Required remediation: implement schema-valid claim, refresh, release, expiration recovery, deterministic generation, and tests using the configured lease intervals.

### QA-263-004 — HIGH — `doctor` returns a false-positive ready state

The command reports both worker classes ready after only executable/auth/repository probes. It does not verify required GitHub labels and permissions, configuration schema and referenced files, safe/writable/ignored runtime and worktree roots, worker permission policy, supported worker invocation options, or a real duplicate PID/lock. The duplicate check uses a fixed 45-second heartbeat instead of `heartbeatTimeoutMs`.

Required remediation: implement every doctor prerequisite from the issue and add negative tests for each hard failure. The observed permission failure must become a reproducible doctor failure.

### QA-263-005 — HIGH — Committed evidence is not bound to the PR head

Fresh comparison result:

```json
{"head":"69564a85dd9f9dbd0852dad37275722329fc91bd","manifest_subject_sha":"39b5e495f1dcf5d44e9e3dfb48ca05b060fc9d42","handoff_subject_sha":"39b5e495f1dcf5d44e9e3dfb48ca05b060fc9d42","all_match":false}
```

`verifyArtifactRefs` checks only the working-tree file digest and the `subject_sha` value supplied in the reference. It does not verify the declared `git_blob_sha`, does not read the file from the declared commit, and does not validate the internal manifest/handoff subject. The later GitHub comment rewrites references to the final SHA without making the committed files match it.

Required remediation: define a non-circular authoritative binding envelope published after the final commit, validate its schema, prove every referenced blob exists at the PR head, verify SHA-256 and Git blob IDs, and reject disagreement between the envelope and committed manifests.

### QA-263-006 — HIGH — Three-cycle no-progress blocking is dead code

`nextRemediationState` exists only in `agent-team/src/core/remediation.mjs`; runtime and QA worker never call it. Every `qa-failed` result is requeued indefinitely.

Required remediation: rebuild QA attempt history from GitHub, call the policy before relabeling, publish a structured blocked reason after three equivalent failures, and test the real reconciler path.

### QA-263-007 — MEDIUM — Supervisor status, stop, and recovery are incomplete

`status` reads only local heartbeat data and never reads GitHub claims, issue/PR coordinates, attempts, leases, or SHAs. `stop` writes `stop.request` and returns immediately instead of waiting for lease-safe shutdown. `start` can report success before the detached child owns the lock, and restart does not reconstruct or refresh active claims.

Required remediation: implement the specified status projection, graceful stop wait with timeout, start acknowledgement, and GitHub-based recovery tests.

### QA-263-008 — MEDIUM — CI is red for an external billing gate

GitHub Actions run `29196703898` and run `29196703886` both failed before executing steps. Check annotations state that account payments failed or the spending limit must be increased. This is not a code-rooted failure, but QA cannot call CI green or treat skipped downstream jobs as passing.

Required remediation: repository owner resolves GitHub Actions billing/spending availability, then reruns the workflows on the remediation SHA. Claude must not hide or relabel this as a code pass.

### QA-263-009 — LOW — Claude's diff-check evidence is not reproducible

Fresh `git diff --check origin/main...HEAD` fails on trailing whitespace in `checks/build.txt` and `task8-codex-stderr-red.txt`, while the committed handoff declares the check passed.

Required remediation: sanitize captured output deterministically, rerun `git diff --check`, and record real command timestamps/results rather than identical synthesized timestamps.

## Gate table

| Check | Result | Evidence |
|---|---:|---|
| Acceptance criteria | FAIL | AC2–AC12 have blocking gaps listed above |
| Code review | FAIL | QA-263-001 through QA-263-007 |
| Tests | PASS / INSUFFICIENT | Fresh 24/24 pass; missing required end-to-end orchestration paths |
| Playwright | NA | CLI-only issue |
| Runtime validation | FAIL | Real Claude headless permission failure is not detected by doctor; loop not exercised |
| Persistence | FAIL | Lease refresh/recovery and GitHub status reconstruction absent |
| Privacy/security | FAIL | CI secret-scan did not start; local code has sanitization tests only |
| Evidence complete | FAIL | SHA mismatch and non-reproducible diff-check claim |
| Final decision | QA FAILED | Remediation required on the same draft PR |

Final Decision: QA FAILED
