# Author report — implementation 9

Status: IMPLEMENTED — NOT VERIFIED

STOP — independent QA required. No clinical runtime was executed or queued.

The production correction adds 21 lines to administration-record.ts. Single-day one-off writes now query the exact patient/day and modern-or-legacy identity, filter recognized outcomes and reuse recordedOneTimeOutcome for deterministic priority. Existing given/pending/refusal correction/receipt logic operates on the actual selected row.

| Check | Actual result | Private evidence |
|---|---|---|
| Final actual-writer regression |12 PASS / 0 FAIL / 0 SKIP|final-targeted-attempt3 (combined with four slot tests)|
| Slot scheduling |4 PASS / 0 FAIL / 0 SKIP|final-targeted-attempt3|
| Same final test bytes on old source |4 PASS / 8 FAIL / 0 SKIP; expected F1/correction failures|old-targeted-attempt4|
| Backend official typecheck |PASS, exit 0|backend-types-attempt1|
| New pure test static types |PASS, exit 0|new-pure-tests-types-attempt1|
| Extra ad hoc HTTP test static types |FAIL, exit 2; stdout byte-identical to original baseline|focused-tests-types-attempt2 + baseline-http-tests-types-attempt1|
| Frozen inherited source/proofs |13426 checked; 0 unexpected changes|integrity-comparison.json|
| Real DB / HTTP / browser |UNRUN|Resource restriction, independent QA handoff|

The ad hoc test typecheck is outside the normal backend tsconfig (which excludes tests). Its diagnostics refer to preexisting HTTP test lines 369–883 and frontend imports; the unchanged original route test produces byte-identical diagnostics, SHA-256 dc663ce3a9b1ca77fb9f001d1031ec9dcd7ba1e64f47077dce5d442963899363. No new source/test diagnostic was found. This failure is retained, not recast as a passing typecheck.

Attempt history is retained. Old attempt1 failed bootstrap before application assertions (hoisted tsx resolution). Attempt2 combined F1 failures with fixture/API-assumption issues; attempt3 corrected those issues (6 FAIL / 4 PASS). Final old attempt4 uses the exact final 12-test file (8 FAIL / 4 PASS). Final-source attempt1 had two double-only DbNull snapshot mismatches (12 PASS / 2 FAIL), corrected by representing Prisma DbNull as a persisted null. Attempt2 passed 15 tests; attempt3 adds keyed stale-write assertions and passes all 16. The first ad hoc typecheck hit TS5112; retry enabled ignoreConfig and exposed the documented baseline diagnostics. Raw logs and original runner versions are private and unchanged. Counts describe individual invocations and are not aggregated into a fictional clean run.

All 13424 other frozen files retain hashes, bytes and metadata. The two authorized existing source files were detached before editing; their old bytes remain in private copies. QA8, actual Claude4, final failed Codex and packet8 remain historical immutable evidence. The safe final-failed report/summary copies already in this packet remain unchanged.

No Git index/ref/commit/push/GitHub/state/provider/configuration write, runtime launch, issue closure, merge or deploy was performed. Root remains the sole publication writer. The preceding Claude4 approval/final Codex failure retain their exact historical subjects; this author report does not supersede or self-certify them.
