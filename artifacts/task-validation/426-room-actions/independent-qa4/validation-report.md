# Independent QA4 — issue426

QA Verdict: READY FOR CODEX QA
Final Decision: IMPLEMENTED — NOT VERIFIED

Local acceptance checks pass against immutable application30e8023e8b88dcd8b5e40544f1597ee0c046a41c, compared with accepted baselineb7ae14d120c1e70ccf72784206a505f8c48f975e. This independent reviewer did not implement or coordinate application changes and modified no application file. Root must replay the exact frozen recipes and own the release/production/publication gate before closure. No GitHub write, commit, deployment, real patient/facility mutation or DELETE was performed by QA4.

| Phase | Result | Objective evidence |
|---|---|---|
| Contract/original issue and comments | PASS | task-contract.md, original-issue.json (comments[]) |
| Complete eight-path diff review | PASS; presentation extraction and names only; save/delete/single-flight/abortable loading retained; no schema/API/auth/env/dependency changes | source-git-binding.json, git source at application SHA |
| FE/BE types, tsc-b, actual React/Vite build | PASS | commands01/*types.log, frontend-tsc-build.log, vite-build.log |
| Focused regression |24/24 PASS | commands01/focused.log |
| Full regression delta |1267 total,1255PASS,12 exact accepted baseline failures,0new; NOT globally green | commands01/full-regression.log, command-results.json |
| Source/dist secret scan | PASS | commands01/security-scan.log |
| Native scoped security comparison | baseline/candidate zero findings,0new; not global CVE certification | security01/comparison.json and raw samples/scans |
| Actual SPA browser |22/22 serialized groups PASS | browser-replay-results.json, seven test-results/browser-results.json; screenshots/traces/videos; playwright-report/index.html |
| Application unchanged |1539 files/raw hashes before-after stable; each immutable Git blob exact or strictly UTF8 CRLF-only | source-before.json, source-after.json, source-git-binding.json |
| Exclusive browser lane handoff | own PID2972 command/listener verified, stopped; contexts closed | server-start-policy.json, server-stop-policy.json, lane-handoff.json |

| Original AC | Result | Evidence |
|---|---|---|
| Unambiguous room/bed accessible names | PASS | browser01 unique names across2rooms/4beds; supplemental01/long01 literal hostile/separator fixtures; quoted components; roomActionIdentity unit runtime/SSR checks |
| Tooltip/editor/dialog same captured resource | PASS | browser01 exact titles and capturedoriginal rename; supplemental01 original PUT target/stateful mock reload; long01 long bed header; room-headers01 two complete32W camera headings; delete-header01, confirm-bounds01 and header-vertical01 complete confirmation glyph bounds |
| Destructive action distinct and existing confirmation retained | PASS | browser01 trash vsedit SVG, dangercolor and16px gap; exact confirmation and focus return; all deletion flows CANCEL ONLY |
| Names verified without live deletion | PASS | all seven before-wire route guards; zero external, unexpected, clinicalWrites, pageErrors; no DELETE request; empty patients and synthetic supervisor/facility only |

Frozen recipe/output/count mapping: browser.mjs→browser01(6); supplemental.mjs→supplemental01(5); long-labels.mjs→long01(6); room-headers.mjs→room-headers01(2); delete-header.mjs→delete-header01(1); confirm-bounds.mjs→confirm-bounds01(1); header-vertical.mjs→header-vertical01(1). Hashes recorded in browser-replay-results.json; recipes byte-identical to assigned copies. All22 count as group assertions, not a claim of22 different clinical workflows.

Expected negative path: supplemental01 and long01 each deliberately mock exactly one409 on `/admin/beds/QA-BED-426-2-B`, each with exactly one matching Chromium console409 error; both explicitly asserted, not hidden or reported as zero. All other unexpected console/HTTP errors are zero. Delayed save disables all five controls, retains target, rejects Escape while busy, and retries exact original ID. Updates/reload are exclusively stateful mocked memory, NOT database persistence.

Visual inspection: browser01/screenshots/resource-actions.png shows distinct edit/trash actions for101/102; long01/screenshots/independent-mobile-long-context.png shows full16L/32W bed identity and all fields/close/Annulla/Salva; room-headers01/screenshots/mobile-long-room-editor.png shows entire32W editor heading and close; header-vertical01/screenshots/mobile-complete-confirmation-context.png shows entire32W heading/message/danger label and reachable Annulla. The latter strong geometry places header22..114.75 within dialog0..359.5 and danger231.5..295.5; horizontal311/311 and vertical60/60; all text glyphs inside their real element and viewport bounds. Actual pixel hit tests, Tab/Escape and focus return passed. No shortened labels or softened assertions.

Security review: React literal strings/SSR escaping, no dangerouslySetInnerHTML/raw SQL/new logging; existing server bounds mirrored (room32, bed16 server fixture bounds, notes2000); capability routing and operatorHeaders retained; no credential/config/manifest changes or packages. Synthetic token is explicitly not an actual credential. Privacy-safe screenshots contain no patients. No real DB, physical assistive technology, hardware/gloves/lighting, clinical policy or global security certification claimed.

Tooling observation retained: incident-startup.md records the short PowerShell readiness timeout during cold dependency compilation; the same owned PID subsequently returned200 and all22 frozen browser groups passed. No browser failure was overwritten or assertion relaxed. Prior candidate failures are owned/preserved by root, not overwritten by this independent bundle.

Codex must now re-run the QA Gate.
