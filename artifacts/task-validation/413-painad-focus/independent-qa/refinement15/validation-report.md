# Issue 413 independent QA — accepted candidate

Final Decision: READY FOR CODEX QA

Application `15db02a896bab963479cd99dea695ef09e1d8c72`; accepted baseline `3790a95b7c0c09b388ffbaeb7c71fe09d80a1c56`.
Source SHA-256 `0c2c66809aa192bc38f0377e6a49eac80b92d749a2b195f8295784b1e96aa8eb`,1448 inputs identical pre/post. Sole root application writer; QA evidence only, serialized real SPA browser at localhost7475. Read GitHub #413 directly: original four AC, zero comments. Entire six-file baseline diff reviewed plus each subsequent fix.

| Area | Test | Esito | Evidenza |
|---|---|---|---|
| Contract | Four original AC; PAINAD-only interactive scope | PASS | ../../task-contract.md |
| Diff | Six frontend files, unchanged backend/schema/auth/transport/clinical definitions | PASS | pre/source-receipt.json; post/source-receipt.json |
| Build | frontend/backend noEmit,frontend tsc build,Vite build | PASS | commands/frontend-types.log; commands/backend-types.log; commands/frontend-tsc-build.log; commands/vite-build.log |
| Focused | SSR/default compatibility/validated choices/draft persistence/version guards | 38/38 PASS | commands/focused.log |
| Full regression | Baseline #412 proof553dbd83 comparison | 1206 total,1194 PASS,12 exact baseline failures,0 NEW; not globally green | commands/full-regression.log; commands/command-results.json |
| AC1 | Startup focused first radio with exact accessible question name and question-header bounds desktop1150x1004/mobile390x844; single visible patient identity | PASS | browser/test-results/browser-results.json; browser/screenshots/*; browser/desktop-trace.zip; browser/mobile-trace.zip |
| AC2 | Active Bozza in modifica; no redundant resume; inactive local resume and reload answers retained | PASS | browser/test-results/browser-results.json |
| AC3 | Sticky action/progress visible/hit-test unobscured start/end; tablet820x1180 midpoint; no horizontal overflow | PASS | browser/test-results/browser-results.json; adversarial/test-results/adversarial-results.json; adversarial/screenshots/tablet-midpoint.png |
| AC4 | 15 validated choices unchanged,0..5 partial versus complete not final,immutable source definition/engine/version paths,explicit read-only preview after simulated save failure | PASS | commands/focused.log; pre/source-receipt.json; browser/test-results/browser-results.json; browser/screenshots/preview-full-source-sheet.png |
| Failure boundaries | Hidden empty required datetime revealed/focused/unobscured on Save; preview blocked and field revealed desktop/mobile; responses retained,no finalization/no requests/no console error | PASS | adversarial/test-results/adversarial-results.json; adversarial/screenshots/invalid-save-date.png; adversarial/screenshots/desktop-invalid-preview-date.png; adversarial/screenshots/mobile-invalid-preview-date.png |
| Security | Secrets scanner on source/dist; escaped React identity/operator strings; no new logs/raw injection/API/storage/dependency/config changes; all API guarded synthetic | PASS touched scope | commands/security-scan.log; source receipts; browser/test-results/browser-results.json; adversarial/test-results/adversarial-results.json |

## Independent tests and findings resolved

Original ordinary browser suite independently rerun:9/9 PASS. Additional independently authored adversarial suite:3/3 groups PASS (four contexts:tablet,invalid-save,desktop invalid-preview,mobile invalid-preview). Native invalid capture now opens closed metadata,focuses/scrolls existing required input. Preview invokes reportValidity before its existing action: constraints remain unchanged and explicit finalization is never bypassed. Fifteen clinical radio labels/options unchanged; read-only and other scale default SSR rendering unchanged.

Earlier first candidate2097e059 was rejected for hidden required input on save with browser error. Refinement87 was rejected for hidden invalid date on preview action. Failed evidence manifests31 and35 remain immutable for audit; current report supersedes both decisions, not their files.

Correction to refinement87 report: its sentence claiming identical pre/post source receipts was premature. Post-receipt call failed because root had moved HEAD to15db after the early QA failure/lane release; there is no valid87 post receipt. This correction is explicit; no87 artifacts were rewritten. The current15db gate has actual identical pre/post receipts before lane release.

## Security and limits

No real patient images or live clinical API data used. All screenshots visually inspected: Persona Sintetica and synthetic operator/identifier only. Requests for API at3001 fulfilled in-memory; external origins rejected. Expected ordinary simulated400 validation error explicitly isolated; all other relevant HTTP/console/page errors absent. No assessment writes in adversarial invalid paths,ordinary flow only two simulated draft save attempts; zero finalizations. Local sessionStorage reload proved,not backend DB persistence. No new route/AuthZ boundary or permission changes. New React text is escaped; no console logging/raw HTML introduced. No dependency/manifests/env/config modifications. Scoped source/dist secret scanner PASS; project-wide pre-existing security/dependency findings remain a separate root release check, not a globally clean assertion.

No real screen-reader or hardware-light test claimed. Read-only/other module compatibility validated in SSR; no clinical content/scoring/backend change. This QA verdict is not authorization to close: root must independently rerun frozen tests,review project-wide security delta,verify compiled deployment and publish sanitized immutable evidence.

Browser contexts/process closed; root server retained. Runnable additional suite: `node --import tsx artifacts/task-validation/413-painad-focus/independent-qa/refinement15/adversarial-browser.mjs <evidence-output>`; optional `QA_FIXTURE_MODULE` selects guarded compiled-online helper. Trace/video/report/raw results exist under browser/ and adversarial/.

Codex must now re-run the QA Gate.
