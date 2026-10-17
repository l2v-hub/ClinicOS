# Independent QA2 — issue review communication

Final Decision: **READY FOR CODEX QA**

Fresh dedicated QA session after implementation2/4, not its author or coordinator. Baseline `8124b1bc88c0f086b1ee328214f87f4802005d11`; exact seven-source manifest SHA-256 `a0f05a1d59c0d2dec0b0c0ed89dbcd25c252275130c53915801fc6d1b0c43682`; author candidate seal `8f56db3393dcf7557ebe5144f3062e5568fcbba57926d108f7e82aea225d87ef`.

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS: user instruction and all AC1–AC7, four frozen contracts read and hashed | `phase0-contract.md`, `before-proof.json` |
| 1 Diff review | PASS: scope7, nineteen G sources unchanged; both QA1 late-guard defects corrected with no remaining finding | `diff-security-review.md`, `source-preservation-check.json` |
| 2 Build/tests | PASS:628 regression tests =625 PASS+3 native-Windows skips, zero fail;21/21 independent actual HTTP probes; frontend noEmit app+node projects and production build740 modules/35.74s; six syntax checks, seven-path formatter, whitespace and task contract validation PASS | `full-regression.log`, `independent-probes.json`, `types.log`, `build.log`, `static-checks.json` |
| 3 Actual browser | PASS:13 scenarios, all five labels, source feedback/acknowledgement, actual existing bounded correction handoff to new SHA, refresh persistence, failed-spent preservation, idempotency, stale head and authority rejection, both former races reject zero writes. Zero page/console/relevant HTTP errors | `browser-results.json`, `new-sha-ready.png`, `blocked-review-preserved.png`, `role-race-rejected.png`, `source-race-rejected.png`, `trace.zip`, `review-bridge.webm` |
| 4 Security | PASS: late actor/source authorization, exact identity/digest, bounded input/age and untrusted quoted feedback verified; entire packet and ZIP member scan finds zero high-confidence credentials; synthetic fixtures only, no database or external writes | `diff-security-review.md`, `privacy-audit.json` |

## Independent evidence

QA wrote its own expanded tests against the previous independent HTTP adapter, not the author's fixture. All original nine cases now pass, including actor revocation/source edit specifically during the guard's awaited cohort reads; twelve more cover source-author revocation, deletion, head/ownership drift, fresh oversized feedback, cross-SHA deduplication, expired/backwards clocks, copied markers, redaction/injection and report tampering. No source or author proof changed.

The safe internal browser surface calls the actual production communication module over loopback HTTP and the actual existing externalReviewStep with synthetic workspace callbacks. DOM result values and labels, reload persistence and write counts are asserted. The callback records fix → test → simplify → test → independent QA → publish without invoking a model or implementing real code. Trace ZIP CRC is valid; final VP8 video is real1440×1150,5.0s. Final ready screenshot visually inspected.

Harness-only limitations are preserved: initial type command pointed to a missing frontend-relative compiler; the corrected absolute installed compiler checks both actual app/node projects with noEmit and passes. Initial browser run passed13 cases but inherited environment; it is retained under `browser-history-before-environment-hardening/`. Final browser and full regression run remove credential environment entries and use failing provider CLI shims. No candidate changes or weakened assertions were made to obtain PASS.

All seven candidate sources, four contracts, nineteen frozen guards and86 pre-QA historical files were reverified byte-for-byte. Borrowed dependency symlinks were removed. Original QA1 RED reports/media and author attempt1/2 proofs remain unchanged. QA performed no commit, push, GitHub issue/PR/label operation, durable-state write, model call, database access, deployment, merge or issue closure.

Root still owns publication, all required native checks, trusted-main activation and actual PAT notification verification. This feature makes existing failed Max attempts visible; it does not repair the unknown personal-worker failure, retry a consumed review, manufacture a missing report or approve PR481/483. Exact-SHA structured review and existing release guards remain mandatory.
