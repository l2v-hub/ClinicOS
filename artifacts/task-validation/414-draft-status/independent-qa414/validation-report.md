# Issue 414 — independent QA

Final Decision: READY FOR CODEX QA

Application commit `288dac948c8a46e26e1bef87d6266b2497727566`, accepted baseline `e01bd55114e2b5b1615b4088d988a41aad60eb80`. Source SHA-256 `9c0d4c1c5e559b66801f33760cb513d21a664e141fa30f1c0e23e3f26dc79e9c`, 1,451 source inputs. Pre/post receipts independently bind the exact committed application source, excluding generated builds and known unrelated launchers. Root alone wrote application code. This dedicated QA agent wrote only its evidence subtree, independently read original GitHub #414 and zero comments, and reviewed the complete seven-file frontend-only diff.

| Phase / original criterion | Result | Evidence relative to this folder |
|---|---|---|
| Contract and original AC | PASS — four original criteria, persistence/backend not changed | ../task-contract.md; this report |
| Diff review | PASS — presentation only; no definitions/engine/store/client/persistence/backend/schema/config/dependency/AuthZ change | pre/source-receipt.json; post/source-receipt.json |
| Frontend/backend types and frontend build | PASS — independent noEmit, tsc build, Vite build | commands/frontend-types.log; commands/backend-types.log; commands/frontend-tsc-build.log; commands/vite-build.log |
| Focused tests | 42/42 PASS | commands/focused.log |
| Independently authored state/store adversarial tests | 8/8 PASS after test import-path correction, no app change | adversarial414.test.ts; adversarial-rerun/tests.log; adversarial-rerun/result.json |
| Full frontend regression | 1,210 tests, 1,198 pass, 12 exact accepted #413 baseline failures, 0 new; not globally green | commands/command-results.json; commands/full-regression.log |
| AC1: locality and availability without server | PASS — unsaved only this open window, not another device/new access; saved same author account plus continuing patient permission; neutral catalog/legacy presence labels | browser-cleanup-rerun/test-results/browser-results.json; browser-cleanup-rerun/screenshots/local-only.png; browser-cleanup-rerun/screenshots/confirmed-save.png; adversarial-rerun/tests.log |
| AC2: only change after actual save confirmation | PASS — held request remains in progress; malformed/mismatched receipt never saved; dirty changes distinct from last confirmed timestamp; incomplete saved preview accurately remains acknowledged | browser-cleanup-rerun/test-results/browser-results.json; browser-cleanup-rerun/screenshots/save-pending.png; adversarial-browser/test-results/adversarial-results.json; adversarial-rerun/tests.log |
| AC3: progress/failure and recovery | PASS — exact retry request retained; uncertain receipt does not unlock or discard observation; blocked browser storage denies reload guarantee in busy and uncertain states | browser-cleanup-rerun/screenshots/failure-recovery.png; adversarial-browser/screenshots/desktop-malformed-receipt-blocked-storage.png; adversarial-browser/screenshots/mobile-malformed-receipt-blocked-storage.png |
| AC4: chart-tab change, new access, distinct test-device storage | PASS — real SPA tab switch/reload preserves same-window local draft; actual simulator logout/new login clears unsaved draft; fresh separate storage context cannot see it; acknowledged real PostgreSQL draft retrieved after new access and in separate context; other author and revoked patient scope rejected | browser-cleanup-rerun/test-results/browser-results.json; browser-cleanup-rerun/screenshots/distinct-context-recovery.png; db/tests.log; db/result.json; db/migrations.json |
| Responsive / #413 regression | PASS — desktop1150x1004 and mobile390x844 first radio remains focused, no selected draft resume, no horizontal overflow; source validated scales unchanged | adversarial-browser/test-results/adversarial-results.json; commands/focused.log; browser-cleanup-rerun/screenshots/mobile-confirmed-save.png |
| Security / privacy | PASS touched scope — source/dist scanner, no new logs/raw HTML or permissions/transport/storage/dependency changes; synthetic-only guarded transport; no unexpected external HTTP or production writes | commands/security-scan.log; source receipts; browser-cleanup-rerun/test-results/browser-results.json; adversarial-browser/test-results/adversarial-results.json |

## Independently executed runtime evidence

The ordinary real SPA suite was independently executed against the root-owned loopback7476 source server. Assessment requests invoke unchanged backend source services on a fresh isolated real PostgreSQL cluster; other SPA/auth/roster endpoints are synthetic transport fixtures. Ten ordinary assertion groups pass. The fresh cleanup rerun exits0 and includes screenshots, five per-context trace ZIPs, videos, HTML report and raw results. No production patient API is contacted. Deliberate synthetic503 write failure and scope-denied404 reads are explicitly isolated; no other relevant HTTP/console/page errors or unexpected writes are permitted.

Eight additional independently authored browser assertion groups pass on desktop/mobile, with process exit0: preserve #413 first-question focus and selected-draft action suppression; deny browser storage; hold a save; return successful HTTP201 without a verified DTO/receipt; prove no optimistic saved label, answer loss or unlocked delete; retain exact recovery action. This suite uses guarded synthetic responses, not DB claims. Two screenshots capture the resulting unconfirmed state and locality warning; desktop/mobile traces and videos plus HTML/raw reports are in adversarial-browser/.

The separate unchanged backend database suite was independently rerun: eight tests pass against a fresh real PostgreSQL instance, covering author-only draft privacy (including manager), patient-scope revocation, immutable creation replay, CAS, history scope, and persistence across new processes. Native fixture files are cloned into private temporary directories; missing UTC timezone data is supplied only in the private clone. The shared native cache is never modified.

## Preserved failed harness attempts

commands/independent-adversarial.log and command-results.json retain an initial own test-file import-depth error; corrected test imports produced the separately captured eight-test PASS in adversarial-rerun/. No application change occurred.

browser/ retains the first independent ordinary run: all ten assertions and raw results completed, but process exit1 during cleanup when an externally owned pg Pool outlived Prisma disconnect and PostgreSQL was stopped. It is not certified as a successful run. The copied QA-only qa-browser-cleanup.mjs drains test-process pools before stopping the isolated cluster; browser-cleanup-rerun/ is the fresh exit0 run used above. The shared root QA helper subsequently restricts pool tracking to that fresh synthetic database URL. No source backend or installed dependency file is modified by this resource-lifecycle adaptation. Do not publish the unhandled native exception dump; evidence contains only this sanitized explanation, not its ephemeral pg protocol key.

## Limits and handoff

Distinct test devices are emulated with independent browser storage contexts, not claimed as two physical devices. Auth reaccess uses the actual app simulator logout/login UI while assessment DB/author checks use unchanged real source services. No Entra live-auth certification, screen-reader certification, direct-light hardware proof, global security-clean assertion or globally green CI claim. Existing project-wide baseline findings remain outside this scoped bug.

Screenshots were visually inspected: synthetic patient/operator only; saved and uncertain labels, last confirmed save, and mobile help are present. Root before screenshots in ../baseline/browser/ are source-bound baseline evidence, not asserted as this agent's original run. All QA browser contexts/processes and isolated PostgreSQL clusters are closed; the root7476 source server remains for root rerun. No commits, deployment, GitHub writes or issue closure by this QA agent. Source receipts and immutable-manifest.json bind this evidence. Root must rerun the gate and verify/publish deployment before closure.

Codex must now re-run the QA Gate.
