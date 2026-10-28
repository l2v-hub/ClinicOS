# QA3 validation report

**READY FOR CODEX QA** — independent local gate for frozen source `31b11f09331249a93468bf00d8cc3d1313004a72`. QA nonce `e224a4fd-aebb-4679-af5e-7d1d6eb061e5`. Final publication head is not yet known; no self-hash cycle or final-head CI/review assertion is included.

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS | task-contract.md; actual prior peer report read; no network issue access by instruction |
| 1 Diff review | PASS | complete.diff (six runtime files vs main); round3.diff (four files vs parent); scope-verification.json; 117 old packet files byte-identical |
| 2 Build/tests | PASS for changed runtime | logs/native-exact.tap:1668 total,1665 pass,0 fail,3 Windows skips,71.285s. Frontend source unchanged; no frontend build run or claimed. |
| 3 Browser evidence | PASS | screenshots/result.png; trace/trace.zip; playwright-report/index.html; test-results/playwright.json. Reload and rehydration from the persisted HTML file reassert actual fixture values; zero console/page/HTTP errors and external requests. No UI/chatbot/voice; video not applicable. Browser administrator policy blocked file:// navigation on the initial attempt (preserved logs/playwright-file-navigation-blocked.log); final run uses setContent, reload and disk rehydration with no app persistence claim. |
| 4 Security | PASS | test-results/privacy-scan.json; source-inventory.md; diagnostics/source and typed-result negatives below |
| 5 Verdict | READY FOR CODEX QA | seal.json plus manifest; no source corrections |

Native command (Node22):
```
/tmp/clinicos-node22-native12/node_modules/node/bin/node --test --test-concurrency=1 agent-team/tests/bug-pipeline/*.test.mjs scripts/quality-gate/claude-bug-review.test.mjs scripts/automation/protect-demo-secret.test.mjs
```
Run from owned snapshot. `commands.txt` records all other commands. Full 2959 tracked context files verified against frozen candidate; QA2 baseline six hashes verified before copying, then six candidate files overlaid by Git show. One tiny tracked context file, scripts/automation/setup-claude-review-windows.ps1, differed from the copied snapshot and was restored from frozen31 before tests. No source repository or old QA evidence was modified.

Independent fixtures:16/16 groups PASS; policy extra8/8 groups PASS; memory54 transitions PASS; adversarial classifier4 cases PASS. Real fakecodex child emits JSON progress and separate typed result: b868 RED output-limit at3,069,696 raw stdout bytes;31 GREEN3,145,813 raw stdout bytes,32,768 captured. Separate both-stream case:3,145,754 stdout+65,536 stderr,65,536 total captured, each exact32,768 owned backing allocation with discarded marker unreachable. At65,537 stderr bytes outcome stderr-limit. Continuous stdout exceeded3MiB then timeout; descendant marker absent after2.2s. Default controller and default model env still fail >2MiB combined output. Native tests cover prefix capture, invalid bool and combined limits. Actual configured model timeout is30minutes; elapsed30minutes was not exercised (small real timeout tests instead).

Real-child typed failures missing/malformed/oversize/symlink/schema:5/5 rejected after3MiB stdout; independent schema matrix9 negatives also rejected. Input serialization/bounds3 negatives, limit validation21 negatives, 64-entry CLI collector and callback isolation pass. Classifier bare numeric matrix7 cases remains other without cooldown; anchored7-case HTTP/status matrix retains auth/quota/rate/network. Actual capacity next selection is delegate→senior→delegate after expiry. Arbitrary stdout/progress/nested source text4 cases creates neither category nor cooldown; synthetic private strings excluded from thrown error/diagnostics. No real provider called.

Source review locations: process.mjs:6–28 owned tail/limit validation;119–146 default combined policy and booleans;203–244 process group TERM→KILL/timeout/counters; models.mjs:44–115 terminal/status classifier and finite count;211–230 typed regular/path/schema256KiB checks;310–315 bounded capacity marker;364–369 approved nonfatal stdout;381–405 private finite diagnostics; cli.mjs:94–98 collector64. CLI/authflags/environment builder unchanged in round3 and no unrelated route/role/counter/release changes vs main. Intentional console.log emits finite diagnostic fields only.

The author’s first glob-only native run omitted49 script cases; it is not this full run. Later broad agent-team selections initially failed for sparse missing context. Those outputs remain at original immutable paths with hashes in author-history-references.json. They are not relabeled code failures or deleted checks. The authoritative author full command and this independently rerun full command both report1668/1665/0/3; two new real process tests account for+2 over prior1666. All prior author1/author2/QA1/QA2 and actual peer1 BLOCKED remain preserved.

Source inventory confirms all tracked actual createRunner callers/defaults/helpers up to48MiB within64MiB. Scripts callers are included. Arbitrary external config applies to a separate process adapter and is not inferred bounded. Source contract stale40MiB prose is superseded here by actual48MiB value. See findings.md for all four peer findings.

## Exact six-file identity

| Path | Git blob SHA-1 at31 | Raw SHA-256 tested before/after |
|---|---|---|
| agent-team/src/bug-pipeline/cli.mjs | b42cd83de4b6442451a7437926271e70b761b712 | a34f3009edd29bd0b0e5e2f5a707fd80aaf7c1063be7bd4e68e32b7e162b93ed |
| agent-team/src/bug-pipeline/models.mjs | 9fbf4ef5003599e27bebeb1ff2a54dd55febaab9 | 57af56be98574342f296f773d7ebf1b3155de1bf3557d37e606974ffe46fcd38 |
| agent-team/src/bug-pipeline/process.mjs | 9e11b3a620e3b1fb7c9cf2ee2783e865e93c5f51 | 078765e34f5941de29f801e68b5d8ab438a05d86c6d7331177bbea105d956f6d |
| agent-team/tests/bug-pipeline/models.test.mjs | cc23e403463bca3f606f66d33f89698f8daa2384 | 7214b96a5e82420fa9e7e412a84cb4f3f17adbb33c03820a0f266bca10a18ce8 |
| agent-team/tests/bug-pipeline/process-output.test.mjs | e62e33a0b21f015bd362930f1503349a110bd637 | 96bc65bc79dc398fc6d021c0ca95573790a3085d23970212037d47f409ea5553 |
| agent-team/tests/bug-pipeline/routing.test.mjs | d2d1290e1fb70498a109490acec362497218f0c7 | 46844bbf6cc9536515307d1b0b6c2c8caeae9627db19cfc5f52433bc8f0f25fd |

Parent `b868e72ceb2d2e29fdaf077b3d7144c34481e176`, baseline main `995e2ff6d14a96b5d67e0d14d708f4a95c4c816f`. This same six-row mapping is in seal.json. A later metadata-only publication head may reuse this QA only if every source projection row is unchanged and independently bound to that head. The final head is pending; its six required native checks, new independent Claude review and future final Codex gate are sequential pending facts. Prior qualification/old-head CI success is historical evidence, never new-head CI. Old clinical402493 exact cause remains UNKNOWN; two RUNNING tombstones untouched/no replay.

No provider/API/network/shared stack, source mutation, merge, release, or publication performed. Root must attach actual final-head facts in plain authenticated PR comment/body before the new peer review; automatic-prefix comment being ignored is not cured by local QA. **No source merge on the existing BLOCKED peer report.**
