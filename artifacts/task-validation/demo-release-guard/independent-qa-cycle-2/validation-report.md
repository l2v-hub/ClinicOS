# Independent QA — demo release guard, cycle 2

Verdict: **FAILED VALIDATION**. Correction cycle 3 must be explicitly reserved before source changes. This review never changed source files, state/budgets, GitHub settings, credentials, deployments or issue status.

Dedicated reviewer: `/root/release_guard_qa2`. Baseline `a516d42e31f6674c39c1d130c9706cd80a7ab4c6`. All ten candidate-2 source hashes match the frozen manifest. All 24 recorded historical candidate-1 / independent-QA files remain unchanged. Governance: `.claude/skills/qa-gate/SKILL.md`, all five phases recorded independently.

## Findings

**QA2-F1 — completion publication bypasses a hold applied during the awaited issue read.** `agent-team/src/bug-pipeline/release.mjs:536–540`: the initial loop hold check precedes `await github.viewIssue()`. If an authorized operator applies a durable hold while that remote read is pending, `commentIssue()` publishes **Risolto** before the next hold check. The latter stops closure but cannot retract the false publication. Independent regression: actual completion comments **1**, expected **0**; status mutations remain 0. Re-read and validate the current durable release/hold immediately before posting the comment, after the asynchronous issue read.

**QA2-F2 — the actual status adapter can close an issue after a hold arrives during its intermediate HTTP operations.** `release.mjs:553` checks only before calling `setIssueStatus`; `agent-team/src/bug-pipeline/github.mjs:355–375` then awaits label inspection, label POST and two old-label DELETE calls before the close PATCH. The independent test uses the **real createGitHub adapter**, with only its transport synthetic, and adds a hold during its awaited label inspection. The actual close PATCH is still emitted with `held=true`. Provide a release-guard callback that reaches the actual mutation boundaries inside the adapter, including immediately before the final close PATCH after all preceding awaits. Preserve unrelated labels, existing status-cache/retry behavior and all non-release callers. A hold arriving while the irreversible close request itself is already in flight cannot be atomically prevented by a separate state store; tests should target the avoidable awaits before that request.

**QA2-F3 — completion comment declares closure before the close API succeeds.** `release.mjs:526`: the pre-close comment states “issue chiusa come completata”. A synthetic HTTP503 from the actual close operation leaves this untrue claim on an open issue. Independent regression verifies the false claim remains. Use only already verified review/deployment facts in the pre-close message; do not state that issue closure already happened. Retry must remain idempotent through the existing marker. This wording predates the candidate, but the modified publication path and new hold semantics make it part of the explicit release guarantee.

All three independent regressions are **RED: 0 pass / 3 fail**, preserved in `hold-publication-race.test.mjs` and `hold-publication-race.log`. No production source fix was applied by QA.

## Phase results

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | Original task-contract.md; candidate-2/contract-addendum.md; cycle-2-correction-addendum.md. Read actual issue #470 body and its status comment; exact demo target and no production reset are confirmed constraints. This is the separately authorized release-proof infrastructure prerequisite, not a claim of completing #470. |
| 1 Complete diff review | FAIL | All ten source files reviewed, plus the actual unchanged GitHub transport adapter reached by publication. QA2-F1/F2/F3 above violate AC5/publication truth. Scope otherwise matches the frozen ten files; no schema, clinical policy, frontend product or dependency changes. |
| 2 Independent build/tests | FAIL due to new regressions | Existing full suite: 254 total, 251 pass, 0 fail, 3 native-Windows skips. Focused helper/release/settings plus original independent cache negatives: 142/142 pass. New independent header grammar probes: 10/10 pass. Actual backend readiness HTTP: 1/1 pass. Backend and frontend TypeScript pass. Frontend production build passes (46.46 s). New independent hold/closure regressions: 0/3 pass. Exact logs remain alongside this report. |
| 3 Synthetic Playwright | FAIL — defects objectively reproduced; evidence complete | Actual frozen production helpers, real localhost HTTP and real GitHub adapter over synthetic transport: 20 scenarios, 17 correct decisions and 3 DEFECT results corresponding exactly to QA2-F1/F2/F3. Values survive reload; zero console/page/relevant HTTP errors. Screenshot visually inspected; valid trace ZIP and actual WebM recorded. See final-result.png, trace.zip, browser-results.json, playwright-report/index.html, test-results/. The browser harness PASS means its assertions matched observed findings; it is not a candidate approval. |
| 4 Security | PASS with release-authorization correctness failures | No real secrets, PHI, model calls, external writes or data; fixed API origins and credential separation; trusted main run/repo/ref/SHA/attempt checks; bounded artifact digest/extraction; exact native source/target/unique active deployment/public UUID/no-store. No new product route/auth bypass/dependency, unsafe SQL, CORS relaxation or shared trust mutation. QA2-F2 is a correctness failure of the new durable-hold authorization promise, not excused by otherwise passing controls. |

