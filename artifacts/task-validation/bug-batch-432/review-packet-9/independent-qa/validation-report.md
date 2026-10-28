# Independent QA — legacy one-off writer

Verdict: READY FOR CODEX QA for the scoped writer fix at `e405399427e7c738dc32070b17a50494b629608b`. No production correctness or security findings were identified. Root remains responsible for publication checks, actual next Claude review and fresh final Codex before release.

Reservation `546d53b9-f6f7-4ebb-b439-061c3184cda1` was verified before work. Clinical runtime remained unrun until explicit canonical grant `6fc4a42e-7cb1-4369-9105-3fa9ce2eda88` and independent port/lock/disk/baseline readback. Every test ran from a fresh private source snapshot through trusted `createRunner` verification mode with controller credentials stripped. Harness bytes/manifests were saved before execution, with actual stdout/stderr/exit receipts.

| Phase | Fresh result | Evidence |
|---|---|---|
| Contract, scoped full diff and callers | PASS | static-review.md; reviewed-scoped.diff |
| Actual-writer pure regressions | 15 PASS | pure19-attempt1/stdout.txt |
| Slot scheduling | 4 PASS | same invocation: 19 total, 0 FAIL, 0 SKIP |
| Real HTTP/PostgreSQL relevant complete file | 19 PASS / 0 FAIL / 0 SKIP | runtime-attempt1/http-pg-stdout.txt and receipt |
| Official backend types | PASS, exit 0 | runtime-attempt1/backend-types-receipt.json |
| Fresh private Vite application build | PASS, exit 0 | runtime-attempt1/frontend-private-build-receipt.json |
| Selected actual App Giro/HTTP/SQL checks | 4 PASS | runtime-continuation1/browser/results.json |
| Security and current-scope validation | PASS | static-review.md; actual HTTP scope-denial/replay tests |
| Integrity | 61120 file checks, 0 differences | integrity-after.json |

The 3 new HTTP tests contain 8 valid/repaired × modern/legacy × given/refused outcome cases, 4 contradictory/tied priority cases and 6 nonmatching identity variants. These are cases within 3 of the 19 Node tests, not extra test counts. The complete affected file also exercises real concurrency, idempotent immutable receipts, scope denial, observed correction, moved clocks, multi-dose, measured doses and spoofed prescription fields. Complete clinical rows and receipts are compared around mutations and denials.

The actual rendered Giro showed valid and repaired legacy given/refused outcomes across four prescriptions with no new-dose buttons, and retained them after reload. Fourteen stale/pending/omitted/already-given authenticated HTTP requests returned 409 with exactly unchanged full SQL rows and receipts. Two explicit corrections followed observed real rendered refusals: each changed the selected historical row once, preserved its null therapyId and historical identity, attributed SIM-NURSE-1, created no new clinical row and exactly one receipt. Keyed replay and repeat nonkeyed 409 made zero additional changes. Reload showed persisted given outcomes. Corrections used real authenticated HTTP; no nonexistent UI correction-button flow is claimed. Browser events: 0 page/console/HTTP errors and 0 UI administration posts.

Four PNGs were decoded, the trace ZIP passed archive checks, and the video fully decoded. The actual signed synthetic simulator bearer values were redacted in 77 trace occurrences; logs contain no unredacted bearer values. Screenshots were visually inspected. Fixtures are synthetic. No provider calls or external writes occurred.

Historical failures remain preserved. Preparation attempt 1 stopped at a manifest-comparison assertion caused by the .git pointer and historical omission of a nested artifacts fixture; separate continuation verified historical Git bytes. Runtime attempt 1 passed migrations, types, HTTP19 and private build, then failed in the private SQL snapshot before browser launch because receipts have a composite actorId/requestId key rather than id. The original harness and complete actual failure output remain. Separate continuation corrected only that private SQL ordering and passed the remaining UI phase without repeating passed suites or build. This report does not recast all attempts as one clean run.

All original source/packet bytes and inodes are unchanged, index unchanged, HEAD `e405399427e7c738dc32070b17a50494b629608b` clean. The original author 666-file seal and continuation 624-file seal (SHA-256 `9493e3397d0b4871924152e1d1d51a80cd2d83d84d7fdee28c042ee6d4b2a58d`) verify. Original QA8, actual Claude4/final-failed provenance and prior failures remain immutable. Reader query/helper, authoritative resolver, HTTP and Tool caller bytes match QA8. Only the 3 authorized code/test paths differ from QA8, and all frontend bytes match.

UNRUN/retained: unchanged full backend/frontend suites and original seven-feature/QA8 browser matrix retain their historical statuses; they were not freshly repeated. The scheduled individual drug-dose branch still has no actual App mount. No provider/real-credential clinical test, publication checks, new Claude review, fresh final Codex, Git/GitHub write, merge or deployment is claimed.

Both owned disposable PostgreSQL containers were removed and owned direct Node services stopped. Independent final binding checks found ports 55432/3447/5447/8432 free; nonwaiting flock is free. Baseline container `9000f70d4ee95b9e3bde723796daa050081db4274d20c97888413479232949ad` and its 5432 port manifest are unchanged; no baseline SQL or mutation was performed. See resource-handback.json.
