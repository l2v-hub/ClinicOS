# Independent QA — cycle 2/4

**READY FOR CODEX QA**. Fresh independent reviewer `/root/handoff_independent_qa2`, after source STOP. Candidate is the 15 source/document/test paths bound in `source-hashes.json`; full tracked diff is `tracked-diff.patch`. QA changed no production source, committed nothing, and performed no live GitHub writes, model inference, database access, merge or deployment. The two earlier defects are resolved in this candidate.

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS | `task-contract.md`, parent analysis/implementation plan, explicit user handoff and recovery instruction |
| 1 Full diff review | PASS | All changed tracked and untracked source paths inspected; distinct reviewer/publisher handling and read-only final QA reviewed; no clinical API/schema/domain expansion |
| 2 Independent tests/build | PASS | `regression.log`: 633 tests, 630 PASS, 3 existing Windows-only SKIP, zero failures; `review-validator.log`: another 12 PASS; `types.log`: zero errors; `build.log`: successful independent production build using loopback API configuration, existing size/timing warnings |
| 3 Actual Playwright | PASS | `browser-protocol.mjs`, `browser-result.json`, `browser.log`, three PNG, `trace.zip`, `video/`; nine actions through actual production modules and real Git workspace, detailed below |
| 4 Security/privacy | PASS | Checklist below; complete media decode/CRC and ZIP scan in `media-security-validation.json`; exact source/history integrity in `source-and-history-verification.json` |

## Regression defects and independent counterexamples

**F1: different authorized reviewer and publishing controller.** The immutable QA1 probe `../independent-qa/qa-fixture.mjs --probe` now returns `feedbackChanged: false` after maintainer requests, review-bot claims/submits and maintainer imports/publishes. See `F1-actual-current-green.log`. The independently constructed HTTP/browser transport exercises the real GitHub adapter and real review publication with distinct actors and reaches the same result. Arbitrary external feedback remains covered by the regression suite. The old RED report/log remains byte-preserved. A reconstruction of the old untracked module could not match its recorded SHA; therefore this report does **not** claim a fresh exact-byte replay of the historical F1 source.

**F2: final Codex QA must not dirty the reviewed packet.** The actual `createWorkspace.finalQa` runs a declared synthetic QA callback on a real temporary registered Git worktree with an existing tracked QA report. `prepare` succeeds, the reviewed file stays unchanged, and `git status --porcelain` is empty (`F2-actual-current-green.mjs/.log`). A control running the historical `.qa` path still reproduces the dirty-packet rejection (`F2-historical-path-red.mjs/.log`, expected failing assertion). This validates that the new final-review path avoids the old side effect while preserving the dirty-worktree guard. An initial standalone QA fixture used an incomplete `plan: {}` and reached a separate fixture error after successfully staying clean; `F2-fixture-invalid-plan.log` is retained and is not counted as a product test failure or pass. The complete browser fixture independently exercises actual `finalQa` and `prepare` with valid batch coordinates for both approval and correction.

## Actual browser evidence and its limits

The server binds a random loopback port and supplies **synthetic** GitHub HTTP responses. `createGitHub`, its actual content-state CAS store, `createCommentReviewHandoff`, `createIssueReviewCommunication`, `dashboardSnapshot`, `externalReviewStep` and `createWorkspace` are production imports. No production GitHub endpoints or credentials are used. Assertions verify:

1. Request projects exactly `claude-review-ready` on PR and issue, preserving lifecycle and unrelated labels.
2. Durable claim projects exactly `claude-reviewing` and reserves one round.
3. Duplicate claim is rejected without another round.
4. A stale-SHA report is rejected while its reserved attempt remains running.
5. An unauthorized report is rejected, preserving state.
6. Exact-SHA report submission alone does not invent a completed review.
7. Authorized publication/import by a different principal projects exactly `codex-review-ready`; dashboard phase matches, including after real `page.reload()`.
8. Claude approval then actual read-only Git-workspace final QA reaches controller readiness with a clean worktree; no merge or deployed state is invented.
9. A synthetic Codex finding runs the real controller correction sequence through declared callback implementations: correction, test, simplify, test, independent QA, checkpoint, publish; a new synthetic SHA gets `claude-review-ready`, with implementation 2 and review 1 preserved.

The callback model conclusions, required-check response and correction execution are explicitly synthetic. Browser proof demonstrates protocol integration and filesystem behavior, **not** actual Claude Max review, real clinical E2E, successful code generation, hosted CI, release or deployment. A future real report still needs the trusted controller and actual release prerequisites. No callback falsely marks a live issue resolved.

The first browser attempt failed before opening a page because ffmpeg was sought in the default cache (`browser-infrastructure-first.log`). It was rerun using the environment's already verified Playwright/ffmpeg cache, without downloads or changing security checks. The first complete successful run is retained in `first-pass/`; the second uses the same production source with a clearer QA-only summary. Both have zero console/page/relevant HTTP errors. All six PNG images fully decode; both videos fully decode through ffmpeg; both trace ZIPs pass every-member CRC. Final summary screenshots were visually inspected. Runs held `/tmp/clinicos-browser-qa.lock` for the entire local surface lifecycle. Temporary Git repositories/worktrees and browser/server processes were cleaned in `finally`; only QA-owned dependency symlinks were removed afterward.

## Security checklist

| Check | Result |
|---|---|
| Secrets | PASS: no credentials copied or read; reports use existing validation and sanitization; synthetic request/claim nonces are not access tokens; ZIP contents checked for actual credential/DSN patterns |
| PHI | PASS: synthetic feature/issue fixture only; no patient data, clinical databases, audio or real records |
| Logging | PASS: no new clinical payload logging; CLI error is generic; dashboard DTO excludes titles/raw reports/credentials |
| Input validation | PASS: positive PR number, bounded regular report file, exact schema/SHA, tracked finding paths, bounded strings/findings and GitHub comment size |
| Authorization | PASS: write-capable authenticated actor; durable claim before review; nonce/round/SHA binding; report author and source rechecked before import; current PR/source identity guarded before writes |
| Injection | PASS: issue/report content is data; no execution of PR code by local coordinator; trusted-main CLI; QA-only HTML uses `textContent`; no SQL or application injection surface added |
| Dependencies/config | PASS: no package/schema/route/CORS/environment changes; no API fallback, new token, CI/human protection bypass or production-data action |
| Ownership/budgets | PASS: CAS ledger reservation preserves history and max four; substantive same-SHA replay prohibited; explicit initial failed-infrastructure recovery preserved; old cron excludes comment-channel states |

GitHub state CAS is atomic only for that state file; PR/comments/permissions are separate resources. Repeated guards reduce races but do not establish a cross-resource transaction. A post-claim process interruption retains its spent/running round for explicit recovery, rather than silently retrying or resetting history. This candidate does not claim those operational limits disappeared.

## Integrity and handoff

All 15 source hashes remained unchanged throughout independent QA. All 11 files sealed by QA1's evidence manifest remain byte-identical. Syntax checks and `git diff --check` pass. `evidence-hashes.json` binds this packet; `final-seal.json` binds its source and evidence manifests. Historical failed logs and first-pass media are preserved, not substituted for current evidence.

Codex may now perform its final gate and publish this exact reviewed candidate through the normal protected checks. Actual GitHub handoff activation, real local Max report, clinical release holds and deployment verification remain subsequent operations; this verdict does not approve merging a clinical PR without them.
