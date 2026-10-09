# Issue425 independent QA iteration2

QA Verdict: READY FOR CODEX QA

Application b7ae14d120c1e70ccf72784206a505f8c48f975e; accepted baseline67d21c3e9257a5acb8c9b25130c9417fb92185fb. Dedicated tester, source readonly, isolated C:/w-425-qa2. Root must rerun byte-identical recipes and decide release/deployment/closure; this is not a production or CI verdict.

| Phase / criterion | Result | Evidence |
| --- | --- | --- |
| Contract/original issue/comments | PASS original wording, zero comments, AC4 viewport-dimensions interpretation explicit | recipes/task-contract.md, recipes/original-issue.json |
| Diff scope/hygiene | PASS exact3 frontend files, one import,55-line scoped screen CSS,5 focused tests; no backend/schema/API/auth/env/config/deps/lock changes | diff.patch |
| Types/build | PASS FE/BE noEmit,tsc-b,actual Vite/React compiler | commands01/frontend-types.log,commands01/backend-types.log,commands01/frontend-tsc-build.log,commands01/vite-build.log |
| Focused |44 total43 PASS1 exact accepted classic fallback baseline failure; no new failures, not global green | commands01/focused.log,commands01/command-results.json |
| Full regression |1257 total1245 PASS12 exact named baseline failures0 new; not global green | commands01/full-regression.log,commands01/command-results.json |
| Security | PASS scoped changed-file baseline/candidate0 findings; new files honestly absent from baseline; frontend source/dist secrets scan PASS | security01/comparison.json,commands01/security-scan.log |
| AC1 predictable vertical path | PASS actual computed single owner, long calendar/Clinica/form,wheel | browser01/results.json,browser01/doctor-1280-before-wheel.png,browser01/doctor-1280-after-wheel.png,browser01/doctor-1280-clinical.png,browser01/doctor-1280-trace.zip |
| AC2 calendar no scroll trap | PASS wheel reaches after-grid PRN region, gridYtop0, horizontal week rail preserved | browser01/results.json,browser01/doctor-1280-after-wheel.png,browser01/doctor-390-week-rail.png |
| AC3 keyboard focus visible | PASS110 form Tab/ShiftTab per10 groups,110 modal per10 groups plus330 adversarial modal focus controls all effectiveClip0/hittrue/CBviewport; Save focus via ShiftTab/Tab fully in viewport and hittrue on3 sizes | browser01/results.json,browser03/results.json,browser03/doctor-1280-modal-save.png,browser03/doctor-768-modal-save.png,browser03/doctor-390-modal-save.png,browser03/doctor-1280-trace.zip |
| AC4 desktop/tablet dimensions | PASS actual measured Chromium1150x1004,1280x720,1024x768,768x1024,390x844; not physical hardware/touch certification | browser01/results.json,browser02/results.json,browser03/results.json |

16 successful browser groups:10 nurse/doctor primary groups,3 denied/coarse groups,3 strong fixed-modal groups. Denied nurse therapy.create exposes neither Nuova terapia tab nor slot creation buttons. Coarse-pointer media is actually true on3 emulated contexts, not a real tablet claim. Browser02 inherited console suffix mentions modal, but its assertions are wheel/week/denied gating only; modal evidence belongs to browser01/03.

Previously failed796 QA remains IMMUTABLE in C:/w-425-qa/.../independent-qa manifest a69b2123ffa5765005099a494ed66aa030561836b748fdec15ad93798885e22f. New candidate disables retained transform animation only on chart panel. Real fixed containing block is now viewport; DOM overflow ancestors above that fixed viewport are not effective clipping ancestors. Hit tests and full bounds verify actual pixels rather than merely DOM visibility. Desktop/modal-save PNG visually inspected: focused Save visible, overlay covers entire page, no y239 clipping. All330 adversarial focused controls have matching elementFromPoint. No QA2 failed attempts.

All16 groups:0 unknown/external/clinicalwrites/pageerror/consoleerror/HTTPerror. API/auth/catalog/provider requests intercepted before wire, synthetic fixtures only. No durable clinical writes; no DB persistence claim. Background modal scrolling recorded independently; no nonexistent body-lock claim. No app AuthZ logic altered; UI denied-capability gate tested, server authorization unchanged and not newly certified. No new logs,rawHTML/SQL,dependencies or configuration. Scanner is scoped code validation, not global CVE certification.

Source-before/after bind1534 tracked frontend/backend/scripts/manifests exactly; dependency junction readonly and native launchers untouched. server-stop-policy/verified receipts record identity-bound scoped shutdown. Raw artifact manifest seals recipes, logs, result JSON, real PNG, traces, video and report; only generated runtime-cache excluded. playwright-report/index.html is generated from asserted result JSON, not an application substitute.

Codex must now re-run the QA Gate.

## Actual video artifacts

- browser01/page@009ab298e35f1c1538571efd6fc1ede7.webm
- browser01/page@17002056941aed122eae2089f1a644db.webm
- browser01/page@1f6b57955e14f813bf67ea957ac06774.webm
- browser01/page@90df33e0ae6a77a124a378e4e4f9c859.webm
- browser01/page@a9dd519b69e07e661cbf630eadebf6a7.webm
- browser01/page@b76dd0c797110f77ecdee3b570f6a4be.webm
- browser01/page@cc170b784adbb7d730e3435c8bb53a68.webm
- browser01/page@dcde399a73ea111ca344183628aa7eb0.webm
- browser01/page@df36236d906fb801d2936aaa143bda2f.webm
- browser01/page@f42fffd2f04444cfed5cb2280eb4dba7.webm
- browser02/page@39d1352aef97b17edb155e0596e11003.webm
- browser02/page@963a38a3b2fd54432b4bf43690303ad5.webm
- browser02/page@97f5a0f74ad766935ca804d214473e22.webm
- browser03/page@2d7a79fbaf73a2c74ea897a6b7fc56ee.webm
- browser03/page@674168152164042350338be74678184b.webm
- browser03/page@eac6c41d582b941cf790bc8366371b98.webm
