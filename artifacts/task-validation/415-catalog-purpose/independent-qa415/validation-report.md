# Independent QA #415 — frozen candidate

Final Decision: READY FOR CODEX QA

Issue-scoped disposition only; not a release/deployment/clinical certification. Original issue l2v-hub/ClinicOS#415 read with all comments (none), still OPEN at inspection. No source/test/shared-script/git mutations or external writes by this QA session. Mandatory qa-gate and agent-loop-quality-gate used to require independent diff, executable assertions, privacy/security checks and source-bound receipts. Publication/issue attachment is left to independently authorized integration owner.

Application commit: `0d7adc361b92c8466655d9ed830d2b87bbd0f419`
Source SHA256: `6be776fab17aae587589b039db30f5df3be8d6a8e7910cfd5be6f0863b3b6902` (1453 tracked inputs)
Baseline application: `288dac948c8a46e26e1bef87d6266b2497727566`
Independent baseline checkout: `27526e82d5251ac67fd95d5a604cf1c98a8456fe`; application inputs independently verified unchanged relative to baseline.

## Original four acceptance criteria

| Criterion | Verdict | Objective evidence |
|---|---|---|
| Every scale has brief purpose without changing official name | PASS source/UI | Exact original ten catalog names asserted; ten visible purpose paragraphs; exact PAINAD/Braden text asserted; source descriptions audited against unchanged definitions/template/legend. `browser-final/screenshots/metadata-catalog.png`, `diff-security-review.md` |
| New compilation and history visually distinct | PASS | Visible Compila/Storico on each row; textual Resume/Delete when available; no tooltip-dependent catalog actions. All seven modern new/history/resume routes asserted; legacy routes preserve separate view intent. `browser-final/test-results/results.json` |
| Nessuna compilazione / Bozza / Ultima completa coherent | PASS UI | Simultaneous catalog latest-final metadata, own saved draft and local saved-draft cache; exact assessment/registration/finalization dates and own counts; no invented score/result; loading/error never says empty; retry recovers. Legacy clinical-date metadata not relabelled final. `browser-final/screenshots/coexisting-final-saved-local.png`, `controlled-error.png`, `retry-recovered.png` |
| Keyboard navigable, not tooltip dependent | PASS | Native button Space/Enter and Tab/Shift+Tab; 3px visible focus and modern history focus; mobile 390px action widths/heights >=44 and within viewport; visible text/purpose wrapping visually inspected. `browser-final/screenshots/catalog-mobile.png`, `mobile-keyboard-history.png`, `browser-final/test-results/mobile-targets.json` |

## QA phases and command evidence

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS | `task-contract.md`; four original AC, safety bounds, chosen QA surface |
| 1 Full diff | PASS no correctness finding | `diff-reviewed.patch`, `diff-security-review.md`; all 12 changed files reviewed; git diff --check zero errors |
| 2 Targeted checks/types/build | PASS | `commands/frontend-types.log`, `backend-types.log`, `frontend-tsc-build.log`, `vite-build.log`; focused 54/54; supplementary catalog SSR 4/4 with isolated Node Vite URL/env stub only |
| 2 Normal full regression | FAILED — unchanged baseline, not green | Candidate 1215 tests/1203 pass/12 fail, baseline 1210/1198/12; exact same twelve failure names, zero new. `commands/full-regression.log`, `independent-baseline-full.log`, `independent-baseline-comparison.json`. No tests removed/hidden; issue-scoped READY does not certify whole repository green. |
| 3 Synthetic actual-SPA browser | PASS 22/22 groups | 17 behavioral + five guarded-network/console groups, raw values and request ledger in `browser-final/test-results/results.json`; readable replay report `browser-final/playwright-report/index.html` |
| 4 Security | PASS within changed scope | `diff-security-review.md`, `commands/security-scan.log` (zero findings in src/dist); read-only OSS gating, mocked before navigation, no unexpected requests/domain writes/external access/page errors. Explicit controlled 503 only in error/retry context, retained in raw records. |

## Executed adversarial behavior

Final run (`browser-final`) uses actual SPA on localhost:7477, original independently authored adversarial script, shared QA414 synthetic actor/patient fixture adapted only within own subtree. APIs wired to guarded synthetic replies before any navigation; no real patient/backend/database access. Dedicated synthetic OSS actor is QA-OSS-415, with denied assessment mutation capabilities.

