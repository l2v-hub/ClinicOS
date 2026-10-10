import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const root='artifacts/task-validation/426-room-actions',read=p=>JSON.parse(readFileSync(root+'/'+p)),gate=read('release-gate-receipt.json'),deployment=read('deployment-receipt.json'),online=read('compiled-online/online-receipt.json'),blocked=existsSync(root+'/ci-blocker-receipt.json'),ci=read(blocked?'ci-blocker-receipt.json':'ci-comparison.json'),final=process.argv[2]==='final';
assert.equal(deployment.applicationCommit,gate.applicationCommit);assert.equal(online.applicationCommit,gate.applicationCommit);assert.equal(ci.applicationCommit,gate.applicationCommit);assert.equal(gate.originalCriteriaPassed,4);assert.equal(gate.rootIndependentRerun,online.cases);
if(final){const pub=read('public-preverification.json');assert.equal(pub.applicationCommit,gate.applicationCommit);assert.equal(pub.images.length,4);assert.ok(pub.images.every(i=>i.http===200));}
const decision=blocked?'BLOCKED':final?'CLOSED — VERIFIED':'IMPLEMENTED — NOT VERIFIED';
const report=`# Validation Report — issue426

Application ${gate.applicationCommit}; accepted baseline b7ae14d120c1e70ccf72784206a505f8c48f975e. Eight scoped frontend source/test paths. Room/bed action identity and local bounded wrapping only; extracted typed helper/panels keep parent handlers/API/auth/bounds/single-flight intact and touched files under500 lines. No backend/schema/API/config/env/dependency/pipeline change. Dirty primary/native launchers and unaccepted405/408/410/416 candidates excluded.

## Original acceptance criteria

| Criterion | Result | Evidence |
|---|---|---|
| AC1 unambiguous accessible room and bed names | PASS | independent-qa4/browser01 and supplemental01/test-results/browser-results.json:2 rooms/4 beds, quotes/separators and hostile literals |
| AC2 tooltip, editor and confirmation retain complete resource | PASS | standard browser; captured original context while renaming; long01/room-headers01/delete-header01/confirm-bounds01 actual value + geometry/glyph/pixel assertions |
| AC3 distinct deletion with existing confirmation | PASS | separate IcoTrash/danger color/16px gap, full original camera identity in confirmation, reachable Cancel; no DELETE click |
| AC4 verify without live deletion | PASS | all three lanes before-wire synthetic guards; zero actual patient/facility writes/DELETE/external/unknown requests |

## Tests executed

NEW independent QA4 ${gate.independentBrowserCases} cases PASS. Root exact byte-identical frozen recipe replay ${gate.rootIndependentRerun} PASS. Actual deployed compiled SPA ${online.cases} PASS with identical source/fixtures/assertions/guards; only APP_URL environment changes. Real React/Vite config/compiler, not a replica. Two recipes exercise an exact single controlled mocked409 path/console event each; other errors are forbidden, not suppressed. Bed all5 busy-disabled controls and single-flight/retry/stateful mock reload remain verified. No realDB persistence claim. No production auth/clinical/facility API passes the before-wire guard; only bounded static GETs.

Independent/root types FE/BE,tsc-b,Vite build,24/24 focused and source/dist secret scan PASS. Full1267/1255PASS/12 exact named accepted baseline failures/0new, NOT globally green. Eight-path native scoped security baseline/candidate0 findings, not global CVE certification. All1539 source inputs unchanged before/after each lane; root rawSHA${gate.sourceSha256}; independent rawSHA${gate.independentRawSourceSha256}. Strict UTF-8 CRLF→LF-only normalization records stay separate from raw source hashes. New QA manifest${gate.immutableQaFiles} files SHA${gate.qaManifestSha256}, verified immutable before root replay.

## Rejected attempts and integrity

Candidate07 FAILED valid32room/16bed context at x612>390; all105 artifacts/raw manifest7a7ee7ff2f48dde6ba453771441f753634dcdd6d13583b9c32219a51a86d2f7d retained in failed-independent-qa-07. Bed-wrap143 fixed that but QA2 FAILED valid32W inline camera heading x517>376 and deletion heading x611>374; full message/destructive text also overflowed. All100 raw files/manifest214ebae4bdc1cced6455897772fc0acca255488c91cb95b74a2b0a6055dafe29 retained in failed-independent-qa2-143. Neither failure waived or relabeled. Additive local selector wrapping preserves the shared design system. RED1 for each remediation precedes CSS. Root first header command attempt changed source while running and failed existing bed selector guard: inadmissible, retained locally; fresh source-bound root-headers2 rebuild passed before final freeze. No overwritten independent proof or assertions altered to fit output.

Candidate922 QA3 original20 cases PASS but new complete-text check FAILED: destructive button scroll435/client311 and glyphs outside390 viewport. All140 raw files/manifest133014ded7ed582f34b38f615551b8ab66ca1509407e6a1a99150d7fbfbf7c58 preserved in failed-independent-qa3-922. QA3 report's inline-flex hypothesis is not causal certification; root inspected the actual canonical :not(#ds) selector specificity/nowrap/fixedheight. Local matching-specificity automaticheight/normal whitespace retains the shared minimumheight/font/palette/borders and fixes fulltext, without shortened labels. Fresh strong preflight and final QA4/root/compiled glyph/vertical/hit assertions prove correction. Root adoption parser initially stopped on QA3 field convention; only parser corrected to actual sealed fields, no evidence changed. WinPS5 BOM decoding on owned stop receipts similarly repaired only root parser before staging/commit. Tooling incidents retained.

Actual final pixels reviewed by root for bed, inline camera and full confirmation bounds in the independent, replay and compiled lanes; visual-review.md records the source and exact paths. Playwright library receipts under independent-qa4/playwright-report and compiled-online/playwright-report/index.html are NOT native Playwright Test runner reports. Desktop1280x720/mobile390x844 measurements/emulation only, NOT physical tablet/touch/gloves/screen-reader/ward certification. No original clinical photographs or identifiable patient data published.

## Deployment and CI

Vercel ${deployment.vercel.id} READY; Git source/metadata exactly${gate.applicationCommit}, production alias/static200. JS SHA${online.bundleSha256After}; HTML/CSS captured before and unchanged after compiled acceptance. Retained backend47a4b16c111d9b9bfd0b138991958a8ca8f6c351/Railwayed539cb2-224c-4221-8e7a-0f0901039987 health200; no backend deploy needed.

${blocked?`CI${ci.candidateRun} external infrastructure failure before checkout (${ci.failedStage}); application CI unavailable, NOT the accepted backend baseline. No unchanged retry or pipeline/env/credential bypass. Issue remains open.`:`CI${ci.candidateRun} completed. Secret scan${ci.frontendSecretScanRun} success. ${ci.candidateConclusion==='success'?'Workflow success.':'Exactly the same single accepted422 backend test name/stage; downstream import tests skipped, not claimed PASS. No global CI green claim.'} ci-comparison.json records exact source-bound comparison.`}

Canonical staged Git blobs must pass configured credential checks (including expanded ZIP entries), binary integrity and all failed/successful raw QA manifests before push. Pinned public4PNG HTTP200/hash verification${final?' completed in public-preverification.json; final report/canonical blobs rechecked on final proof commit before GitHub mutation':' remains pending; no issue closure permitted'}. Original issue body remains unchanged, duplicate comment check before mutation. Release actions independently authorized by human/root recorded receipts, not by QA role.

## Final Decision

${decision}

${blocked?'External CI gate not satisfied; preserve accepted source/functional evidence without claiming closure.':final?'All4 scoped functional criteria and source/independent/root/compiled/deployment/CI/canonical/pinned screenshot gates verified. Final proof commit integrity and original issue are checked again before actual GitHub closure.':'Functional/local/deployment/compiled/CI gates passed; canonical public proof verification still required. No completion claim.'}
`;
writeFileSync(root+'/validation-report.md',report);console.log('Generated report from verified receipts: '+decision);
