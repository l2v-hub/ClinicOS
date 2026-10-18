# Independent QA candidate 2

**Verdict: FAILED VALIDATION**

Candidate local checkpoint: `5a250319bae5b3f61f2c5864aee438f04d948df5`, baseline `a516d42e31f6674c39c1d130c9706cd80a7ab4c6`. Source manifest SHA256 `2868fedc1c96697b0e028cc6bca66257f38df1dbcae257346d9ecd211aa305a3`. Group #432, #441, #442, #460, #463, #464, #467. Implementation cycle remains 2/4, review count 0/4; this QA has not changed source or reset any budget.

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS — all seven bodies and every comment read directly; sanitized criteria match original frozen contract | `task-contract.md`, `issue-source-provenance.json` |
| 1 Diff review | FAIL — QA432-2 below; all 37 scoped source paths inspected, 35 changed, zero outside source paths | `diff-review.json`, `source-before.json` |
| 2 Build and tests | Both builds/types and frontend 1388 PASS; first full backend 1932 = 1927 PASS + 5 explicit opt-in skips, 0 failures. Additional extracted-source timeout reproducer FAILS cleanup. Second backend run intentionally cancelled after finding | Run details below |
| 3 Playwright | PARTIAL / NOT CERTIFIED — fresh actual inventory and retry flows passed with PNG, trace and video for five issues; remaining print/switch/import/catalog-role/internal flows not completed | `playwright-report/index.html`, first-run paths below |
| 4 Security | Static checklist and executed runtime checks found no additional security defect; missing runtime scenarios not certified | `security-review.md`, privacy scan JSON, immutable-input/source manifests |

## QA432-2 — confirmation timeout can leave the correction barrier held

`backend/src/skills/__tests__/skills-e2e.test.ts:575` awaits `run()` without a bound or the outer node:test cancellation signal. The interpreter-entry wait and final correction-settlement wait are bounded, but confirmation and the original-record read occur inside this unbounded callback, before its explicit release. A node:test timeout does not throw into the suspended callback and does not unwind this helper's finally. Thus the held correction can remain unreleased when confirmation stalls and the outer test expires. This violates AC442.2's cleanup requirement. No product clinical-write failure is claimed.

The same gap is present in `e2e/qa-bug-batch-432-browser.mjs:43`. That browser path also has no outer node:test timeout; a callback stall can hold the full canonical lane indefinitely. Other waits before cleanup were inspected: interpreter entry is bounded and correction rejection observed immediately; final correction settlement is bounded. The callback's awaited confirmation, first-record read, late result, replay and final reads share this remaining gap.

Independent reproduction extracts and transpiles the **actual current backend helper**, reaches interpreter entry, keeps the confirmation callback pending, supplies a helper timeout budget of 10 ms, and expires the enclosing node:test after 25 ms. Actual command:

`node --unhandled-rejections=strict --test artifacts/task-validation/bug-batch-432/independent-qa-attempt-2/barrier-run-timeout-reproduction.mjs`

Actual exit **1**, tests 1, pass 0, cancelled 1. After the outer timeout, measured `cleanupCalledAfterOuterTimeout=false`. See `barrier-run-timeout-reproduction.txt` and `barrier-run-timeout-observation.json`. This is a synthetic lifecycle reproduction without DB access, not a claimed clinical/server reproduction.

Remediation must make callback timeout/cancellation enter the protected cleanup while retaining the original primary error and all completion, late correction, replay, exact single write, author and immutable 120/80 assertions. No random timing retries or clinical-rule weakening. Root alone reserves the next bounded implementation cycle; QA makes no fix.

## Existing candidate 1 finding

Candidate 1's entry-before-finally defect is corrected: entry/rejection/early-settlement failures now enter cleanup. Two independent tests against both real extracted helper implementations passed early reject, early resolve, bounded entry, and failed cleanup preserving the primary assertion. See `barrier-adversarial.mjs` / `.txt`. This does not cover the unbounded callback gap demonstrated separately above. The original failed QA1 record remains untouched.

## Canonical execution 1 — full unit passes, later QA environment failure

Exact command `node e2e/qa-bug-batch-432.mjs --test`, internal lifecycle flock, own PostgreSQL 16 on 55432 and 3432/5433/8432 services, synthetic fixtures, local mock AI only.

