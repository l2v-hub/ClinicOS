# Independent QA2 validation report

**Verdict: READY FOR CODEX QA**

Code: `3f1311dbdf2bc17d2ae5a1ec42e8adb4ea9ba94b`; base: `995e2ff6d14a96b5d67e0d14d708f4a95c4c816f`.
QA nonce: `e26aaa1a-0d6a-4cea-a582-ab66a5a9cdda`; pre-session canonical reservation: `592892e55d314fdb355b8b4986a53701360d80c8`. One dedicated independent session; no additional agent/model session was started.

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS | task-contract.md; logs/contract.log. Canonical reservation and bounded task handoff supplied criteria; no network issue fetch was permitted. |
| 1 Full diff review | PASS | complete.diff; findings.md; exactly six reserved files; Git diff check clean. All source hashes match before and after; frozen author source also matches. |
| 2 Relevant tests | PASS | logs/pipeline-tests-complete.tap: 1,666 tests, 1,663 PASS, 0 FAIL, 3 Windows SKIP. logs/focused-tests.tap: 26 PASS. Independent extra results below. |
| 3 Safe internal Playwright | PASS | screenshots/result.png; trace/trace.zip; playwright-report/index.html; test-results/playwright.json. 16 actual fixture rows, memory values, reload and disk rehydration, 0 console/page/HTTP errors, 0 external requests. Screenshot visually inspected; trace ZIP integrity PASS. |
| 4 Security | PASS | Checklist below; synthetic fixtures only; no new production surface or dependencies. |
| 5 Verdict and sealed evidence | READY FOR CODEX QA | result.json; artifact-manifest.json; seal.json. |

| Acceptance criterion | Result | Actual evidence |
|---|---|---|
| Baseline RED / candidate GREEN above old 64 KiB cap | PASS | Real synthetic child: 80 KiB progress fails baseline; candidate reads separate valid typed result after 82,005 stdout bytes with 32,768 captured. test-results/independent.json. |
| Total, stderr, timeout, process groups and default prefix | PASS | Exact 2,097,152 stdout / 65,536 stderr boundaries accept; +1 independently fails. Focused suite proves timeout descendant marker never appears and default prefix/full under-limit contract remains. |
| Capture memory and byte handling | PASS | 32,768 visible/backing helper probe; 54 allocation transitions; real runner two streams total 65,536 captured and 32,768 backing each; discarded synthetic marker unreachable from retained backing. Zero capture, small limits and split multibyte accounting pass. test-results/memory-extra.json. |
| Typed-result/input guards unchanged | PASS | Nine negative missing/empty/malformed/oversized/symlink/schema cases; prompt serialization/size/cwd negatives; full existing regular-path/runtime/schema tests. Separate result maximum remains 256 KiB. |
| Finite privacy diagnostics and collector | PASS | Invalid/unknown byte counts become null; exact finite field assertions exclude raw synthetic markers; callback error cannot change success; actual extracted CLI callback retains last 64 of 100 events. |
| Capacity fallback without source false positives | PASS | Terminal event selects delegate → senior → delegate after expiry. Four extra adversarial source/tool forms retain next delegate choice; corrected routing tests prove actual later selection and no automatic retry. test-results/classifier-extra.json. |
| Scope/invariants | PASS | 30-minute model timeout, process-group kill, CLI/auth/provider/retry flags, typed-result guards unchanged. No workflow/release/ownership/frontend changes. |

Security checklist: secrets/PHI PASS (synthetic fixture markers only); logging PASS (finite fields, no raw source/provider/clinical text in model diagnostics or failure message); bounded inputs PASS; AuthZ PASS (no auth or route changes); injection/XSS PASS (escaped local QA HTML); dependencies PASS (none added); configuration PASS (no weakened auth/CORS/prod flags). QA HTML exists only in this evidence directory and is never served by the application.

Commands and counts: commands.txt. QA scripts are copied under evidence-scripts/. Node v22.23.4, Chromium 154.0.8037.57, installed Playwright via `/workspace/ClinicOS/node_modules/playwright`, system Chromium with `--no-sandbox` for the isolated synthetic report. Browser reload rehydrates the static report from disk; no application persistence is claimed. Video is optional for this internal source change and was not attempted. No app/database/shared runtime was used. Existing suites create local synthetic Git fixture repositories only; no source/shared Git mutation occurred.

Limits: no frontend build/typecheck, native Windows run, remote exact-head CI, provider inference, API call, clinical replay, publication, actual Claude review, final Codex gate, merge, or release validation is claimed. Three Windows-native tests are explicitly skipped. Existing clinical failure `40249337703` exact cause and unknown attempts remain unknown. Context qualification `40251755127` success was not rerun; current managed CLI API401 is separate and no user key/billing action is inferred. Native selected-default Git fast-forward was prior context, not exercised here. Imported-history publication and code-bound remote validation remain coordinator-owned and pending. QA1 failure and author2 failed-run evidence remain preserved.

Final Decision: READY FOR CODEX QA
