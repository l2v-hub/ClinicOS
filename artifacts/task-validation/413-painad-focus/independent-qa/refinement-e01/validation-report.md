# Issue 413 independent QA — final refinement-e01

Final Decision: READY FOR CODEX QA

Application `e01bd55114e2b5b1615b4088d988a41aad60eb80`; accepted baseline `3790a95b7c0c09b388ffbaeb7c71fe09d80a1c56`. Source SHA-256 `b1bf67f6ae4357cc76015a39879eebb342669836f3c01ae1937add0674e347c8`,1448 inputs identical pre/post receipts. Six-file frontend-only diff independently reviewed,including latest resumableDrafts filtering. All original four criteria read directly from GitHub #413; zero comments at initial independent read. Root remains sole application writer; this agent writes only current QA evidence subtree. No deployment/GitHub or production patient operations.

| Area | Test | Esito | Evidenza |
|---|---|---|---|
| Contract | Four original criteria and PAINAD-only scope | PASS | ../../task-contract.md |
| Diff | Entire six-file change + follow-up error reveal and all-active-view resume filter | PASS | this report; pre/source-receipt.json; post/source-receipt.json |
| Build/types | frontend/backend noEmit;frontend tsc build;Vite build | PASS | commands/frontend-types.log; commands/backend-types.log; commands/frontend-tsc-build.log; commands/vite-build.log |
| Focused | SSR/default compatibility/clinical labels/drafts/version/lazy guards | 38/38 PASS | commands/focused.log |
| Full suite | Immutable accepted #412 proof553dbd83 comparison | 1206 total,1194 PASS,12 exact baseline failures,0 NEW; not globally green | commands/command-results.json; commands/full-regression.log |
| AC1 | First radio focused with exact accessible name and first rowheader in viewport desktop1150x1004/mobile390x844; one contextual patient identity | PASS | browser/test-results/browser-results.json; browser/screenshots/desktop-first-question.png; browser/screenshots/mobile-first-question.png |
| AC2 | No redundant selected-draft resume in editing AND preview;inactive resume and local reload preserved | PASS | browser/test-results/browser-results.json; adversarial/test-results/adversarial-results.json; browser/screenshots/preview-full-source-sheet.png; adversarial/screenshots/inactive-draft-retained.png |
| AC3 | Sticky actions/progress unobscured start/end,tablet820x1180 midpoint;no horizontal overflow | PASS | browser/test-results/browser-results.json; adversarial/test-results/adversarial-results.json; browser/screenshots/*persistent-actions.png; adversarial/screenshots/tablet-midpoint.png |
| AC4 | 15 validated choices/source definitions/engines/versions unchanged;0..5 partial versus complete never auto-finalized;read-only full source defaults;explicit preview after simulated validation failure | PASS | commands/focused.log;source receipts;browser/test-results/browser-results.json |
| Failure paths | Empty required date hidden in metadata exposed/focused/unobscured on save and preview desktop/mobile;zero write/error,answers retained | PASS | adversarial/test-results/adversarial-results.json;adversarial/screenshots/*date.png |
| Security | Scoped source/dist secret scan;no new raw HTML/logging/auth/transport/storage/deps/config changes;synthetic API interception only | PASS touched scope | commands/security-scan.log;source receipts;browser/adversarial results |

## Independent additional coverage

Ordinary real SPA suite9/9 PASS (includes newly added preview no-resume assertion); independently extended adversarial suite4/4 groups PASS:tablet bounds,invalid-save date,invalid-preview date desktop/mobile,and draft lifecycle preview→editing→close→new empty→resume earlier saved draft. The lifecycle proves removing selected-key action does not remove other drafts: zero resume while selected sole draft is edited/previewed;one inactive resume after closing;new draft0/5 while saved inactive retained;resume saved restores5/5 while the new inactive draft remains available. One synthetic saved draft response,no finalization. This catches the root's AC2 preview finding without relying only on a zero-button count that could hide all drafts.

The conditional `resumableDrafts` filter only removes selected PAINADkey;all other modules preserve previous list logic,legitimate version-conflict actions unchanged. Definitions/engines/clinical version/client/draft store/backend unchanged against accepted3790;read-only/other scale SSR output guards remain PASS. Native invalid handling and reportValidity preserve required constraints and reveal metadata rather than changing save/preview semantics.

## Frozen earlier evidence and correction

Preserve prior manifests:2097 failed31 artifacts;87 failed35 artifacts;15 READY38 artifacts. The prior15 READY verdict is **superseded** by the root's additional AC2 preview finding,not relabeled in-place as FAILED. Current e01 proves that finding resolved. Every prior manifest-listed raw file hash checked unchanged. The earlier87 report's pre/post identical sentence is explicitly corrected in the15 report:87 post attempt intercepted moved HEAD and was not a valid post receipt. Current e01 has actual pre/post identical receipts before lane release. No old report/manifest was rewritten.

## Safety and residual limits

Actual source SPA on root-owned7475 server,all API requests fulfilled synthetic at3001;external origin guard rejects unexpected hosts. No real PHI or original audit images used. Screenshots visually inspected: only Persona Sintetica/operator/QAidentifiers. Normal browser suite two simulated draft save attempts (one expected400);adversarial lifecycle one successful in-memory draft-save response;invalid metadata paths zero assessment writes;zero finalizations. Local sessionStorage real reload verified,not DB persistence. No relevant unhandledHTTP/console/page errors. Expected synthetic400 isolated explicitly in normal suite;remaining transports/errors asserted empty.

Source/dist secret scanner PASS and independent diff security checklist PASS;known project-wide481 security findings/7 dependency findings require root final source-bound baseline-delta receipt,not a globally clean assertion. No screen-reader/hardware-light claim. No backend/schema/AuthZ/dependency/config modifications. Root still must rerun frozen QA,verify compiled deployment and publish sanitized commit-pinned evidence before issue closure.

All browser contexts/process closed;root7475 server retained. Runnable independently authored additional suite: `node --import tsx artifacts/task-validation/413-painad-focus/independent-qa/refinement-e01/adversarial-browser.mjs <out>`;optional QA_FIXTURE_MODULE chooses guarded online helper. Evidence includes browser/ and adversarial/ HTML report/raw results,traces,screenshots and videos. No further QA writes after final manifest handoff.

Codex must now re-run the QA Gate.