- Migration, backend build/types, frontend build/types: PASS.
- Frontend: **1388/1388 PASS**, 0 fail, 0 skip.
- Backend concurrent block: **1884 = 1879 PASS + 5 opt-in skips**, 0 fail. Serial nine-global-suite block: **48/48 PASS**. Total **1932 = 1927 PASS + 5 opt-in skips**, 0 fail/cancel. Actual H1 race passed under this full-suite load (515 ms), and its existing failure-path test passed (27 ms).
- The five skips are one archive-original PostgreSQL opt-in and four real-API professional-profile #428 opt-ins. They were not executed by this invocation and are not claimed covered. They are outside the seven-issue source scope.
- Real import reconciliation API/DB: 5 retained occurrences, 3 persisted, explicit deferred indexes [2,4], omission/stale-client rejection, replay PASS. No external OCR/model completeness claim.
- Browser inventory: nine measured scenarios PASS, 106 prescriptions/105 active/one inactive, all pages, PRN day/week, absent-feed read-only, distinct doses, explicit 11:30 one-off, given one-off remains given after 18:10 edit/reload, zero empty-catalog searches, mobile and error telemetry.
- Browser retry: both actual post-commit response loss and pre-write transport loss/reload retry PASS, same request identity, one clinical record/one receipt each, original unchanged. Exactly two deliberate transport console errors, zero unexpected errors/statuses.
- The next video context failed before its first page: Playwright's parent registry had initialized the default HOME FFmpeg path before the internal fallback assignment. The QA launcher omitted explicit `PLAYWRIGHT_BROWSERS_PATH`. This is a recorded QA setup error, not a demonstrated product failure.

Every first-run log/media byte is retained under `canonical-run-1-env-failure/`. In particular:

- `canonical-run-1-env-failure/test-results/{frontend-unit,backend-unit,therapy-import-api,browser-e2e}.txt`
- `canonical-run-1-env-failure/inventory-browser/{results.json,trace.zip,flow.webm}`
- `canonical-run-1-env-failure/retry-browser/{results.json,trace.zip,flow.webm}`
- `canonical-run-1-env-failure/evidence/issue-{432,441,460,463,467}.{png,webm}` and corresponding `-trace.zip`

The inventory, 11:30 one-off,18:10 persisted-mobile and lost-response/reload recorded-result PNGs were visually inspected and show the synthetic result with its count/time/recorded state. These are actual independent screenshots, not development images. No new internal screenshot for #442 or #464 was produced.

## Canonical execution 2 — intentionally stopped after the certain finding

Root authorized the same unchanged SHA to rerun with `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/clinicos-batch432-playwright` exported **before** Playwright import. Existing cache FFmpeg resolves to `/usr/bin/ffmpeg`; no download, source modification or TLS relaxation.

Migration, both builds/types and frontend **1388/1388 PASS** again. While the full backend run was in progress, QA432-2 was independently reproduced and root accepted the candidate as failed. Per root instruction, only the verified owned backend test subtree was frozen; descendants were terminated before the npm child root, while canonical wrapper and lifecycle flock stayed alive. Canonical received that nonzero child result, ran its existing finally, restored controlled generated fixture bytes, stopped its own runtime and removed its owned container before releasing the lock. This second backend interruption is **intentional QA coordination cancellation, not a new failing product test**. Its 909 completed check lines are partial output, not a complete suite total or pass claim. Remaining browser execution was not attempted.

See `canonical-run-2-cancellation.json`, current sibling `../test-results/run-results.json` (`backend-unit`: signal SIGKILL), `canonical-exit.json` and `source-after-and-cleanup.json`. At the recorded stop, all 37 source hashes and six frozen packet hashes match; owned container absent; ports 3432/5433/8432 closed; zero owned active processes. Six already-orphaned zombie entries have no execution or I/O; init was not signalled or modified. No wrapper, flock, unrelated process or existing dev PostgreSQL was signalled.

## History, privacy and publication

Prior development output was relocated byte-for-byte under `pre-run-development/` before the fixed canonical paths were recreated. All 21 original evidence hashes match and 190 historical files have a preserved manifest. Their old verdicts remain unchanged and are not certified. New raw issue snapshots were moved to private `/tmp/clinicos-qa432-private-inputs` with file permissions 0600 outside the repository; only source URLs/comment IDs/hashes and sanitized criteria are public.

Historical scan: 3228 text/ZIP members, zero findings or invalid ZIPs. First actual QA run scan: 2326 text/ZIP members, zero signed simulator tokens, provider keys or credentialed database URIs, zero invalid ZIPs. Frontend source and first fresh build secret scan: zero findings. Signed simulator trace values were redacted by the canonical exact-token rule; clinical/API result events remain. No real patient, model credential, deployed service, issue state, commit, push, merge or release was changed by this QA.

**Root must reserve the next implementation attempt and assign a fresh dedicated QA after source is stable.** The next gate must pass a complete canonical with actual screenshots/traces/videos for all seven issues and an added confirmation-timeout/cancellation regression. Exact-SHA external Claude review, native required CI, migration/backend/frontend order and verified demo deployment remain separate root-owned gates before issue closure.
