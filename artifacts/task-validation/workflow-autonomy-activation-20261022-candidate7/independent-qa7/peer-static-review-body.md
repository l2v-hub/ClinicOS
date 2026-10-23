<!-- claude-review-report:504:c172b1341e6f10d13c2407fd60fd9e92c1f93d74 -->

## Claude review round 2 (read-only) — subject `c172b1341e6f10d13c2407fd60fd9e92c1f93d74`

**Verdict: changes-requested** — previous findings: 3 resolved, 2 partially resolved, 0 unresolved. New findings: 6 (2 medium, 4 low).

Note: there is no controller claim this round. The trusted CLI on main fails to read the durable ledger (`github-read-failed`, no HTTP status; `.codex-bug-state.json` is about 5.17 MB), so this report is published as a PR comment for reconciliation. This PR modifies the trust root (`.claude/`, `agent-team/src/`). An independent native human approval is still required, and this report is not that approval (`reviewDecision` is currently empty).

Scope: I read the delta `ce7993a78..c172b1341` outside `artifacts/` (16 files, +1398/-169), the PR comments and the candidate6 packet (`independent-qa6/validation-report.md`, root `validation-report.md`). I also checked CI on the exact head. Evidence binding: the non-artifact diff between QA6's verified private code `99249672` and `c172b134` is empty. All required checks on `c172b134` pass: bug-pipeline-tests, gate, browser-e2e, archive-tests, frontend-tests, real-provider, secret-scan, windows-review-setup. configure-repository and verify-provider-access were skipped. I did not run any tests.

### Previous findings (status each)

1. **Resolved** — `agent-team/src/bug-pipeline/operator-ownership.mjs:13-59`, `contracts.mjs:212-218`. The handback now requires `takeoverNonce`, `authorizedActor` and `handedBackAt`. `automationPaused` (`:46`) unpauses only when `handback.takeoverNonce === operatorTakeover.nonce`, and a stale or malformed handback pauses. Two residual points remain:
   - Code does not enforce a fresh nonce for each takeover: `nonce` is optional and no writer tooling exists in `src`. This is operator discipline, as documented.
   - `authorizedActor` is audit data, not authentication, as documented.

   See also new finding 6.

2. **Resolved** — `release.mjs:201-221`. `hasFinalCodexProof` binds the verdict to `verified`, the SHA, the Claude round and the feedback fingerprint, and checks the `externalReview` fingerprint. It is enforced in selection (`:142`), `releaseBatch` before merge (`:650`), the fresh guard (`:419`), `recordDeployment` (`:945`) and the publication guard (`:1138`). Internal-mode batches are exempt (`:204`, `!batch.externalReview`). See new finding 2 for the effect on legacy, already-merged batches.
3. **Partially resolved** — `external-review.mjs:191, 237-283`.
   - What is fixed:
     - `failed` and `blocked` records are archived and re-run under a separate three-session inference allowance.
     - An unusable verdict counts as an infrastructure failure.
     - Only `changes-requested` reaches the correction path (`:287`), so implementation attempts are no longer consumed.
     - A `failed` record is recoverable via `release-qa-reservation`.
   - What remains: blocked, exhausted or ambiguous final-QA states have no sanctioned recovery, and legacy records trigger that dead end automatically (new finding 1). Observation failures can still consume attempts or slots (new finding 3).
4. **Resolved** — `pipeline.mjs:110-148`. Proxy guards re-read ownership before `prepare`, `execute`, `verify`, `simplify`, `qa`, `finalQa`, `checkpoint`, `publish`, `review`, `issueEvidence`, `commentIssue`, `commentPR`, `createDraft`, `setIssueStatus` and `discoverQueue`. `report` and `block` also re-check (`:239`, `:245`), and so does `save` (`:151`). The internal paths from round 1 (old lines 469-470, 516 and 583) are now covered. The read-to-push window that remains is inherent. A residual unguarded write is new finding 5.
5. **Partially resolved**:
   - What is fixed:
     - The rebase and fresh-ownership validators throw the typed `review-operator-owned`.
     - `github.mjs:735-751` preserves that code instead of wrapping it as `state-rebase-invalid`.
     - `save` no longer sets `persistenceFailed` for it.
     - `recoverOwnership` reloads canonical state and skips the subject (`pipeline.mjs:437`, `:671`, standalone loop `:200`).
   - What remains: new finding 4.