The final run proves: catalog never fetches full/current records; history with final+saved-own+local state never auto-resumes/creates; saved-own Resume reads only explicitly selected draft; repeated modern history preserves exact respiration answer 1 and returns focus to history; all seven modern Compila routes and #413 focused PAINAD appearance are retained; Resume reopens forms; local-delete cancel preserves draft, confirm removes only local draft; legacy Medicazioni/Contenzioni restored existing editId remains QA-EXISTING-415 across hidden history/Resume and blocks catalog-new implicit updates; Braden kept-alive/restored unsaved date/note remains intact (Braden has no editId UI); held metadata loading, controlled error and explicit single retry; read-only OSS catalog action gating; mobile text/actions/focus/44px geometry. No implicit application update was attempted. Local retention is browser-session-only synthetic evidence; metadata mocks are NOT an actual server-persistence/finalization claim.

## Real browser evidence files

Screenshots, all under `browser-final/screenshots/`: `metadata-catalog.png`, `coexisting-final-saved-local.png`, `painad-resume-saved-local.png`, `legacy-medicazioni.png`, `legacy-contenzioni.png`, `legacy-braden.png`, `loading.png`, `controlled-error.png`, `retry-recovered.png`, `readonly-catalog.png`, `catalog-mobile.png`, `mobile-keyboard-history.png`.

Five traces, all under `browser-final/`: `catalog-metadata-trace.zip`, `legacy-restored-edit-trace.zip`, `loading-error-retry-trace.zip`, `readonly-trace.zip`, `mobile-keyboard-trace.zip`.

Five videos, all under `browser-final/video/`: `catalog-metadata.webm`, `legacy-restored-edit.webm`, `loading-error-retry.webm`, `readonly.webm`, `mobile-keyboard.webm`.

Report/raw: `browser-final/playwright-report/index.html`, `browser-final/test-results/results.json`, `run-output.log`, `mobile-targets.json`. HTML is the generated readable report of executed Playwright assertions, not a separate official Playwright Test reporter run.

All artifacts and scripts, including every preliminary run, are SHA256-bound in `evidence-manifest.json` (manifest excludes itself only). `source-receipt.json` binds runtime source and unchanged domain/client/storage/backend inputs; repeated after final browser run.

## Preliminary harness failures retained honestly

`browser/`, `browser-rerun1/`, `browser-rerun2/`, `browser-rerun3/`, `browser-rerun4/` retain failing raw outcomes/traces/videos and are NOT PASS evidence. Harness-only repairs were: synthetic full-assessment response envelope; paper radio assertion uses exact aria-label (HTML radio default value is 'on'); transfers form class; confirmation has alertdialog role, not dialog; metadata prefetch duplicates require holding/failing all pre-retry requests, not only first request. Screenshot helper awaits finite CSS entrance animations (initial faded screens not used as final result). `browser-rerun5/` passed with denied-capability nurse actor; `browser-final/` repeats with explicit OSS identity and raw log. No application change required.

Initial independent baseline attempt omitted TSX_TSCONFIG_PATH and exposed three additional JSX-harness failures. Corrected baseline runs with identical candidate TSX app config reproduce exact twelve baseline failures; corrected full output is retained. No normal-suite Vite failure was suppressed. The supplementary SSR stub is QA-only and never applied to normal full regression or actual SPA.

## Limits / handoff

The normal repository suite remains non-green with twelve pre-existing failures; Gatekeeper must retain that distinction in any release decision. No clinical sign-off or validation of clinical interpretation, no actual server persistence, no production deployment, no native hardware or sunlight certification. Purposes are repository-source-backed, not newly clinically approved. Legacy files already exceed 500 lines and were not refactored in this scoped bug.

Browser lane explicitly RELEASED to root after all five final contexts and Chromium closed. Servers 7477/7476 left running. Re-run `node --import tsx artifacts/task-validation/415-catalog-purpose/independent-qa415/qa-adversarial.mjs <separate-output-dir>` from C:/w-415; optional QA_BASE_URL; do not overwrite sealed independent evidence. Root remains sole integration/application writer. No issue close/merge/deploy performed.

Codex must now re-run the QA Gate.