## Boundary and negative audit

- Cache directive correction: the original three independent negatives now pass; quoted comma/escaped quote/OWS/case and malformed syntax were additionally probed independently. Bare no-store is required. No lookalike acceptance found.
- Native active identity: exact single SUCCESS deployment required. Old/new coexistence, duplicate identity and transitional status fail. Polling waits for convergence and never requests public readiness while overlap remains; persistent overlap cannot issue a receipt.
- Remote proof: trusted successful main workflow/repo/event/attempt/commit and immutable ZIP digest are bound to the expected target and receipt; redirects do not forward GitHub credentials. A production-only success cannot satisfy backend closure. Native API/deployment/public proof is rechecked before publication.
- Premerge: current-main preflight and final state/approval reread precede merge; a hold applied in remote checks blocks the merge. The merge adapter's first command is the merge request; an already in-flight irreversible request is a different boundary.
- Recording: live-proof await is followed by a fresh state check. Actual state writes use optimistic compare-and-swap, preserving a competing hold rather than overwriting it. No review or implementation ledger is reset.
- Publication: initial live-proof and loop-entry rereads are present, but the subsequent issue-read await creates QA2-F1; the actual status adapter creates QA2-F2. Comment-post holds are detected before calling status, but the already-closed wording creates QA2-F3.
- Settings: all six unconditional PR check jobs were independently inspected. Reads cover managed, cumulative/effective and classic bindings before any mutation; bounded pagination rejects a wrong binding on later pages. Existing human review rules, strict mode, other checks, bypass actors and default workflow permission are preserved. Fully configured settings produce no writes. Actual authenticated settings application remains a later root operation, not this local QA result.
- Both modified workflow YAML files parse and structural tests pass. Native actionlint is unavailable; no native-actionlint or GitHub CI pass is claimed. Real read-only source-binding preflight and actual deployment/Claude review remain later release gates.

## Reproduction and limits

Run `node --test artifacts/task-validation/demo-release-guard/independent-qa-cycle-2/hold-publication-race.test.mjs` from the worktree root to reproduce the three deterministic failing release regressions without any real GitHub or Railway request.

This review does not authorize merge, live activation, deployment, actual settings mutation, issue closure or source correction. Parent Codex owns those later actions and the next bounded correction cycle. GitHub issue publication is deferred to root as explicitly instructed; local QA did not send a message or mutate any external application.

## Browser execution and integrity

The entire QA HTTP-server/browser lifecycle held `/tmp/clinicos-browser-qa.lock`. No Docker operations or shared NSS/trust changes occurred. The subprocess used `env -i` with only PATH and its task-specific PLAYWRIGHT_BROWSERS_PATH. System Chromium and `/usr/bin/ffmpeg` via a task-local cache symlink were used; no browser install, insecure TLS or external fonts. All results come from actual current production helpers, not precomputed PASS text. Synthetic release calls never leave the fake transport. The failure screenshot clearly shows completionComments=1/closedIssues=0 with a hold, actualClosePatchWithHold=1, and closedIssues=0/closeHTTP=503/alreadyClosedClaim=true.

Actual artifact paths (relative to this report): `final-result.png`, `trace.zip`, `browser-results.json`, `playwright-report/index.html`, `playwright-report/run-summary.json`, and `test-results/page@b06132ede13d24a0df928782467cde0b.webm`. Source manifests are `source-hashes-before.json` / `source-hashes-after.json`; historical checks are in `hash-integrity.log`; all new evidence hashes are recorded in `evidence-hashes.json`.