### New findings

1. **medium — `agent-team/src/bug-pipeline/external-review.mjs:74`** (also `:190`, `:246`, `:286`)
   - _Problem_: Final-QA records written by main have the shape `{subjectSha, claudeRound, status, summary}`, with no `feedbackFingerprint`, `nonce` or `reservedAt`. For an already-approved batch at the same SHA and round, `prior.feedbackFingerprint !== fingerprint` (`:190`) forces a re-run. `finalQaSpend` then sees a spent-status entry whose identity is not "different" but which fails the binding check, so it classifies the history as ambiguous (`:74`→`:80`) and blocks. The same dead end follows `final-qa-infrastructure-exhausted` (`:246`) and the pre-QA identity race (`status: 'blocked'`). No sanctioned recovery applies:
     - `release-qa-reservation` accepts only `running` or `failed` (`comment-review-handoff.mjs:572`).
     - `resume` requires a transient `batch.failureCode` or a negative-review allowance (`:632`), and `blocked()` sets no failure code.
     - The archived legacy entry stays in `codexFinalReviewHistory`, so every later run re-blocks.

     Result: every `ready` legacy external batch at rollout becomes permanently blocked, and only a new commit or review round can move it.

   - _Requested change_: Treat a legacy record that matches SHA and round but lacks the new fields as one counted spent session (or as a non-spending migration), not as ambiguous. Provide a trusted, history-preserving recovery action for final-QA `blocked` or exhausted states, for example by extending `release-qa-reservation` to `blocked` with `failureCode`, bounded by the existing native continuation authorization.
   - _Test expectation_: A `ready` batch with `approvedSha === sha` and a legacy `codexFinalReview {subjectSha, claudeRound, status:'verified'}` re-runs final QA (or reaches a recovery-eligible block) and does not end in an unrecoverable state. After exhaustion or ambiguity, the trusted recovery succeeds without deleting any history entry, and the next run is still bounded.

2. **low — `agent-team/src/bug-pipeline/release.mjs:143`** (also `:945`, `:1138`)
   - _Problem_: The new proof is applied retroactively to post-merge stages. Batches merged before this gate, with `release.status` `merged` or `deployed` and publication pending, carry a legacy `codexFinalReview` without `feedbackFingerprint`. Three effects follow:
     - They are no longer re-selected for publication (`:143`).
     - `recordDeployment` and the publication guard refuse them.
     - The pipeline skips merged or deployed batches, so the proof can never be regenerated.

     The result is stuck issue publication and closure for releases in flight.

   - _Requested change_: Enforce the proof before merge, and bind it into the release record, for example `release.finalQaNonce`. Post-merge stages should then verify that recorded binding, or explicitly accept releases recorded before the gate existed.
   - _Test expectation_: A batch with `release.status:'deployed'`, publication incomplete and a legacy final QA record is still selected, and `recordDeployment` and publication proceed. A new merge without a verified, fingerprint-bound proof is still refused before the merge call.

