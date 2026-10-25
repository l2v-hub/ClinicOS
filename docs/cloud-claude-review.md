# Cloud Claude subscription reviewer

`Claude cloud review` runs trusted `main` on GitHub-hosted runners with pinned Claude Code
2.1.301. Configure `CLAUDE_CODE_OAUTH_TOKEN` (Claude subscription OAuth) and
`CLINICOS_BOT_TOKEN` (native state/comment/label and workflow-dispatch permissions).
The workflow installs the CLI outside the checkout before credentials enter the model step.
There is no Anthropic API billing fallback.

First dispatch `claude-cloud-review.yml` on `main` with `mode=probe`. Its receipt must report
`probe-passed`: the worker performs a real tiny structured Claude inference with an isolated
HOME and no tools. This probe neither claims a subject nor changes its review budget.
Missing/invalid credentials stop before any native claim. A successful probe qualifies that
run's authentication; it does not prove the global Codex workflows are enabled.
Review jobs remain disabled until repository variable `CLAUDE_CLOUD_REVIEW_ENABLED` is `true`.
Probe dispatch remains available while that variable is unset/false. Enable review only after
the actual hosted probe passes, preventing repeated attempts with an invalid credential.

Review mode is triggered by `claude-review-ready` label events, the native request comment,
manual dispatch or a ten-minute scheduled catchup. Labels/comments only wake the worker.
Authority comes exclusively from a canonical batch or adopted standalone subject whose native
GitHub-comments handoff is `comment-requested`. Human PRs and manual batches are never adopted.
The native claim checks live SHA, ownership, checks and remaining budget, then reserves one
round through CAS before review inference. Existing reports, failures and ledger history remain.

The source reader fetches fixed-repository GitHub API data for the durable base/head SHAs.
Complete bounded tree inventories prove the source delta even when GitHub caps comparison files
at 300; regular text blobs are verified against Git object hashes. Changed source blobs, frozen
task contract, implementation plan, validation report and earlier review reports are supplied as
untrusted JSON data. Proof artifacts remain hash-addressed metadata; bounded additional QA
report/seal text is included with explicit omission metadata. Native standalone verification still
checks the entire frozen packet. Unsupported binary source or oversized/incomplete required text
blocks before a claim. Reviewed files, hooks, plugins,
settings and commands are never executed. Claude has no GitHub, OpenAI or deployment credentials.
An unsupported/stale subject appears as `source-unavailable` in the finite receipt, retains its
request and budget, and does not prevent the worker from preparing later eligible subjects.

A valid structured report is submitted and reconciled through the native handoff, projected
onto source issues (or the standalone PR), then explicitly dispatches `codex-bug-pipeline.yml`
on `main`. That controller owns corrections and independent final QA. Claude approval never
merges, closes or deploys. This change does not enable disabled Codex workflows.
Cloud publication passes the original full native claim snapshot to `submit` and checks it
again after the final live/auth guards immediately before posting. A replacement request,
claim, round, owner or frozen context yields `ownership-changed`; the stale result cannot
consume the replacement reservation, even when its actor and SHA match. Both histories remain.

A model failure settles only this worker's unchanged, owned, live claim as failed. The round
stays spent, the exact claim snapshot digest and previous reservation are retained, and no
synthetic review or retry is created. A changed claim/SHA or uncertain report publication stays
reserved for native reconciliation/operator recovery. Publication errors never discard findings.
Inspect the finite receipt and native comments/state; do not reset claims or budgets to rerun.
