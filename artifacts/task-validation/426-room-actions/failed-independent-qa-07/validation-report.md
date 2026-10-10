# #426 independent QA

QA Verdict: FAILED VALIDATION

Final Decision: FAILED VALIDATION

Immutable application: 07c3f7d13e8ac99a1af1238ec3661502950f45e3. Baseline: b7ae14d120c1e70ccf72784206a505f8c48f975e. QA checkout C:/w-426-qa assigned before artifact writes; all app source readonly. No commit/push/provider credential reads/deployment/GitHub mutations.

| Phase | Result | Evidence relative to this directory |
|---|---|---|
| Contract/issue/comments | PASS | original-issue.json (original four criteria, comments empty), task-contract.md |
| Full eight-file diff review | PASS except F1 | diff-security-review.md; F1 BedEditDialog.tsx:19 |
| Build/types | PASS | commands01/frontend-types.log, backend-types.log, frontend-tsc-build.log, vite-build.log |
| Focused tests |21/21 PASS | commands01/focused.log |
| Full regression |1264 total /1252 PASS /12 exact accepted baseline failures /0new | commands01/full-regression.log, command-results.json; baseline proof057dc6ca6374203d4a1c86d1e5c4b14b73810d48 |
| Basic browser |6/6 PASS | browser01/test-results/browser-results.json; screenshot/trace/video dirs |
| Supplemental behavior |5/5 PASS | supplemental01/test-results/browser-results.json |
| Long resource exploratory |6 weak assertions PASS, insufficient geometry check; retained transparently | long-labels01/test-results/browser-results.json, screenshots/independent-mobile-long-context.png |
| Strengthened long resource geometry |5 PASS +1 FAIL | long-labels02/test-results/failure.json, long-heading-geometry.json, screenshots/independent-mobile-long-context.png |
| Security/native scan | PASS in scope | security01/comparison.json, commands01/security-scan.log, diff-security-review.md, test-results/network-guards.json |
| Source stability | PASS 1539 files | source-before.json, source-final.json, source-final-verification.json |

| Criterion | Result | Actual proof |
|---|---|---|
| AC1 unique camera/bed accessible names | PASS | Basic two rooms/four beds, repeated A/B; literal custom separator/hostile text in supplemental |
| AC2 coherent full target tooltip/header | FAIL mobile long valid labels | Captured original rename target PASS, exact dialog name PASS, but visible full heading clips at x612.5625 vs390 viewport |
| AC3 distinct deletion + existing confirmation | PASS | Trash/danger/gap16px versus edit, exact confirmation target, cancellation/Escape/focusreturn, noDELETE |
| AC4 guarded desktop/mobile without live deletes | PASS safety / FAIL complete visual result | All API/auth/clinical endpoints intercepted beforewire; no actual writes, live delete or real patient fixture; mobile long context unreadable |

Supplemental tests exercise original IDs for synthetic PUT, all5 bed controls disabled during held409, Escape/busy and retry, exact state after mock-only reload, creation heading nonstale, hostile literal labels and real pixel hit-tests. One controlled409 per supplemental run is expected explicitly; no unhandled console/page/HTTP/network issue. This is mock-only persistence, not database proof. No hardware/actual screenreader certification claimed.

Raw physical source SHA256:727754be110611528df57566099b515e7760a8b287a64ca76f0c010fd380fd8d. All1539 Git blobs match:17 exact physical bytes +1522 strictUTF8 CRLF-only differences. Before/after/final physical arrays identical; app status clean. Parent physical hash is different due CRLF; not relabelled.

Replay from checkout root, fresh output each invocation: node recipes/commands.mjs <output>; node recipes/security.mjs <output>; actual server via recipes/qa-server.mjs with QA_PORT and EV_OUT; browser recipes/browser.mjs, recipes/supplemental.mjs and recipes/long-labels.mjs each with APP_URL and SOURCE_COMMIT. Existing paths are below artifacts/task-validation/426-room-actions/independent-qa. SOURCE_COMMIT is evidence label; assertions use actual SPA. Each browser run serial and all fixture endpoints beforewire. Long-labels02 is the strong required repro; earlier weak run does not override its FAIL.

HTML report: playwright-report/index.html generated directly from every raw library run, honestly not native test-runner reporter. Every screenshot/trace/video preserved, including failed geometry run. Native server PID42176 command/listener verified and stopped; all browser contexts closed. Root must fix F1 in sole writing checkout, freeze a new immutable candidate and obtain fresh independent validation; this failed candidate must not be released.

Codex must now re-run the QA Gate.
