# PR492 independent QA9 validation

Verdict: **READY FOR CODEX QA** for the tested local controller scope. No new correctness or security finding was reproduced. Hosted native checks, actual new Claude review, final Codex and protected merge remain root gates.

Source:0d8326db7d3e53691ce6f8127a70c06c3666b426 after actual496-first and495 integration of main45033a3949742218b1c9d23a37a0c94776cd5bd5. Canonical QA reservation37ce512a-5556-49d5-9ef7-b1454ffe55e5 was recorded before this session. Contract validated before tests/private harness edits. QA wrote only this private directory. No author/product/historical proof, Git/index/ref, provider state or application/DB configuration mutation was performed.

| QA phase | Result | Evidence |
|---|---|---|
| Contract | PASS | task-contract.md; setup skill and both repository quality gates read; private resource refinement recorded before browser edit |
| Diff/source review | PASS | source-security-review.md, integrated-source-review.diff, source-security-checks.json |
| Exact workflow | PASS locally | workflow.json:771 tests,768 passed,0 failed,3 native-Windows skips |
| Imported495 automation | PASS locally | imported495.json:142 tests,142 passed,0 failed,0 skipped |
| Independent transport/history/budget adversarial suite | PASS | adversarial.json:33/33, including both validators on unchanged actual canonical snapshot |
| Fresh independent R1-R7 | PASS | r1-r7-third.json:33/33, all requested recovery, liveness, scope and timing cases |
| Actual CLI/process integration | PASS | cli-third.json:3/3 groups; cli-boundary-summary.json contains8 actual shipped CLI subprocess receipts, exact8MiB payload and same-owner409/CAS refusal |
| Browser controller surface | PASS | browser-summary.json:7 actions with result-value assertions and reload equality each; controller-final.png, trace.zip, video/*.webm; media-index.json |
| Security/privacy | PASS | source-security-review.md and source-security-checks.json; zero source/trace sensitive matches, no live provider/native approvals manufactured |
| Preservation | PASS | full-preservation-final.json, source-after.json, snapshot-after-check.json; all history retained |

Final successful Node suite totals are982 tests,979 passed,0 failed,3 skipped across the five suites above. Earlier failed setup/harness attempts are retained and explained in attempt-history.md. Expected negative CLI exits for502, missing verifier, same-owner CAS conflict and corrupt blob are positive assertions, not hidden passing provider operations. The three skips remain unexecuted locally.

## R1-R7 objective results

- R1: actual adapter sends exactly three idempotent label writes after502, stores operation metadata, refuses resume when frozen evidence is corrupted and accepts exact verified resume. Eight definite4xx merge outcomes archive the full random reservation/timestamp and permit explicit resume with no second merge. Timeout/408/500 and changed-head/closed cases retain reservation and deny unsafe resume. Revision adoption archives full tombstones only for verified OPEN different head; same head, closed or unreadable native state retain the old owner.
- R2: normal and standalone waiting reconciliation performs no notice actor/read/write across accounts or transient notice failures. The actual shipped request CLI preserves the durable request after502; explicit reconcile repairs exactly once and a repeated request spends no review round.
- R3: both validators accept the untouched16-entity canonical snapshot and reject unauthorized appended allowances in every collection. Unsupported issue-only owner coordinates fail earlier as expected. Missing cutover grants zero legacy exemptions; post-prefix authorization content binds actor/action/entity/PR/collection/budget. PR492 remains ONLY manualBatches/standalone-pr-review-adapter: original4 implementation attempts and continuation rounds5,6,7,8,9 remain; extension limits6,7,8,9 and root-pinned legacy prefix3 remain. No stored JSON is claimed to authenticate an actual live grant. Actual CLI with no verifier refuses extension.
- R4: first failure has a1-minute delay, then2/4/8/16/30 minutes. Rapid ticks remain pending; failure across30 minutes exhausts. Changed SHA resets the clock. A failed persistence boundary stops mutation/queue work, with no unsaved failure record claimed durable. Existing full-suite fairness tests also pass.
- R5: recovery at31 seconds and329999ms treats merge ownership as live; expiry at330000ms still requires verified release capability. Actual merge command guard permits31000/299999ms and refuses300000/330000ms preparation. Constants are300-second preparation plus30-second command lease.
- R6: runbook, reviewer prompt, model-auth and executor-workspace tests, controller source, workflow/tool and instruction paths are protected even with an injected allowlist. The shipped production automatic infrastructure allowlist is EMPTY. All successful core merge fixtures use explicitly synthetic actors/harmless documentation scope and never establish real native human approval.
- R7: main45033 is an ancestor of the reviewed commit; all35 main GitHub and12 main handoff test titles are retained. One shared pinned loader,8MiB serialized state and16MiB transport remain. Contentsnone goes only to the exact Contents Git blob SHA, validates SHA1/size/base64/UTF8/object shape, and does not follow download_url. Exact8MiB succeeds in the actual shipped CLI; oversize/reserved-result checks reject before mutations. Native stale/guarded CAS, disjoint-owner rebase and actual CLI same-owner409 preserve concurrency without state promotion.16000 records survive with unchanged full-history digest; the CLI fixture initially serializes5521575 bytes, independently exceeding4MiB.

## Runtime and media

Every test ran on local Nodev24.19.0, with trusted credential-free verification subprocesses; no native Node22 or Windows execution is claimed. The actual CLI uses a disk-backed synthetic gh executable, with no dependency injection into the shipped CLI implementation. A read-only import records that CLI process's process.resourceUsage().maxRSS on exit. Final eight CLI receipts range66972..261728KiB; exact8MiB status used193732KiB and2089ms in this run. These are observations, not a memory-cap guarantee. The process runner accepts exactly16MiB output, rejects16MiB+1, kills a120ms timed-out test process and excludes a synthetic controller credential from verification children.

The controller browser fixture used ONLY127.0.0.1:5592 and this private directory/controller-browser.lock after root's explicit disjoint-resource confirmation. It did not acquire the clinical lock or touch clinical ports/services/DBs. Browser/network/console errors are empty, final state persisted across reload, and cleanup closed browser/context/server and proved the port refused connections. The screenshot decodes at1200x1280; the4.28-second VP8 video decodes at1200x1100; the trace CRC and24 embedded image decodes pass. All media is private and labelled synthetic; it is not clinical E2E or live GitHub/provider validation.

## Preservation and publication limits

All13606 tracked paths keep their initial disk bytes/presence, including7743 sparse absences. All7448 historical proof entries match their old Git blobs or retained original disk bytes; all26 original untracked proofs and131 old private proof files remain unchanged. Snapshot5863 materialized tracked inputs are unchanged and have zero hardlinks. All27 reserved source hashes match freeze38ee81c3d9adbe1d36787651751c987adc56e3c507418be0671336156edda286. QA performed no CRLF normalization. Canonical snapshot SHA256 remains907f968417927738ab6c1829fe1ebeb83165f43b12133f8ab17b88c024da5d66; no canonical write was attempted.

No public packet was created. Raw output, traces, synthetic backend files and actual canonical state remain private. Root may select safe report/JSON/media after QA_STOP, publish a real Claude request on the resulting review subject, run hosted/native checks and final Codex, and perform any authorized protected merge. This local verdict supplies none of those external approvals. No reusable environment configuration change was necessary for this built-in Node workflow.

## Final Decision

READY FOR CODEX QA
