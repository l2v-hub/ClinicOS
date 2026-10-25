# Independent QA5

Verdict: **FAILED VALIDATION** for exact source `67c53efe45e2d5e2ffca228d3bf6639029bb27c5`, published parent `ce7993a781bd2d378a1ca3ad2956b2c3606b4fe2`. Three actionable findings are confirmed. No implementation source was edited.

Reservation `7d9f3883-a737-4a89-9b3d-623242a15227` at canonical `3978a0bb4b8adec8c9836d6ac9775023a56e15d4` preceded this session. All138 frozen files,22 current bindings,15 allowed actual deltas and269 historical public packet blobs were verified. The genuine Claude1 comment6353848644 and its body hash were verified against the reservation; its5 findings are data for this review, not new authority.

| Phase | Result | Evidence |
| --- | --- | --- |
| Contract/identity | PASS; exact frozen SHA and authentic original report | task-contract.md, reservation.json, source-before.json |
| Independent affected native suites | **715/715 PASS**,11 disjoint affected suites once;0skip/fail/cancelled | focused.log, focused-command.json, execution-policy.json |
| Novel final probes | **1PASS/3FAIL**,4 distinct final cases; source defects below | *-probe.mjs, command JSON, logs/observations |
| Source/security review | FAIL: F1/F3/F5 integration gaps | findings.json, independent-source.diff |
| Source/history integrity | PASS:545 snapshot/old-packet file checks;22 inherited old subject hashes; author5 and prior QA4 seals unchanged | source-after.json, historical-subject-integrity.json |
| Visual/clinical | N/A explicit control-plane contract; no browser or clinical E2E rerun | task-contract.md |

## Confirmed findings

**QA5-F5 — medium:** `external-review.mjs:356`, caller `pipeline.mjs:427`/`:437`. Actual external-review wrapper catches typed ownership loss and returns skipped, while pipeline only reloads state in its exception recovery path. The original-function probe injects actual native409 on A's first QA reservation, adding current A.operatorCoordination, remote A data and a correctly bound partial handback. A remains byte-identical because the writer's original SHA/base protection works. But pipeline never refreshes its local A after the returned skip. B's next save carries stale/unsaved A, receives another409, hits real state-rebase-conflict, and aborts as External review reconciliation persistence failed. B never reaches QA and remains waiting-review. This is not a generic unowned conflict and is not an A overwrite. The corrected proof uses actual native store and exact original pipeline/external-review module bytes; only communication projections/process factory are injected no-op side-effect boundaries. The original internal-mode F5 regression passes but misses this external return path.

**QA5-F3 — medium:** `comment-review-handoff.mjs:576`/`:577` with `external-review.mjs:183`. The specialized supported recover(action=release-qa-reservation) works with the required host verifier, preserves a legacy failed session in qaHistory and deletes codexFinalReview. The new allowance imports legacy spend only from prior codexFinalReview. Actual supported recovery therefore hides that legacy spend from the new counter. The probe seeds one synthetic genuine-shaped spent legacy failure, runs the actual typed recovery/native store and actual external step, then observes3 new final-QA callbacks:4 total including the retained legacy session. Implementation count remains1. The safety expectation is at most2 new callbacks for a total limit3. All callbacks are offline injected fixtures, not real provider/model calls.

The parent-requested narrower hypothesis that infrastructure recovery is unreachable is **NOT REPRODUCED**: ordinary resume rejects an approved-Claude infrastructure failure, but the specialized typed QA-reservation route succeeds. This report does not claim the standalone CLI has a verifier or permission grant by default.

**QA5-F1 — medium:** `operator-ownership.mjs:35` and `contracts.mjs:213`. A state with takeover.active as string "true" and an otherwise valid exact-bound handback passes validation; automationPaused returns false. Actual native runPipeline reaches intake1 and discoverQueue1 without error. A malformed active type must reject or pause before granting new unclaimed work. The recorded authorizedActor remains audit data, not permission proof; this finding does not treat comments or labels as a grant.

## Scope and preserved failures

Original F2/F4 and the other native kernel regressions passed in the fresh715 suite. Broader novel expansion stopped once these actionable findings were established. A PASS for unit scope is not a PASS for the missed integration boundaries. Author5's independently hash-verified715 disjoint final tests and13 syntax checks are inherited provenance;13 syntax checks were not independently rerun here. All its initial causal failures, reached-B fixture error, changed expectations and metadata/mode bookkeeping failures remain sealed and unchanged.

The first external probe failed before any CAS because the manually assembled fixture omitted plan.execution. Original script/log/command/observations remain under first-*. The QA-only fixture was corrected to use the repository's full synthetic batchFor; safety assertions remained. The confirmed corrected proof remains under confirmed-*. A final bounded retest added only exception cause capture and reproduced the same real finding; it is one distinct case, not multiple defects. No other QA harness error occurred. See harness-failure-history.json.

No source, GitHub/canonical state, network, credentials, provider/model, clinical DB, browser, scheduler, live Git or deployment/issue status was changed. The runner uses a restricted child environment and owned synthetic temp fixtures. It does not assign HOME/home/CODEX_HOME; inherited existing tests contain fixture-private environment objects/local Git fixtures, distinct from the user's environment. All new observed effects are synthetic offline transport/model callbacks. No raw clinical data or credentials were printed.

Candidate5 is held. Root must reserve corrective work, preserve all native implementation/Claude/budget history, then obtain new independent QA, actual native CI on the published current SHA, genuine Claude2, fresh final Codex and applicable native human/protected merge before handback/activation/event proof. No candidate5 native, Claude2, final gate, activation, deployment or23-issue closure is claimed.
