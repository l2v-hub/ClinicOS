# Implementation handoff — issue review communication

Author STOP. Candidate implementation 1/4 is complete and awaiting a NEW independent QA session. This document is not a QA approval or proof of an actual Claude review.

Baseline: `8124b1bc88c0f086b1ee328214f87f4802005d11`. Branch: `codex/issue-review-communication`. No commit, push, GitHub mutation, provider/model invocation, personal-PC action, production data operation or database access was performed by this author.

## Result

The existing external review handoff now mirrors fresh authorized source-issue feedback into the real PR feedback snapshot. The old installed Windows worker can consume those PR comments without a changed fingerprint format. Mirrored data is bounded, redacted, explicitly untrusted, linked to the source comment ID/content digest and the candidate SHA. Free-form approval is never parsed as approval.

The trusted bridge publishes the existing durable review state on every source issue using one of five informational labels: `claude-review-ready`, `claude-reviewing`, `codex-review-fixes`, `review-blocked`, `claude-reviewed`. It preserves lifecycle and unrelated labels. Review comments contain the exact SHA, round, verified report digest and findings. Missing-report failures remain blocked with their existing spent attempt; old failures have diagnostic code `unknown`, never a guessed cause. Updated cron runs additionally capture fixed diagnostic codes without publishing local stdout/stderr.

The sibling workflow runs every five minutes, after the existing controller workflow and on manual dispatch. Both its job and CLI require the configured repository and trusted `main`; only the three intended event types are accepted. It checks out the trusted default branch, uses the existing `CLINICOS_BOT_TOKEN` for real workflow notifications and has no model/API credential. It never saves durable state, reserves or restarts reviews, merges, deploys or closes issues. Informational notification failures do not consume another implementation or inference attempt; later sync can publish them.

## Correctness and simplification

- One module owns status projection, managed labels, guarded GitHub transport, mirroring and acknowledgements. The CLI only selects authoritative batches and emits bounded diagnostic summaries.
- Every mutation serializes its body before awaiting guards, checks the authorized actor, exact current PR identity, every source issue and an immutable full-batch snapshot. A second PR-identity/state read detects drift during the guard's own network awaits. Volatile PR mergeability metadata is intentionally outside identity.
- Feedback freshness uses the stable controller-owned `issueFeedbackSince`; older workers fall back to server-generated PR creation time. Git author/committer dates are not trusted or queried. Future/skewed controller boundaries fall back safely to PR creation, preserving fresh findings.
- The boundary remains stable across corrected SHAs. Older mirrors remain in PR context unchanged, deduplicated by trusted publication actor, source ID, digest and exact generated content. Notifications and mirrors in reserved namespaces are always excluded from actionable input, including across harness identities. A copied marker alone is not publication proof.
- Existing controller owns corrections, tests, simplification, dedicated QA, a new committed SHA and the next bounded review request. The four-round budgets and all nineteen frozen guard sources are unchanged.

## Actual author verification

| Check | Observed result | Evidence |
|---|---|---|
| Focused communication and external-review tests | 45/45 PASS, zero skips/failures | `author-tests/focused.log` |
| Full existing pipeline/Claude helper regression glob | 622 total, 619 PASS, 3 native Windows skips, zero failures | `author-tests/full-regression.log` |
| Provider/network-call safety | Credentials removed, empty HOME/GH config, explicit failing `gh`/`codex`/`claude` executables; no unexpected provider command | `author-tests/deny-provider-bin/`, regression logs |
| JavaScript syntax and diff whitespace | Six `node --check` commands plus `git diff --check` PASS | `author-tests/static-checks.json` |
| Formatting | All seven source files pass Prettier | verified command, unchanged source seal |
| Contract validator | PASS | `author-tests/contract-validation.log` |
| Scope/history | Exactly seven source paths; all nineteen frozen guard sources byte-identical; three contract hashes retained | `source-hashes.json`, `scope-audit.json`, `guard19-unchanged.json`, `contract-hashes.json` |
| Privacy | No actual credentials, private key or signed session found; synthetic fixtures explicitly identified | `privacy-audit.json` |

The meaningful tests exercise the actual communication/controller functions through an in-memory GitHub transport. They cover lifecycle/idempotency, current and old-worker failures, bounded diagnostic codes, report digest tampering, free-form approval rejection, source feedback that reaches real correction/test/QA/new-SHA handoff, feedback during correction, historical oversized comments, future timestamps, source edits, author/cohort/head/ownership races at multiple awaits, notification outages, preservation of labels and all budgets, trusted-main/event checks and workflow event compatibility. They are not evidence of a real GitHub write or live model execution.

## Required next gate and limitations

A NEW dedicated QA agent must run all five phases, including its own actual safe internal browser surface, screenshot, trace and video, plus relevant frontend type/build checks required by the QA skill. Author did not self-certify that gate or claim browser execution. Native CI, root review, operational publication/merge and actual native sync/event verification remain root-owned.

This feature does not repair the inaccessible personal Claude invocation that failed earlier. The existing failed Max attempts for PRs 481 and 483 remain spent and blocked. A fresh source comment larger than 8KB or invalid input fails closed; it does not initiate another review. Historical oversized comments preceding the stable boundary do not block the handoff.
