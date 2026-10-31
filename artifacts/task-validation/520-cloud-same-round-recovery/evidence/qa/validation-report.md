# Independent QA gate — separate infrastructure PR

**Verdict: READY FOR CODEX QA** — for preparation of the separate technical PR
only. Not permission to activate recovery, call Claude, merge, deploy or close #506.

Reviewed source: `2a90c6873b63ea55d866c8081a34c555b2e24d38`.
Base: `59f0a9ea60bd56d1823305da9b18fa0bca8db213`.
QA session: `qa_gate520_infra`, separate from author/integration sessions.
Date: 2026-10-31.

## Gate phases

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | Task contract AC1–AC6; read #506 and current #520 comments; latest human exception limits this work to a separate technical PR |
| 1 Full diff | PASS | Infrastructure only; no application/Prisma/package/lock changes; 15 non-artifact source/doc/test files match frozen source after QA |
| 2 Build and tests | PASS | Independent 347/347 focused tests, frontend TypeScript exit 0, final full frontend/backend build exit 0; exact-source CI described below |
| 3 Synthetic browser | PASS | 1/1 Playwright test; actual core lifecycle with mock external effects, disk roundtrip, visible values before/after reload, screenshot, trace, video and HTML report |
| 4 Security | PASS | Exact capability/owner/SHA/round gates, no unclaimed inference, no tools/API fallback, bounded source, no credentials/PHI in public evidence, no dependency/config permission expansion |

## Acceptance criteria

| AC | Result | Proof |
| --- | --- | --- |
| AC1 | PASS | Missing/forged/stale capability rejected; separate injected verifier/action with `budget:null`; replay audit appended, original history not replaced |
| AC2 | PASS | Explicit trusted-main dispatch; one CAS technical execution, no new review/round/allowance; synthetic consumed 5 / limit 5 and old failure unchanged |
| AC3 | PASS | Frozen #520 packet independently constructed from exact GitHub tree metadata/Git blobs: six source files, four text proofs, 76 inventory entries, zero omitted text evidence; generated plan explicitly not committed |
| AC4 | PASS | Default qualification plus real recovery core tests cover missing capability, replay and concurrent claims: exactly one `--print` after CAS; stale/revoked guards and uncertain publication preserve actual report without new inference |
| AC5 | PASS | Focused tests, final build, exact-source Linux/native-Windows CI and independent loopback browser evidence; broad local Windows baseline limitations retained below, not disguised as green |
| AC6 | PASS within preparation scope | No actual Claude/probe, remote controller mutation, merge, deploy, issue close or allowance by QA; root owns separate PR publication/final readback |

## Exact-source CI

Independently read back [run 41249496255](https://github.com/l2v-hub/ClinicOS/actions/runs/41249496255):
`completed/success`, head exactly `2a90c6873b63ea55d866c8081a34c555b2e24d38`.

- Native Windows setup: **10 passed / 0 failed / 0 skipped**.
- Linux full controller regression: **1849 tests / 1846 passed / 0 failed / 3 skipped**.
  Existing normal skips remain; none were added or assertions weakened for this PR.
- Isolated sandbox and HTTP/Postgres readiness steps passed.
- Provider-access and repository-configuration jobs were **skipped**; no review,
  recovery, administration or real-provider qualification was dispatched.
- Complete CI log retained privately, SHA256
  `517f975e253929631d1fe669bbdfaa266814281b457ffbd0ebe5966a07289746`.

The earlier 430afa test-only CI also passed, but is superseded, not relabeled as
testing the final source.

## Retained failures and corrections

See [initial-findings.md](initial-findings.md) and
[attempt-ledger.json](attempt-ledger.json). Initial gate failed on a genuine P1:
the native probe invoked inference before claim. Final source removes that call,
reuses the sealed prior successful probe receipt, verifies its exact run/CLI pin,
and permits only a non-inferencing `--version` check before CAS. Regression tests
exercise the real default qualification and core, rather than mocking this risk
away. The undeclared `@playwright/test` harness reference was separately corrected
to existing `playwright/test`; no dependency or assertion was removed.

The initial local broad Windows run reported 197 failures. Independent unchanged
main reproduced all 197 (192 detailed identities; nested suite accounting), with
no candidate-only failure and identical blobs for all 14 failed suites. Causes:
Windows worktree slash identity, POSIX mode/absolute executable assumptions,
synthetic shebang/ESM drive paths, symlink EPERM, and four sparse-omitted tracked
trace fixtures. Materializing that old packet made three of the four pass; the
fourth then reached the existing Windows symlink EPERM. No test was weakened.
This is **not** a claim that the broad local Windows suite is green. Linux final
CI and the dedicated native Windows setup gate provide the supported counterpart.

## Actual frozen source compatibility — no provider

[frozen-source-capacity.json](frozen-source-capacity.json) binds PR520 head
`6b7055d773f4e36d85f149aecbf31059ed5bb00e`, base 59f0, and infrastructure 2a90.
Canonical authorization/preparation ran only on a disconnected in-memory copy
with a synthetic verifier: zero real controller writes. Packet SHA256
`44b18c20e9b7ca54f69ec16d7d8339f6c9317de9255d46ee1f85b2a900dfbda6`;
147742 packet bytes, 344818 conservative required tokens versus qualified 1M.
No packet text, private authorization or clinical document is published.
An initial local inventory command was stopped because `ls-tree -l` would lazily
fetch every historical binary blob; the bounded metadata route replaced it.
Only owned QA processes stopped; no files deleted.

## Browser evidence

All final-code paths are under `final-code/browser/`:

- [Final screenshot](final-code/browser/result.png), visually inspected at full size.
- [Result JSON](final-code/browser/result.json), [HTML surface](final-code/browser/result.html).
- [Trace](final-code/browser/test-results/cloud-recovery-evidence-on-d9d78-fth-round-after-disk-reload/trace.zip).
- [Video](final-code/browser/test-results/cloud-recovery-evidence-on-d9d78-fth-round-after-disk-reload/video.webm), 1.32 seconds; sampled result frame inspected.
- [Playwright report](final-code/browser/playwright-report/index.html).
- [Raw test result](final-code/browser/test-results/.last-run.json).
- [Focused unit/integration output](final-code/focused-tests.log).

Trace network inspection: three GET responses, all **200**, all **127.0.0.1**.
Real assertions cover consumed rounds 5, limit 5, original failed-authentication
status, one technical execution/mock review post, zero actual Claude calls,
report/accounting preservation and rejected replay, before and after reload.
No console/page errors or external requests. All state and identities are synthetic.

## Integrity and limits

[source-integrity.json](source-integrity.json) records exact source/after-QA hashes.
Only this owned evidence lane was written by QA. Primary project, real controller,
credentials, PR520 SHA/history/budget and unrelated issue work were not changed.

There is **no real Claude review** of PR520 or this technical PR in this evidence.
Activation remains a separate authorized host operation after infrastructure
review/integration, and every later release gate still applies. Original failure
and #506's online acceptance hold remain intact.

**Codex must now re-run the QA Gate.**
