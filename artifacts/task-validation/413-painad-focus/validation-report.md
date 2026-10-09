# Issue 413 — PAINAD first question and persistent compilation actions

## Final Decision

CLOSED — VERIFIED

Local acceptance and fresh independent QA passed for application `e01bd55114e2b5b1615b4088d988a41aad60eb80`, baseline `3790a95b7c0c09b388ffbaeb7c71fe09d80a1c56`. Exact raw source SHA-256 `b1bf67f6ae4357cc76015a39879eebb342669836f3c01ae1937add0674e347c8` over 1448 inputs, identical before/after both sessions. Six frontend paths only; clinical definitions/engine/version, backend/API/schema/auth/config/dependencies unchanged. The dirty primary checkout and unrelated launchers are preserved. Root is the sole application writer and release authority under the direct user authorization; QA and Ruflo ledger do not authorize promotion.

| Area | Test | Esito | Evidence |
|---|---|---|---|
| Contract | Four original GitHub acceptance criteria, full scoped diff | PASS | task-contract.md; issue-source.md; implementation-receipt.md |
| Types/build | frontend/backend noEmit;frontend tsc build;Vite build, independently repeated | PASS | root-refinement-e01/commands/command-results.json; independent-qa/refinement-e01/commands/command-results.json |
| Focused | SSR compact/default compatibility,15 option labels,partial/complete/locking,drafts/versions/lazy guards | 38/38 each PASS | both commands/focused.log |
| Regression | Full frontend suite against accepted412 | 1206 total;1194 PASS;12 exact baseline failures;0 new | root-refinement-e01/commands/full-regression.log; commands/command-results.json in both sessions |
| AC1 | First named Respiration control focused and visible desktop1150x1004/mobile390x844, contextual identifier retained | PASS local | root-refinement-e01/browser/test-results/browser-results.json; independent-qa/refinement-e01/browser/test-results/browser-results.json; both browser/screenshots/*first-question.png |
| AC2 | No selected-draft resume in editing OR preview; inactive saved draft survives close/new/resume and reload | PASS local | both browser/test-results/browser-results.json; both adversarial/test-results/adversarial-results.json; adversarial/screenshots/inactive-draft-retained.png |
| AC3 | Named actions/progress unobscured start/end,tablet820x1180 midpoint;no horizontal overflow | PASS local | both browser/adversarial result JSONs; screenshots/*persistent-actions.png; adversarial/screenshots/tablet-midpoint.png |
| AC4 | Definitions/engine/version byte-bound unchanged;15 choices identical;0..5 partial versus complete;preview full read-only source sheet | PASS local | both source receipts;focused logs;browser results and screenshots/preview-full-source-sheet.png |
| Failure paths | Empty required date collapsed: Save and Preview reveal/focus visible invalid field with zero write;answers retained | PASS local | both adversarial result JSONs and screenshots/*date.png |
| Independent gate | New dedicated QA,43 raw artifacts verified;root reran38focused+9ordinary+4adversarial groups | READY FOR CODEX QA / root PASS | independent-qa/refinement-e01/validation-report.md; immutable-manifest.json; release-gate-receipt.json |
| Security | Scoped source/dist secrets scan;no PHI/auth/transport changes;full481 findings/7dependency findings unchanged;0 touched findings | PASS touched scope only | security-receipt.json;both commands/security-scan.log |
| Deployment | Main/source branch push e01;exact provider Git SHA/READY/alias/assets;compiled online guard | PASS dpl_7zpdzhFSHXYrkidnZSsu6Rgrs3mz READY,13/13 compiled browser groups | deployment-receipt.json;release-gate-receipt.json;root-refinement-e01/online-verified/test-results/browser-results.json;root-refinement-e01/online-extra-verified/test-results/adversarial-results.json |
| CI | Source-bound comparison with accepted412 broad backend failure | Secret scan PASS;exact same1 backend failure;0new;downstream skipped | ci-comparison.json; candidate37920045885;baseline37913741797;frontend secret scan37920045898 |

## Runnable evidence

The helper intercepts every API request before the network with synthetic Persona Sintetica/operator DTOs. Only the actual local SPA or public compiled static frontend is loaded; no real patient writes or original audit images. Normal suite has two in-memory draft POST attempts including a deliberately expected400, then explicit preview; the separate lifecycle suite has one in-memory draft POST. No finalizations. Invalid-date paths send zero writes. Expected400 is isolated explicitly; all remaining console/page/relevant HTTP/unexpected origin/domain-write arrays asserted empty. Reload proves local sessionStorage, not database persistence.

Root commands `qa-commands.mjs`, actual SPA `qa-browser.mjs`, independently authored rerun `qa-extra-rerun.mjs`, guarded public compiled helper `qa-online.mjs`. Artifacts include screenshots,trace ZIPs,HTML reports,raw JSON,webm videos under each root/independent browser/adversarial directory. Source receipts: root-refinement-e01/source-before and source-after; independent-qa/refinement-e01/pre and post.

## Preserved rejected/superseded iterations

Initial2097 failed hidden required date native focus. Refinement87 fixed Save but failed type-button Preview validation. Refinement15 obtained independent READY, then root visual compiled-online review found redundant resume in active preview and rejected closure. e01 resolves that additional AC2 finding. Preserve earlier31+35+38 manifest-listed files unchanged; final manifest43 verifies all their raw hashes. The87 post-source attempt was invalid after HEAD moved; that inaccurate old report sentence is explicitly corrected by later reports, not rewritten. e01 has actual identical pre/post receipts before QA lane release.

## Release limits

No globally green suite/security/CI claim. Twelve frontend baseline failures and the single broad backend CI failure are unchanged;exact-source online verification passed. No hardware/light/screen-reader certification. Backend accepted409 remains unchanged. Pending405/408/410 source excluded. Root visually inspected all four selected compiled-online synthetic screenshots including the preview without redundant resume. The original four AC pass source/independent/root/online gates. This decision authorizes scoped closure, not a claim that GitHub was closed before publication: the publication script still credential-scans selected files and ZIP members, separately hashes canonical Git blobs versus local text EOLs, verifies four commit-pinned public screenshots, comments on the original issue, closes it and verifies the resulting state;selected remote receipt follows. No issue413 was closed for earlier2097/87/15 candidates.

Published browser artifacts are under root-refinement-e01/online-verified and online-extra-verified,including screenshots,trace ZIPs,HTML report,raw JSON and videos. Thirteen compiled-online groups passed. Every actual deployed demo-backend request was fulfilled synthetically before network. The raw public index/chunks are200 and both Vercel provider Git SHA fields equal e01; the alias resolves to that READY production deployment. No backend413 change or production patient test mutation.
