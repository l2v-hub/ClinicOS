# Independent QA — original GitHub issue 416

Final Decision: BLOCKED

Reason: original AC3 requires touch on the actual intended device with hands in realistic conditions. No such external evidence exists. Coarse-pointer/touch browser emulation is software evidence only. No clinical, physical-device, operator, glove or WCAG-AA certification is claimed. No GitHub mutation, commit, push, merge, deployment, promotion or closure was performed.

## Independent inputs

Original issue/comments fetched afresh: `issue-source.json` (open; comments empty). Candidate application commit `a57cffe6337929f4021913d7b319a85e5feef9f8`. QA checkout C:/w-416-qa is application-read-only, detached, with existing unrelated launcher modifications preserved. Exclusive serialized browser lane; no new backend/server.

Build/test physical source: `e814a23f6ff352f2359c4fe78f1332b0cf4296228935330a0e64d121a3e0f185`, 1455 inputs, unchanged `before/source-receipt.json` vs `after/source-receipt.json`.

Actual browser SPA served from C:/w-416 port7478 physical source: `c27747cce4221c33a65ba7bd2045772ba7d2c83b189e9b7e171a9e54b603c4a9`, 1455 inputs, unchanged `server-before/source-receipt.json` vs `server-after/source-receipt.json`. `source-mapping.json` independently checks every input against candidate Git blobs: all canonical content identical, 11 files differ only CRLF/LF. Distinct physical hashes are not conflated.

Accepted415 application baseline `0d7adc361b92c8466655d9ed830d2b87bbd0f419`; proof/server checkout `82920e256904b8a967ecb343cc19add281f58ed0`, application paths unchanged relative to accepted source, port7477. Baseline physical source `6be776fab17aae587589b039db30f5df3be8d6a8e7910cfd5be6f0863b3b6902`/1453 inputs, `baseline-source/source-receipt.json`. This baseline is not falsely attributed to the historical live audit revision.

## Criteria and gate phases

| Criterion/phase | Result | Evidence |
|---|---|---|
| Contract | PASS | `task-contract.md`; original issue fresh; absolute contract validation passed |
| Diff review | PASS scoped | `reviewed-diff.patch`; all12files inspected, layout/text/bounded header metric only; original handlers and clinical/API/auth/schema/dependencies unchanged |
| Build/types | PASS | `commands/frontend-types.log`, `backend-types.log`, `frontend-tsc-build.log`, `vite-build.log` |
| Focused tests | PASS66/66 | `commands/focused.log` |
| Supplemental SSR | PASS4/4 with QA-only loader | `commands/catalog-ssr-with-vite-url-stub.log`; URL loader only that invocation |
| Normal full regression | NOT globally clean; no new failures | 1219tests/1207pass/12fail, exactly same12as pinned415proof; `commands/full-regression.log`, `command-results.json` |
| AC1 software frequent target goal | PASS finite inventory | 455main measured control instances min44×44; 22additional PAINAD workspace controls. `browser-second/test-results/geometry.json`, `form-inventory-second/test-results/results.json` |
| AC2 bounds/separation/focus | PASS software inventory | 38nonoverlap groups,476native focus records, edge-midpoint hits; native Tab/Shift+Tab, Enter/Space/Escape; dynamic wrapping header145↔64 measured and focus unobscured; `browser-second/`, `adversarial/` |
| AC3 actual device/realistic hands | EXTERNALLY UNVERIFIED | No evidence; emulation cannot pass this criterion; keeps overall BLOCKED |
| AC4 interpretation | PASS | contextual44goal, not blanket WCAG-AA failure; unchanged native paper radio26px documented as whole-cell choice, no invented operator-validated44equivalence |
| Security/privacy | PASS scoped; broad baseline findings retained | independent source/newdist zero-secret scan `commands/security-scan.log`; synthetic guards before navigation; no unexpected/external/domain writes or console/page/HTTP failures. `security-review.json` independently compares previously generated broad481findings/7dependency findings unchanged/0touched; broad scanner not independently rerun and not globally clean |

