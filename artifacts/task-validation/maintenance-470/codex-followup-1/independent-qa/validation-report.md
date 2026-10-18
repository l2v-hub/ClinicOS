# Maintenance470 continuation5 — independent QA

Verdict: **FAILED VALIDATION** at exact candidate `ce7da2f7f5f3f149e4a5a16046843f067252e807` on `codex/demo-470-completion`.

Reservation nonce: `78a15106-a130-4a11-b601-b270d3903f0e`, durably reserved before this independent QA session. Author source/harness STOP was verified from the author report and seal. QA performed no source/test/product fixes, commits, provider/GitHub/DB calls, secret reads or state mutations. Local Git clone and sparse-checkout writes were confined to this QA-owned directory. No service/browser was started.

## F1 — blocking CI packaging defect

`.github/workflows/deploy-backend.yml:48` requests only `sparse-checkout: scripts/maintenance`, then line54 runs the complete diagnostic test suite. `scripts/maintenance/demo-storage-inspect.test.mjs:534` unconditionally reads `../../.github/workflows/deploy-backend.yml`. Git cone sparse checkout excludes that directory. The mandatory credential-free test step therefore fails before the diagnostic step can execute.

Independently reproduced using a local shared clone of the exact candidate (no network), `git sparse-checkout set scripts/maintenance`, then detached checkout of the exact SHA. The same test command ran through trusted `createRunner`, `envMode: verification`, with an explicit PATH-only runner environment and isolated verification home. Exit 1: **115 tests, 114 passed, 1 failed, 0 cancelled/skipped/todo**. Exact failure: `ENOENT: no such file or directory, open '.../sparse-repro/.github/workflows/deploy-backend.yml'`. This is a real workflow failure, not a failure of the offline binding logic.

Remediation for the author: include the workflow file/directory in the sparse checkout and preserve all existing job definitions. Retain the meaningful workflow test; do not skip or suppress it. Root owns any follow-up authorization and author reservation.

## Recorded phases and limits

| Phase | Result | Evidence |
|---|---|---|
| Contract | Read original contract and amendment, hashes match reservation | integrity-check.json |
| Diff review | FAIL — F1 | workflow line48; test line534; sparse-tests.json |
| Fresh full-checkout tests | PASS — 115/115, zero failed/skipped/cancelled | fresh-tests.json |
| Exact sparse-checkout tests | FAIL — 114/115; one ENOENT | sparse-tests.json |
| Browser evidence | UNRUN — finding triggered mandatory failstop | no browser proof claimed |
| Additional adversarial suite | UNRUN — finding triggered mandatory failstop | no extra coverage claimed |
| Security certification | INCOMPLETE — no passing gate claimed | static review only |

Full unrelated application build/suites were out of scope. Actual provider API/CLI permissions, remote CI and live diagnostic behavior remain unverified. No cleanup, source-storage verification, issue closure, deployment or release-unblocking claim is made.

Integrity verification against the frozen pre-session author manifest: all nine source/input entries match, including the two immutable helpers, original contract and amendment. Author seal hash matches `5a603240ccdab55a56ef17bd66e74ccf63acb023bfbc4fcee21b02e2005b3811`. All **5,931** prior proof files, **1,149,600,589 bytes**, match their immutable manifest. Candidate git status remains the pre-existing untracked contract/evidence packet only; no tracked changes. `git diff --check` passes. These checks were performed after both independent test executions; no claim of a separate full pre-run proof reread is made.

**QA SOURCE/HARNESS/PROOF STOP.** Root decides the next step. No passing QA, screenshot, trace or browser artifact was fabricated.
