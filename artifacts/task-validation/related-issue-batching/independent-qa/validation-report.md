# Independent QA — related issue batching

Verdict: **READY FOR CODEX QA**.

Dedicated QA session `/root/related_issue_batching_qa`, independent of implementation. Base `origin/main` = `a733a293f6dd2fed29f71fc1a36f546ee7eae317`. The reviewed working diff is bound by `reviewed-source-manifest.json`. No GitHub issue/queue/model mutation, task registration, deployment, merge or production/patient access was performed. This verdict covers local behavior and review readiness; required native CI and final PR review remain separate gates.

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | `../task-contract.md`, direct user requirement to aggregate similar issues/shared files |
| 1 Diff review | PASS after correction | Full 12-file source/test/docs diff reviewed; live opt-in revocation race identified, implementer corrected and independent negative controls passed |
| 2 Build/tests | PASS | `test-results/regression.log`: 143 total, 140 PASS, 0 FAIL, 3 Windows-only SKIP; includes the 138-test normal gate and 5 independent tests. `test-results/independent-controller.log`: latest five controls PASS. `test-results/frontend-tsc.log`: exit0; `test-results/frontend-build.log`: exit0. Existing chunk-size warnings only. |
| 3 Browser | PASS | Real `createDashboardServer` + `dashboardSnapshot` via explicit QA-only synthetic adapter; `collection.png`, `result.png`, `trace.zip`, `video.webm`, `playwright-report/index.html`, `test-results/browser.log` and raw `test-results/browser/` |
| 4 Security | PASS | Checklist below, `test-results/frontend-security.log`: zero findings, full diff inspected |

## Independent assertions

- No paid session, worktree preparation or ownership during the durable collection window; adjacent authorized wake-ups group into one plan/worktree/PR, tested by the normal gate.
- Reason-specific negative controls reject missing/duplicate issue-to-file entries, files outside scope, scoped files with no source issue, and shared-file splits lacking a rationale in either group. Explicitly justified splits are accepted. Existing four-round budget, CAS reservation, interrupted-work, independent QA, review, evidence and verified-release tests pass.
- Fresh label revocation, `ready-for-qa`, `assigned-to-claude` and controller blocking labels cannot enter collection or paid planning. Authorization disappearing at the second queue discovery fails before ownership and paid planning.
- Mixed existing legacy and new batch scopes: overlapping incoming work is blocked; existing frozen plan and exhausted four-round implementation/review budgets remain byte-for-byte unchanged. Unrelated scopes can reach worktree preparation, then the synthetic adapter deliberately stops before implementation.
- The **actual old validator fetched with `git show origin/main:agent-team/src/bug-pipeline/contracts.mjs`** accepts newly generated planned controller state with `batch.grouping` and unchanged legacy `batch.plan` wire format. Both old and new validators leave it unchanged. No Windows worker update is necessary for this schema extension; native Windows execution itself was not performed in this Linux QA session.
- Actual dashboard shows two synthetic collected issues with queued=2/processing=0, both in `Raccolta issue per accorpamento`; after adapter state transition both share `bug-batch-701`, queued=0/processing=2, phase=`Analisi e piano pronti`, implementation/review budgets each `0/4`. Exact values persist after reload in both stages. Externally owned synthetic issue703 remains outside the batch. Source title/body/comments sentinel values are absent from both API JSON and page DOM. No console/page errors or relevant HTTP errors.

## Security checklist

| Check | Result |
| --- | --- |
| Secrets | PASS: source diff and evidence contain no credentials; production frontend scanner zero findings |
| PHI | PASS: only synthetic issue701/702/703/900 fixtures; no patient data |
| Logging | PASS: bounded validated planner summary and issue/file identifiers; no new raw issue-body/dashboard payload |
| Input validation | PASS: exact scoped files, per-issue coverage, quiet-window timestamps/IDs, current opt-in/ownership checks; reason-specific invalid-input controls pass |
| AuthZ | PASS: existing authorized event discovery retained, rechecked before claim; external ownership excluded |
| Injection/XSS | PASS: dashboard uses textContent; no raw SQL, HTML injection or shell changes |
| Dependencies | PASS: no package/lockfile changes or new dependencies |
| Config | PASS: no workflow permission/CORS/deploy/gate weakening. Synthetic browser adapters require `CLINICOS_BATCHING_QA=1` and bind only loopback. Original unrelated maintenance SQL preserved. |

## Environment notes and limits

Initial browser launch lacked Playwright's video ffmpeg executable; trusted CDN installation returned403 Domain forbidden. The existing system `/usr/bin/ffmpeg` was used through Playwright's expected executable path under writable `/workspace/.cache/ms-playwright`, preserving video assertions and producing a real WebM. Browser uses installed `/usr/bin/chromium` with container-standard `--no-sandbox`; no production browser/sandbox changes. Raw failed tooling-download diagnostics remain in `test-results/browser-tools.log`.

The three Windows-only native cases are explicitly skipped by the Linux suite and remain required in GitHub's Windows CI job. No model inference or real queue intake was needed to verify deterministic grouping controls. This synthetic dashboard proof demonstrates controller DTO rendering and reload persistence, not a claim that real issues were processed.

Codex must now re-run the QA Gate.
