# Independent QA — bounded setup PR review

Date: 2026-10-16. Existing draft PR #471. Three reviewed workflow/helper/test files are bound by `qa-reviewed-files.sha256`. Dedicated QA did not author implementation, invoke a model, mutate GitHub, merge or deploy.

## Phase results

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS: AC1–AC6 require exact-SHA/admin/same-repository preflights, subscription-only read-only review, remote reservation before inference, four durable attempts, authentic published evidence and no release bypass. | `task-contract.md`, `implementation-plan.md` |
| 1 Diff | PASS after two findings below were fixed. One workflow adds a manual bootstrap review job; the fixed-PR helper reuses existing reviewer/state APIs; seven synthetic real-Git tests verify recovery and bounds. | `qa-reviewed-files.sha256` |
| 2 Tests/build | PASS: independent complete scoped regressions93/93, including bootstrap7/7; new helper syntax, workflow YAML, native regression dependency, matching concurrency group and unchanged default token permissions checked. Existing application TypeScript/build evidence carried forward for unchanged application/package files. | `test-results/qa-regressions.txt`; `../codex-runner-activation/test-results/qa-frontend-build-carried-forward.txt` |
| 3 Browser | Prior independent Max report Playwright1/1 and result artifacts carried forward explicitly: bootstrap changes metadata/state/publication only; application and safe report-surface UI remain unchanged. Screenshot/report prove the prior synthetic86-regression result, not this new93-test run or an actual Claude review. | `../codex-claude-max-auth/result.png`, `../codex-claude-max-auth/trace.zip`, `../codex-claude-max-auth/playwright-report/index.html`, `../codex-claude-max-auth/test-results/qa-playwright.txt` |
| 4 Security | PASS for scoped source; real review/default-branch integration remain separately gated. | Checklist below |

## Findings fixed before actual inference

1. An approval persisted before a failed GitHub review POST could be reused without ever publishing the required PR review. Fixed: the helper reads the restored hashed report even for reused approval, checks paginated existing reviews for exact body/SHA and posts only when absent. A failed-publication/retry regression proves one model call, eventual publication and no duplicate on a later run.
2. Restoring the ledger before the existing review helper's symlink checks could overwrite a redirected file. Fixed: canonical packet path validation precedes writes; ledger/report/diff creation uses exclusive `wx`. A real symlink regression proves the external target remains unchanged and no additional model call occurs.

No unresolved scoped correctness/security finding remains.

## Reviewed controls

- The manual job is restricted to the fixed repository and requires the native regression job. It shares the ordinary controller's repository concurrency group with cancellation disabled.
- Before model work the helper checks exact40-character reviewed SHA, dispatch SHA, administrator actor, same-repository open PR471/current head, checked-out HEAD and valid existing batch state. It checks current PR head again before publishing.
- Running review state is compare-and-swap saved remotely before `claude --print`; CAS failure prevents inference. An interrupted remote running attempt blocks automatic recovery and cannot reset the budget. Existing batch records are preserved in the same state object.
- Prior reports/ledger are restored to the same fixed packet. Existing helper validates approval report hashes, exact subject SHA and the four-round ledger, and enforces Read/Glob/Grep-only tools, empty MCP configuration, no project settings or commands. Approval reuse is allowed only for identical SHA and untampered evidence.
- Independent tests prove reservation-before-inference, CAS/admin/stale/interrupted rejection, a head change during review preserving its spent attempt without publishing, a total four-call cap across source commits, tampered evidence rejection and publication recovery without a new call.
- The model process receives the review role through the existing credential-isolating runner: subscription OAuth only, API fallback excluded, no GitHub/deployment credentials. CLI errors print fixed classifications and exit code rather than provider messages or credentials.
- The helper posts a SHA-bound `COMMENT` review containing the actual validated structured report (or durable/artifact reference for a large report). It does not impersonate a GitHub approval or bypass human review rules.
- No merge/deploy/issue-close operation is present. The full runtime diff excludes generated artifact content from its text but the plan explicitly requires reviewing current saved QA/evidence through read-only file tools. No new review packet or ledger reset is created to bypass limits.

## Security checklist

| Check | Result |
| --- | --- |
| Secrets | PASS: synthetic mock model inputs only in tests; actual OAuth stays in Actions and only the review child. No raw provider response/error is logged. |
| PHI | PASS: no clinical or production data accessed. |
| Logging | PASS: fixed classifications/outcomes and validated structured reports; existing sanitizer/review validation remains active. |
| Input validation | PASS: fixed repository/PR/packet, strict actor/SHA, bounded report names/sizes and pagination, canonical path/exclusive creation. |
| Authorization | PASS: administrator and exact-head checks precede inference; native gate dependency and serialized remote CAS; model role has no GitHub/deploy credentials. |
| Injection/XSS | PASS: no SQL/application HTML changes; argv-only Git/GitHub operations and structured JSON request body, no shell interpolation. |
| Dependencies | PASS: existing pinned official CLI/action revisions; no application dependency changes. |
| Configuration | PASS: default workflow permission remains read-only; controller token scoped to explicit step; four-attempt subscription review enforcement and existing protections remain intact. |

## Verdict and limits

**BLOCKED** for completed default-branch activation until an actual Claude review and required exact-head gates pass. The scoped bootstrap source has no unresolved QA finding and is approved for one authorized exact-SHA subscription review dispatch. Its actual result must be recorded independently; source changes require re-review and remain within the same durable four-round budget.

Prior native38969585616 recognized Max OAuth and passed86 regressions/sandbox without inference; this is a prerequisite, not the requested real review. The new93/93 synthetic regression result does not prove real provider execution, PR approval, integration or deployment. No model inference, new issue processing, merge or deployment was performed by this QA session.