## Browser coverage and final-result artifacts

`browser-second`: 24PASS scenario groups in 7contexts — nurse1150×1004,1280×720,390×844coarse emulation,1280×720coarse emulation; supervisor1150×1004,1280×720,390×844coarse emulation. Both roles explicitly exercised patient roster/open-delete geometry/search-clear, chart portal/header/navigation/inline edit-cancel/print dialog, catalog/history/textual creation,413firstPAINADradio keyboard focus and local draft/history/reload/resume. Supervisor additionally exercised rooms actions/edit fields/bed dialog. Inactive roving tabs intentionally tabindex=-1, arrow-navigation tested, not incorrectly required in sequential Tab order. All7contexts report zero console/page/HTTP errors, unexpected routes, external traffic and patient/domain writes. Synthetic simulator auth and read-only POST patient search are fulfilled, not sent to live backend. Saves/deletions were not dispatched; local draft recovery tested, no backend persistence claim.

- Main screenshots: `browser-second/screenshots/{nurse,supervisor}-<viewport>-{roster,chart,draft,catalog,rooms}-result.png` (only applicable roles/viewports; exact existing paths enumerated in manifest).
- Representative results: `browser-second/screenshots/nurse-1150-chart-result.png`, `supervisor-390-coarse-rooms-result.png`, `supervisor-390-coarse-draft-result.png`.
- Main traces: `browser-second/<role>-<viewport>-trace.zip`; videos `browser-second/video/*.webm`; HTML `browser-second/playwright-report/index.html`; raw results/geometry `browser-second/test-results/`.
- Adversarial resize/header/focus and emulated edge-taps: `adversarial/screenshots/resize-2-native-focus.png`, `coarse-edge-clear-result.png`, `adversarial/adversarial-trace.zip`, `adversarial/video/adversarial.webm`, `adversarial/playwright-report/index.html`, `adversarial/test-results/results.json`. Route cleanup restores unrelated dashboard coarse40px token.
- Active PAINAD non-choice action/field measurements: `form-inventory-second/screenshots/painad-form-false.png`, `painad-form-true.png`; traces `form-false-trace.zip`,`form-true-trace.zip`; video/HTML/results within same directory. Native underlying radios remain unchanged and excluded from44claim.
- Independent BEFORE accepted415 results: `baseline-browser/screenshots/baseline-{roster,chart,workspace}.png`, `baseline-trace.zip`, `video/baseline.webm`, `playwright-report/index.html`, `test-results/results.json`: roster/header36px and workspace36px vs candidate44px actual SPA.

All artifact paths are relative to this report directory. HTML reports are assertion-generated static reports, not a falsely claimed Playwright test-runner report. Playwright context traces/videos capture actual SPA. Screenshots visually inspected for mobile chart painted focus and supervisor room results. Scripts and command/exit logs included; `qa-commands.mjs` records actual test invocation inputs. Every file sealed in `evidence-manifest.json` with exact relative path, byte count and SHA256; manifest itself excluded.

## Preliminary failures and limits

`preliminary-attempts.md` discloses both retained browser harness failures and contract argument error. `browser-first/` and `form-inventory/` preserve evidence; final passes did not overwrite them. No candidate app repair was made. Normal full-suite SSR ?url failure persists outside the separate4-test loader invocation. Broad baseline481security findings/7dependency findings remain. No whole-repository clean/test/security claim, no hardware acceptance, no production data writes. No application changes were made by QA.

The QA-gate, Playwright-evidence and quality-loop skills required independent source-bound checks, retained evidence and acceptance-based verdict. Root may integrate/copy the sealed bundle and independently rerun it, but may not convert AC3 into PASS or close416 on emulation alone. Browser lane and artifact ownership are explicitly released after manifest verification.

Codex must now re-run the QA Gate.
