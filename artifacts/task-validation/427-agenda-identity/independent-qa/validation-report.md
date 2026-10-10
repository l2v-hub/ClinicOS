# Independent QA #427

Verdict: READY FOR CODEX QA

Application: 7680ec0b25c61de5745f296d91e370b575de9c00; base30e8023e8b88dcd8b5e40544f1597ee0c046a41c. Root retains sole publication gate. No GitHub, commit, deployment or application writes by this session.

| Phase / original AC | Result | Evidence relative to this folder |
|---|---|---|
| 0 Original issue and comments / valid contract | PASS | original-issue.json (comments empty), task-contract.md, qa-assignment-policy.md |
| 1 Full diff / scope / patterns / hygiene | PASS | diff-security-review.md |
| 2 Independent types/build/focused | PASS | commands01/command-results.json, all corresponding logs: frontend/backend types, frontend tsc build, actual Vite build, focused10/10 |
| 2 Full regression | SAME ACCEPTED BASELINE ONLY | commands01/full-regression.log and command-results.json:1271total1259pass12exactnamedacceptedbaseline0new; not globally green |
| AC1 identity vs activity | PASS | browser02/test-results/browser-results.json: names in all three admin views, hidden computed identity dots, zero aggregate border width;11actual palette operators repeat blue without semantic identity paint |
| AC2 all states beyond color / surface alignment | PASS | browser02 normal/grayscale day-week-month screenshots and computed values; values01 exact synthetic patient/operator/state text, HMI unchanged day backgrounds |
| AC3 empty/populated/loading hierarchy | PASS | browser02 empty all views both viewports; loading-hierarchy.png with held synthetic GET and explicit loading text, no false empty-day claim; real filter caption/count + legend |
| AC4 multiple operators/mixed states/grayscale | PASS SOFTWARE ONLY | browser02 30groups and values01 6groups,1280x720/390x844; same-operator mixed states, same-state other operators, all text identical in grayscale and changed hierarchy bounds within viewport |
| 4 Healthcare security | PASS | diff-security-review.md, commands01/security-scan.log, security01/comparison.json, strict transport guard arrays empty |
| Source integrity / exclusive lane | PASS | source-before.json/source-after.json (1540clean physical inputs, equal raw hashes), server-owner.json/lane-handoff.json exact PID16928/listener7527 stopped; browserLane RELEASED |

Successful evidence: browser02/screenshots/, browser02/trace/desktop-mixed.zip and other trace files, browser02/video/, browser02/playwright-report/index.html; values01/screenshots/, values01/trace/, values01/video/, values01/playwright-report/index.html. Reports are honest Playwright library assertion receipts, not native Playwright Test HTML output. Actual repo SPA/config/compiler; read-only fixture transport before wire; no real data/DB persistence proof claimed or required.

Frozen recipes in recipes/, browser-plan.json selects exact30+6successful cases for root replay. browser01 failure bundle and original recipes retained with navigation-incident.md: initial mobile navigation omitted native menu opener; no assertions were weakened or application changed. Missing mobile failure trace from that initial pre-return setup is explicitly disclosed; successful replacement has full trace/video/screenshot.

Limitations: no physical intense-light/touch/gloves/assistive-device acceptance; no production closure, deployment, CI, canonical-publication verification by this session. Those remain root release gates. Mobile narrow month-grid wrapping is inherited and outside this identity-semantic scope.

Codex must now re-run the QA Gate.
