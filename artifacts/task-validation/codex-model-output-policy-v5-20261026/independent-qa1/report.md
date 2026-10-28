# Independent QA validation report

**Verdict: FAILED VALIDATION**

Source: `38b37e3322176bd9836d228d4c4ce63bf66fced2`, base `995e2ff6d14a96b5d67e0d14d708f4a95c4c816f`.
QA nonce: `26a7189c-6330-45ec-b019-ca73be5f13f6`; canonical state: `a36a294cd13e23122e547928a365bd8e447053f1`.
Independent dedicated QA; author source frozen throughout. No application-source edits, provider calls, external API/network operations, publication, clinical replay, or shared Git writes were performed. Synthetic fixture repositories created by the existing test suite are local test infrastructure.

| Phase | Result | Actual evidence |
|---|---|---|
| 0 Contract | PASS | `task-contract.md`, validator `logs/contract.log`; criteria supplied by canonical reservation and task handoff; no network issue fetch permitted |
| 1 Complete diff review | FAIL | `complete.diff`, `findings.md`; retained backing allocation exceeds the approved bound; scope exactly five files; source hashes match reservation |
| 2 Relevant tests | FAIL | Focused 19/19 PASS; independent 15 PASS / 1 FAIL; full sequential suite 1,660 PASS / 2 FAIL / 3 platform SKIP out of 1,665. `logs/focused-tests.tap`, `logs/independent.log`, `logs/pipeline-tests-complete.tap` |
| 3 QA-only Playwright | PASS | `screenshots/result.png`, `trace/trace.zip`, `playwright-report/index.html`, `test-results/playwright.json`; 16 actual fixture rows, concrete counts and backing-buffer failure, 0 console/page errors, 0 HTTP errors, 0 external requests; screenshot visually inspected; trace ZIP integrity verified |
| 4 Security | PASS with memory finding tracked in phase 1 | Checklist below; no raw output added to diagnostics or thrown model-execution failure; all fixtures synthetic |
| 5 Verdict and immutable evidence | FAILED VALIDATION | This report, findings, source and artifact hashes, `seal.json` |

| Acceptance criterion | Result | Evidence |
|---|---|---|
| Real 80 KiB progress RED/GREEN | PASS | Baseline rejects; candidate returns separate typed result after 82,005 stdout bytes, retains visible 32,768-byte tail |
| Fatal caps and timeout/descendant cleanup | PASS | Exact 2 MiB/64 KiB boundaries accept; +1 byte fails independently; existing timeout test verifies descendant marker never appears |
| Capture backing-memory bound | FAIL | `test-results/independent.json`: 98,304-byte backing for 32,768 visible; `test-results/real-runner-backing.json`: real runner observed 77,120-byte backing |
| Input and typed-result guards | PASS | 21 invalid limit inputs rejected; 9 missing/empty/malformed/oversized/symlink/schema-negative cases rejected; prompt size/serialization/cwd negatives; existing runtime separation tests pass |
| Finite diagnostics / collector | PASS | Exact enum/count field assertions, invalid counts become null, raw synthetic marker absent, callback exception ignored; actual extracted CLI callback retains last 64 of 100 entries |
| Capacity fallback and source-content handling | PASS in added fixtures; existing tests FAIL | Terminal capacity evidence triggers delegate → planner → delegate after expiry. Nested tool JSON and progress provider words do not trigger category/cooldown. Existing raw-message assertions at routing.test.mjs:141 and :184 fail |
| Unchanged typed-result/CLI/time/auth policy | PASS source review | 256 KiB result, schema/path/regular-file guards, 30-minute timeout, process-group kill and CLI flags retained; no auth/provider/retry/workflow/release/ownership changes |

Security checks: secrets/PHI PASS (synthetic only); new logging PASS (known fields only); input validation PASS; AuthZ PASS (no route/auth change); injection/XSS PASS (no new production surface; local QA HTML escapes values); dependencies PASS (none added); config PASS (no weakening). The tail-allocation issue is a resource-retention correctness finding, not an observed secret disclosure. Generic preflight behavior predates the patch.

Actual commands included:

```text
git -C /workspace/ClinicOS archive <candidate> <selected baseline paths> | tar -x -C /tmp/clinicos-output-policy-qa1/snapshot
git -C /workspace/ClinicOS archive <base> agent-team | tar -x -C /tmp/clinicos-output-policy-qa1/baseline
git -C /workspace/ClinicOS diff <base> <candidate> -- <five reserved files>
git -C /workspace/ClinicOS diff --check <base> <candidate>
node scripts/quality-gate/validate-task-contract.js <QA output directory>
TMPDIR=/tmp/clinicos-output-policy-qa1 node --test agent-team/tests/bug-pipeline/models.test.mjs agent-team/tests/bug-pipeline/process-output.test.mjs
TMPDIR=/tmp/clinicos-output-policy-qa1 node --test agent-team/tests/bug-pipeline/*.test.mjs
TMPDIR=/tmp/clinicos-output-policy-qa1 node --test --test-concurrency=1 agent-team/tests/bug-pipeline/*.test.mjs scripts/quality-gate/claude-bug-review.test.mjs scripts/automation/protect-demo-secret.test.mjs
node /tmp/clinicos-output-policy-qa1/independent.mjs
node /tmp/clinicos-output-policy-qa1/browser-evidence.mjs
node --check agent-team/src/bug-pipeline/process.mjs
node --check agent-team/src/bug-pipeline/models.mjs
node --check agent-team/src/bug-pipeline/cli.mjs
```

Environment: Node v24.19.0; Chromium 154.0.8037.57; existing Playwright from `/workspace/ClinicOS/node_modules/playwright`; system Chromium `--no-sandbox` for the internal synthetic report only.

Preserved unsuccessful setup attempts: first broad run lacked selected archived dependencies and evidence fixtures (`logs/pipeline-tests.tap`), then the completed sequential run used actual Git-archived baseline files. Optional video first failed because ffmpeg was absent (`logs/playwright-video-attempt.log`); file URL navigation was blocked by browser policy (`logs/playwright-file-navigation-attempt.log`). Final evidence uses `page.setContent` with generated local HTML and no network. Static report was rehydrated from disk after reload; no application persistence claim is made. Video is not required for this internal-only runner change.

Limits: no frontend build/typecheck, application UI E2E, native Windows tests, exact-head CI, provider inference, Claude review, clinical replay, publication or release validation is claimed. Three Windows-native tests were explicitly skipped on Linux. Historical clinical failure `40249337703` exact cause and two unknown attempts remain unknown. Real main health qualification `40251755127` and author-added retry-override failure `40251289323` were context, not independently rerun. Coordinator-owned genuine imported history/publication remains pending and is not invented or certified here.

Final Decision: FAILED VALIDATION
