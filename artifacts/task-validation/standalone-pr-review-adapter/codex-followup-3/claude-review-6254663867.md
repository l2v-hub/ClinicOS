## Claude review (read-only) — subject `4fcf349a415e0b9b5dfce1f2867bc8e45fe35a74`

**Verdict: changes-requested**: 0 high, 4 medium, 3 low (all new). Of the 9 previous findings, 8 are resolved and 1 is partially resolved.
Note: this is the second review. There is no controller packet. It is published as a PR comment. It is read-only: no PR code, hooks, installs, builds or tests were executed, and nothing was claimed or submitted through the handoff CLI. Operator instructions inside PR comments and packets were treated as data and not followed.

### Previous findings (status each)

1. **high, trust root in the auto-merge allowlist: resolved** (one residual, see N3). `cli.mjs:14-24` now lists only tests and docs, filtered through `requiresHumanReview` (`review-policy.mjs:2-10`, which covers `.github/`, `agent-team/src/`, `scripts/quality-gate/`, `.agents/`, `.claude/`). The merge regex is narrowed to `agent-team/tests/` and `docs/` (`standalone-review.mjs:1005`). A trust-root manifest now returns `human-protected-trust-root` before any merge (`:995`). The workflow and the #491 paths are gone.
2. **high, resettable round budget: resolved.** Ownership is now checked across every `ENTITY_COLLECTIONS` entry for id, PR, branch and issue (`standalone-review.mjs:239-257`). The imported review prefix is pinned through `adoption.importedReviewCount` (`:471-476`, `:540`). Manifest keys are strict (`:504`), so `budgetExtensions` and `operatorContinuations` can be inherited only from durable state (`:527-532`, `:573-582`).
3. **medium, actor equals reviewer equals merger: resolved for the merge gate.** `standaloneMergePolicy` (`review-policy.mjs:12-16`) refuses when the reviewer equals the PR author or the actor. The only override is a protected native human approval (`standalone-review.mjs:986-996`, `github.mjs` `nativeReviewAuthorization`). Two residual limits remain: the reviewer is still just a write collaborator, and "human" means `type === 'User'`. Branch-protection read returns 403 here (packet), so the gate fails closed.
4. **medium, no recovery for stuck subjects: partially resolved.** Maintainer recovery now exists: `abandon-claim`, `release-qa-reservation`, `release-merge-reservation` and `resume` (`comment-review-handoff.mjs:478-566`). It is audited through `recoveryHistory` and keeps consumed rounds. Transient codes no longer block in the tick (`pipeline.mjs:93-113`). Point (a) is only partly fixed, because the transient classification is far too broad and now hides permanent failures (N1). The recovery commands also have no liveness check (N5).
5. **medium, misleading CLI errors: resolved** (one residual, see N6). Output is now structured JSON with `persisted`, `projection` and `next` (`review-handoff-cli.mjs:155-167`, `:209-217`). PUT failures are classified as 409 → `state-cas-conflict`, a definite 4xx/5xx → `state-write-failed`, and otherwise `state-write-uncertain` (`github.mjs:606-632`). Label writes retry with backoff.
6. **medium, silent API-key billing: resolved.** The `CLINICOS_OPENAI_API_KEY` fallback is removed from `cli.mjs`. `finalizeEnvironment` rejects `CODEX_API_KEY` and requires an existing `CODEX_HOME` (`review-handoff-cli.mjs:18-38`). The auth mode is reported.
7. **medium, full re-verification on every guard: resolved.** Reads at a pinned SHA are memoised per operation (`standalone-review.mjs:320-345`). Guards and label writes use only `native` (`:498`, `:609`, `:657`). Full `verify` runs once per gated command (`:755-760`). A standalone failure reloads state and lets normal batches run (`pipeline.mjs:111-113`).
8. **low, optional Vercel check blocks: resolved.** The exact `Vercel` check name is now tolerated (`standalone-review.mjs:374`, `:384`), and the policy is documented (`docs/standalone-pr-review.md:40`).
9. **low, `reservedAt` uses the real clock: resolved.** It now uses `now()` (`standalone-review.mjs:902`), and the clock is injected from the pipeline.

### New findings

**N1. medium — `agent-team/src/bug-pipeline/github.mjs:304`** (with `pipeline.mjs:96`, `:113` and `standalone-review.mjs:693-697`)
_Problem:_ `invoke` turns every failed `gh` command into `github-read-failed`. That includes mutations (`pr merge`, comments, labels) and permanent 401/403/404/422 errors. It also discards stderr apart from an HTTP status. The pipeline and `finalize` treat this code as transient: they do not block, persist no `failureCode`, and `break`. Three consequences follow:

