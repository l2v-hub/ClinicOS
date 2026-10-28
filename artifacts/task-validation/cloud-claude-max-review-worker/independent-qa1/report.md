# Independent QA1 — FAILED VALIDATION

Reservation: `b5903280-392e-4013-8af5-2f6df465c7c5`. Frozen nine-file delta against `715a4b9e47ff9bd0192b7f58f24271e48da4900d`. Reviewed repository QA Gate and agent-loop instructions, task contract, and all nine source/test/doc files. The task-contract validator reports `CONTRACT VALIDO`; `git diff --check` passes. Source hashes before and after match the reserved map exactly.

## Finding QA1-01 — High: stale inference publishes under replacement claim

`agent-team/src/bug-pipeline/cloud-review-worker.mjs:396` submits only `(pr, review)`. Its request binding checks at lines 357–359 happen before inference. `agent-team/src/bug-pipeline/comment-review-handoff.mjs:287` reloads whichever reservation is current and verifies owner/status, then stamps that reservation's request, claim, and round at lines 302–304. It never compares them with the original inference reservation.

The private Node 22 adversarial probe uses the real native handoff and synthetic GitHub API/state fixtures only. During inference, a separately authorized operator executes native `failOwnedClaim`, `request({recoverFailed:true})`, and `claim` on the same SHA/actor. Original request `nonce-1`, claim `nonce-2`, round 1 becomes replacement request `nonce-3`, claim `nonce-4`, round 2. The old inference is then posted and reconciled as replacement round 2, and the worker returns `published`. This violates exact request/claim/round ownership and consumes the replacement reservation with a result produced for the old request.

Evidence: `claim-race-probe.mjs`, `native-fixture.mjs`, and `claim-race-probe-node22.log`. No real provider execution, genuine Claude verdict, or GitHub mutation occurred. Fix native submit to accept and guard the original expected reservation/snapshot through publication; pass it from the worker. Reject a changed claim/request/round even when SHA and actor match, and preserve the replacement reservation. Cover both batch and standalone paths.

## Recorded phases

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | Existing task contract; independently validated; AC1 exact claim/request/budget preservation is the failing criterion. |
| 1 Full diff review | FAIL | QA1-01. Other reviewed boundaries include main-only checkout, label/comment/schedule gating, source-only API retrieval, tree bounds, Git blob verification, binary artifact metadata, queue continuation, and failure/publication separation. |
| 2 Build/tests | FAIL | Node v22.23.4: all 110 focused native/worker/schema tests pass; independent exact-reservation invariant fails. |
| 3 UI evidence | PASS for scoped contract | Internal worker/configuration; contract says Frontend/UI no and Playwright no. Parent explicitly constrained QA to internal/no-UI and no browser. Synthetic runtime protocol evidence supplied. |
| 4 Security | FAIL | Exact request/claim publication binding fails. Main-only pinned Actions checkout and review child allowlist otherwise structurally present; tests exercise no GitHub/OpenAI/deploy/API credential inheritance, no provider fallback, no PR hooks/settings execution. No new dependencies or PHI fixtures. |
| 5 Verdict/report | PASS | This report, result.json, STOP.json, and seal.json. |

Focused command: `TMPDIR=<private cloud-qa1/test-tmp> /tmp/clinicos-node22-native12/node_modules/node/bin/node --test agent-team/tests/bug-pipeline/cloud-review-worker.test.mjs agent-team/tests/bug-pipeline/comment-review-handoff.test.mjs agent-team/tests/bug-pipeline/standalone-review.test.mjs scripts/quality-gate/claude-bug-review.test.mjs`. Output: 110 pass, zero failed/skipped/cancelled; `focused-node22.log`. Full bug-pipeline regression was deferred after this decisive failure because root requested prompt sealing for repair and no broader run on failed source. No application build is applicable to this worker-only delta.

## Operational gate remains unpassed

Actual hosted authentication result `auth-probe/actual-authentication-result.json` for native run `40202235777`: secret present, provider authentication rejected, zero issue claims, API fallback false. QA did not retry it. Actual authentication qualification and whole activation remain **UNVERIFIED**; no synthetic fixture output is a genuine Claude review. Passing code tests would not qualify hosted authentication.

Final decision: **FAILED VALIDATION**. This reservation is sealed and stopped; no source, contract, API, Git, provider secret, or operational state was edited.
