# PR492 independent QA — follow-up 1

Final Decision: READY FOR CODEX QA

Dedicated fresh QA after author STOP found no candidate source defect. Frozen source:21files, digest `940d4254e31568cdb108263bc7e01c428a2b17ce78af902c41989ffc840fd1ac`; follow-up base `fcabd40713ad355c944d7aff3fcfa7852dce01e9`. Existing manual owner `manualBatches/standalone-pr-review-adapter` retains implementation rounds1–4 and spent operator continuation5. This verdict covers the frozen local candidate and its evidence; root owns commit binding, publication, actual Claude Max review, final Codex review, native checks/protections and release.

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | [task-contract.md](task-contract.md); fresh author contract and scope amendment read; all nine actual Claude findings treated as data |
| 1 Diff review | PASS, no source findings | [diff-review-and-security.md](diff-review-and-security.md), [full-main-source.diff](full-main-source.diff), [followup.diff](followup.diff), [source-freeze.json](source-freeze.json) |
| 2 Independent build/tests | PASS | [full-suite.tap](full-suite.tap):714total,711PASS,0FAIL,3Windows-onlySKIP; [independent-negative-cases.tap](independent-negative-cases.tap):17PASS; [syntax-and-scope.json](test-results/syntax-and-scope.json) |
| 3 Playwright | PASS |24concrete assertions,6controller actions, refresh persistence,0console/page/HTTP errors; [browser-result.json](test-results/browser-result.json), [HTML report](playwright-report/index.html), screenshots/video/trace below |
| 4 Security | PASS locally | [diff-review-and-security.md](diff-review-and-security.md), [acceptance-matrix.md](acceptance-matrix.md), [media-security-validation.json](media-security-validation.json) |
| 5 Verdict/evidence | PASS | [artifact-manifest.json](artifact-manifest.json), [final-seal.json](final-seal.json), source/proof integrity before and after |

All F1–F9 have independently authored meaningful negative cases in [independent-negative-cases.mjs](independent-negative-cases.mjs), with the unchanged production modules as the target. They cover hostile trust-root allowlists, ownership/history shortening, same-account/native approval and guard-time revocation, exact-token maintainer recovery and stale-worker CAS, definite409/502/uncertain writes and reconciliation, bounded label retries after durable submit, subscription-only auth, operation-only blob caching with fresh identity, isolated failed-write reload, strict required checks with exact optional Vercel, and injected reservation time. Audited allowance tests reject nonmaintainer/jump/manifest grants and changed history; fresh round6 contains no copied terminal evidence/approval. The17public probes use synthetic public fixtures and require no private state file.

[actual-state-local-validation.json](actual-state-local-validation.json) validates the initial limited491/492snapshot and local Git packet bytes. [full-state-local-validation.json](full-state-local-validation.json) independently validates the complete actual post-migration snapshot:4normal batches,8manual owners,2standalone subjects and2archives. Actual393's139-file new packet plus prior packet and491's34-file new packet plus prior packet were checked through203local Git file reads and6trees. Active432spent5/effective5 remains owned. Both archived historical transfer tombstones retain full-record digests, canonical implementation/review digests, exact original implementation/review/report prefixes and identical PR/branch/issues. Reinserting either tombstone rejects strict F2 ownership. Root performed this audited metadata migration; this QA made no state change. Both actual snapshots remain private outside publication.

Browser proof uses only fixed synthetic fixtures and actual candidate controller methods through a QA-only127.0.0.1HTTP surface. It proves persisted=true despite three failed label attempts, reconcile without another comment/round, ready trust-root refusal with0merge calls, head-drift recovery preserving the spent failed review, and an archived failed QA reservation followed by a fresh verified nonce. Reload reasserted the results. Synthetic callbacks are not real model reviews or human approvals.

- [Durable projection receipt screenshot](screenshots/durable-projection-receipt.png)
- [Protected release and recovery screenshot](screenshots/protected-release-and-recovery.png)
- [Video](video/receipt-recovery.webm)
- [Trace](trace/trace.zip)
- [Browser probe source](browser-receipt-recovery.mjs)

The entire server/browser lifecycle held `/tmp/clinicos-browser-qa.lock` after root explicitly released the clinical lane. Browser, context and HTTP server are closed; lock released and clinical author notified. Initial startup found a missing default ffmpeg cache; rerun used existing `/workspace/.cache/clinicos-batch450-playwright` via PLAYWRIGHT_BROWSERS_PATH. No installation was performed. Final screenshots were visually inspected; all media frames and ZIP member images are decoded, every ZIP member CRC-checked and secret-scanned by [audit-and-seal.py](audit-and-seal.py). The curated bundle has<=100files and each<=25MiB. [integrity-before.json](integrity-before.json) and [integrity-after.json](integrity-after.json) prove21frozen files and369historical proofs unchanged; supporting model/workspace/process/CI files also remain unchanged.

No frontend/backend/schema/runtime/dependency/workflow diff exists in the selected source comparison. Application builds, DB/runtime/provider checks are outside this controller-only contract and are not claimed. Existing Linux CI's unit-test target is included in this broader suite; Node24Linux is this host, and Node22hosted CI plus Windows-native PowerShell tests remain external verification. No actual GitHub/state/model/inference/provider/production calls, source edits, installs, commits, pushes, merges, deployments or closures were performed.

Trust-root PR492 never automatically merges. Actual independent human approval and native enforced review protections remain release prerequisites. Root reported admin protection access403 and accessible branch rules exposing required checks only; this QA did not query GitHub and does not infer classic protection is absent. No identity, Max review, hosted CI result or approval is fabricated.

All reviewer writes stop at final-seal.json. Codex must now re-run the QA Gate.
