# Independent QA — demo source configuration attempt 1

**Verdict: READY FOR CODEX QA**

Dedicated new QA session; I did not author or coordinate the candidate. Reviewed base b7194ac4dd185b3edc4f8d093c0505d0b4ef69ea, exactly three new source files from the unchanged candidate seal and frozen operational contract. No source, contract or previous report was edited. This verdict covers the bounded operational configuration candidate, not an actual Railway operation, clinical release or resolution of issue #470.

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS — frozen scope and explicit acceptance, related #470 and both comments read | [task-contract.md](task-contract.md), [issue read receipt](test-results/issue-read-receipt.json) |
| 1 Full diff | PASS — no correctness findings; exact three-file scope; bounded branch-only write | [diff-review.md](diff-review.md), [initial source check](test-results/initial-source-check.json) |
| 2 Build/tests | PASS — existing 57/57 and independent 30/30; both source syntax checks; two ASTs, workflow YAML/trust assertions, both GraphQL documents against official Railway CLI 5.66.0 schema | [unit output](test-results/unit-tests.log), [independent output](test-results/independent-probes.log), [static result](test-results/static-validation.json), [checker output](test-results/static-checker.log) |
| 3 Actual browser | PASS — nine synthetic scenarios, 110 concrete visibility/value assertions, actual module/client and loopback HTTP, zero console/HTTP errors, persisted state verified after reload | [screenshot](result.png), [trace](trace.zip), [HTML report](playwright-report/index.html), [machine results](test-results/browser-results.json), [video directory](video/), [video metadata](test-results/video-probe.json) |
| 4 Security | PASS — allowlisted receipts, fixed/redacted errors, strict trust/target scope, no PHI/new dependency/auth bypass; complete packet and ZIP contents inspected | [review](diff-review.md), [final security and unchanged source proof](test-results/security-final.json) |

Independent probes cover malformed and foreign token/service/trigger bindings, metadata bounds, duplicate IDs, provider and domain validation, fresh-read/mutation/post-read transport failures without retry, post-write root/check policy/override drift, detached recursive immutability, nested private-field non-disclosure, every omitted workflow trust field, alternate response URL, response stream/null-body failure and provider error redaction. They use the actual candidate exports, not a reimplementation.

Browser scenarios: healthy inspect/update, already-main zero-write no-op, stale digest, fresh drift, post-write drift, missing trigger, duplicate trigger, foreign repository and provider error. A QA-only synthetic loopback HTTP server exercises the actual production module and HTTP client through a test adapter; it never contacts Railway. Concrete counters show read-only and rejected cases make zero writes; the healthy branch changes once and root `/backend`, check policy and override remain unchanged. Reload verifies the resulting state. The final PNG was visually inspected. The trace passes ZIP integrity validation; video is actual VP8, 1180×900, 5.28 seconds. No application UI or real patient data is involved.

The initial browser environment lacked a Playwright FFmpeg cache and failed before page creation. Its [original failure log](test-results/browser-initial-environment.log) is preserved. A QA-specific cache outside the published packet points to the installed system FFmpeg; the subsequent complete run passed under the same global lifecycle lock. No source or test expectation was weakened.

All three source hashes, the frozen contract and all five previously sealed evidence hashes remain unchanged. The source seal SHA-256 remains adff4341d290c4e41c15752552d7adf9b9a078bd4fc35ba535ec00766d157de4. Complete packet scan before this report: 24 files and 125 ZIP members, zero credential-shaped values, symlinks or files over 25 MiB. The final manifest records all QA evidence hashes.

Limits: local Node 24.19.0 was used; the workflow's Node 22 must still run natively. This is an operational-only scope, so applicable build checks are JavaScript syntax/AST/module execution, workflow YAML and the official GraphQL schema; no frontend source/dependency/build was changed or installed. No actual provider binding, authorization or deployment is certified. Railway exposes no trigger CAS/revision: the candidate detects concurrent drift before and after its single branch-only write but cannot make that external mutation atomic. No provider/GitHub mutation, model call, secret retrieval, push, PR, merge, deployment or issue closure was performed by QA. Existing maintenance/guard attempt budgets remain untouched.

Codex must now re-run the QA Gate.
