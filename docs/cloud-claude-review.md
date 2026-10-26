# Cloud Claude subscription reviewer

`Claude cloud review` runs trusted `main` on GitHub-hosted runners with pinned Claude Code
2.1.301. Configure `CLAUDE_CODE_OAUTH_TOKEN` (Claude subscription OAuth) and
`CLINICOS_BOT_TOKEN` (native state/comment/label and workflow-dispatch permissions).
The workflow copies the small `scripts/automation/claude-cloud-tools/` package and integrity
lock into the runner temp directory, then runs `npm ci` before credentials enter the model
step. The job's `GITHUB_TOKEN` has only `contents: read`; native writes use the separate bot token.
There is no Anthropic API billing fallback.

First dispatch `claude-cloud-review.yml` on `main` with `mode=probe`. Its receipt must report
`probe-passed`: the worker performs a real tiny structured Claude inference with an isolated
HOME and no tools. This probe neither claims a subject nor changes its review budget.
Missing/invalid credentials stop before any native claim. A successful probe qualifies that
run's authentication and model profile; it does not prove the global Codex workflows are enabled.
The probe explicitly requests `opus[1m]` and requires one resolved Opus model entry with positive
`modelUsage.contextWindow` and `maxOutputTokens` metadata. Internal model entries cannot qualify
the review model. Missing, ambiguous or smaller-context profiles fail before a claim. Reviews pin
the resolved safe Opus ID with `[1m]`, and the qualified context is capped at 1,000,000 tokens.
An unset or empty `CLAUDE_CLOUD_REVIEW_ENABLED` variable, or `true`, enables queued review jobs;
`false` or any other value disables them. No variable needs to be created: merging this reviewed
workflow on `main` may activate queued reviews by default. Probe dispatch remains available when
reviews are disabled. Dispatch `mode=probe` on `main` and verify its real `probe-passed` receipt,
qualified model profile, and a successful review event before declaring activation operational.

Review mode is triggered by `claude-review-ready` label events, the native request comment,
manual dispatch or a ten-minute scheduled catchup. Labels/comments only wake the worker.
Authority comes exclusively from a canonical batch or adopted standalone subject whose native
GitHub-comments handoff is `comment-requested`. Human PRs and manual batches are never adopted.
The native claim checks live SHA, ownership, checks and remaining budget, then reserves one
round through CAS before review inference. Existing reports, failures and ledger history remain.
The cloud worker copies the original subject before asynchronous source retrieval, then copies
the resulting packet. Before the probe it resolves the authorized native actor and fingerprints
the packet's actual GitHub feedback with the native protocol-comment filter. Native claim accepts
that original semantic subject and fingerprint, checks them before reserving, then rechecks the
pending subject and fresh feedback in its final CAS guard. Same-SHA specification/history or
feedback drift yields `preclaim-source-changed`, keeps the pending request and spends no round.
The returned claim must also match precisely the legitimate one-round reservation transition
from the original source before review inference. Benign observations and filtered own protocol
comments remain eligible; feedback arriving after claim is flagged during native report import.

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
Text blobs are limited to 256 KiB and the serialized JSON packet to 700 KiB. Before native claim,
the worker freezes the exact review prompt and schema strings. Their complete UTF-8 byte count
is a conservative input-token upper bound; it adds a fixed 65,536-token native overhead margin
and the probe's observed maximum output allowance. The result must fit the qualified context.
Escaping, Unicode, instructions and schema all count. A known pre-invocation capacity failure
spends no review round and cannot become a repeated paid review attempt.

A valid structured report is submitted and reconciled through the native handoff, projected
onto source issues (or the standalone PR), then explicitly dispatches `codex-bug-pipeline.yml`
on `main`. That controller owns corrections and independent final QA. Claude approval never
merges, closes or deploys. This change does not enable disabled Codex workflows.
Cloud publication passes the original native claim to `submit` and checks its semantic identity
again after the final live/auth guards immediately before posting. PR/SHA/base/ref, frozen
packet/plan, review history and request/claim/owner/status stay bound; benign check or projection
observations do not invalidate a completed review. A replacement request,
claim, round, owner or frozen context yields `ownership-changed`; the stale result cannot
consume the replacement reservation, even when its actor and SHA match. Both histories remain.
The receipt retains the full validated and sanitized report plus `reportSha256` (SHA256 of its
UTF-8 `JSON.stringify(report)`) on ownership changes and every uncertain publication stage.
These artifact reports are recovery evidence; they never authorize a replacement claim or merge.

A model failure settles only this worker's unchanged, owned, live claim as failed. The round
stays spent, the exact claim snapshot digest and previous reservation are retained, and no
synthetic review or retry is created. A changed claim/SHA or uncertain report publication stays
reserved for native reconciliation/operator recovery. Publication errors never discard findings.
Once an actual model call starts, a timeout, rate limit, overload or authentication failure may
have an unknown execution outcome. Its reservation remains spent and the finite failure is
projected with a Codex wake request for authorized recovery. The worker never refunds/pops an
attempt, reclaims a running reservation, mints a retry grant or automatically replays the SHA.
This differs from a capacity/capability rejection proven before invocation, which claims nothing.
Inspect the finite receipt and native comments/state; do not reset claims or budgets to rerun.

Cloud and local review prompts share the trusted `reviewGenerationContract` beside `reviewSchema`.
Approval requires empty findings and supported acceptance criteria and evidence. Every actionable
finding, including low severity, forbids approval; never drop or relabel findings to obtain it.
`changes-requested` requires at least one finding. `blocked` may have zero or more findings, so
empty findings alone never imply approval. Text must be nonempty, locations must refer to exact
tracked relative paths and positive lines, and sensitive values or shapes must not be reproduced.
Schema patterns check nonempty text; descriptions guide generation. The unchanged native
`validateReview` remains authoritative for verdict consistency, the 100-finding bound, positive
lines, tracked locations, exact SHA and unsafe content. The schema alone does not enforce those
cross-field and contextual rules.

Each claimed inference yields a bounded `validationDiagnostic` in its result and a metadata-only
workflow stderr record, including when the runner throws or later controller work fails.
The workflow stdout receipt remains one JSON document. Categories are `schema`, `stale-or-shape`,
`contradiction`, `location`, `fields`, `unsafe`, `envelope-json`, `post-communication`, `valid` or
`other`. Booleans identify parsing, schema, native semantic and communication stages; a separate
whitelisted native Claude failure still governs execution failure. `valid` describes the report
validation stages and does not authorize approval, publication, another attempt or merge.
`runnerThrew` and `diagnosticFailed` expose finite observation failures without exception text.
Only fixed enums, flags, counts, safe exit codes and hashes enter diagnostics. The
`capturedSanitizedStdoutStringBytes` / `capturedSanitizedStdoutSha256` and stderr equivalents
identify captured, already sanitized strings, never raw provider bytes. No report, finding text,
file path or stream content is included in the diagnostic. Diagnostic delivery failures cannot
replace native outcomes or controller exceptions. Existing validated-report retention on success,
ownership changes and uncertain publication remains unchanged. Invalid output is never repaired,
normalized into approval, persisted as a report or replayed automatically.

Revision adoption also preserves the previous `reviewHandoffHistory` byte for byte alongside
existing recovery and budget histories. Archived failed-request recovery authorizations and their
consumed nonces survive a new-head adoption; this creates no request, grant or extra attempt and
never refunds failed rounds.
