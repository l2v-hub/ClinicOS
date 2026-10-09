# Independent QA — issue 425

Final Decision: FAILED VALIDATION

Application source: 796f5b4b1e32c43a15f5875a8bea79dd4f4fc61e. Baseline: 67d21c3e9257a5acb8c9b25130c9417fb92185fb. Source read-only; root must implement/re-freeze and rerun dedicated QA before release. No commit, push, provider or patient mutation performed.

| Phase / criterion | Result | Evidence |
| --- | --- | --- |
| Contract and original issue/comments | PASS, original wording retained, zero comments | recipes/task-contract.md, recipes/original-issue.json |
| Diff scope/hygiene | PASS, 3 frontend files only; 50-line scoped screen CSS, one import, 4 regression tests; no backend/API/schema/auth/env/lock changes | diff.patch |
| Types/build | PASS frontend/backend noEmit, tsc-b, actual Vite/React compiler | commands01/*types.log, commands01/frontend-tsc-build.log, commands01/vite-build.log |
| Focused tests | 43 total, 42 PASS, 1 exact accepted classic fallback baseline failure; not globally green | commands01/focused.log, command-results.json |
| Full regression | 1256 total, 1244 PASS, 12 exact named accepted baseline failures, zero new; not globally green | commands01/full-regression.log, command-results.json |
| Security | PASS scoped native changed-file baseline/candidate zero findings; no source secrets, config/deps/log/AuthZ change | security01/comparison.json, commands01/security-scan.log |
| AC1 long page predictable owner | PASS actual SPA wheel/form/Clinica, 5 viewport sizes × nurse/doctor | browser01/results.json, before/after/clinical PNG, per-group trace/video |
| AC2 calendar no vertical trap | PASS real PRN region reached with wheel above grid, week horizontal rail retained, grid Y top zero, exactly 1 vertical owner | browser01/results.json, after-wheel/week-rail PNG |
| AC3 keyboard controls not obscured | **FAIL** modal focus obscured by chart clipping ancestors, despite passing viewport/dialog-only bounds | browser03/failure.json, failure-0.png, failure-0-trace.zip, video |
| AC4 desktop/tablet dimensions | Actual Chromium 1150×1004,1280×720,1024×768,768×1024,390×844 measured. Geometries tested; modal desktop case fails AC3. No physical touch/device/ward certification | browser01/results.json; browser02/results.json |

Adversarial nurse DENIED therapy.create: 3 pointer-coarse viewport groups PASS, no Nuova terapia tab or slot creation action; wheel/week layout still works. Browser02's inherited console summary suffix mentions modal but no modal is opened there; modal evidence comes only from browser01 and failed browser03. Coarse-pointer emulation is explicitly not physical tablet certification.

All 13 successful browser groups had zero console errors, page errors, bad HTTP responses, unknown APIs, external calls or clinical writes. Auth simulator and clinical APIs were intercepted before wire; all unknown/non-GET clinical calls rejected. No durable state changed, so no DB persistence claim is made. Dialog background scrolling was recorded independently; no body-lock claim was made.

Failure reproduces at doctor1280×720: modal Close button bounds top189.5 bottom225.5, ancestor chart panel top239 bottom720 with overflow:auto and persisted transform matrix(1,0,0,1,0,0). elementFromPoint hits demographics-status instead of the focused button. Multiple subsequent prescription controls are similarly clipped. App.css tab-panel-transition animation fill both leaves transform translateX(0), creating a containing block for the fixed modal. Root was notified with exact source-bound evidence; do not waive the supplemental failure or treat DOM visibility as viewport/hit reachability.

Failed attempt and every prior success remain immutable. Raw manifest seals recipes, logs, screenshots, trace/video and source-before/after; dependency runtime cache excluded only. User-owned start-claude-team.ps1 overlay preserved.

Codex must now re-run the QA Gate after a corrected frozen candidate.
