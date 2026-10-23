# Independent durable state transport QA

Verdict: **READY FOR CODEX QA** (local candidate validation only; remote reconciliation remains required).

Candidate: `19d0db6ae2f345d7ac8c03a0ee9e9dabbc969c86`; baseline: `df1bf69f48242ad5f61d81d7ac54f7f7a14f9711`.
Reservation nonce: `5a93d3d2-e12a-4352-a361-851772a53419`, locally fsynced before this independent session. `githubReconciled:false`; no remote publication, reservation reconciliation, live Claude review or merge claim is made.

| Phase | Result | Evidence |
|---|---|---|
| Contract | PASS | Original contract and amendment hashes verified against root reservation; three allowed source paths only |
| Diff review | PASS | Full production diff and fixture amendment inspected; strict metadata, pinned endpoint, blob header SHA, canonical base64, fatal UTF8 and JSON object checks; no correctness finding |
| Native tests | PASS | `native-suite.log`: fresh credential-free `node --test agent-team/tests/bug-pipeline/*.test.mjs scripts/quality-gate/claude-bug-review.test.mjs`, 660 total / 657 passed / 0 failed / 3 Windows skips |
| Independent adversarial checks | PASS | `probe.mjs`, `aggregate-results.json`: 12 scenarios; 1,913,844 synthetic bytes, 16,000 history records, full deep equality; inline and fallback; pinned SHA, size, base64, UTF8, malformed JSON, array, oversized metadata and API error rejection; guard denial and oversized save produce zero mutations |
| Browser | PASS | `browser.mjs`, `browser-results.json`, `result.png`: safe owned loopback viewer displays actual candidate aggregate results; result values, load control, reload persistence, zero console/page and HTTP errors asserted under full flock |
| Security | PASS | Synthetic data only, no ambient credentials in verification child; bounded fixed-repo/ref/SHA transport; no new dependencies/routes/auth changes/log payloads; source scope unchanged |
| Integrity | PASS | Before/after source seals and contract hashes match; PNG CRC + image decompression, private trace ZIP CRC, video decode, public secret/PHI sentinel scan and 25 MiB/file ceiling pass |

The browser is a **QA-only result viewer**, not clinical E2E and not proof of production GitHub behavior. Raw trace/video remain private. Public safe artifacts are enumerated in `public-manifest.json`. The browser uses installed Chromium and system ffmpeg through an isolated local browser cache; initial missing ffmpeg attempt was an environment prerequisite failure resolved without source edits. The initial independent probe erroneously asserted the state-read 8 MiB output cap on the unrelated branch-reference read; corrected QA harness only, then all scenarios passed. No candidate source finding was suppressed.

Unrelated frontend build/typecheck and broader app/unit suites are outside this transport contract. Author's original failed pre-amendment and baseline reproduction logs were read and left unchanged; no claim of independently rerunning those broader suites. Existing native suite CAS/guard race tests passed fresh, alongside independent guard-denial mutation check. Existing expected-SHA and catch restoration code is unchanged in production diff.

No GitHub/provider/network/database/state/commit/push/merge operations were performed by this QA session. Browser server and browser were closed. Root remains sole remote/state/commit writer. Publication requires root's actual remote reservation/amendment reconciliation and required live review/check flow; local PASS does not waive that blocker.

**SOURCE / HARNESS / PROOF STOP**: all candidate source unchanged; QA harness and evidence frozen after final seal.