3. **medium — `agent-team/src/bug-pipeline/pipeline.mjs:90`** (also `:110-148`, `:535`; `external-review.mjs` correction catch near `:374`)
   - _Problem_: Each guarded call and each `save` performs an untyped full-ledger read (`store.observe()` → a new store `load()`, including `ensureBranch`, about 5.17 MB). A read failure inside a guard behaves like a work failure:
     - At `execute`, `verify`, `simplify` or `qa`, the inner catch (`:535`) marks the implementation attempt `failed`, consuming one of four.
     - In the external correction path, the reserved attempt is marked `failed`.
     - At the `finalQa` guard, the failure consumes one of the three inference slots although no inference ran.

     This conflicts with the module's rule that non-code failures do not consume implementation attempts. Ledger reads are currently failing on main. The resulting failure codes are not transient, so `resume` cannot recover them.

   - _Requested change_: Type observation failures (for example `ownership-observation-failed`, mapped to `github-read-transient`). Propagate them without marking attempts or slots spent. Consider a cheaper freshness check, such as the ref or Contents SHA, before decoding the full blob.
   - _Test expectation_: When `store.observe` rejects once during `verify` or before `finalQa`, `spentAttempts` and the inference ledger are unchanged, and the batch ends with a resume-eligible transient failure code.

4. **low — `agent-team/src/bug-pipeline/pipeline.mjs:245`** (also `:437`, `:671`)
   - _Problem_: `block()` starts with `freshOwnership()`. If ownership changes between a genuine failure and the block write, the typed error is thrown from inside the catch handler and aborts the whole run. Other unowned subjects are not processed and the workflow goes red. This is the residual of previous finding 5.
   - _Requested change_: In both batch catch handlers, wrap the `block(...)` call so that `recoverOwnership` applies, and `continue`.
   - _Test expectation_: Batch A fails genuinely, and a takeover of A lands before `block`. A is not written or relabelled, batch B is processed, and `runPipeline` resolves.

5. **low — `agent-team/src/bug-pipeline/external-review.mjs:388`**
   - _Problem_: `gh.draftReady` is a PR write but is missing from the guarded list (`pipeline.mjs:141-148`). A takeover after the step's last observation can still move an operator-owned PR out of draft. The following `save` detects the takeover only after the write.
   - _Requested change_: Add `draftReady`, or default-guard every mutating `gh` method (an allowlist of reads instead of a list of writes).
   - _Test expectation_: With a takeover written before `draftReady`, `draftReady` is never called and the subject is skipped.

6. **low — `agent-team/src/bug-pipeline/contracts.mjs:212-218`**
   - _Problem_: `validateState` now hard-throws on handback and takeover metadata that main accepts, for example the round-1 handback shape without `takeoverNonce`, `authorizedActor` or `handedBackAt`. `validateState` is on every path: Claude claim, submit and recover (`comment-review-handoff.mjs:98`, `:122`), release, cron, dashboard and issue sync. If the live ledger holds such a record at merge time, the controller, the Claude reviewer path and recovery all stop, and only a manual ledger edit can fix it. This fails closed, but it disables the recovery tooling too.
   - _Requested change_: Before merge, verify that the live ledger has no legacy-shape handback, and record that in the packet. Alternatively, let `validateState` accept the legacy shape while `automationPaused` keeps treating it as paused, which `:57` already does.
   - _Test expectation_: State with a legacy handback (no nonce, actor or time) loads in `comment-review-handoff` and in recovery, while `runPipeline` and `selectAutoReleaseBatch` remain paused.

### Limits

- This was a read-only static review of the delta and of the surrounding code paths it touches. I ran no tests or probes, made no reads or writes to GitHub state, and did not read the live ledger. Findings 1, 2 and 6 depend on records that may exist in the live state; I could not confirm their presence.
- Test-suite results and the QA6 counts (724/724 tests, 10/10 probes) are taken from the packet as reported, not reproduced. QA6 reports the packet's metadata typos as non-source defects.
- I found no secrets in the delta. The skill and docs text in `bug-delivery.md` and `codex-bug-workflow.md` is consistent with the code. Two exceptions: the docs say exhaustion "requires explicit recovery" without naming the action, and no action currently exists (finding 1). The docs also do not mention the post-merge effect described in finding 2.
- The manual Claude claim, submit and reconcile code is unchanged in this delta (`comment-review-handoff.mjs` has only test changes). It is affected only through `validateState` (finding 6).
