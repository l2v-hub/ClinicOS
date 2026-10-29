# Independent QA — issue #506

Final Decision: READY FOR CODEX QA

Dedicated session `/root/qa_issue506`, reserved before execution; nonce `64b40274-d129-449e-9c54-60307616eb30`. No implementation or coordination role. Completed 2026-10-24T22:17:10.348067+00:00. This report authorizes no publication, Claude approval, merge, deployment or issue closure.

## Contract and identity

Authoritative issue body and its empty comment list were read from the authenticated intake snapshot; sanitized issue-only copy: `issue506-intake.json`. The request is that Importa dimissione and Riprendi bozza fill their main page while the existing sidebar/topbar stay visible. Scope is #506 only despite the inherited packet name mentioning #507.

Native baseline `715a4b9e47ff9bd0192b7f58f24271e48da4900d`, original tree `bf5b0f78e40388b2857c158b80cd6d6ad91bc6d8`. Source reviewed by native Git diff plus all untracked new component/CSS/test/harness files. Frozen source manifest SHA-256 `abbfefa3a79ebe8aade35abae537c9533e2f236ad54c40e2dcdaebb9e1e441ca`. Both `source-check-before.json` and `source-check-after.json` PASS all 12/12 files. Hash-bound QA applies to these bytes; future publication must retain them or request fresh validation.

## Mandatory phases

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | `issue506-intake.json`, `task-contract.md`, `analysis.md`, `implementation-plan.md` |
| 1 Diff review | PASS | Production presentation propagation, lifecycle, navigation/save guard and modal defaults reviewed; no correctness finding. `diff-review.md` |
| 2 Build/tests | PASS | Independent `tsc --noEmit`; independent `npm run build` with explicit localhost fixture API URL; full frontend tests 1560 PASS / 0 FAIL. Logs below |
| 3 Playwright | PASS | 4 viewport flows + 4 adversarial probes + 1 cold lazy-loading probe; 1 additional authentic baseline reproduction. 10 valid traces and 10 decoded videos; HTML index and raw results |
| 4 Security | PASS within frontend scope | Explicit checklist in `security-review.md`; synthetic data and localhost-only fulfilled API traffic; no backend/role/provider claims |
| 5 Verdict | READY FOR CODEX QA | This report, `result.json`, `STOP.json`, SHA-256 artifact manifest |

## Acceptance criteria

| Criterion | Result and direct evidence |
| --- | --- |
| AC1 Import in main pane | PASS at 1440, 1024, 768, 390 × 1000. Bounding-box assertions compare real main/topbar/sidebar edges, not hardcoded widths. `evidence/test-results/browser.json`; `evidence/screenshots/import-{1440,1024,768,390}.png` |
| AC2 Resume/review/controls | PASS real NewPatientFlow → DischargeImportModal → IntakeWorkspace, draft field initial value, edit, immediate navigation/save, reopen, reload, review bounds, plus live resizing to all widths at 720 height and reachable back/save control. Resumed screenshots and adversarial JSON |
| AC3 Navigation/a11y | PASS page region has no aria-modal/overlay, replaced main content inert then restored, navigation works, true confirmation traps keyboard focus and blocks physical background navigation, Escape dismisses only confirmation. Cold lazy fallback and API-opening exit/reopen leave zero inert nodes |
| AC4 Existing state/security | PASS scoped diff review, existing unit tests, fixture version assertions and saved value after reload. Rejected save blocks navigation and retains input; retry succeeds. No patient creation, endpoint/schema/auth/provider change |
| AC5 Independent evidence | PASS independent full test suite/build/browser, screenshots, HTML index, traces, videos, artifact hashes; zero unexpected console/page/HTTP errors. Explicit expected synthetic 422 exception described below |

## Direct evidence and commands

Working source: `/workspace/clinicos-bugs-506-507`. Node `v22.23.4`, installed dependency tree reused; no npm install/ci. System Chromium `/usr/bin/chromium`.