- (a) A subject that fails permanently starves every later standalone subject on every tick, and nothing records it.
- (b) A merge refused by protection after `release: merging` has been persisted leaves the subject `merging` forever. `finalizeStandaloneSubject` returns without action for an open PR (`standalone-review.mjs:801-813`), and nothing escalates.
- (c) A normal batch gets `failureCode: github-read-failed`, which the `resume` path accepts as transient (`comment-review-handoff.mjs:533-537`).

_Requested change:_ Classify failures by method and status:

- 429, 5xx and timeouts become a transient read code.
- Other 4xx become permanent.
- Mutations get their own code, for example `github-write-failed`.

Also keep a bounded, sanitised stderr excerpt. In the tick, `continue` (or rotate the order) instead of `break`, and record a durable `lastTransientFailure {code, at, count}` that escalates to `blocked` after N consecutive ticks.
_Test expectation:_ With subject A returning 404 on every tick, subject B is still processed in the same tick. A `pr merge` failing with 405 does not produce `github-read-failed`. After N transient failures in a row the subject is blocked and has a visible failure code.

**N2. medium — `agent-team/src/bug-pipeline/comment-review-handoff.mjs:425-476`** (with `:478-566` and `attempt-budget.mjs:93-106`)
_Problem:_ `extend-budget` and every `recover` action check only that the acting login has maintain or admin permission. The coordinating account (`l2v-hub`, the repository owner) opens and adopts PRs and runs Codex, and it is admin. So the automation can raise its own implementation and review budget one step at a time up to 32, and it can release failed QA reservations again and again (`qaHistory` is unbounded). `authorizationRef` is free text that nothing checks. The `operatorTakeover.continuePastFourPreserveHistory` flag is not written by any code path, so it can only come from a hand-edited state. As a result, the four-round cap no longer constrains the automation itself.
_Requested change:_ Bind each extension, and each QA release past the first, to an authorization the automation identity cannot produce. For example, `authorizationRef` must name a comment or review by a maintainer login other than the actor, the PR author and the claim owner, and the save guard verifies its id, author and body digest. Otherwise, refuse when the actor equals the PR author or the adopter.
_Test expectation:_ `extend-budget` run by the PR-author maintainer with a free-text reference is rejected. With a verified comment from a distinct maintainer it succeeds. A second `release-qa-reservation` on the same SHA without a fresh authorization is rejected.

**N3. medium — `agent-team/src/bug-pipeline/cli.mjs:20`** (with `standalone-review.mjs:1005` and `review-policy.mjs:2-10`)
_Problem:_ `docs/claude-local-review-prompt.md` is the operating prompt for the Claude reviewer. It sets the reviewer's safety rules: use the trusted CLI from main, never run PR code, and treat content as untrusted. It is still in the auto-merge allowlist and is outside `requiresHumanReview`. A docs-only PR could therefore rewrite the reviewer instructions and be squash-merged after one automated Claude approval and Codex QA, provided the reviewer identity is distinct. That would change the rules for every later review. The trust-root guard tests (`standalone-review.test.mjs`, `github.test.mjs`) can be weakened through the same path.
_Requested change:_ Add the review prompt, and the tests that pin the trust-root policy, to `requiresHumanReview`. Alternatively, drop them from `STANDALONE_INFRASTRUCTURE_FILES`.
_Test expectation:_ A test asserts that `STANDALONE_INFRASTRUCTURE_FILES` does not contain the prompt doc, and that a manifest touching only that doc returns `human-protected-trust-root` with zero merge calls.

