# Independent cloud QA2 — READY FOR CODEX QA

Reservation: `39759edd-9ecc-4354-83fc-fecf1f3f8964`. Worktree `/workspace/clinicos-cloud-review`, nine-file source delta against `715a4b9e47ff9bd0192b7f58f24271e48da4900d`. All nine source hashes match the reservation before and after independent review. QA1, author1/2 and source remain unchanged. No correctness or security finding remains in the reviewed code. This is a code gate; hosted authentication and activation remain unverified.

## QA1-01 independently retested: PASS

The independent probe starts with a requested subject before the worker acquires its original claim. During inference, real native handoff methods settle that claim as failed, consume separately verified synthetic operator authorization to recover/request, then reserve a fresh same-actor, same-SHA claim. In both batch and standalone paths, valid stale inference returns `ownership-changed`, posts zero reports, performs zero reconciliation/projection/wake, and leaves the replacement snapshot exactly unchanged, with old failed/new running review and ledger history. Failed stale inference likewise cannot settle the replacement. No real provider or GitHub mutation was used.

`comment-review-handoff.mjs:322` synchronously clones expected claim and review before its first await. Full snapshot and actor checks at `:327` bind request, claim, round, owner, SHA and context. `:165` reloads and compares after the final actor/live checks immediately before `:187` comment publication. The probe mutates the durable request/claim during the fourth and final live read in BOTH batch and standalone, and both reject publication. Independent aliases tests mutate caller-owned expected claim and review during awaits; posted bodies remain the validated originals. Normal unchanged-claim submit/reconcile passes for both. A comment that actually posts and then throws uncertain outcome preserves the genuine comment and unchanged running reservation. Worker submission at `cloud-review-worker.mjs:405` carries the original native snapshot; ownership changes return a finite result without replacing/settling the new claim.

Evidence: `independent-probe.mjs`, `native-fixture.mjs` (byte copy of frozen QA1 synthetic fixture), `standalone-fixture.mjs` (private extraction of current test fixture), and `independent-probe.log`: 12 scenario groups PASS. Private fixtures exercise real native handoff/controller implementations against synthetic state/API transports; outputs are not genuine Claude reviews.

## Recorded phases

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | Existing contract independently validated: `CONTRACT VALIDO` in contract.log. AC1 ownership and security boundaries retested; AC2 independent tests pass; AC3 operational qualification explicitly remains unverified. |
| 1 Full nine-file delta review | PASS | Worker, workflow, native batch/standalone changes, schema export, three test files and docs reviewed against 715. No code finding. Source before/after match reserved manifest. |
| 2 Build/tests | PASS | Exact requested Node v22.23.4 binary. Focused 116 passed, zero failed/skipped/cancelled. Full suite once: 1,247 tests, 1,244 passed, zero failed/cancelled, 3 native Windows skips. Independent probes pass. git diff --check clean. |
| 3 Scoped runtime evidence | PASS | Contract Frontend/UI=no and Playwright=no; parent explicitly restricted to internal synthetic probes/no browser. Runtime protocol/state assertions supplied instead of adding UI or clinical surfaces. |
| 4 Security | PASS | Main-only checkout/gating, subscription-only child isolation, inert source retrieval, bounds, native claim/budget, exact reservation publication and uncertainty preservation verified below. |
| 5 Report/freeze | PASS | report.md, result.json, source-before/after.json, STOP.json and seal.json. No source/contracts/old-QA/canonical-state writes. |

## Boundary audit

- `.github/workflows/claude-cloud-review.yml:29`: fixed repository and main ref; review gate requires repository variable `CLAUDE_CLOUD_REVIEW_ENABLED == true`; explicit probe works while disabled. Native label/request-comment wakes and ten-minute schedule; concurrency preserves the active run. Checkout pins Actions and `refs/heads/main`, with credentials persistence disabled. CLI installation is outside checkout before credentials enter the model step. No PR checkout or PR hook/settings execution.
- `cloud-review-worker.mjs:96`: fixed-repository integer/SHA endpoints, live nonfork/open/main-base identity, pinned base/head complete nontruncated inventories, ancestor proof and capped-300 compare handling. Regular bounded UTF-8 text blobs verify actual Git SHA1; unsupported source modes/binary/oversize block. Binary proof artifacts stay hash-addressed metadata; frozen standalone packet verification is retained. Required contract/plan/validation text included; additional text is bounded with explicit omissions.
- `cloud-review-worker.mjs:23`: 160KiB blob, 1,200KiB packet, 80 source-file, 5,000 changed-entry, 50,000 tree-entry bounds. Large historical PR 504 exceeds the source scope and remains source-unavailable BEFORE a claim; this is an explicit operational limitation, not a qualification success. `:331` continues to later candidates; passing tests cover unsupported-first queue fairness plus 90 binary artifacts and capped-300 evidence inventory.
- `cloud-review-worker.mjs:249`: real structured subscription probe required before native claim; pinned CLI 2.1.301. `:463` removes API/alternate provider credentials; review child environment is allowlisted by existing process.mjs. Actual subprocess test confirms OAuth only and no GitHub/OpenAI/Codex/API/deploy credentials, isolated HOME/cwd, no tools/MCP/settings/slash commands. No dependency/clinical/database/application changes or real PHI fixtures.
- Native claim at `comment-review-handoff.mjs:293` checks SHA, issue state, active implementation owner, required checks and remaining attempts; native CAS reserves before inference. `:350` exact-owned failure preserves prior reservation and spent history; no invented report/refund/retry. Submit uses full expected reservation. Uncertain publication remains for native reconciliation; no failure settlement discards a possible report. Native reconciliation/projection and main Codex wake remain; no merge/close/deploy path was added.

## Commands and fixture provenance

Both test commands used `TMPDIR=<private cloud-qa2/test-tmp>` and `/tmp/clinicos-node22-native12/node_modules/node/bin/node` from the read-only source worktree:

- `--test agent-team/tests/bug-pipeline/cloud-review-worker.test.mjs agent-team/tests/bug-pipeline/comment-review-handoff.test.mjs agent-team/tests/bug-pipeline/standalone-review.test.mjs scripts/quality-gate/claude-bug-review.test.mjs` → focused-node22.log, 116 PASS.
- `--test agent-team/tests/bug-pipeline/*.test.mjs scripts/quality-gate/claude-bug-review.test.mjs` → full-bug-pipeline-node22.log, 1,244 PASS, 3 skipped, zero FAIL. Run exactly once; no package install, full fetch or browser download.

The four prior author ENOENT fixture failures now pass. Root restored the authentic 175,354-byte 715 Git trace fixture. QA2 independently compared current bytes with `git show 715:.../trace.zip`; SHA256 `008d36bda06472a22c86244c8e06bdad0bde622bce35f637058c13cd977545eb`. No fabricated trace or test/source alteration. See fixture-verification.json. An application/frontend build is outside this worker-only contract.

## Operational gate: FAILED AUTHENTICATION / ACTIVATION UNVERIFIED

Preserved actual hosted run `40202235777` with present token reports `claude-authentication-error`, providerAuthenticated=false, zero issue claims, no API fallback. QA2 read the receipt and did not retry any provider/auth/API operation. Synthetic tests do not qualify hosted OAuth or produce a genuine Claude verdict. Native event activation, hosted qualification, genuine review and final Codex/deploy gates remain unverified. Source-80-file limits also prevent automatic review of oversized historical 504 while permitting later eligible work.

Final code decision: **READY FOR CODEX QA**. Whole activation: **UNVERIFIED**, actual hosted authentication failed. Evidence is sealed; no further writes after STOP.