- `frontend: node ../node_modules/typescript/bin/tsc --noEmit` → exit 0 (`logs/tsc-noEmit-final.log`).
- `frontend: VITE_API_URL=http://127.0.0.1:5196/__fixture_api npm run build` → exit 0 (`logs/build.log`); existing advisory large-chunk/plugin timing notices, no build errors.
- `frontend: npm test` → 1560 tests PASS, 0 FAIL (`logs/full-frontend-tests-final.log`). Only tracked `backend/src` sparse paths were added for existing pure cross-workspace test helpers; no backend execution, env, database or edits.
- `node --import tsx e2e/issue506-workspace.mjs` with private QA_EVIDENCE_DIR → 4/4 PASS (`logs/browser.log`, `evidence/test-results/browser.json`).
- Private `adversarial-probes.mjs` → 4/4 PASS (`logs/adversarial-final.log`, `evidence/test-results/adversarial.json`).
- Private `cold-lazy-probe.mjs` → 1/1 PASS (`logs/cold-lazy.log`, `evidence/test-results/cold-lazy.json`). It removes only the fixture preload import from the network response, then delays the actual production lazy module; no application source rewrite.
- Private `baseline-probe.mjs` → authentic original covering-shell behavior reproduced (`logs/native-baseline-resolved.log`, `evidence/test-results/native-baseline-geometry.json`).

### Saved-write negative probe

The exact draft PATCH is deliberately fulfilled with HTTP 422 and a synthetic rejection string. The error alert is visible, the field still equals `Ada QA conservata`, navigation count stays 0 and the page stays open; the fixture retains the old server value. On a successful retry, the page closes, navigation count becomes 1, the saved field equals the edit and survives reload. This is an expected negative case, not an ignored network failure. One expected Chromium console resource error and one expected HTTP 422 are retained in raw results. No other error is accepted. Screenshot: `evidence/screenshots/rejected-save-retained-input.png`.

### Native baseline proof

`git archive` extracted the actual baseline frontend into `native-baseline`. All 928 tracked frontend blobs match native Git object hashes (`native-baseline-source-check.json`). Only the identical synthetic shell files and a private Vite config/cache were added. No synthetic before-CSS or app source changes. Original import box at x=0,y=0 overlaps original sidebar/topbar; fixed import starts at actual main/topbar bounds. Compare `evidence/screenshots/native-baseline-original-import-covers-shell.png` with `evidence/screenshots/import-1440.png`. Baseline trace/video are included.

## Artifact integrity and visual inspection

`evidence/playwright-report/index.html` is an honest custom-runner HTML evidence index, not a fabricated native Playwright Test report. `evidence/test-results/` contains recorded assertion outcomes. `media-integrity.json` maps each of the 10 scenario videos to its exact path/hash and contains independent ffprobe metadata and complete ffmpeg decode results; all PASS. All 10 trace ZIPs pass full CRC checks. Screenshots viewed directly: desktop import, mobile resumed draft, tablet review, save-rejection retained field and authentic baseline. Video contact sheets for desktop/mobile/save retry/cold loading are under `evidence/media-review/`; mobile and save retry sheets were viewed. Text and main-pane boundaries are readable; shell is explicitly synthetic and its bare QA navigation controls are visible in result shots.

Artifact SHA-256s: `artifact-hashes.json`. Structured verdict and completion seal: `result.json`, `STOP.json`.

## Preserved failed setup attempts

No application-source repair occurred during QA. These failures remain attributable and are excluded from passing counts:

1. First build launch raced the creation of the private log directory; no build ran. Relaunch passed.
2. First tsc command incorrectly used frontend/node_modules; `logs/tsc-noEmit.log` records missing compiler module. Correct installed parent path passed.
3. First broad suite lacked six tracked backend pure helper modules in sparse checkout: `logs/full-frontend-tests.log` (6 failures). Authorized sparse add and full rerun passed all 1560.
4. First private adversarial attempt had three harness faults: duplicate banner/alert selector, a fresh-session review fixture returning document state, and an incorrect save/back control label. `attempt1/adversarial.json`, `attempt1/adversarial.log`, and retained media record them. Exact selectors/fixture/control labels corrected privately; 4/4 rerun passed.
5. Two baseline setup attempts could not resolve Babel from the private Vite config directory; adding a private dependency symlink and restarting the baseline-only server cleared its cached resolution failure. Logs and media are retained in `attempt1`, `attempt2-baseline`, `logs/native-baseline*.log`, `logs/baseline-vite.log`. Final native source reproduction passed.

## Limits

This validates actual production components and CSS with an isolated synthetic shell, synthetic job/draft API state, and real browser rendering. It does not claim full authenticated App/backend integration, real sidebar menu contents, live OCR/provider correctness, real server persistence/authorization, deployment or patient creation. Reload persistence is the explicit fixture server-state test. Default true-modal behavior is covered by existing full tests and runtime nested confirmation; appointment workflow itself was not opened end-to-end. No PHI or external clinical traffic was used. No commit/push/issue/PR/canonical-state mutation was performed by this QA session.
