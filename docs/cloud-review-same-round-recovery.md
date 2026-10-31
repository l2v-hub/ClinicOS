# Explicit same-round cloud recovery

This adapter is separate from the normal queue. It does **not** create a new
review, extend a budget, approve a PR, wake the controller, merge, or deploy.
Preparing this infrastructure PR is not permission to execute a recovery.

## Authority and immutable history

The original `failed-authentication-no-inference` review remains unchanged,
including its nonce, SHA, zero-inference failure receipt and consumed round.
Existing reviews, budget extensions, implementation and release histories are
hashed against the request's preserved accounting snapshot on every operation.

A recorded `technicalRecoveryRequests` entry is **not** an execution capability.
Before dispatch, the designated host must call
`createCloudReviewRecovery({ github, authorizationVerifier }).authorize(selector,
{ actor, reference })`. The verifier must consume an independently authenticated
human grant for `execute-cloud-review-recovery`, with `budget: null`, bound to the
exact original owner, follow-up, request, failed review, SHA, round and history.
Never inject a verifier based on free text or manufacture an approval. Reusing
the already authorized technical recovery does not grant another round or call.
The authorization receipt appends to `recoveryHistory`; it does not replace prior
entries. The cloud worker cannot mint this capability.

## Trusted transport

Only after this infrastructure has separately passed review and been integrated
into trusted main may an authorized maintainer explicitly dispatch
`claude-cloud-review.yml` with `mode: recover` and all four exact inputs:
`recovery_pr`, `recovery_sha`, `recovery_round`, `recovery_request_nonce`.
No schedule, label or automatic queue selection enables this route. Never
dispatch a branch version of the workflow as a substitute for trusted main.

The worker reads source as bounded GitHub API data, never executes the reviewed
branch, and uses the existing subscription-only CLI qualification, empty runtime,
no-tools profile and credential isolation. No API fallback is added. The source
and manifest must match the frozen SHA and every changed source file.

The normal source reader still requires its committed implementation plan. Only
this adapter can supply a missing plan from canonical accepted scope and exact
source manifests. That projection is explicitly `generatedEvidence`, marked
`committed: false`; it never masquerades as a file in the reviewed commit.
Committed contract, validation and referenced QA evidence remain mandatory.

## One-shot execution and recovery of publication

`prepare` and `claim` recheck actor, ownership, nonces, SHA, checks and fingerprints.
Claim atomically appends one `request.execution`; any subsequent inference claim
fails closed, including after provider failure or uncertain publication. It does
not call the ordinary new-round `handoff.claim` path.

An actual validated report is retained under `request.execution` before the
guarded GitHub review POST. If publication acknowledgement is uncertain, retain
the report and receipt artifact: do not rerun inference. A trusted host may
reconcile/re-publish the retained report with the original claim, using native
idempotence and all fresh guards. A stale or revoked capability blocks this too.
Do not change the original failed review into an approval. Final Codex validation
must read the new execution's actual report and GitHub review, bound to the exact
SHA, and separately apply all existing release gates. Legacy release helpers
must not be blindly rerun against the old merged batch.

## Safe local qualification

Unit and integration fixtures use synthetic state, an injected mock authorizer,
mock GitHub and mock provider. The evidence test uses only loopback and a static
HTML/JSON report generated from the actual recovery core. No actual Claude probe,
inference, secret copy or production controller mutation is part of testing.

```powershell
node --test agent-team/tests/bug-pipeline/cloud-review-recovery.test.mjs agent-team/tests/bug-pipeline/cloud-recovery-source.test.mjs agent-team/tests/bug-pipeline/cloud-recovery-transport.test.mjs
node node_modules/@playwright/test/cli.js test --config scripts/quality-gate/cloud-recovery.playwright.config.mjs
```

The browser receipt labels all external effects as mock, preserves the original
failure and accounting across disk reload, and asserts replay rejection. It is
not evidence that PR520 received a real Claude review or that recovery is active.
