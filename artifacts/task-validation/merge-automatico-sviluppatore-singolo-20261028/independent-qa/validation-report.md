# Independent QA Report

## Scope and provenance

- Task: Merge automatico sviluppatore singolo 20261028
- Baseline reviewed: `d0c5fd82e358de60b4e31879e02f04929c7b0954`
- Contract: `../task-contract.md`
- QA role: fresh independent local review; no source or Git writes were performed.
- Source freeze: all 10 entries in `../source-manifest.json` match their current SHA-256 hashes (0 mismatches).

## Acceptance criteria

| AC | Result | Independent evidence |
|---|---|---|
| AC1 | PASS | Current playbook and linked skills describe exact-SHA Claude review, separate Codex final QA, native GitHub protections, and no controller-imposed second-human requirement. No stale categorical trust-root/manual-merge rule remains in the active files reviewed. |
| AC2 | PASS | `review-policy.mjs` applies fixed trusted infrastructure scopes and intersects them with the caller allowlist. The merge path no longer compares the reviewer, actor, and native PR author or creates approval records. `standalone-review.test.mjs` covers same-account proof and infrastructure merge. |
| AC3 | PASS | Independent policy tests cover the shipped scopes, caller allowlist intersection, malformed/canonical paths, and rejection of frontend, backend, database, provider/runtime, script-outside-policy, and unknown paths. |
| AC4 | PASS | Review of both finalizer preflight and merge guard confirmed clean published Claude feedback, verified Codex proof, passed checks, current identity/ownership, no hold, durable reservation, deadline/preparation guard, and exact-SHA state are retained. Regression suite covers required-check failures, wrong/stale proof, merge refusal, reservation recovery, and no blind replay. Native adapter remains ordinary `gh pr merge --squash --match-head-commit <sha>` and verifies GitHub's merge receipt; no `--admin` or fabricated approval. |
| AC5 | PASS (local scope) | Fresh targeted Node 22 run: 77/77 pass. A test-only synthetic browser surface asserted exact QA values, boundary assertions, and explicit live-evidence limits. Source manifest is frozen and hash-clean. Screenshot and trace are recorded below. |
| AC6 | NOT VERIFIED | This local QA session did not inspect or mutate GitHub. Existing PR #505 publication, native CI, protected main merge, and workflow activation remain unverified here. This report makes no live merge or release claim. |

## Diff review

The reviewed diff is limited to the ten contract-frozen policy, documentation, controller, and regression-test files. The implementation centralizes fixed infrastructure path classification, validates canonical relative paths, and requires every changed path to satisfy both the fixed policy and the supplied trusted allowlist. Both the finalization readiness preflight and the pre-invocation merge guard use that policy. Existing native exact-head merge and receipt checks remain unchanged.

I found no correctness issue in the reviewed diff. No application, provider, database, or runtime path is added to the trusted scope. The only operational limit is the expected one: native GitHub rules can still reject the ordinary merge.

## Independent test results

| Check | Result | Evidence |
|---|---|---|
| Targeted Node 22 regression run | PASS — 77 passed, 0 failed, 0 skipped | `test-results/targeted-node22.tap` |
| Synthetic local Playwright QA surface | PASS — 1 passed; exact result values, no console/page/HTTP errors | `test-results/report.json`, `playwright-report/index.html` |
| Source manifest SHA-256 check | PASS — 10 files, 0 mismatches | `../source-manifest.json`; rechecked during this QA |
| Full Node 22 suite | Recorded as implementation-session evidence: 1800 passed, 0 failed, 3 Windows-only skipped, 1803 total. Not rerun by this independent QA. | `../test-results/full-node22.tap` |
| Formatter and diff whitespace | PASS according to implementation-session artifacts; not rerun by this QA. | `../test-results/format-controller.txt`; root reported `git diff --check` pass |

The Playwright page is an HTML/JSON result surface generated for this internal, non-UI feature. All values are synthetic and identify this as local test evidence. The result explicitly says GitHub merge, native CI, workflow activation, and deployment were not verified.

## Security and privacy review

- No credentials, tokens, or connection strings were introduced in the reviewed diff.
- No patient information or clinical payloads appear in changed code, fixtures, logs, or browser evidence.
- The policy rejects noncanonical, absolute, traversal, malformed, and out-of-scope paths even when a caller supplies a broad allowlist.
- Application, database, provider, and AI runtime paths remain excluded.
- No dependency, endpoint, auth bypass, GitHub protection change, fabricated approval, or admin merge option was introduced.
- Native required checks and any native review requirement remain authoritative at the ordinary GitHub merge call.

## Playwright evidence

- Final result screenshot: `screenshots/result.png`
- Trace: `trace/trace.zip`
- HTML report: `playwright-report/index.html`
- Raw browser test: `test-results/report.json`
- Synthetic surface and assertions: `qa-surface.html`, `qa-surface.spec.cjs`, `results.json`

## Final Decision

**READY FOR CODEX QA** — local independent diff review, targeted tests, hash verification, and synthetic browser evidence passed. This verdict does not establish PR publication, native CI, protected main merge, workflow activation, or deployment; those remain outside the evidence collected in this bounded QA session.