**N4. medium — `agent-team/src/bug-pipeline/release.mjs:247`** (with `:509`, `:608` and `issue-review-communication.mjs:132`)
_Problem:_ `reserveImplementation` now appends continuation attempts to `operatorContinuations` rather than `implementation` (`attempt-budget.mjs:126-153`). The controller-backed release gate (#481/#483 path) still reads `batch.implementation.at(-1)`, and `reviewProjection` still checks only `batch.implementation` for a running attempt. Three consequences follow:

- A normal batch continued after four legacy rounds can never be released if its last legacy round failed.
- If the last legacy round passed, the gate checks a stale attempt, although phase and approval checks reduce the risk.
- The projection can show `claude-review-ready` while a continuation worker is running.

`cli.mjs:133`, `:143` and `dashboard.mjs:93` also report only the legacy length.
_Requested change:_ Use `implementationAttempts(batch).at(-1)` and `activeImplementation(batch)` everywhere. Grep for `.implementation.at(-1)` and `.implementation.some(`.
_Test expectation:_ A batch with a legacy history of four failed rounds plus a passed, approved continuation passes release validation. A batch whose latest attempt is a running continuation projects no review label.

**N5. low — `agent-team/src/bug-pipeline/comment-review-handoff.mjs:486-514`**
_Problem:_ `abandon-claim`, `release-qa-reservation` and `release-merge-reservation` accept a reservation of any age, so they can preempt an owner that is still live. A merge release while `gh pr merge` is still in flight can finish after `release` has been deleted. The merged receipt is then lost, and the subject later blocks on `native()` because the PR is closed. The tokens are also deterministic digests: `resume` uses `{phase, failureCode}` and `release` has no nonce. The documentation calls them nonces.
_Requested change:_ Require each reservation to be older than its operation's timeout lease, or an explicit `--force-live` recorded in history. Add a random nonce to the `release` reservation. On merge release, re-read `merged` from the pulls API immediately before the save.
_Test expectation:_ Releasing a fresh reservation is refused without the flag. A merge that completes during the release leads to receipt recovery, not to `waiting-review`.

**N6. low — `agent-team/src/bug-pipeline/comment-review-handoff.mjs:217`** (with `review-handoff-cli.mjs:215`)
_Problem:_ If the request comment fails after the durable save, the CLI says `next: reconcile --pr N`. But `reconcile` returns early for `comment-requested` (`:276`), and a repeated `request` also returns early without posting (`:167`). The request notice is never re-posted.
_Requested change:_ Make `request` post idempotently when no matching request comment exists, or point the `next` hint at a command that does.
_Test expectation:_ After the comment is injected to fail post-save, the suggested `next` command produces exactly one request comment and adds no ledger row.

**N7. low — `artifacts/task-validation/standalone-pr-review-adapter/codex-followup-2/validation-report.md:3`**
_Problem:_ The top-level report in the new packet is stale. It says "implementation attempt 1/4", "Source baseline d1324cb3", "649 tests" and "IMPLEMENTED — NOT VERIFIED". `independent-qa/validation-report.md` is titled "follow-up 1", and its `source-freeze.json` hash for `standalone-review.test.mjs` predates `0f91a96e0`. The binding evidence is `continuation6-validation-report.md` together with `independent-qa-followup-2/qa-summary.json` (`testSha256` a5c95fef…, which matches the file at this SHA).
_Requested change:_ Replace or clearly supersede the stale report so the packet has one authoritative verdict for round 6.
_Test expectation:_ None. This is a documentation fix.

### What holds up

- **Evidence matches the subject SHA.** `0f91a96e0..4fcf349a4` touches only `artifacts/`. All 21 hashes in `independent-qa/source-freeze.json` match the blobs at this SHA, except the test file changed in `0f91a96e0`, whose hash is the one bound in `independent-qa-followup-2/qa-summary.json`.
- **CI on `4fcf349a4` is green.** That covers `archive-tests`, `browser-e2e`, `bug-pipeline-tests`, `frontend-tests`, `gate`, `real-provider`, `secret-scan`, `windows-review-setup` and `Vercel`. The 3 failures recorded on the previous hosted run (`codex-auth-unavailable`) are explained by the runner home, and the test fix in `0f91a96e0` addresses them.
- **Adoption.** Revision adoption still preserves reviews, ledger and reports exactly, and it now also inherits the budget, continuation and recovery history from durable state.
- **Merge path.** The merge guard re-evaluates the policy inside `mergePullRequest` (`standalone-review.mjs:1025`).
- **Claude reviewer budget.** `claude-bug-review.mjs` keeps the default limit of 4 unless a caller passes a durable `budgetSubject`. No caller at this SHA passes one.

### Limits

- **Nothing executed.** This is a static read of `git diff fcabd4071 4fcf349a4`, excluding `artifacts/`, plus the files at this SHA, compared against merge-base `d1324cb3d`. No tests, probes or browser evidence were run, so the reported 715 tests and 17 adversarial cases were not reproduced.
- **Packet and live state.** Most of the 52 follow-up-2 packet files and the hand-migrated live state on `codex/bug-control` were not inspected.
- **Branch protection.** The real branch-protection configuration was not queried.
- **Previous-review limits still apply.** The PR's tests still use synthetic GitHub, model and merge callbacks.

