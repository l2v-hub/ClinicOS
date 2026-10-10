import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const root='artifacts/task-validation/427-agenda-identity',read=p=>JSON.parse(readFileSync(root+'/'+p,'utf8').replace(/^\uFEFF/,'')),final=process.argv[2]==='final',gate=read('release-gate-receipt.json'),deploy=read('deployment-receipt.json'),online=read('compiled-online/online-receipt.json'),ci=read('ci-comparison.json'),plan=read('root-rerun/browser-plan.json');
for(const r of [deploy,online,ci])assert.equal(r.applicationCommit,gate.applicationCommit);assert.equal(online.cases,gate.rootIndependentRerun);assert.deepEqual(ci.newFailureNames,[]);assert.equal(ci.frontendSecretScanConclusion,'success');
let publicProof='Commit-pinned HTTP/hash preverification still pending; issue remains open.';
if(final){const pub=read('public-preverification.json');assert.equal(pub.applicationCommit,gate.applicationCommit);assert.ok(pub.images.length>=3&&pub.images.every(i=>i.http===200));publicProof=`Pinned public proof${pub.proofCommit}, ${pub.images.length} PNG HTTP200/rawSHA verified in public-preverification.json. Final publisher must reverify current finalproof canonical hashes/PNG/actor/exactoriginalissue before closure.`;assert.ok(existsSync(root+'/visual-review.md'));}
const text=`# #427 Agenda identity and activity states

## Final Decision
${final?'CLOSED — VERIFIED':'IMPLEMENTED — NOT VERIFIED'}

Application ${gate.applicationCommit}; Vercel${deploy.vercel.id} READY exactGitSource/meta SHA; alias/HTML/JS/CSS HTTP200/static hashes unchanged before/after compiled acceptance. Backend unchanged47a/Railwayed539 health200, no backenddeployment required.

## Original acceptance criteria
| Criterion | Result | Actual evidence |
|---|---|---|
| AC1 Identity does not imply activity state | PASS | Names retained; all admin identity dots hidden; week/month identity-border width0, including inlinecolors; scoped CSS excludes HMI |
| AC2 State beyond color | PASS | All four state words retained in day/week/month; cancelled included in named legend; admin blue/amber surfaces agree with badge/legend. Labels preexisted, not a newly claimed feature |
| AC3 Empty/populated hierarchy | PASS | Real DOM appointment-filter caption and activity legend title/counts; empty zero count, no async falseempty message; original handlers/nativecontrols retained |
| AC4 Mixed operators/states/grayscale | PASS | NEW independent QA and byte-identical root/compiled recipes, actual SPA, multiple operators, repeat palette, normal/grayscale, desktop/phone software. No physicalhardware/AT/light certification |

## Independent quality gate and root replay
independent-qa/validation-report.md and manifest.json: ${gate.immutableQaFiles} immutable files, manifest SHA${gate.qaManifestSha256}. Original4AC read independently. ${gate.independentBrowserCases} groups each independent/root/compiled; root-rerun/pre-run.json freezes recipes byte-for-byte, source-before/after stable${gate.sourceFiles}physical app inputs, rawSHA${gate.sourceSha256}; independent rawSHA${gate.independentRawSourceSha256}. Cross-checkout differences restricted to verified strictUTF8 CRLF-to-LF only, normalization receipt in release-gate-receipt.json. No app changes during tests. Root checked BOTH physical checkouts against actual cleanGit candidate in root-rerun/source-git-binding.json, without changing the immutable QA bundle. Inherited phone-month narrow seven-column calendar wrapping remains; no global mobile layout/readability redesign claimed.

Commands10focusedPASS, FE/BE/types/tsc-b/ViteReactcompiler/secretsPASS. Full1271:1259PASS/12 exactnamedacceptedbaseline/0new. Not globallygreen. Native scanner4diffpaths0new baseline/candidate; not globalCVEcertification. Security checklist in independent report; no API/auth/schema/deps/env/config changes or runtime bypass. ${ci.candidateConclusion==='success'?'CI application workflow success':`CI${ci.candidateRun} exactsame single accepted422backendfailure/stage Backend unit tests; downstream importtests skipped, not claimed passing`}; secret${ci.frontendSecretScanRun} success. ci-comparison.json authoritative.

## Artifacts and safety
Actual successful results/screenshots/traces/videos: ${plan.map(r=>['independent-qa','root-rerun','compiled-online'].map(f=>f+'/'+r.folder).join(', ')).join('; ')}. Planfolders enumerated in each browser-plan.json; preliminary failed QA attempts remain historical inside immutable QA manifest and are NOT successful replay claims. Receipt HTML in corresponding playwright-report, clearly Playwright library rather than native runner report if applicable. ${publicProof}

All clinical/auth/facility requests intercepted BEFORE wire, staticonly production GET allowlist, zero unauthorized/unexpected/HTTPconsole/pageerrors and zero real writes. Synthetic names/IDs only; no original clinical photos. User main dirty/native launchers/blocked405/408/410/416 preserved. local initial test-discovery/tsxtransform incident retained in initial-test-discovery.md and tdd-red.log, no failing independent assertion weakened. root-initial02 actual pre-freeze command/security data included. No real persistence claim required for presentation-only change. Publication scanner checks configured credentials and expanded ZIP canonical blobs; publication-manifest.json authoritative. Final action policy is root human-authorized gate, no fabricated Ruflo lease/capability.
`;
writeFileSync(root+'/validation-report.md',text);console.log(final?'Final verified report prepared; pinned finalpublication gate pending':'Prepublication report honest NOT VERIFIED; publicproof pending');
